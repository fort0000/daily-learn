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
    points: z.tuple([z.string().min(1).max(120), z.string().min(1).max(120), z.string().min(1).max(120)]),
    blocks: z
      .array(
        z.discriminatedUnion("type", [
          z.object({ type: z.literal("heading"), text: z.string().min(3).max(80) }),
          z.object({ type: z.literal("paragraph"), markdown: z.string().min(80).max(2400) }),
          z.object({ type: z.literal("tip"), text: z.string().min(1).max(600) }),
          z.object({ type: z.literal("action"), text: z.string().min(1).max(600) }),
        ]),
      )
      .min(8)
      .max(20)
      .refine(
        (blocks) => blocks.filter((b) => b.type === "action").length === 1,
        { message: "blocks must contain exactly one 'action' item" },
      )
      .refine(
        (blocks) => blocks.filter((b) => b.type === "tip").length <= 4,
        { message: "blocks may contain at most four 'tip' items" },
      )
      .refine(
        (blocks) => {
          const n = blocks.filter((b) => b.type === "heading").length;
          return n >= 3 && n <= 7;
        },
        { message: "blocks must contain between 3 and 7 'heading' items" },
      ),
    references: z
      .array(
        z.object({
          title: z.string().min(1).max(200),
          url: z.string().url().max(800),
        }),
      )
      .min(1)
      .max(8),
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
    required: ["v", "points", "blocks", "references"],
    properties: {
      v: { type: "integer", const: 1 },
      points: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: { type: "string", description: "1ポイント=1〜2文の箇条書き。120字以内。" },
        description: "「📌 今日の3つのポイント」枠に表示される3つの要点。必ず3個。",
      },
      blocks: {
        type: "array",
        minItems: 8,
        maxItems: 20,
        description:
          "本文ブロック列。配列の順番が表示順。**3〜7 個の heading で全体を区切り**、各 heading の下に1〜3 個の paragraph(必要なら tip)を置く。" +
          "action は必ず1個(末尾)、tip は最大4個、残りは paragraph または heading。" +
          "各 paragraph は 200〜500 字・3〜5 文。全体で 3,500〜5,500 字を目指す。",
        items: {
          oneOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "text"],
              properties: {
                type: { type: "string", const: "heading" },
                text: {
                  type: "string",
                  description:
                    "セクション見出し。短く骨太に(15〜40字目安)。番号(1. 2. 等)は書かない。表示時に自動で振られる。",
                },
              },
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "markdown"],
              properties: {
                type: { type: "string", const: "paragraph" },
                markdown: {
                  type: "string",
                  description:
                    "Markdown 段落。3〜5 文・200〜500 字を目安に、具体例・数字・実例を必ず含める。" +
                    "**太字** と ==ハイライト== を使ってよい(他の Markdown 装飾は使わない)。",
                },
              },
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "text"],
              properties: {
                type: { type: "string", const: "tip" },
                text: { type: "string", description: "💡ヒント本文。1〜3文。" },
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
      references: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        description:
          "本文中で参照した情報源(web_search で得たページ等)を 1〜8 件。読者が原典を辿れるよう、" +
          "本当に内容を確認したページだけを入れる(URL を捏造しない)。",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "url"],
          properties: {
            title: {
              type: "string",
              description: "ページのタイトルや出典名。日本語/英語そのままで構わない。",
            },
            url: {
              type: "string",
              description: "https:// から始まる完全な URL。短縮 URL は使わない。",
            },
          },
        },
      },
    },
  },
} as const;

// ---------- prompt construction ----------

