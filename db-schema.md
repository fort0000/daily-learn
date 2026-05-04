# DailyLearn DB スキーマ

これから実装する Supabase Postgres のテーブル設計。`direction.md` の Phase 2〜6 で順次マイグレーションに落とす。

## 設計の前提

- 認証は **Supabase Auth (`auth.users`)** を使い、アプリ固有のユーザー情報は `public.profiles` に持つ(1:1)
- 全テーブルは作成と同時に **RLS ON**。「他人の行を絶対に読み書きさせない」を全テーブルで担保
- 主キーは原則 `uuid`(`gen_random_uuid()`)
- 時刻はすべて `timestamptz`(`timestamp` は使わない)
- ステータス系は `text + CHECK 制約` で表現(enum 型より migration が楽)
- 外部キーカラムには明示的に index を貼る(Postgres は FK だけでは index 自動生成しない)
- **「レッスンは個人専用 AI 生成コンテンツ」前提で、ユーザー紐付けは原則 `course → user` 経由で辿る**(中間テーブルや `user_id` 重複保持はしない)
- ストリークなどの派生情報は列で持たず **SQL 関数で都度算出**(同期バグを原理的に発生させない)
- レッスン本文は自由 Markdown ではなく **構造化 JSON (`LessonBody`)** で保存。モックの専用ブロック(ポイント/ヒント/アクション)を確実に描画でき、Renderer 側に表示順や装飾の **推測** を持ち込まない

## ER 図

> `profiles` は `auth.users` と 1:1(`profiles.id` = `auth.users.id`)。`auth.users` は Supabase 管理スキーマのため図からは省略。

```mermaid
erDiagram
    profiles ||--o{ courses : owns
    courses ||--o{ lessons : contains
    lessons ||--o{ chat_messages : has
    profiles ||--o{ user_badges : earns
    badges ||--o{ user_badges : awarded_to

    profiles {
        uuid id PK
        text display_name
        text plan
        timestamptz created_at
        timestamptz updated_at
    }
    courses {
        uuid id PK
        uuid user_id FK
        text field
        text prerequisite
        text goal
        text title
        text status
        timestamptz started_at
        timestamptz created_at
    }
    lessons {
        uuid id PK
        uuid course_id FK
        int day
        text title
        text summary
        jsonb body
        timestamptz generated_at
        timestamptz completed_at
        timestamptz created_at
    }
    chat_messages {
        uuid id PK
        uuid lesson_id FK
        text role
        text content
        timestamptz created_at
    }
    badges {
        uuid id PK
        text code UK
        text name
        text description
        text icon
    }
    user_badges {
        uuid user_id PK
        uuid badge_id PK
        timestamptz earned_at
    }
```

## テーブル定義

### `profiles` — アプリ固有のユーザー情報

| カラム | 型 | 制約 | メモ |
|---|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE | `auth.users.id` と同値 |
| `display_name` | `text` | NOT NULL | 表示名 |
| `plan` | `text` | NOT NULL DEFAULT `'free'`, CHECK in (`'free'`,`'paid'`) | 課金プラン |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | トリガで更新 |

**自動作成**: `auth.users` への INSERT を AFTER トリガで拾い、`handle_new_user()` で対応する `profiles` 行を作る。

**ストリーク等の派生値はここに持たない** — SQL 関数 `get_streak(uuid)` で `lessons.completed_at` から都度算出。

### `courses` — 30日コース

| カラム | 型 | 制約 | メモ |
|---|---|---|---|
| `id` | `uuid` | PK DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | |
| `field` | `text` | NOT NULL | 例: "投資", "起業" |
| `prerequisite` | `text` | NULL | ユーザーが申告した前提知識の自由記述。未入力 = 基礎から組み立てる |
| `goal` | `text` | NOT NULL | ユーザー入力の目標 |
| `title` | `text` | NOT NULL | AI 生成のコース名 |
| `status` | `text` | NOT NULL DEFAULT `'generating'`, CHECK in (`'generating'`,`'active'`,`'completed'`,`'archived'`) | |
| `started_at` | `timestamptz` | NULL | 初回レッスン完了時にセット |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

**index**: `(user_id, status)` — ユーザー画面の「アクティブなコース一覧」用。

### `lessons` — 1日分の学習コンテンツ(個人専用)

| カラム | 型 | 制約 | メモ |
|---|---|---|---|
| `id` | `uuid` | PK DEFAULT `gen_random_uuid()` | |
| `course_id` | `uuid` | NOT NULL, FK → `courses(id)` ON DELETE CASCADE | |
| `day` | `int` | NOT NULL, CHECK between 1 and 30 | |
| `title` | `text` | NOT NULL | コース生成時に確定 |
| `summary` | `text` | NOT NULL | コース生成時に確定 |
| `body` | `jsonb` | NULL | 本文の構造化データ。スキーマは下記 `LessonBody` を参照。On-demand 生成までは NULL(=未生成と等価、別途 status 列は持たない) |
| `generated_at` | `timestamptz` | NULL | 本文生成時にセット。「いつ生成したか」は `body` の NULL 判定から導出できないため独立カラムで保持 |
| `completed_at` | `timestamptz` | NULL | NULL = 未完了。値あり = 完了日時 |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

