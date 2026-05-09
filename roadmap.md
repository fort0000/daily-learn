# DailyLearn ロードマップ

現在のモックアップ状態からバックエンド完成までの段階的ロードマップ。各フェーズ末でリリース可能な状態を保つ(=デモ用 URL がいつでも動く)。

## アーキテクチャ全景

```
[ブラウザ (React SPA)]
   ├─ 静的アセット ──────▶ Cloudflare Pages
   ├─ Auth / DB / Storage ▶ Supabase  (anon key + RLS で直接アクセス)
   └─ AI / Webhook 等 ────▶ Supabase Edge Functions (Deno)
                              ├─▶ Anthropic API (Claude)
                              └─▶ Stripe Webhook
   定期実行 ────────────▶ Supabase pg_cron → Edge Function 起動
```

- **Cloudflare Pages**: SPA 本体の静的配信のみ
- **Supabase**: 認証・データ永続化・進捗・チャット履歴。フロントから直接呼び出し RLS で守る
- **Supabase Edge Functions**: APIキーを隠したい処理(AI生成・Stripe Webhook)。リクエストの Authorization ヘッダから JWT が自動検証され、`auth.uid()` がそのまま使えるため Supabase 側のロジックと同居しやすい。BFF 化はさせない
- **Supabase pg_cron**: 定期実行(Batch 結果の取り込みなど)。`pg_net` 経由で Edge Function を起動

自前のバックエンドサーバは立てない。Cloudflare Pages Functions も使わない(Supabase Edge Functions に一本化)。

## 進捗サマリ

| Phase | 内容 | 状態 |
|---|---|---|
| 0 | モックアップを CF Pages に配信 | ✅ done |
| 1 | Vite + TypeScript + Tailwind 化 | ✅ done |
| 2 | Supabase Auth + `profiles` | 🚧 雛形のみ(クライアント, 型, schema doc) |
| 3 | `courses` + `lessons` スキーマ + 進捗表示 | ⏳ |
| 4 | Edge Function `courses-generate`(コース一括生成) | ✅ done |
| 5 | Edge Function `lessons-generate` + `chat-send`(本文 + AIアシスタント) | ✅ done |
| 6 | Stripe Checkout + Webhook で無料/有料プラン制御 | ⏳ |

---

## Phase 2 — Supabase Auth + profiles 接続

**ゴール**: ログイン/サインアップ/ログアウトが動き、Profile タブと Account 画面が実セッションを反映する。

**画面構成の整理**(現状確認)
- `Profile.tsx` … プロフィールタブの本体(マスコット/ストリーク/バッジ/設定セクション/ログアウト)。**ここはログイン後の表示**
- `Account.tsx` … Profile から「プロフィール」行で開く編集サブ画面(名前・メール・パスワード変更)。ログイン画面ではない
- `Login.tsx`(新規) … 未認証時のログイン/サインアップ画面

**やること**
- `0001_profiles.sql` マイグレーション
  - `profiles` テーブル(`db-schema.md` 準拠)
  - `handle_new_user()` トリガで `auth.users` INSERT 時に `profiles` 行を自動作成
  - `set_updated_at()` BEFORE UPDATE トリガ
  - RLS: 自分の行のみ SELECT/UPDATE 可
- `src/lib/auth.ts`: `signInWithPassword` / `signUp` / `signOut` / `signInWithOAuth` / `useSession` フック
- `src/screens/Login.tsx` 新規作成: メール+パスワードのフォームに加え、**ソーシャルログインボタン**を併設
  - 対応プロバイダ: **Google**(必須)、GitHub(任意)。Apple は Apple Developer Program(有償)が必要なため当面見送り
  - Supabase ダッシュボードの Auth → Providers で各プロバイダを有効化し、OAuth クライアント ID/Secret を登録
  - リダイレクト URL: 開発(`http://localhost:5173/auth/callback`)/本番(`https://<pages-domain>/auth/callback`)を Supabase と各プロバイダ側両方に設定
  - `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })` で起動 → コールバック画面で `exchangeCodeForSession`
  - `src/screens/AuthCallback.tsx` 新規: OAuth コールバックを受けてセッション確立後にホームへ
  - `handle_new_user()` トリガが OAuth 経由のサインアップでも発火することを確認(`raw_user_meta_data.full_name` を `display_name` のデフォルトに)