const FEW_SHOT_EXAMPLES: LessonBody[] = [
  {
    v: 1,
    points: [
      "複利は「利息にも利息がつく」仕組み",
      "年利・期間が同じなら、開始の早さが最終額を決める",
      "新NISA は2024年から年360万円・生涯1800万円まで非課税",
    ],
    blocks: [
      {
        type: "heading",
        text: "複利は「利息にも利息がつく」仕組み",
      },
      {
        type: "paragraph",
        markdown:
          "==複利==とは「利息にもさらに利息がつく」仕組みのことです。年利5%なら、1年目は元本100万円に5万円の利息がつきますが、**2年目はその105万円に対して5%がつく** ため、利息は5万2,500円に増えます。これを20年・30年と続けると、単利との差は雪だるま式に広がります。アインシュタインがこれを「人類最大の発明」と呼んだと言われるのも、この **指数関数的な伸び** が人間の直感に反するからです。",
      },
      {
        type: "heading",
        text: "時間が複利の最大の武器になる",
      },
      {
        type: "paragraph",
        markdown:
          "具体例で見てみます。毎月3万円を年利5%で30年積み立てた場合、元本は1,080万円ですが、複利で運用された最終額は **約2,500万円** になります(金融庁「資産運用シミュレーション」での試算)。同じ金額・同じ年利でも、開始が10年遅れて20年運用にすると最終額は約1,233万円。元本差はわずか360万円ですが、最終額の差は ==1,267万円== にも開きます。複利において一番効くレバーは、利率でも金額でもなく **時間** だと言われる理由がここにあります。",
      },
      {
        type: "tip",
        text: "「72の法則」: 72 ÷ 年利(%)= 元本がおよそ2倍になる年数。年利6%なら12年、年利3%なら24年で2倍。暗算で複利の手応えを掴むのに便利です。",
      },
      {
        type: "heading",
        text: "新NISA で複利の伸びを非課税で受け取る",
      },
      {
        type: "paragraph",
        markdown:
          "日本では2024年1月から **==新NISA==** が始まり、複利を活かした非課税投資の枠が大幅に拡大しました。年間の非課税投資枠は「つみたて投資枠120万円+成長投資枠240万円」の合計360万円、生涯の非課税保有限度額は1,800万円です。通常の課税口座だと運用益に約20%の税金がかかりますが、NISA 口座内では ==非課税== なので、複利の伸びをそのまま受け取れます。金融庁の2024年末データでは新NISAの口座数は2,560万口座を突破し、20〜30代の口座開設が前年比で2倍に増えました。",
      },
      {
        type: "heading",
        text: "前提条件は「再投資」と「長期継続」",
      },
      {
        type: "paragraph",
        markdown:
          "ただし、複利には ==前提条件== があります。利益を引き出さずに **再投資** していること、そして長期で運用を継続できることです。途中で売却して使ってしまうと、その時点で複利は止まります。米バンガード社の調査では、長期投資家のうち市場下落時に保有を続けた人は、慌てて売って買い直した人と比べて30年リターンで平均1.5%/年高かったというデータがあります。たった1.5%でも、30年複利で見ると最終資産は約**56%** の差になります。",
      },
      {
        type: "tip",
        text: "投資信託やETFを使えば、配当が自動的に再投資されるタイプ(分配金再投資型)を選ぶだけで複利の前提を満たせます。",
      },
      {
        type: "action",
        text: "金融庁の「つみたてシミュレーター」で、毎月3万円・年利5%・30年の試算を実際にやってみる。",
      },
    ],
    references: [
      {
        title: "NISA特設ウェブサイト — 金融庁",
        url: "https://www.fsa.go.jp/policy/nisa2/",
      },
      {
        title: "資産運用シミュレーション — 金融庁",
        url: "https://www.fsa.go.jp/policy/nisa2/moneyplan_sim/index.html",
      },
      {
        title: "NISA口座の利用状況調査(2024年12月末時点) — 金融庁",
        url: "https://www.fsa.go.jp/policy/nisa/20240329-2/01.pdf",
      },
    ],
  },
];

