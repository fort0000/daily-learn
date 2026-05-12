// Phase 5a: enqueue the *next-day* lesson body to Anthropic's Batch API once
// the user completes today's lesson — but only if they advanced the frontier.
// See roadmap.md "Phase 5 / 翌日レッスンの事前生成(Batch API)" and
// db-schema.md "翌日レッスンの事前生成". Pull-side is prefetch-pull (cron).

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildMessagesPayload,
  type CourseMeta,
  type LessonBrief,
} from "../_shared/lessonBody.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required env for lessons-prefetch-next");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type LessonRow = {
  id: string;
  course_id: string;
  day: number;
  title: string;
  summary: string;
  body: unknown | null;
  prefetch_batch_id: string | null;
  completed_at: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "method_not_allowed", "POST only");

  let payload: { lesson_id?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Body must be JSON");
  }
  const completedLessonId = payload.lesson_id;
  if (!completedLessonId) return jsonError(400, "invalid_input", "lesson_id is required");
  console.log(`[lessons-prefetch-next] start completed_lesson=${completedLessonId}`);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError(401, "unauthorized", "Missing Authorization header");

  const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return jsonError(401, "unauthorized", "Invalid session");

  // Read the just-completed lesson (RLS handles ownership).
  const { data: completed, error: completedErr } = await userClient
    .from("lessons")
    .select("id, course_id, day, title, summary, body, prefetch_batch_id, completed_at")
    .eq("id", completedLessonId)
    .maybeSingle();
  if (completedErr) return jsonError(500, "db_error", completedErr.message);
  if (!completed) return jsonError(404, "not_found", "Lesson not found");

  const courseId = (completed as LessonRow).course_id;
  const completedDay = (completed as LessonRow).day;
  if (completedDay >= 30) {
    console.log(
      `[lessons-prefetch-next] skip course_done lesson=${completedLessonId} day=${completedDay}`,
    );
    return new Response(JSON.stringify({ skipped: "course_done" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Plan gate: don't burn Batch credits prefetching Day 11+ for free users.
  // They can't open it anyway (lessons-generate / lessons-read 402s).
  const adminForPlan = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data: profile } = await adminForPlan
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const plan = (profile as { plan: "free" | "paid" } | null)?.plan ?? "free";
  if (plan === "free" && completedDay + 1 > 10) {
    console.log(
      `[lessons-prefetch-next] skip plan_limit user=${user.id} plan=${plan} next_day=${completedDay + 1}`,
    );
    return new Response(JSON.stringify({ skipped: "plan_limit" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Frontier check: the completed lesson must be the max(day) completed in
  // this course. Past-day completions don't trigger Batch (avoids re-running
  // generation when the user fills in old gaps).
  const { data: maxDayRow, error: maxDayErr } = await userClient
    .from("lessons")
    .select("day")
    .eq("course_id", courseId)
    .not("completed_at", "is", null)
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxDayErr) return jsonError(500, "db_error", maxDayErr.message);
  const maxCompletedDay = (maxDayRow as { day: number } | null)?.day ?? 0;
  if (maxCompletedDay !== completedDay) {
    console.log(
      `[lessons-prefetch-next] skip not_frontier course=${courseId} completed_day=${completedDay} max_completed_day=${maxCompletedDay}`,
    );
    return new Response(JSON.stringify({ skipped: "not_frontier" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Load all 30 lessons + course meta for the prompt.
  const [courseRes, lessonsRes] = await Promise.all([
    userClient
      .from("courses")
      .select("field, prerequisite, goal, title")
      .eq("id", courseId)
      .maybeSingle(),
    userClient
      .from("lessons")
      .select("id, day, title, summary, body, prefetch_batch_id")
      .eq("course_id", courseId)
      .order("day", { ascending: true }),
  ]);
  if (courseRes.error) return jsonError(500, "db_error", courseRes.error.message);
  if (lessonsRes.error) return jsonError(500, "db_error", lessonsRes.error.message);
  if (!courseRes.data) return jsonError(404, "not_found", "Course not found");

  const allLessons = (lessonsRes.data ?? []) as Array<{
    id: string;
    day: number;
    title: string;
    summary: string;
    body: unknown | null;
    prefetch_batch_id: string | null;
  }>;
  const next = allLessons.find((l) => l.day === completedDay + 1);
  if (!next) return jsonError(500, "db_error", "Next-day lesson row missing");

  // Idempotence: only enqueue when both body and prefetch_batch_id are clean.
  if (next.body !== null) {
    console.log(
      `[lessons-prefetch-next] skip already_generated next_lesson=${next.id} day=${next.day}`,
    );
    return new Response(JSON.stringify({ skipped: "already_generated" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (next.prefetch_batch_id !== null) {
    console.log(
      `[lessons-prefetch-next] skip already_enqueued next_lesson=${next.id} day=${next.day} batch=${next.prefetch_batch_id}`,
    );
    return new Response(JSON.stringify({ skipped: "already_enqueued" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const courseMeta: CourseMeta = {
    field: courseRes.data.field,
    prerequisite: courseRes.data.prerequisite,
    goal: courseRes.data.goal,
    title: courseRes.data.title,
  };
  const briefs: LessonBrief[] = allLessons.map((l) => ({
    day: l.day,
    title: l.title,
    summary: l.summary,
  }));
  const target: LessonBrief = { day: next.day, title: next.title, summary: next.summary };

  // The Batch API accepts the same /v1/messages params nested inside each
  // request. custom_id ties results back to the lesson row in prefetch-pull,
  // but we also store batch_id on the row so we don't need to scan results.
  const batchBody = {
    requests: [
      {
        custom_id: `lesson-${next.id}`,
        params: buildMessagesPayload(courseMeta, briefs, target),
      },
    ],
  };

  const batchRes = await fetch("https://api.anthropic.com/v1/messages/batches", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31,message-batches-2024-09-24",
      "content-type": "application/json",
    },
    body: JSON.stringify(batchBody),
  });
  if (!batchRes.ok) {
    const text = await batchRes.text();
    console.error("[lessons-prefetch-next] batch submit failed:", batchRes.status, text);
    return jsonError(502, "batch_submit_failed", `${batchRes.status}: ${text}`);
  }
  const batchJson = (await batchRes.json()) as { id?: string };
  if (!batchJson.id) return jsonError(502, "batch_submit_failed", "No batch id in response");

  // Same race protection: only set prefetch_batch_id if the row is still
  // both empty and unenqueued. If two completions raced, the loser observes
  // the row already has a batch_id and the second batch is silently leaked
  // (Anthropic eventually expires it). Acceptable — we already pay for the
  // first one.
  const { data: updRows, error: updErr } = await adminForPlan
    .from("lessons")
    .update({
      prefetch_batch_id: batchJson.id,
      prefetch_submitted_at: new Date().toISOString(),
    })
    .eq("id", next.id)
    .is("body", null)
    .is("prefetch_batch_id", null)
    .select("id");
  if (updErr) return jsonError(500, "db_error", updErr.message);
  if (!updRows || updRows.length === 0) {
    // Lost the race: another concurrent invocation already set prefetch_batch_id
    // (or body) on this row between our read and write. The batch we just
    // submitted to Anthropic is silently leaked (we already pay for it).
    console.warn(
      `[lessons-prefetch-next] update missed lesson=${next.id} day=${next.day} leaked_batch=${batchJson.id}`,
    );
  } else {
    console.log(
      `[lessons-prefetch-next] enqueued lesson=${next.id} day=${next.day} batch=${batchJson.id}`,
    );
  }

  return new Response(
    JSON.stringify({ enqueued: true, lesson_id: next.id, batch_id: batchJson.id }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
