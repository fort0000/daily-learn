// Phase 4: kick off a 30-day course generation, return immediately, then run
// the Anthropic call in a background task via EdgeRuntime.waitUntil.
// See roadmap.md "Phase 4" / db-schema.md "courses".

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import {
  generateLessonBody,
  type CourseMeta,
  type LessonBrief,
} from "../_shared/lessonBody.ts";

// EdgeRuntime is a Supabase-provided global; declare it so TS doesn't complain.
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };

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

const InputSchema = z.object({
  field: z.string().trim().min(1).max(200),
  prerequisite: z.string().trim().max(2000).nullish(),
  goal: z.string().trim().min(1).max(2000),
});

const LessonSchema = z.object({
  day: z.number().int().min(1).max(30),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
});

const CourseSchema = z
  .object({
    title: z.string().min(1).max(200),
    lessons: z.array(LessonSchema).length(30),
  })
  .refine((data) => new Set(data.lessons.map((l) => l.day)).size === 30, {
    message: "lessons must have unique day values across 1..30",
  });

type CourseSkeleton = z.infer<typeof CourseSchema>;
type GenerationInput = z.infer<typeof InputSchema>;

const SAVE_COURSE_TOOL = {
  name: "save_course",
  description: "Save the generated 30-day learning course (title + 30 lesson titles/summaries).",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: {
        type: "string",
        description: "30字以内のコース名。ユーザーが達成したいことを端的に表現する。",
      },
      lessons: {
        type: "array",
        minItems: 30,
        maxItems: 30,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            day: { type: "integer", minimum: 1, maximum: 30 },
            title: { type: "string" },
            summary: { type: "string" },
          },
          required: ["day", "title", "summary"],
        },
      },
    },
    required: ["title", "lessons"],
  },
};

const SYSTEM_PROMPT = `あなたは段階的な学習コースを設計する教育デザイナーです。
ユーザーの「分野」「前提知識」「ゴール」を受け、30日間のレッスンを設計してください。

設計原則:
- 各レッスンは1日10分で読めるサイズ
- 学習アークは「基礎(Day 1〜10)→ 応用(Day 11〜20)→ 統合(Day 21〜30)」の3段構成
- ゴール達成に直結する内容に絞る(教養目的の脱線は避ける)
- title は「○○を使って△△できる」「△△を理解する」など、その日の学びを具体に表す日本語
- summary は2〜3文で「何が学べるか」をユーザー視点で要約
- 30日全体を通して同じ概念を繰り返し説明しない(各日に新しい論点)

出力は必ず save_course ツールで返してください。30件、day は1〜30で重複なし。`;

function buildUserPrompt(input: GenerationInput, retryFeedback?: string): string {
  const lines = [
    `分野: ${input.field}`,
    `前提知識: ${input.prerequisite?.trim() || "未指定(基礎から組み立ててください)"}`,
    `ゴール: ${input.goal}`,
    "",
    "このユーザー専用の30日コースを設計し、save_course ツールで返してください。",
  ];
  if (retryFeedback) {
    lines.push(
      "",
      "前回の出力に以下の問題がありました。修正したうえで再度返してください:",
      retryFeedback,
    );
  }
  return lines.join("\n");
}

async function callClaude(
  input: GenerationInput,
  retryFeedback?: string,
): Promise<CourseSkeleton> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      tools: [SAVE_COURSE_TOOL],
      tool_choice: { type: "tool", name: "save_course" },
      messages: [{ role: "user", content: buildUserPrompt(input, retryFeedback) }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    content: Array<{ type: string; name?: string; input?: unknown }>;
  };
  const toolUse = json.content.find((c) => c.type === "tool_use" && c.name === "save_course");
  if (!toolUse?.input) {
    throw new Error("Claude did not return a save_course tool_use block");
  }

  return CourseSchema.parse(toolUse.input);
}

async function generateSkeletonWithRetry(input: GenerationInput): Promise<CourseSkeleton> {
  try {
    return await callClaude(input);
  } catch (err) {
    if (err instanceof z.ZodError) {
      // Forward the exact validation issue to Claude so the second attempt has
      // a concrete signal — generic "try again" messages have low retry rates.
      const feedback = err.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      console.warn("[courses-generate] zod retry:", feedback);
      return await callClaude(input, feedback);
    }
    throw err;
  }
}

