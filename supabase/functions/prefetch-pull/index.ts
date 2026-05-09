// Phase 5a: cron-driven Batch result pull. Runs daily at 06:00 JST via
// pg_cron + pg_net (see migration 20260509120100_lessons_prefetch.sql).
//
// For every lessons row with a non-null prefetch_batch_id and body=NULL,
// check the Batch status and either save the body or clear the batch_id so
// the Realtime path takes over on next open.
//
// The cron job sends our service_role JWT in the Authorization header. We
// do not need RLS scoping here — service_role bypasses RLS — so verify_jwt
// is set to false in config.toml.

import { createClient } from "npm:@supabase/supabase-js@2";
import { LessonBodySchema, extractToolUseInput } from "../_shared/lessonBody.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required env for prefetch-pull");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_HEADERS = {
  "x-api-key": ANTHROPIC_API_KEY!,
  "anthropic-version": "2023-06-01",
  "anthropic-beta": "message-batches-2024-09-24",
};

type PendingRow = {
  id: string;
  prefetch_batch_id: string;
  prefetch_submitted_at: string | null;
};

type BatchStatus = {
  id: string;
  processing_status: "in_progress" | "canceling" | "ended";
  results_url: string | null;
  ended_at: string | null;
};

type BatchResult = {
  custom_id: string;
  result: {
    type: "succeeded" | "errored" | "canceled" | "expired";
    message?: unknown;
    error?: { type: string; message: string };
  };
};

async function fetchBatchStatus(batchId: string): Promise<BatchStatus> {
  const res = await fetch(`https://api.anthropic.com/v1/messages/batches/${batchId}`, {
    headers: ANTHROPIC_HEADERS,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`batch status ${res.status}: ${text}`);
  }
  return (await res.json()) as BatchStatus;
}

async function fetchBatchResults(resultsUrl: string): Promise<BatchResult[]> {
  const res = await fetch(resultsUrl, { headers: ANTHROPIC_HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`batch results ${res.status}: ${text}`);
  }
  // Results are JSONL.
  const text = await res.text();
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as BatchResult);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: { code: "method_not_allowed", message: "POST only" } }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: pending, error: pendingErr } = await admin
    .from("lessons")
    .select("id, prefetch_batch_id, prefetch_submitted_at")
    .not("prefetch_batch_id", "is", null)
    .is("body", null);
  if (pendingErr) {
    console.error("[prefetch-pull] fetch pending failed:", pendingErr);
    return new Response(JSON.stringify({ error: { code: "db_error", message: pendingErr.message } }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const rows = (pending ?? []) as PendingRow[];
  console.log(`[prefetch-pull] ${rows.length} pending lesson(s)`);

  // Group by batch_id so a single batch with multiple results (today we only
  // submit 1-per-batch, but be defensive) is fetched once.
  const byBatch = new Map<string, PendingRow[]>();
  for (const r of rows) {
    const list = byBatch.get(r.prefetch_batch_id) ?? [];
    list.push(r);
    byBatch.set(r.prefetch_batch_id, list);
  }

  const stats = { saved: 0, dropped: 0, still_running: 0, errors: 0 };

  for (const [batchId, members] of byBatch) {
    let status: BatchStatus;
    try {
      status = await fetchBatchStatus(batchId);
    } catch (err) {
      console.error(`[prefetch-pull] status check failed for ${batchId}:`, err);
      stats.errors += members.length;
      continue;
    }

    if (status.processing_status !== "ended") {
      stats.still_running += members.length;
      continue;
    }

    let results: BatchResult[];
    try {
      if (!status.results_url) throw new Error("no results_url on ended batch");
      results = await fetchBatchResults(status.results_url);
    } catch (err) {
      console.error(`[prefetch-pull] results fetch failed for ${batchId}:`, err);
      // Drop these lessons so Realtime can pick them up on next open.
      await admin
        .from("lessons")
        .update({ prefetch_batch_id: null, prefetch_submitted_at: null })
        .in("id", members.map((m) => m.id));
      stats.dropped += members.length;
      continue;
    }

    // Map custom_id (`lesson-<uuid>`) → result.
    const byCustomId = new Map<string, BatchResult>();
    for (const r of results) byCustomId.set(r.custom_id, r);

    for (const member of members) {
      const customId = `lesson-${member.id}`;
      const r = byCustomId.get(customId);
      if (!r) {
        // Member submitted under this batch but no result row — drop.
        await admin
          .from("lessons")
          .update({ prefetch_batch_id: null, prefetch_submitted_at: null })
          .eq("id", member.id);
        stats.dropped += 1;
        continue;
      }
      if (r.result.type !== "succeeded" || !r.result.message) {
        console.warn(
          `[prefetch-pull] lesson ${member.id} result.type=${r.result.type}`,
          r.result.error,
        );
        await admin
          .from("lessons")
          .update({ prefetch_batch_id: null, prefetch_submitted_at: null })
          .eq("id", member.id);
        stats.dropped += 1;
        continue;
      }
      let body;
      try {
        const input = extractToolUseInput(r.result.message);
        body = LessonBodySchema.parse(input);
      } catch (err) {
        console.error(`[prefetch-pull] parse failed for lesson ${member.id}:`, err);
        await admin
          .from("lessons")
          .update({ prefetch_batch_id: null, prefetch_submitted_at: null })
          .eq("id", member.id);
        stats.dropped += 1;
        continue;
      }
      // Race protection: only write if body still NULL. If a Realtime call
      // beat us to it, the WHERE clause filters us out and we just clear the
      // batch_id below.
      const { error: writeErr } = await admin
        .from("lessons")
        .update({
          body,
          generated_at: new Date().toISOString(),
          prefetch_batch_id: null,
          prefetch_submitted_at: null,
        })
        .eq("id", member.id)
        .is("body", null);
      if (writeErr) {
        console.error(`[prefetch-pull] save failed for lesson ${member.id}:`, writeErr);
        stats.errors += 1;
        continue;
      }
      // If the save was skipped due to body now being NOT NULL, also clear
      // the batch_id so this row stops showing up in the pending query.
      await admin
        .from("lessons")
        .update({ prefetch_batch_id: null, prefetch_submitted_at: null })
        .eq("id", member.id)
        .not("body", "is", null);
      stats.saved += 1;
    }
  }

  console.log("[prefetch-pull] done:", stats);
  return new Response(JSON.stringify({ ok: true, ...stats }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
