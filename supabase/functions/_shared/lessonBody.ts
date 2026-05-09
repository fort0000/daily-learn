// Shared lesson-body generation: Zod schema, prompt construction, Claude call.
//
// Used by:
// - lessons-generate (Realtime path)
// - courses-generate (Day 1 pre-generation directly after the skeleton lands)
// - lessons-prefetch-next (Anthropic Batch submission — uses buildMessagesPayload)
// - prefetch-pull (parses Batch results — uses parseToolUse + LessonBodySchema)
//
// The frontend mirror of the Zod schema lives in src/lib/lessonBody.ts.
// Keep the two in sync; their shapes must match the LessonBody contract in
// db-schema.md.

import { z } from "npm:zod@3";

export const LessonBodySchema = z
  .object({
    v: z.literal(1),
    hero: z.object({
      theme: z.string().min(1).max(80),
      visual: z.enum(["bubbles", "chart", "icon", "none"]),
    }),
    points: z.tuple([z.string().min(1).max(120), z.string().min(1).max(120), z.string().min(1).max(120)]),
    blocks: z
      .array(
        z.discriminatedUnion("type", [
          z.object({ type: z.literal("paragraph"), markdown: z.string().min(1).max(1200) }),
          z.object({ type: z.literal("tip"), text: z.string().min(1).max(400) }),
          z.object({ type: z.literal("action"), text: z.string().min(1).max(400) }),
        ]),
      )
      .min(3)
      .max(8)
      .refine(
        (blocks) => blocks.filter((b) => b.type === "action").length === 1,
        { message: "blocks must contain exactly one 'action' item" },
      )
      .refine(
        (blocks) => blocks.filter((b) => b.type === "tip").length <= 2,
        { message: "blocks may contain at most two 'tip' items" },
      ),
  })
  .strict();

export type LessonBody = z.infer<typeof LessonBodySchema>;

// JSON Schema mirror of LessonBodySchema — fed into Anthropic as the
// save_lesson tool's input_schema. Hand-maintained because zod-to-json-schema
// adds drafts/$refs that Anthropic Tool Use can be picky about, and the
// shape is small enough to keep in lockstep.
export const SAVE_LESSON_TOOL = {
  name: "save_lesson",
  description: "Save the structured body of one lesson for later rendering.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["v", "hero", "points", "blocks"],
    properties: {
      v: { type: "integer", const: 1 },
      hero: {
        type: "object",
        additionalProperties: false,
        required: ["theme", "visual"],
        properties: {
          theme: {
            type: "string",
            description: "短い見出しタグ。例: 'FRAMEWORK · 3C', 'CONCEPT · 複利'。",
          },
          visual: {
            type: "string",
            enum: ["bubbles", "chart", "icon", "none"],
            description: "ヒーロー視覚パターン。内容に最も合うものを選ぶ。",
          },
        },
      },
      points: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: { type: "string", description: "1ポイント=1〜2文の箇条書き。120字以内。" },
        description: "「📌 今日の3つのポイント」枠に表示される3つの要点。必ず3個。",
      },
      blocks: {
        type: "array",
        minItems: 3,
        maxItems: 8,
        description:
          "本文ブロック列。配列の順番が表示順。action は必ず1個、tip は最大2個。残りは paragraph。",
        items: {
          oneOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "markdown"],
              properties: {
                type: { type: "string", const: "paragraph" },
                markdown: {
                  type: "string",
                  description:
                    "Markdown 段落。**太字** と ==ハイライト== を使ってよい(他の Markdown 装飾は使わない)。",
                },
              },
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "text"],
              properties: {
                type: { type: "string", const: "tip" },
                text: { type: "string", description: "💡ヒント本文。1〜2文。" },
              },
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "text"],
              properties: {
                type: { type: "string", const: "action" },
                text: {
                  type: "string",
                  description: "✅今日のアクション。読者が今日中に行える具体行動を1つ。",
                },
              },
            },
          ],
        },
      },
    },
  },
} as const;

// ---------- prompt construction ----------

