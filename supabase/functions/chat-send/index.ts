// Phase 5b: AI assistant chat per lesson.
// See roadmap.md "Phase 5 / 5b" / db-schema.md "chat_messages".
//
// Input: { lesson_id, content }
//   1. Insert the user message via the caller-scoped client (RLS allows
//      role='user' if the lesson is the caller's).
//   2. Read the lesson body + prior chat_messages for context.
//   3. Call Claude with that context.
//   4. Insert the assistant message via service_role and return it.
// The frontend subscribes to chat_messages via Realtime, so both inserts
// stream to the UI naturally.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing required env for chat-send");
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

const SYSTEM_TEXT = `あなたはユーザー1人ひとりに寄り添う学習コーチです。
このセッションは、ユーザーが今読んだ1つのレッスンについての質問・相談に答えるものです。

# 役割
- ユーザーがそのレッスンの内容を「自分のこと」として落とし込めるようサポートする
- 専門用語をかみ砕き、必要なら身近な比喩を使う
- ユーザーの状況・実務に即した具体例を一緒に考える

# トーンとルール
- **日本語のです・ます調**(優しく、対等に話す)
- 1回の返答は **3〜6文程度に収める**(長文の説教はしない)
- 必要なら箇条書きで2〜4点に整理
- レッスンに書かれていない事実を断定で答えるときは「〜と一般に言われています」のように曖昧さを残す
- このレッスンの範囲を大きく超える質問(例: 別の Day の内容、無関係な話題)が来たら「それはまた別の Day で扱います」と軽く触れて、現在のレッスンに戻す
- ユーザーが落ち込んでいる/迷っているときは、まず受け止めてから次の一歩を提案する`;

type ChatRow = { id: string; role: "user" | "assistant"; content: string };

async function loadContext(
  client: SupabaseClient,
  lessonId: string,
): Promise<{
  lesson: { day: number; title: string; summary: string; body: unknown | null };
  course: { title: string; field: string; goal: string };
  history: ChatRow[];
}> {
  const { data: lesson, error: lessonErr } = await client
    .from("lessons")
    .select("day, title, summary, body, course_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (lessonErr) throw lessonErr;
  if (!lesson) throw new Error("lesson_not_found");

  const [courseRes, historyRes] = await Promise.all([
    client
      .from("courses")
      .select("title, field, goal")
      .eq("id", (lesson as { course_id: string }).course_id)
      .maybeSingle(),
    client
      .from("chat_messages")
      .select("id, role, content")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true }),
  ]);
  if (courseRes.error) throw courseRes.error;
  if (historyRes.error) throw historyRes.error;
  if (!courseRes.data) throw new Error("course_not_found");

  return {
    lesson: lesson as { day: number; title: string; summary: string; body: unknown | null },
    course: courseRes.data as { title: string; field: string; goal: string },
    history: (historyRes.data ?? []) as ChatRow[],
  };
}

function buildSystemBlocks(
  course: { title: string; field: string; goal: string },
  lesson: { day: number; title: string; summary: string; body: unknown | null },
): Array<Record<string, unknown>> {
  const bodyText = lesson.body ? JSON.stringify(lesson.body) : "(本文未生成)";
  return [
    { type: "text", text: SYSTEM_TEXT },
    {
      type: "text",
      text:
        `# 現在のコース\n` +
        `- title: ${course.title}\n` +
        `- 分野: ${course.field}\n` +
        `- ゴール: ${course.goal}\n\n` +
        `# 現在のレッスン\n` +
        `- Day ${lesson.day}: ${lesson.title}\n` +
        `- 概要: ${lesson.summary}\n\n` +
        `# レッスン本文(LessonBody JSON)\n${bodyText}`,
      // Cache the lesson context across the multi-turn session so consecutive
      // messages don't re-bill the body tokens.
      cache_control: { type: "ephemeral" },
    },
  ];
}

async function callClaude(
  course: { title: string; field: string; goal: string },
  lesson: { day: number; title: string; summary: string; body: unknown | null },
  history: ChatRow[],
  newUserContent: string,
): Promise<string> {
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: newUserContent },
  ];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      system: buildSystemBlocks(course, lesson),
      messages,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const text = json.content
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text!)
    .join("")
    .trim();
  if (!text) throw new Error("Claude returned empty text");
  return text;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonError(405, "method_not_allowed", "POST only");

  let payload: { lesson_id?: string; content?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "Body must be JSON");
  }
  const lessonId = payload.lesson_id;
  const userContent = payload.content?.trim();
  if (!lessonId) return jsonError(400, "invalid_input", "lesson_id is required");
  if (!userContent) return jsonError(400, "invalid_input", "content is required");
  if (userContent.length > 4000) {
    return jsonError(400, "invalid_input", "content too long (max 4000 chars)");
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError(401, "unauthorized", "Missing Authorization header");

  const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return jsonError(401, "unauthorized", "Invalid session");

  // Insert user message via the caller's client. RLS rejects this if the
  // lesson isn't theirs — that's our ownership check.
  const { data: userMsg, error: insertErr } = await userClient
    .from("chat_messages")
    .insert({ lesson_id: lessonId, role: "user", content: userContent })
    .select("id, role, content, created_at")
    .single();
  if (insertErr || !userMsg) {
    return jsonError(403, "forbidden", insertErr?.message ?? "Insert blocked by RLS");
  }

  // Reload context (now including the just-inserted message in history).
  let ctx: Awaited<ReturnType<typeof loadContext>>;
  try {
    ctx = await loadContext(userClient, lessonId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "lesson_not_found" || msg === "course_not_found") {
      return jsonError(404, "not_found", "Lesson not accessible");
    }
    console.error("[chat-send] loadContext failed:", err);
    return jsonError(500, "db_error", msg);
  }

  // History from loadContext already includes the just-inserted user message
  // (newest at the end). Drop the last entry and re-add it as `newUserContent`
  // so the messages array reads cleanly.
  const last = ctx.history[ctx.history.length - 1];
  const priorHistory =
    last && last.role === "user" && last.content === userContent
      ? ctx.history.slice(0, -1)
      : ctx.history;

  let assistantText: string;
  try {
    assistantText = await callClaude(ctx.course, ctx.lesson, priorHistory, userContent);
  } catch (err) {
    console.error("[chat-send] Claude call failed:", err);
    return jsonError(502, "ai_failed", err instanceof Error ? err.message : String(err));
  }

  const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data: assistantMsg, error: assistantErr } = await admin
    .from("chat_messages")
    .insert({ lesson_id: lessonId, role: "assistant", content: assistantText })
    .select("id, role, content, created_at")
    .single();
  if (assistantErr || !assistantMsg) {
    console.error("[chat-send] assistant insert failed:", assistantErr);
    return jsonError(500, "db_error", assistantErr?.message ?? "Failed to save reply");
  }

  return new Response(
    JSON.stringify({ user: userMsg, assistant: assistantMsg }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
