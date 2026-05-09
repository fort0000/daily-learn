// Phase 5a: on-demand (Realtime) lesson body generation.
// See roadmap.md "Phase 5 / 5a" / db-schema.md "lessons / 本文生成フロー".
//
// Called when the Article screen opens a lesson with body=NULL. Also invoked
// by courses-generate immediately after the skeleton lands so Day 1 is ready
// without a spinner. The Batch path (lessons-prefetch-next + prefetch-pull)
// is a separate concern; this function does not touch prefetch_batch_id.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  generateLessonBody,
  type CourseMeta,
  type LessonBrief,
} from "../_shared/lessonBody.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing required env: ANTHROPIC_API_KEY / SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY",
  );
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
};

type CourseRow = {
  id: string;
  field: string;
  prerequisite: string | null;
  goal: string;
  title: string;
};

// Resolve { course, allLessons, target } from a single lesson_id, using the
// caller-scoped client so RLS handles ownership for free.
async function loadContext(
  client: SupabaseClient,
  lessonId: string,
): Promise<{ course: CourseMeta; allLessons: LessonBrief[]; target: LessonRow }> {
  const { data: target, error: targetErr } = await client
    .from("lessons")
    .select("id, course_id, day, title, summary, body")
    .eq("id", lessonId)
    .maybeSingle();
  if (targetErr) throw targetErr;
  if (!target) throw new Error("lesson_not_found");

  const [courseRes, lessonsRes] = await Promise.all([
    client
      .from("courses")
      .select("id, field, prerequisite, goal, title")
      .eq("id", (target as LessonRow).course_id)
      .maybeSingle(),
    client
      .from("lessons")
      .select("day, title, summary")
      .eq("course_id", (target as LessonRow).course_id)
      .order("day", { ascending: true }),
  ]);
  if (courseRes.error) throw courseRes.error;
  if (lessonsRes.error) throw lessonsRes.error;
  if (!courseRes.data) throw new Error("course_not_found");

  const course = courseRes.data as CourseRow;
  return {
    course: {
      field: course.field,
      prerequisite: course.prerequisite,
      goal: course.goal,
      title: course.title,
    },
    allLessons: (lessonsRes.data ?? []) as LessonBrief[],
    target: target as LessonRow,
  };
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
  if (userErr || !user) {
    return jsonError(401, "unauthorized", userErr?.message ?? "Invalid session");
  }

  let ctx: Awaited<ReturnType<typeof loadContext>>;
  try {
    ctx = await loadContext(userClient, lessonId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "lesson_not_found" || msg === "course_not_found") {
      return jsonError(404, "not_found", "Lesson not found or not accessible");
    }
    console.error("[lessons-generate] loadContext failed:", err);
    return jsonError(500, "db_error", msg);
  }

  // Already generated — return as-is. The Batch path UPDATEs with WHERE body
  // IS NULL so this is the canonical "no-op once filled" check.
  if (ctx.target.body !== null) {
    return new Response(
      JSON.stringify({ lesson_id: ctx.target.id, body: ctx.target.body, cached: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body;
  try {
    body = await generateLessonBody(
      ANTHROPIC_API_KEY!,
      ctx.course,
      ctx.allLessons,
      { day: ctx.target.day, title: ctx.target.title, summary: ctx.target.summary },
    );
  } catch (err) {
    console.error("[lessons-generate] generation failed:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(502, "generation_failed", msg);
  }

  // Race protection: WHERE body IS NULL ensures a Batch result that landed
  // moments earlier wins, and we don't double-write.
  const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { error: updateErr } = await admin
    .from("lessons")
    .update({
      body,
      generated_at: new Date().toISOString(),
      prefetch_batch_id: null,
    })
    .eq("id", ctx.target.id)
    .is("body", null);
  if (updateErr) {
    console.error("[lessons-generate] update failed:", updateErr);
    return jsonError(500, "db_error", updateErr.message);
  }

  return new Response(
    JSON.stringify({ lesson_id: ctx.target.id, body, cached: false }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