**制約**: `UNIQUE (course_id, day)`

**完了処理**: `UPDATE lessons SET completed_at = now() WHERE id = $1 AND completed_at IS NULL`(RLS が「自コースのレッスンか」をチェック)。再完了は不可。

#### 本文 JSON スキーマ (`LessonBody`)

`body` カラムには以下の構造の JSON を入れる。型と Zod スキーマは `src/lib/lessonBody.ts`(Phase 5 で作成)に単一ソースで定義し、AI Function 側でも同じものを使って tool_use の input_schema を導出する(`zod-to-json-schema`)。

```ts
type LessonBody = {
  v: 1
  hero: {
    theme: string                                    // 例: 'FRAMEWORK · 3C'
    visual: 'bubbles' | 'chart' | 'icon' | 'none'    // ヒーロー視覚パターン
  }
  points: [string, string, string]                   // 必ず3個
  blocks: Array<
    | { type: 'paragraph'; markdown: string }        // 中身は自由 Markdown(==hl==, **bold** OK)
    | { type: 'tip'; text: string }                  // 💡 ヒント
    | { type: 'action'; text: string }               // ✅ 今日のアクション
  >                                                  // 3〜8個。action は必ず1個。tip は最大2個
}
```

**ブロック順 = 表示順**。`blocks` 配列の順番がそのまま画面の上から下に描画される(Renderer 側で並べ替えしない)。

具体例:

```json
{
  "v": 1,
  "hero": { "theme": "FRAMEWORK · 3C", "visual": "bubbles" },
  "points": [
    "Customer(顧客)から始める",
    "自社と競合は「比較」する",
    "スキマを探す視点を持つ"
  ],
  "blocks": [
    { "type": "paragraph", "markdown": "副業を始めるとき、最初にぶつかる壁は「==誰に何を売るか==」です。**3C** はこの問いに答える最も基本的な道具です。" },
    { "type": "tip", "text": "順番が大事。Customer → Competitor → Company の順で考えること。" },
    { "type": "paragraph", "markdown": "顧客のニーズを把握せずに競合を見ても意味がありません。まず「**困っている人**」を3人具体的に思い浮かべるところから始めます。" },
    { "type": "paragraph", "markdown": "次に競合を見ます。**同じ顧客**を取り合っているのは誰か。直接競合だけでなく、代替手段(YouTube・本など)も含めて広く見ます。" },
    { "type": "action", "text": "自分が始めたい副業の「想定顧客」を3人、紙に書き出してみる。" }
  ]
}
```

#### 生成フロー(Phase 5: `/api/lessons/:id/generate`)

品質劣化を避けるため **2段階生成 + Tool Use** を採用:

1. **Step 1 (ドラフト)**: Claude Opus 4.7 + extended thinking で「Markdown でレッスン本文を書け」と自由に書かせる(構造化負荷ゼロ)
2. **Step 2 (整形)**: Claude Sonnet 4.6 に `save_lesson` ツール(input_schema は Zod から自動生成)で `LessonBody` JSON に整形させる。`tool_choice` で強制
3. **Zod 検証**: NG なら失敗内容をフィードバックして Claude に1回だけ再生成させる
4. **保存**: 検証通過したら `lessons.body` に JSON を入れ、`generated_at = now()`(`body IS NOT NULL` で「生成済み」を判定)

#### Renderer

`<LessonRenderer body={...} />` が以下を担当:
- `hero.visual` で分岐してヒーロー描画
- `points` を「📌 今日の3つのポイント」枠に展開
- `blocks` を `.map` で順番通りに `<Paragraph>` / `<TipBox>` / `<ActionBox>` に振り分け
- `paragraph.markdown` 内の `==xxx==`(ハイライト)と `**xxx**`(太字)はミニ MD パーサで `<strong>` に置換

### `chat_messages` — AIコーチの発言ログ

レッスンごとに1本のチャットしか持たないため、**スレッドテーブルは設けず `lesson_id` で直接ぶら下げる**。

| カラム | 型 | 制約 | メモ |
|---|---|---|---|
| `id` | `uuid` | PK DEFAULT `gen_random_uuid()` | |
| `lesson_id` | `uuid` | NOT NULL, FK → `lessons(id)` ON DELETE CASCADE | 所属レッスン |
| `role` | `text` | NOT NULL, CHECK in (`'user'`,`'assistant'`) | Anthropic API の role 仕様に合わせる(変換不要)。UI 表示時のみ `'assistant'` を「コーチ」とラベル化 |
| `content` | `text` | NOT NULL | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

**index**: `(lesson_id, created_at)` — チャットを時系列で取り出す用。

**所有権**: `lesson → course → user_id` で辿る。

**API パス**: `/api/chat/lessons/:lessonId/send`(`thread_id` ベースではなく `lesson_id` ベース)。

### `badges` — バッジマスタ(管理者のみ INSERT)

