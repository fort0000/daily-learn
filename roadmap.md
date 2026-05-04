# DailyLearn ロードマップ

現在のモックアップ状態からバックエンド完成までの段階的ロードマップ。各フェーズ末でリリース可能な状態を保つ(=デモ用 URL がいつでも動く)。

## アーキテクチャ全景

```
[ブラウザ (React SPA)]
   ├─ 静的アセット ──────▶ Cloudflare Pages
   ├─ Auth / DB / Storage ▶ Supabase  (anon key + RLS で直接アクセス)
   └─ AI / Webhook 等 ────▶ CF Pages Functions
                              ├─▶ Anthropic API (Claude)
                              └─▶ Stripe Webhook
```

- **Supabase**: 認証・データ永続化・進捗・チャット履歴。フロントから直接呼び出し RLS で守る
- **Pages Functions**: APIキーを隠したい処理だけ(AI生成・Stripe Webhook)。BFF 化させない
- **Pages 静的配信**: SPA 本体

自前のバックエンドサーバは立てない。

## 進捗サマリ

| Phase | 内容 | 状態 |
|---|---|---|
| 0 | モックアップを CF Pages に配信 | ✅ done |
| 1 | Vite + TypeScript + Tailwind 化 | ✅ done |
| 2 | Supabase Auth + `profiles` | 🚧 雛形のみ(クライアント, 型, schema doc) |
| 3 | `courses` + `lessons` スキーマ + 進捗表示 | ⏳ |
| 4 | `/api/courses/generate`(コース一括生成) | ⏳ |
| 5 | `/api/lessons/:id/generate` + `/api/chat`(本文 + AIアシスタント) | ⏳ |
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

## Phase 4 — `/api/courses/generate`(コース一括生成)

**ゴール**: Create 画面の「✨ コースを作成する」ボタンで、30 日分の `(title, summary)` が一括生成され `lessons` に書き込まれる。

**やること**
- `functions/api/courses/generate.ts`(CF Pages Functions)
  - 入力: `{ field, prerequisite?, goal }`
  - Supabase JWT を Authorization ヘッダから検証 → `user_id` 確定
  - Anthropic Claude Opus 4.7 を Tool Use で呼び、`save_course` ツール経由で構造化出力
    ```ts
    {
      title: string,
      lessons: Array<{ day: 1..30, title: string, summary: string }>  // 30件固定
    }
    ```
  - Zod で検証(30 件か、day が 1..30 で重複なしか)。NG なら 1 回だけリトライ
  - service_role キーで `courses` INSERT(`status='active'`)→ `lessons` × 30 を一括 INSERT
  - 完成した `course_id` を返す
- `src/screens/Create.tsx`: ボタン押下で `fetch('/api/courses/generate')` → 完了したらホームへ遷移
- 生成中は専用ローディング画面(15〜30秒級なので進捗表記必須)

**受け入れ条件**
- Create 画面の入力 → 30 件の `lessons` 行が生成され、ロードマップに即時反映
- `prerequisite` 未入力でも生成成功(Claude プロンプトで「未指定なら基礎から」を強制)
- 同じ入力で複数回叩いても 30 日のアークが一貫している(重複・順序破綻なし)

**設計メモ**
- **タイトル+概要を 30 日分まとめて作る**のは、Claude が学習アーク全体(基礎→応用→統合)を俯瞰しないと内容が重複・断片化するため
- 本文(`body`)はこの段階では生成しない(コスト・レイテンシ削減)

---

## Phase 5 — `/api/lessons/:id/generate` + `/api/chat`(本文 + AIアシスタント)

**ゴール**: その日のレッスンを開くと本文が自動生成され、画面下部の AIアシスタントとチャットできる。

### 5a. レッスン本文生成