- `App.tsx`: `supabase.auth.onAuthStateChange` でセッション監視。**未認証なら `Login.tsx` を表示し、それ以外の画面に到達させない**(Home/Profile/Account/Roadmap/Article/Chat/Create すべて認証必須)。`/auth/callback` パスだけは未認証でも到達可能
- `Profile.tsx`: モック値(`たけし` / `12日連続` 等)を `profiles` + `get_streak` の実値に差し替え。「ログアウト」行を `signOut()` に接続
- `Account.tsx`: 名前/メール/パスワード変更を Supabase Auth API + `profiles.display_name` UPDATE に接続

**受け入れ条件**
- メール+パスワードでサインアップ → メール確認 → ログインの一連が動く
- **Google ログインが動き、初回サインインで `profiles` 行が自動作成される**
- 既存メールアドレスで OAuth サインインしたとき、同一アカウントに紐付くこと(複数 `auth.users` 行が作られない)を確認
- 再読込してもセッション維持
- ログアウト後はログイン画面に戻り、URL 直打ちでも他画面に入れない
- Account 画面で名前変更 → Profile タブの表示名が即反映
- 別ユーザーの `profiles` 行が SELECT で取れないことを SQL で確認

**注意**
- `.env.local` に `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` が必須
- CF Pages 側にも環境変数を設定
- メール変更は Supabase 側で確認メール経由になる(即時反映はされない点を UI で明示)
- OAuth プロバイダのクライアント Secret は Supabase Dashboard 側で保管(`.env` には出さない)

---

## Phase 3 — courses + lessons スキーマ(中身は空でOK)

**ゴール**: 自分のコース一覧と進捗が DB から表示される(まだ AI 生成は手動 INSERT で代替)。

**やること**
- `0002_courses_lessons.sql`
  - `courses`(`prerequisite` は NULL 許容、`level` は持たない)
  - `lessons`(`title`/`summary` NOT NULL、`body jsonb` NULL、`completed_at` NULL)
  - `UNIQUE (course_id, day)`
  - `get_streak(uuid)` 関数(SECURITY DEFINER)
  - RLS は `db-schema.md` の表通り
- `src/lib/db.ts`: `fetchActiveCourses` / `fetchLessonsByCourse` / `markLessonComplete`
- `src/screens/Home.tsx`: 実データから `DAY xx / 30` チップとカルーセルを描画
- `src/screens/Roadmap.tsx`: 30マスを `lessons` から描画(`completed_at IS NOT NULL` で済マーク)
- 動作確認用に SQL から手動でダミーコースを 1 件挿入

**受け入れ条件**
- ホームのストリークが `get_streak` の結果と一致
- ロードマップの 30 マスが実 `lessons` 行と 1:1
- レッスン完了タップ → `completed_at` が更新され、再描画でチェックされる

---

## Phase 4 — Edge Function `courses-generate`(コース一括生成)

**ゴール**: Create 画面の「コースを作成する」ボタンで、30 日分の `(title, summary)` が一括生成され `lessons` に書き込まれる。続けてクライアントが Phase 5 の `lessons-generate` を叩いて Day 1 本文を生成し、ホーム遷移時には Day 1 がそのまま読める状態になっている。

**やること**
- `supabase/functions/courses-generate/index.ts`(Supabase Edge Function / Deno)
  - 入力: `{ field, prerequisite?, goal }`
  - リクエストの Authorization ヘッダはランタイム側で自動検証済み。`createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: req.headers.get('Authorization')! } } })` でユーザー文脈クライアントを作り、`auth.getUser()` で `user_id` を確定
  - Anthropic Claude Opus 4.7 を Tool Use で呼び、`save_course` ツール経由で構造化出力
    ```ts
    {
      title: string,
      lessons: Array<{ day: 1..30, title: string, summary: string }>  // 30件固定
    }
    ```
  - Zod で検証(30 件か、day が 1..30 で重複なしか)。NG なら 1 回だけリトライ
  - 別途 `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` を作り、`courses` INSERT(`status='active'`、`started_at = now()`)→ `lessons` × 30 を一括 INSERT(`body = NULL`)
  - 完成した `{ course_id, day1_lesson_id }` を返す(クライアントが直後に Day 1 生成エンドポイントへ渡せるよう、Day 1 の lesson UUID を同梱)
