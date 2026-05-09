// Phase 7: read a lesson body, gated by plan.
// See roadmap.md "Phase 7".
//
// Input: { lesson_id }
// Output: { lesson_id, body } when accessible, 402 + PLAN_LIMIT_LESSONS when
// the caller is on the free plan and lesson.day > 10.
//
// Why this exists separate from lessons-generate: the body column on
// public.lessons is REVOKE'd from the authenticated role (migration 20260509190000),
// so the frontend must always fetch body through this gated server path
// instead of selecting it directly. lessons-generate produces body when null;
// this function only reads. Both enforce the same plan check.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required env: SUPABASE_*");
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "method_not_allowed", "POST only");

  let payload: { lesson_id?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Body must be JSON");
  }
  const lessonId = payload.lesson_id;
  if (!lessonId || typeof lessonId !== "string") {
    return jsonError(400, "invalid_input", "lesson_id is required");
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError(401, "unauthorized", "Missing Authorization header");

  const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return jsonError(401, "unauthorized", "Invalid session");

  const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  // Verify ownership via the joined courses row, then read body in the same
  // round-trip. Using admin lets us include body (which userClient can't read).
  const { data: row, error: rowErr } = await admin
    .from("lessons")
    .select("id, day, body, course:courses!inner(user_id)")
    .eq("id", lessonId)
    .maybeSingle();
  if (rowErr) {
    console.error("[lessons-read] select failed:", rowErr);
    return jsonError(500, "db_error", rowErr.message);
  }
  if (!row || (row.course as { user_id: string } | null)?.user_id !== user.id) {
    return jsonError(404, "not_found", "Lesson not found or not accessible");
  }

  // Plan gate. Only fetch the profile when needed (every paid call gets a
  // free pass without an extra query? — the gate is cheap enough to always
  // run, and avoiding races on plan change matters more).
  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const plan = (profile as { plan: "free" | "paid" } | null)?.plan ?? "free";
  if (plan === "free" && (row as { day: number }).day > 10) {
    return jsonError(402, "PLAN_LIMIT_LESSONS", "有料プランで Day 11 以降が解放されます");
  }

  return new Response(
    JSON.stringify({ lesson_id: lessonId, body: (row as { body: unknown }).body }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