| カラム | 型 | 制約 | メモ |
|---|---|---|---|
| `id` | `uuid` | PK DEFAULT `gen_random_uuid()` | |
| `code` | `text` | UNIQUE NOT NULL | 例: `'first_lesson'`, `'streak_7'` |
| `name` | `text` | NOT NULL | 表示名 |
| `description` | `text` | NOT NULL | |
| `icon` | `text` | NOT NULL | 絵文字 or アイコン名 |

### `user_badges` — 獲得バッジ

| カラム | 型 | 制約 | メモ |
|---|---|---|---|
| `user_id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE | |
| `badge_id` | `uuid` | PK, FK → `badges(id)` ON DELETE CASCADE | |
| `earned_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

`badges` はユーザー横断のマスタなので、`user_badges` は中間テーブルとして必要。

## RLS 方針

全テーブル `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`。

| テーブル | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | `id = auth.uid()` | (トリガ経由のみ) | `id = auth.uid()` | × |
| `courses` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` | `user_id = auth.uid()` |
| `lessons` | `course_id` の所有者が `auth.uid()` | service_role のみ | 同左(本文生成は service_role / `completed_at` の更新のみフロントから可) | コース所有者と一致 |
| `chat_messages` | `lesson_id`(コース)の所有者が `auth.uid()` | `role = 'user'` かつ所有者一致 / `assistant` は service_role | × | × |
| `badges` | 全員 SELECT 可 | service_role のみ | service_role のみ | service_role のみ |
| `user_badges` | `user_id = auth.uid()` | service_role のみ | × | × |

**ポイント**:
- **`lessons` の INSERT は AI 生成 Function だけが行う** → `service_role` キー経由(フロントには露出しない)
- **`completed_at` のセットだけは UPDATE ポリシーでフロントから許可**(`completed_at IS NULL` のときのみに WITH CHECK で制限)
- **チャット**: ユーザー発言はフロントから INSERT、AI 応答は service_role からのみ INSERT
- **`user_badges` の付与もサーバ側ロジック** → `service_role` で書き込み

`chat_messages` の所有者判定はサブクエリで EXISTS チェック。例:

```sql
CREATE POLICY chat_messages_select_own ON chat_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM lessons l
    JOIN courses c ON c.id = l.course_id
    WHERE l.id = chat_messages.lesson_id
      AND c.user_id = auth.uid()
  )
);
```

## 関数・トリガ

| 名前 | 種別 | 役割 |
|---|---|---|
| `handle_new_user()` | `auth.users` AFTER INSERT トリガ | `profiles` を自動作成 |
| `set_updated_at()` | BEFORE UPDATE トリガ(`profiles`) | `updated_at = now()` |
| `get_streak(p_user_id uuid)` | 通常関数 | `lessons.completed_at` の連続日数を算出して `(current, longest)` を返す |

`get_streak` は SECURITY DEFINER で実装(自分のストリークしか取れないように WHERE 句で `auth.uid()` を強制)。フロントは `supabase.rpc('get_streak')` で呼ぶ。

## 命名規約

- テーブル名: 複数形・スネークケース(`chat_threads`)
- カラム名: スネークケース、bool は `is_xxx`(現状なし)
- FK カラム: `<参照先単数形>_id`(`course_id`, `lesson_id`)
- index 名: `idx_<table>_<columns>`(自動生成名は使わず明示)
- 制約名: Postgres デフォルト名に任せる(`<table>_<column>_check` 等)

## マイグレーション順序(Phase との対応)

| Phase | マイグレーション | テーブル |
|---|---|---|
| 2 | `<ts>_profiles.sql` | `profiles` + `handle_new_user` トリガ + RLS |
| 3 | `<ts>_courses_lessons.sql` | `courses`, `lessons`(`body jsonb` / `completed_at` 含む)+ `get_streak` 関数 + RLS |
| 5 | `<ts>_chat.sql` | `chat_messages` + RLS(EXISTS ポリシー) |
| - | `<ts>_badges.sql` | `badges`, `user_badges` + 初期バッジ seed |

`<ts>` は `YYYYMMDDHHMMSS` 形式の UTC タイムスタンプ。`supabase migration new <name>` で生成すると自動で付く。

`badges` は機能優先度が低いので Phase 番号は割り当てず、適時投入。

## やらないこと

- ユーザー削除時の論理削除(`deleted_at`)導入 — `ON DELETE CASCADE` で物理削除
- レッスン本文のバージョニング — 再生成は上書き(`v` フィールドはスキーマのバージョンであって本文のリビジョンではない)
- レッスンの **再** 完了履歴 — `completed_at` 単一カラムで足りる
- チャットメッセージの編集 — `UPDATE` ポリシー閉じる
- マルチテナント化(`organizations` / `workspaces`) — 将来必要になったらその時
- ストリーク等の派生値の列保持 — SQL 関数で都度算出
- `body_status` のような **`body` の NULL 判定で導出可能なステータス列** — 派生情報は持たない原則を貫く
- レッスン本文を **自由 Markdown 文字列のまま保存する** — モックの専用ブロック(ポイント/ヒント/アクション)が描けないため `LessonBody` JSON 構造化必須
- フロント側で Markdown を AST パースして装飾を **推測** で割り当てる — 構造はサーバ側で確定させる(Renderer は構造を信じて描画するだけ)