async function runBackground(
  admin: SupabaseClient,
  courseId: string,
  input: GenerationInput,
): Promise<void> {
  try {
    const skeleton = await generateSkeletonWithRetry(input);

    const lessonRows = skeleton.lessons.map((l) => ({
      course_id: courseId,
      day: l.day,
      title: l.title,
      summary: l.summary,
    }));
    const { data: insertedLessons, error: lessonsErr } = await admin
      .from("lessons")
      .insert(lessonRows)
      .select("id, day, title, summary");
    if (lessonsErr) throw lessonsErr;

    // Order matters: lessons must exist BEFORE we flip status to 'active', so
    // the realtime client never observes "active with no lessons".
    const { error: updateErr } = await admin
      .from("courses")
      .update({ title: skeleton.title, status: "active" })
      .eq("id", courseId);
    if (updateErr) throw updateErr;

    console.log(`[courses-generate] course ${courseId} ready: ${skeleton.title}`);

    // Pre-generate the Day 1 body so the user opens the article without a
    // spinner. Best-effort: a failure here just leaves body=NULL and the
    // Article screen falls back to lessons-generate on first open.
    await prefillDay1(admin, courseId, skeleton.title, input, insertedLessons ?? []);
  } catch (err) {
    console.error(`[courses-generate] background failed for ${courseId}:`, err);
    const summary = err instanceof Error ? err.message : String(err);
    const trimmed = summary.length > 500 ? summary.slice(0, 500) + "…" : summary;
    await admin
      .from("courses")
      .update({ status: "failed", generation_error: trimmed })
      .eq("id", courseId);
  }
}

async function prefillDay1(
  admin: SupabaseClient,
  courseId: string,
  courseTitle: string,
  input: GenerationInput,
  inserted: Array<{ id: string; day: number; title: string; summary: string }>,
): Promise<void> {
  const day1 = inserted.find((l) => l.day === 1);
  if (!day1) {
    console.warn(`[courses-generate] no day=1 lesson for course ${courseId}; skipping prefill`);
    return;
  }
  try {
    const courseMeta: CourseMeta = {
      field: input.field,
      prerequisite: input.prerequisite || null,
      goal: input.goal,
      title: courseTitle,
    };
    const allLessons: LessonBrief[] = inserted.map((l) => ({
      day: l.day,
      title: l.title,
      summary: l.summary,
    }));
    const body = await generateLessonBody(ANTHROPIC_API_KEY!, courseMeta, allLessons, {
      day: day1.day,
      title: day1.title,
      summary: day1.summary,
    });
    const { error } = await admin
      .from("lessons")
      .update({
        body,
        generated_at: new Date().toISOString(),
        prefetch_batch_id: null,
      })
      .eq("id", day1.id)
      .is("body", null);
    if (error) throw error;
    console.log(`[courses-generate] day1 prefilled for course ${courseId}`);
  } catch (err) {
    // Swallow — the user can still open Day 1 and lessons-generate runs.
    console.error(`[courses-generate] day1 prefill failed for course ${courseId}:`, err);
  }
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonError(405, "method_not_allowed", "POST only");
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Body must be JSON");
  }

  const parsed = InputSchema.safeParse(rawBody);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join(", ");
    return jsonError(400, "invalid_input", msg);
  }
  const input = parsed.data;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonError(401, "unauthorized", "Missing Authorization header");
  }

  const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return jsonError(401, "unauthorized", userErr?.message ?? "Invalid session");
  }

  const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  // Plan gate: free plan = at most 1 non-archived course. Stops Stripe-bypass
  // attacks where the client patches around the UI guard.
  const { data: profile } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();
  const plan = (profile as { plan: "free" | "paid" } | null)?.plan ?? "free";
  if (plan === "free") {
    const { count } = await admin
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["generating", "active", "completed", "failed"]);
    if ((count ?? 0) >= 1) {
      return jsonError(402, "PLAN_LIMIT_COURSES", "無料プランは 1 コースまでです");
    }
  }

  // Insert the placeholder row immediately. The frontend renders the "作成中…"
  // card off this row (initial fetch + Realtime), so we want it visible before
  // the Claude call even starts.
  const { data: inserted, error: insertErr } = await admin
    .from("courses")
    .insert({
      user_id: user.id,
      field: input.field,
      prerequisite: input.prerequisite || null,
      goal: input.goal,
      title: input.field, // placeholder; replaced when the skeleton lands
      status: "generating",
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return jsonError(500, "db_error", insertErr?.message ?? "Failed to create course");
  }

  // Keep the isolate alive after we return so the Anthropic call can finish.
  EdgeRuntime.waitUntil(runBackground(admin, inserted.id, input));

  return new Response(JSON.stringify({ course_id: inserted.id }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