- `src/screens/Create.tsx`: ボタン押下後、以下を **直列に** 叩く(`supabase.functions.invoke(...)` 経由):
  1. `supabase.functions.invoke('courses-generate', { body: { field, prerequisite, goal } })` — コース骨格 (15〜30 秒)
  2. レスポンスの `day1_lesson_id` を使い `supabase.functions.invoke('lessons-generate', { body: { lesson_id: day1_lesson_id } })` — Day 1 本文を事前生成して DB へ保存 (20〜30 秒)
  3. 完了後ホームへ遷移。続けて Day 1 をタップしたとき、Article 画面で本文生成スピナーが出ない(`body` が既に保存されているため即時描画)
  4. (2) が失敗した場合はトースト通知のみでホームに遷移し、Day 1 を開いた時に再度 `lessons-generate` が走って Realtime で再生成(=このときは初めてスピナーが出る)
- **生成中の専用ローディング画面**(45〜60 秒級なので 2 段階の進捗表記):
  - フェーズ 1: 「30日のコースを設計中…」
  - フェーズ 2: 「Day 1 のレッスンを準備中…」

**受け入れ条件**
- Create 画面の入力 → 30 件の `lessons` 行が生成され、ロードマップに即時反映
- 続けて Day 1 本文生成が走り、ホームから Day 1 を開いた時にローディングなしで本文が読める
- Day 1 本文生成が失敗してもエラー画面にならず、コースは作成済み(初回オープン時に Realtime で再試行)
- `prerequisite` 未入力でも生成成功(Claude プロンプトで「未指定なら基礎から」を強制)
- 同じ入力で複数回叩いても 30 日のアークが一貫している(重複・順序破綻なし)

**設計メモ**
- **タイトル+概要を 30 日分まとめて作る**のは、Claude が学習アーク全体(基礎→応用→統合)を俯瞰しないと内容が重複・断片化するため
- **本文生成エンドポイントは Edge Function `lessons-generate` に一本化**。Day 1 の初回生成も Create フローからこの同一関数を叩く(Phase 4 内に二重実装しない)
- Day 2 以降の Batch 投入はここでは行わない。完了トリガに一本化することで、未着手ユーザーへの無駄な Batch 課金を避ける

---

## Phase 5 — Edge Function `lessons-generate` + `chat-send`(本文 + AIアシスタント)

**ゴール**: その日のレッスンを開くと本文が自動生成され、画面下部の AIアシスタントとチャットできる。

### 5a. レッスン本文生成

- `supabase/functions/lessons-generate/index.ts`(本文生成 Edge Function、Realtime のみ。Batch ロジックは持たない):
  - 入力: `{ lesson_id: string }`
  - 認可: ユーザー文脈クライアントで `lessons → courses` を SELECT し、RLS により他人の行は自然に弾かれる(`user_id = auth.uid()` を明示するまでもなく RLS ポリシーで担保)
  - `body IS NOT NULL` なら即返却。NULL なら下記の Realtime 生成へ
  - **呼ばれるケース**:
    - **新規コース作成直後の Day 1 生成**(Create.tsx が `courses-generate` の直後に叩く)
    - 深夜完了 → 翌朝 6 時前に翌日レッスンを開いたとき(Batch まだ取り込まれていない)
    - Batch / Zod 検証が失敗 → 6 時 cron で `prefetch_batch_id` をクリアされた行の初回オープン
    - 何らかの理由で `body IS NULL` のまま残ったレッスンの開封
  - **生成コンテキスト(品質担保のため必須)**:
    - `courses.{field, goal, prerequisite}` … トーン・深さの校正
    - そのコースの **全30件の `(day, title, summary)`** … 学習アーク全体を Claude に見せ、前後 Day との重複や矛盾を避ける
    - 当該レッスン自身の `(day, title, summary)` を「これから書く対象」として強調
    - **few-shot 例 2〜3 件**(良質な `LessonBody` JSON)… `==highlight==` 記法の維持・block 構成・トーン統一に最も効く。schema 単独では教えきれない「良い paragraph / 良い tip」を例示する
    - 静的部分(システムプロンプト + スキーマ説明 + few-shot + コース30件リスト)は `cache_control` で 5 分キャッシュ対象。retry / 連続生成でキャッシュヒットすれば input コストが約 1/10
    - 過去 body の引き渡しは現時点では行わない(コストが約 10 倍になるため)。アーク逸脱が問題化したら 5a の段階で再検討
  - **単段生成**(`db-schema.md` 通り):
    1. Opus 4.7 + extended thinking + `save_lesson` Tool Use(input_schema は Zod から `zod-to-json-schema`、`tool_choice` で強制)で `LessonBody` JSON を直接出力
    2. Zod 検証 → NG なら **具体的なエラー内容**(`error.issues` を文字列化)を渡して 1 回だけ再生成
  - service_role で `lessons.body` UPDATE(**`WHERE body IS NULL`** でレース対策)、`generated_at = now()`、`prefetch_batch_id = NULL`
  - **品質測定**: 50 件単位で生成結果をサンプリング。`==highlight==` の使用密度・block 種別の分布・トーン一貫性を確認。実測で劣化が見えた時のみ 2 段階構成への切替を検討(現時点では未実証の不安に恒久コストを払わない方針)