const FEW_SHOT_EXAMPLES: LessonBody[] = [
  {
    v: 1,
    hero: { theme: "FRAMEWORK · 3C", visual: "bubbles" },
    points: [
      "Customer(顧客)から始める",
      "自社と競合は「比較」する",
      "スキマを探す視点を持つ",
    ],
    blocks: [
      {
        type: "paragraph",
        markdown:
          "副業を始めるとき、最初にぶつかる壁は「==誰に何を売るか==」です。**3C** はこの問いに答える最も基本的な道具です。",
      },
      {
        type: "tip",
        text: "順番が大事。Customer → Competitor → Company の順で考えること。",
      },
      {
        type: "paragraph",
        markdown:
          "顧客のニーズを把握せずに競合を見ても意味がありません。まず「**困っている人**」を3人具体的に思い浮かべるところから始めます。",
      },
      {
        type: "paragraph",
        markdown:
          "次に競合を見ます。**同じ顧客**を取り合っているのは誰か。直接競合だけでなく、代替手段(YouTube・本など)も含めて広く見ます。",
      },
      {
        type: "action",
        text: "自分が始めたい副業の「想定顧客」を3人、紙に書き出してみる。",
      },
    ],
  },
  {
    v: 1,
    hero: { theme: "CONCEPT · 複利", visual: "chart" },
    points: [
      "利息にも利息がつくのが複利",
      "時間が最大の味方になる",
      "小さくても早く始めるほど効く",
    ],
    blocks: [
      {
        type: "paragraph",
        markdown:
          "==複利==とは「利息にもさらに利息がつく」仕組みです。年利5%なら、1年後に元本の5%が増え、**翌年はその増えた額にも5%がつきます**。",
      },
      {
        type: "paragraph",
        markdown:
          "10年・20年と続けば、単利との差は雪だるま式に広がります。アインシュタインが「人類最大の発明」と呼んだと言われるのも、この**指数的な伸び**が直感に反するからです。",
      },
      {
        type: "tip",
        text:
          "「72の法則」: 72 ÷ 年利(%)= 元本が2倍になるおおよその年数。覚えておくと暗算で複利が掴めます。",
      },
      {
        type: "action",
        text: "毎月1万円を年利5%で20年積み立てたら最終いくらになるか、電卓で計算してみる。",
      },
    ],
  },
];

const SYSTEM_TEXT = `あなたは1日10分で読める学習レッスンを書く教育ライターです。
出力は必ず save_lesson ツールで返してください。自由テキストでは返さないでください。

# 文章ルール
- 全文 **日本語**(である調ではなく、**です・ます調**)
- 読者は専門家ではない一般人。難しい用語は1度説明する
- 1段落 = 2〜4文。長すぎる段落は2つに分ける
- 重要な単語は \`==ハイライト==\` で囲む(=記号2つで挟む独自記法)
- 強調は \`**太字**\`(他の Markdown 装飾は使わない)
- 数字や具体例を入れる(抽象論だけにしない)

# 構成ルール
- \`hero.theme\` は「カテゴリ · キーワード」の形式(例: 'FRAMEWORK · 3C', 'CONCEPT · 複利')
- \`hero.visual\` は内容に最も合うパターン: \`bubbles\`(関係図的)/\`chart\`(数値・推移)/\`icon\`(単一概念)/\`none\`(視覚なし)
- \`points\` は **必ず3個**。今日の学びを箇条書きで端的に
- \`blocks\` は3〜8個。最後または末尾近くに **\`action\` を必ず1個**。\`tip\` は0〜2個。残りは \`paragraph\`
- \`blocks\` の **配列順 = 表示順**。Renderer 側では並べ替えしない
- \`action\` は「読者が今日中に1人で実行できる具体行動」を1つ書く(抽象的な目標ではなく)

# 学習アークを尊重する
- このコースは30日構成で、各日の \`title\`/\`summary\` を別途渡します
- **前日までの内容は前提として扱ってよい**(再説明しない)
- **翌日以降の内容には踏み込まない**(その日の論点に絞る)
- 同じ概念を別の Day で重複説明していないか、コース全体の流れと照らして確認する`;

export type CourseMeta = {
  field: string;
  prerequisite: string | null;
  goal: string;
  title: string;
};

export type LessonBrief = {
  day: number;
  title: string;
  summary: string;
};