- `functions/api/lessons/[id]/generate.ts`
  - 認可: `lesson → course → user_id = auth.uid()`
  - **2段階生成**(`db-schema.md` 通り):
    1. Opus 4.7 + extended thinking で Markdown ドラフト
    2. Sonnet 4.6 + `save_lesson` ツール(input_schema は Zod から `zod-to-json-schema`)で `LessonBody` JSON へ整形
    3. Zod 検証 → NG なら 1 回だけ再生成
  - service_role で `lessons.body` UPDATE、`generated_at = now()`
- `src/lib/lessonBody.ts`: `LessonBody` の Zod スキーマ(AI 側と単一ソース)
- `src/screens/Article.tsx`: `body IS NULL` なら生成 API 呼び出し → 完了したら `<LessonRenderer>` で描画
- `<LessonRenderer>`: `hero.visual` で分岐、`points` を3点枠、`blocks` を順番通りに `<Paragraph>` / `<TipBox>` / `<ActionBox>` へ振り分け

### 5b. AIアシスタント

- `0003_chat.sql`: `chat_messages` + RLS(EXISTS ポリシー)
- `functions/api/chat/lessons/[lessonId]/send.ts`
  - 入力: `{ content: string }`
  - 認可確認後、`chat_messages` にユーザー発言を INSERT
  - 過去メッセージ + そのレッスンの `body` をコンテキストにして Claude へ
  - アシスタント返答を service_role で INSERT し、レスポンスで返す
- `src/screens/Chat.tsx`: モックを `chat_messages` ストリームに置換

**受け入れ条件**
- レッスンを初めて開くと `body` が生成され、リロードしても再生成されない
- 同じレッスンの会話文脈が引き継がれる
- 別ユーザーのレッスン/チャットは API でも DB でも触れない

---

## Phase 6 — Stripe で無料/有料プラン制御

**ゴール**: 無料プランは 1 コースまで、有料プランは無制限。Account 画面からプラン切替ができる。

**やること**
- Stripe ダッシュボードで Product/Price を作成、`STRIPE_*` を CF 環境変数へ
- `functions/api/billing/checkout.ts`: Checkout Session 発行
- `functions/api/billing/portal.ts`: Customer Portal リダイレクト
- `functions/api/billing/webhook.ts`: `checkout.session.completed` / `customer.subscription.deleted` で `profiles.plan` を `'paid'` / `'free'` に更新(service_role)
- `/api/courses/generate` 側で「無料プランかつアクティブコースが既に 1 件」なら 402 を返す
- `Account.tsx`: 現在のプラン表示 + 「アップグレード」/「管理する」ボタン

**受け入れ条件**
- カードテストモードで無料 → 有料 → 解約の往復が動く
- 無料プランで 2 コース目を作ろうとすると上限エラーが UI で出る
- Webhook 失敗時のリトライで状態が壊れない(冪等性: `event.id` を記録)

---

## 横断的にやること(各フェーズで気にする)

- **型同期**: `supabase gen types typescript` を Phase 2 から導入し、CI で diff チェック
- **マイグレーション**: 全て `supabase/migrations/` 配下に置き、`supabase db push` で適用
- **環境変数**: `.env.example` を常に最新に保つ。`SUPABASE_SERVICE_ROLE_KEY` / `ANTHROPIC_API_KEY` / `STRIPE_*` は CF Pages のみ(ブラウザに露出させない)
- **エラーハンドリング**: API ルートは常に `{ error: { code, message } }` 形式で返す
- **観測**: Phase 4 以降は CF Pages Functions のログだけで足りる想定。重くなったら検討

## やらないこと

- 自前のバックエンドサーバ(Express/Hono 等)を立てる
- Supabase の機能を BFF で再ラップする
- レッスン本文を自由 Markdown 文字列のまま保存する(構造化 JSON 必須)
- ユーザーの論理削除(`deleted_at`)
- マルチテナント化(`organizations` / `workspaces`)
- ストリーク等の派生値の列保持(SQL 関数で都度算出)