- **翌日レッスンの事前生成(Batch API)**:
  - **追加マイグレーション**: `lessons` に `prefetch_batch_id text` / `prefetch_submitted_at timestamptz` を追加(`db-schema.md` 参照)
  - `supabase/functions/lessons-prefetch-next/index.ts`(クライアントが `markLessonComplete` 成功後に `supabase.functions.invoke('lessons-prefetch-next', ...)` で起動):
    - 入力: `{ lesson_id: string }`(完了したレッスンの ID)
    - 認可: ユーザー文脈クライアントで RLS 越しに行を読み、本人のレッスンであることを担保
    - 発火条件(全て満たす場合のみ Batch 投入):
      - 完了レッスンの `day` がコース内の **完了済み最大 day** と一致(=フロンティアを進めた完了)
      - `day + 1 ≤ 30`
      - 翌日レッスンが `body IS NULL` かつ `prefetch_batch_id IS NULL`
    - Anthropic Batch API に 1 件投入(プロンプトは Realtime と同一)、`prefetch_batch_id` / `prefetch_submitted_at` を service_role クライアントで UPDATE
  - `supabase/functions/prefetch-pull/index.ts`(**毎朝 06:00 JST = `0 21 * * *` UTC** に Supabase pg_cron から起動):
    - `pg_cron` で `0 21 * * *` のジョブを定義し、`pg_net.http_post` で当 Edge Function を service_role JWT 付きで叩く(マイグレーションに含める)
    - `lessons WHERE prefetch_batch_id IS NOT NULL AND body IS NULL` を全件取得
    - 各行について Anthropic Batch API で結果取得:
      - 完了 + Zod OK → `body` 保存(`WHERE body IS NULL`)、`generated_at = now()`、`prefetch_batch_id = NULL`
      - 未完了 / 失敗 / Zod NG → `prefetch_batch_id = NULL` にして諦める(=以降の開封で Realtime が走る)
    - シンプル運用方針: **6 時に間に合わなかった Batch は破棄**(深夜完了の取りこぼしは Realtime で吸収)
  - コスト効果: Batch は通常価格の 50%。継続率の高いユーザーほど多くのレッスンが Batch 経路でヒットし、コース 1 本あたり最大 ~$7 ぶんが ~$3.5 まで縮む
- `src/lib/lessonBody.ts`: `LessonBody` の Zod スキーマ(AI 側と単一ソース)
- `src/screens/Article.tsx`: `body IS NULL` なら `supabase.functions.invoke('lessons-generate', { body: { lesson_id } })` を呼び、完了したら `<LessonRenderer>` で描画
- `<LessonRenderer>`: `hero.visual` で分岐、`points` を3点枠、`blocks` を順番通りに `<Paragraph>` / `<TipBox>` / `<ActionBox>` へ振り分け

