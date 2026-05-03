# DailyLearn 開発方針

## アーキテクチャ

```
[ブラウザ (React SPA)]
   ├─ 静的アセット ──────▶ Cloudflare Pages
   ├─ Auth / DB / Storage ▶ Supabase  (anon key + RLS で直接アクセス)
   └─ AI / Webhook 等 ────▶ CF Pages Functions
                              ├─▶ Anthropic API (Claude)
                              └─▶ Stripe Webhook
```

役割分担:

- **Supabase**: 認証・データ永続化・進捗・チャット履歴。フロントから直接呼び出し、RLS で守る
- **Pages Functions**: APIキーを隠したい処理だけ(AI生成・Stripe Webhook)。BFF 化させない
- **Pages 静的配信**: SPA本体

自前のバックエンドサーバは立てない。

## 技術スタック

- **ビルド**: Vite + React (現 Babel-in-browser からの移行)
- **スタイル**: Tailwind CSS。既存の `DL` パレットを `tailwind.config` の theme に移植してトークン化
- **言語**: TypeScript (Phase 1 で `.jsx` → `.tsx` に切り替え)
- **DB**: Supabase Postgres + RLS
- **認証**: Supabase Auth (email/password)
- **AI**: Anthropic Claude (claude-opus-4-7 / claude-sonnet-4-6)
- **課金**: Stripe Checkout + Customer Portal

## 移行フェーズ

各フェーズ末尾でリリース可能な状態を保つ。

| Phase | 内容 | ゴール |
|---|---|---|
| 0 | 現状モックアップを CF Pages に載せる | 公開URLで見られる |
| 1 | Vite 化 + TypeScript 化 + Tailwind 導入 + `DL` トークン移植 | 本番品質ビルド + 型 + スタイル統一 |
| 2 | Supabase Auth 接続 / `profiles` テーブル | account 画面が実機能化 |
| 3 | `courses` / `lessons` / `lesson_progress` を実 DB へ + Supabase 型自動生成 (`supabase gen types`) | home の進捗が実データ + DB スキーマと型の同期 |
| 4 | `/api/courses/generate` (AIコース生成) | create 画面が実機能化 |
| 5 | `/api/lessons/:id/generate` + `/api/chat` | レッスン記事 + AIコーチ稼働 |
| 6 | Stripe で無料/有料プラン制御 | 課金開始 |

## Supabase スキーマ(初期)

```sql
profiles        (id, display_name, plan, current_streak,
                 longest_streak, last_active_date)
courses         (id, user_id, field, level, goal, title,
                 status, started_at)
lessons         (id, course_id, day, title, summary,
                 body_md, status, generated_at)
                -- (course_id, day) UNIQUE
lesson_progress (user_id, lesson_id, completed_at)  -- PK 複合
chat_threads    (id, user_id, lesson_id)
chat_messages   (id, thread_id, role, content, created_at)
badges, user_badges
```

全テーブル RLS ON。`user_id = auth.uid()` を強制。
ストリーク更新は Postgres 関数 + トリガで DB 側に持たせる。

## Pages Functions エンドポイント

| メソッド | パス | 役割 |
|---|---|---|
| POST | `/api/courses/generate` | 入力 → Claude で30レッスン分のメタ生成 → DB INSERT |
| POST | `/api/lessons/:id/generate` | 当該レッスンの本文を on-demand 生成 |
| POST | `/api/chat/:threadId/send` | ユーザー発言保存 → Claude ストリーム応答 (SSE) |
| POST | `/api/stripe/webhook` | 課金イベントで `profiles.plan` 更新 |

(任意) Cron Trigger で翌日レッスンを夜間先行生成。

## スタイル移行ルール (Tailwind)

1. **トークン**: `DL` パレットを `tailwind.config.ts` の `theme.extend.colors` へ。色のベタ書き禁止
2. **共通部品優先**: `shared.jsx` の `PushButton` / `Sidebar` / `TabBar` から先に置換
3. **画面は1つずつ書き換え**: 1画面=1PR
4. **動的スタイルは `style` で OK**: 計算値 (`translateX(${shift}px)` 等) は無理に Tailwind に寄せない
5. **`<style>` ブロックの内容**(`@media`, `:hover`, `@keyframes`)も Tailwind に統合し、スタイルを 1 箇所に集約

## 環境変数

| キー | 場所 | 用途 |
|---|---|---|
| `VITE_SUPABASE_URL` | フロント | Supabase 接続 |
| `VITE_SUPABASE_ANON_KEY` | フロント | RLS 経由クライアント |
| `ANTHROPIC_API_KEY` | Functions | Claude 呼び出し |
| `SUPABASE_SERVICE_ROLE_KEY` | Functions | 管理者権限の DB 操作 |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Functions | 課金 |

`VITE_` プレフィックス無しの値はフロントに露出しない。混同注意。

## ドメイン用語(再掲・UI文言の統一基準)

- **コース**: 30日間の学習プログラム全体(「プラン」とは呼ばない)
- **レッスン**: 1日分の学習コンテンツ
- **AIコーチ**: チャット相手の AI(略称「コーチ」)
- **無料プラン / 有料プラン**: 課金プランの場合のみ「プラン」を使う

## やらないことリスト

- 自前バックエンドサーバ (Express / Hono など) を立てる
- Next.js への移行(全画面が認証後で SSR の恩恵が薄いため)
- スタイル移行と機能追加を同 PR で混ぜる
- RLS を後から有効化する(テーブル作成と同時に必ず ON)
- 1画面ずつ厳守を破って複数画面を一気に DB 接続に書き換える