// Build the Anthropic `system` content blocks. Static portions (system text +
// few-shot examples) are flagged with cache_control so retries / consecutive
// generations within the same course hit the prompt cache.
export function buildSystemBlocks(): Array<Record<string, unknown>> {
  const fewShot = FEW_SHOT_EXAMPLES.map(
    (ex, i) =>
      `## 例${i + 1}\n\n\`\`\`json\n${JSON.stringify(ex, null, 2)}\n\`\`\``,
  ).join("\n\n");

  return [
    { type: "text", text: SYSTEM_TEXT },
    {
      type: "text",
      text:
        "# LessonBody スキーマ説明\n" +
        "save_lesson の入力は LessonBody JSON。型は input_schema に厳格に従ってください。\n" +
        "特に: blocks 配列は表示順、action は丁度1個、tip は最大2個、points は丁度3個。",
    },
    {
      type: "text",
      text: `# 良質な LessonBody の例(2件)\n\n${fewShot}`,
      cache_control: { type: "ephemeral" },
    },
  ];
}

// User message for one lesson. Includes the full course meta + 30-day briefs
// (cacheable), then the current target lesson + optional retry feedback.
export function buildUserBlocks(
  course: CourseMeta,
  allLessons: LessonBrief[],
  target: LessonBrief,
  retryFeedback?: string,
): Array<Record<string, unknown>> {
  const briefList = allLessons
    .slice()
    .sort((a, b) => a.day - b.day)
    .map((l) => `- Day ${l.day}: ${l.title} — ${l.summary}`)
    .join("\n");

  const blocks: Array<Record<string, unknown>> = [
    {
      type: "text",
      text:
        `# コース情報\n` +
        `- title: ${course.title}\n` +
        `- 分野(field): ${course.field}\n` +
        `- ゴール(goal): ${course.goal}\n` +
        `- 前提知識(prerequisite): ${course.prerequisite?.trim() || "未指定(基礎から)"}\n\n` +
        `# 全30日のレッスン構成(アーク参照用)\n${briefList}`,
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text:
        `# これから書く対象\n` +
        `- Day ${target.day}: ${target.title}\n` +
        `- summary: ${target.summary}\n\n` +
        `この Day の本文を save_lesson ツールで返してください。前日までの学びは前提とし、当日の論点に集中してください。`,
    },
  ];

  if (retryFeedback) {
    blocks.push({
      type: "text",
      text: `# 前回出力の問題点(修正してから返してください)\n${retryFeedback}`,
    });
  }

  return blocks;
}

// Final shape of an /v1/messages request body. Reused by the Realtime path
// (sent directly) and the Batch path (one request per lesson, wrapped).
export function buildMessagesPayload(
  course: CourseMeta,
  allLessons: LessonBrief[],
  target: LessonBrief,
  retryFeedback?: string,
): Record<string, unknown> {
  return {
    model: "claude-opus-4-7",
    max_tokens: 4096,
    system: buildSystemBlocks(),
    tools: [SAVE_LESSON_TOOL],
    tool_choice: { type: "tool", name: "save_lesson" },
    messages: [
      {
        role: "user",
        content: buildUserBlocks(course, allLessons, target, retryFeedback),
      },
    ],
  };
}

// Pull the save_lesson tool_use input out of an Anthropic /v1/messages
// response (or one batch result). Throws if the model didn't use the tool.
export function extractToolUseInput(json: unknown): unknown {
  const content = (json as { content?: Array<{ type: string; name?: string; input?: unknown }> })
    .content;
  if (!Array.isArray(content)) {
    throw new Error("Anthropic response has no content array");
  }
  const toolUse = content.find((c) => c.type === "tool_use" && c.name === "save_lesson");
  if (!toolUse?.input) {
    throw new Error("Claude did not return a save_lesson tool_use block");
  }
  return toolUse.input;
}

// Realtime generation: call /v1/messages directly with retry-on-Zod-error
// (1 attempt). Returns a validated LessonBody.
export async function generateLessonBody(
  apiKey: string,
  course: CourseMeta,
  allLessons: LessonBrief[],
  target: LessonBrief,
): Promise<LessonBody> {
  const callOnce = async (retryFeedback?: string): Promise<LessonBody> => {
    const payload = buildMessagesPayload(course, allLessons, target, retryFeedback);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic API ${res.status}: ${text}`);
    }
    const json = await res.json();
    const input = extractToolUseInput(json);
    return LessonBodySchema.parse(input);
  };

  try {
    return await callOnce();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const feedback = err.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
      console.warn("[lesson-body] zod retry:", feedback);
      return await callOnce(feedback);
    }
    throw err;
  }
}