const SYSTEM_TEXT = `あなたは1日10分で読める学習レッスンを書く教育ライターです。
出力は必ず save_lesson ツールで返してください。自由テキストでは返さないでください。

# まず最新情報を調べる(必須)
- 本文を書き始める前に **必ず web_search ツールを使って最新情報を調べてください**。
- 検索すべき例: 関連する制度・統計・市場規模・直近の変化(過去1〜2年以内)・公式の数字・主要な事例。
- 「2024年」「2025年」など **直近の年度を含むクエリ** を使い、古い情報をそのまま書かないこと。
- 検索で得た数字や固有名詞は本文に **具体的に組み込む**(「最近増えている」ではなく「2024年12月時点で○○口座」のように)。
- 検索でアクセスしたページのうち、本文に内容を反映したものを **\`references\` に必ず1件以上、最大8件** 入れる。タイトルとフル URL のセット。**捏造や推測 URL は禁止**。実際に検索結果に出たページだけ。

# 文量と見出し構造(最大の改善ポイント)
- 全体で **約 3,500〜5,500 字**。短すぎる出力は読み応えがなく不合格扱い。
- 本文は必ず **3〜7 個の \`heading\` ブロックで章立てする**。長文を見出しなしのべた書きで返さない。
- 各 heading の下には paragraph を1〜3 個、必要なら tip を入れる。
- heading 同士を連続させない(間に必ず paragraph または tip を入れる)。
- heading の text には **番号(「1.」「2.」等)を書かない**。Renderer が自動で番号を振ります。
- \`blocks\` 全体は **8〜20 個**(目安: heading 3〜7、paragraph 5〜10、tip 1〜3、action 1)。
- \`paragraph\` は1ブロックあたり **3〜5 文・200〜500 字**。1〜2文の薄いブロックは作らない。
- 段落は「主張 → 根拠(数字・出典・実例) → 補足や帰結」の構造で書くと厚みが出ます。

# 文章ルール
- 全文 **日本語**(である調ではなく、**です・ます調**)。
- 読者は専門家ではない一般人。難しい用語は1度説明する。
- 重要な単語は \`==ハイライト==\` で囲む(=記号2つで挟む独自記法)。
- 強調は \`**太字**\`(他の Markdown 装飾は使わない)。
- 必ず **数字・具体例・固有名詞** を入れる(抽象論だけにしない)。
- **本文に \`<cite>\` などの HTML タグや \`[1]\`/\`*1\` のような脚注番号を一切書かない**。
  web_search の引用情報をそのままコピーせず、内容を自分の言葉でまとめてから書く。
- 出典の一覧は **\`references\` フィールド** に入れる(同じ URL を本文と references に二重に書かない)。
- 本文中の URL は **「読者がその場で開いて触る価値があるツールやページ」** に絞って書いてよい。
  例: 公式シミュレーター、無料テンプレート、診断ツールなど。
  単なる出典・根拠を示すだけの URL は本文に書かず references に入れる。
  本文中の URL は \`https://...\` のフル形式で書く(短縮 URL は使わない)。Renderer が自動でリンクにします。

# 構成ルール
- \`points\` は **必ず3個**。今日の学びを箇条書きで端的に。
- \`blocks\` の **配列順 = 表示順**。Renderer 側では並べ替えしない。
- \`heading\` は3〜7個。各見出しは「短く骨太」(15〜40字目安)。本文を読まなくても流れが分かるタイトルにする。
- \`heading\` の直後に \`paragraph\`(または \`tip\`)が必ず来る。\`heading\` を2つ以上連続させない。
- \`action\` は **必ず末尾** に1個。「読者が今日中に1人で実行できる具体行動」を書く(抽象目標は不可)。
- \`tip\` は0〜4個。\`tip\` は本文の流れを止める豆知識・注意点に使い、本論は \`paragraph\` で書く。

# 学習アークを尊重する
- このコースは30日構成で、各日の \`title\`/\`summary\` を別途渡します。
- **前日までの内容は前提として扱ってよい**(再説明しない)。
- **翌日以降の内容には踏み込まない**(その日の論点に絞る)。
- 同じ概念を別の Day で重複説明していないか、コース全体の流れと照らして確認する。`;

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
    (ex) => `\`\`\`json\n${JSON.stringify(ex, null, 2)}\n\`\`\``,
  ).join("\n\n");

  return [
    { type: "text", text: SYSTEM_TEXT },
    {
      type: "text",
      text:
        "# LessonBody スキーマ説明\n" +
        "save_lesson の入力は LessonBody JSON。型は input_schema に厳格に従ってください。\n" +
        "特に: blocks 配列は表示順、heading は3〜7個で章立て、action は丁度1個(末尾)、tip は最大4個、points は丁度3個、references は1〜8件。\n" +
        "paragraph は 200〜500 字を目安に厚く書き、全体 3,500〜5,500 字を狙う。\n" +
        "heading の text に番号(「1.」等)は書かない — 表示時に自動で振られる。",
    },
    {
      type: "text",
      text:
        `# 良質な LessonBody の例(実際に web_search で参照したページを references に入れる例)\n\n${fewShot}`,
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
        `手順:\n` +
        `1. **まず web_search で最新情報を 1〜3 回調べる**(関連する直近の制度・統計・事例。クエリには 2024 / 2025 などの年を入れる)。\n` +
        `2. 検索で得た数字・固有名詞を本文に具体的に組み込む。\n` +
        `3. \`save_lesson\` を呼び、本文(3,500〜5,500 字、blocks 8〜20、heading 3〜7 で章立て)と references(実際にアクセスしたページ 1〜8 件)を返す。\n` +
        `前日までの学びは前提とし、当日の論点に集中してください。`,
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
    max_tokens: 8192,
    system: buildSystemBlocks(),
    tools: [
      SAVE_LESSON_TOOL,
      // Anthropic server-side web search. Lets the model fetch live data
      // before composing the lesson so we get current statistics / regulation
      // numbers / recent examples instead of stale training data.
      { type: "web_search_20250305", name: "web_search", max_uses: 4 },
    ],
    // tool_choice "auto" so the model can call web_search first, then
    // save_lesson at the end. The system prompt mandates save_lesson; if the
    // model forgets, generateLessonBody retries once with explicit feedback.
    tool_choice: { type: "auto" },
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
//
// Also strips any <cite index="…">…</cite> wrapper tags that the web_search
// tool occasionally bleeds into paragraph markdown / tip / action strings.
// We keep the inner text and drop the tags — citations belong in the
// `references` field, not in the body. Defense in depth on top of the
// system-prompt rule.
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
  return stripCiteTags(toolUse.input);
}

// Walk the tool_use input as a JSON string and strip <cite …> / </cite> tags.
// JSON.stringify of plain JS values is round-trip safe, and "<" / "/" are not
// escaped, so the regex matches reliably against the serialized form.
function stripCiteTags(input: unknown): unknown {
  const serialized = JSON.stringify(input);
  // Matches both `<cite ...>` and `</cite>`. Inner text is preserved because
  // we only delete the tag itself, not its content.
  const cleaned = serialized.replace(/<\/?cite\b[^>]*>/gi, "");
  return JSON.parse(cleaned);
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
    // Model used web_search but forgot to wrap up with save_lesson — common
    // failure mode now that tool_choice is "auto". One retry with an explicit
    // nudge usually fixes it.
    if (err instanceof Error && err.message.includes("save_lesson")) {
      console.warn("[lesson-body] no-tool-use retry:", err.message);
      return await callOnce(
        "前回は save_lesson ツールを呼ばずに終わってしまいました。" +
          "web_search の結果を踏まえて、必ず最後に save_lesson で LessonBody を返してください。",
      );
    }
    throw err;
  }
}