### 5b. AIアシスタント

- `0003_chat.sql`: `chat_messages` + RLS(EXISTS ポリシー)
- `supabase/functions/chat-send/index.ts`
  - 入力: `{ lesson_id: string, content: string }`
  - ユーザー文脈クライアントで RLS 越しに `lessons` を読み、本人のレッスンであることを担保
  - `chat_messages` にユーザー発言を INSERT(ユーザー文脈クライアントで OK、RLS が自分の行のみ INSERT を許可)
  - 過去メッセージ + そのレッスンの `body` をコンテキストにして Claude へ
  - アシスタント返答は service_role クライアントで INSERT し、レスポンスで返す
- `src/screens/Chat.tsx`: モックを `chat_messages` の Supabase Realtime 購読に置換し、送信は `supabase.functions.invoke('chat-send', ...)`

**受け入れ条件**
- レッスンを初めて開くと `body` が生成され、リロードしても再生成されない
- 同じレッスンの会話文脈が引き継がれる
- 別ユーザーのレッスン/チャットは API でも DB でも触れない

---

## Phase 6 — Stripe で無料/有料プラン制御

**ゴール**: 無料プランは 1 コースまで、有料プランは無制限。Account 画面からプラン切替ができる。

**やること**
- Stripe ダッシュボードで Product/Price を作成、`STRIPE_*` を `supabase secrets set` で Edge Function 環境変数へ
- `supabase/functions/billing-checkout/index.ts`: Checkout Session 発行(ユーザー文脈クライアントで `auth.uid()` を取得して `client_reference_id` に設定)
- `supabase/functions/billing-portal/index.ts`: Customer Portal リダイレクト
- `supabase/functions/billing-webhook/index.ts`: `checkout.session.completed` / `customer.subscription.deleted` で `profiles.plan` を `'paid'` / `'free'` に更新(service_role)。**JWT 検証はオフ**にする必要がある(Stripe からの Webhook には Supabase JWT が乗らない)。`supabase/config.toml` で `[functions.billing-webhook] verify_jwt = false` を設定し、Stripe 署名(`stripe-signature` ヘッダ)で改ざん検証
- `courses-generate` 側で「無料プランかつアクティブコースが既に 1 件」なら 402 を返す
- `Account.tsx`: 現在のプラン表示 + 「アップグレード」/「管理する」ボタン(`supabase.functions.invoke('billing-checkout' / 'billing-portal')`)

**受け入れ条件**
- カードテストモードで無料 → 有料 → 解約の往復が動く
- 無料プランで 2 コース目を作ろうとすると上限エラーが UI で出る
- Webhook 失敗時のリトライで状態が壊れない(冪等性: `event.id` を記録)

---

## 横断的にやること(各フェーズで気にする)

- **型同期**: `supabase gen types typescript` を Phase 2 から導入し、CI で diff チェック
- **マイグレーション**: 全て `supabase/migrations/` 配下に置き、`supabase db push` で適用
- **Edge Function デプロイ**: `supabase functions deploy <name>` で個別デプロイ。CI で `supabase/functions/` 配下の差分を検出して自動化
- **環境変数**:
  - フロント側(`.env.local` / Cloudflare Pages): `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` のみ。`.env.example` を常に最新に保つ
  - Edge Function 側: `supabase secrets set ANTHROPIC_API_KEY=... STRIPE_SECRET_KEY=...` で設定。`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` はランタイムで自動注入される(自分でセットしない)
- **エラーハンドリング**: Edge Function は常に `{ error: { code, message } }` 形式で返す。`supabase.functions.invoke` のエラーハンドリングはクライアント側で統一ラッパーを用意
- **観測**: Phase 4 以降は Supabase ダッシュボードの Edge Function ログ + Postgres ログで足りる想定。重くなったら検討

## やらないこと

- 自前のバックエンドサーバ(Express/Hono 等)を立てる
- Supabase の機能を BFF で再ラップする
- レッスン本文を自由 Markdown 文字列のまま保存する(構造化 JSON 必須)
- ユーザーの論理削除(`deleted_at`)
- マルチテナント化(`organizations` / `workspaces`)
- ストリーク等の派生値の列保持(SQL 関数で都度算出)
