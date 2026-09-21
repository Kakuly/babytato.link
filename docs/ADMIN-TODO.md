# tato admin — 実装 TODO

個人用チェックリスト。詳細手順は [`SETUP-AUTH.md`](./SETUP-AUTH.md) を参照。

| 項目 | 値 |
|------|-----|
| 推奨 URL | `https://manage.babytato.link/` |
| 従来 URL | `https://babytato.link/admin/` |
| リポジトリ | `kakuly/babytato.link` |

---

## 1. Done（コード済み）

- [x] ログイン画面 `/admin/login/`（白黒ミニマル UI）
- [x] ダッシュボード `/admin/`（セッション表示・ログアウト）
- [x] Pages Functions: `/api/admin/login` · `/api/admin/session` · `/api/admin/logout`
- [x] HMAC 署名セッション Cookie（`tato_admin_session` · `.babytato.link` 共有）
- [x] 2 アカウント対応（`ADMIN_USER_1/2` + `ADMIN_PASS_1/2`）
- [x] `manage.babytato.link` ホストベースルーティング（`functions/_middleware.ts`）
- [x] クライアント側 admin URL 解決（`src/lib/admin-paths.ts`）
- [x] `wrangler.toml` · `pages:dev` スクリプト
- [x] セットアップ手順書 `docs/SETUP-AUTH.md`

---

## 2. あなたがやること（Cloudflare / Dashboard）

### 2-1. シークレット・パスワード準備

- [ ] `SESSION_SECRET` を生成（`openssl rand -base64 32`）
- [ ] slot 1（kakuly）の初期パスワードを決める
- [ ] （後日）slot 2（tato）の初期パスワードを決める
- [ ] GitHub PAT 作成（Contents Read/Write · `kakuly/babytato.link`）→ 編集 API 用

### 2-2. Cloudflare Pages 環境変数

Dashboard → **Workers & Pages** → **`babytato-link`** → **Settings** → **Environment variables**  
**Production** と **Preview** の両方に設定。

#### slot 1 — kakuly（今すぐ設定）

| 変数 | 値 | 必須 |
|------|-----|------|
| `ADMIN_USER_1` | `kakuly` | ✓ |
| `ADMIN_PASS_1` | （強めのパスワード） | ✓ |
| `ADMIN_EMAIL_1` | `sqkibana87@gmail.com` | 2FA 実装後 ✓ |
| `SESSION_SECRET` | 手順 2-1 で生成 | ✓ |
| `GITHUB_TOKEN` | GitHub PAT | 編集 API 用（推奨） |
| `GITHUB_REPO` | `kakuly/babytato.link` | 省略可 |
| `GITHUB_BRANCH` | `main` | 省略可 |

#### slot 2 — tato（後日追加）

| 変数 | 値 | 必須 |
|------|-----|------|
| `ADMIN_USER_2` | `tato` | ✓ |
| `ADMIN_PASS_2` | （別の強めのパスワード） | ✓ |
| `ADMIN_EMAIL_2` | （tato のメール） | 2FA 実装後 ✓ |

#### 2FA 実装後に追加（Resend + KV）

| 変数 | 値 | 必須 |
|------|-----|------|
| `RESEND_API_KEY` | Resend ダッシュボードから取得 | ✓ |
| `RESEND_FROM` | 例: `tato admin <noreply@babytato.link>` | ✓ |
| KV バインディング | 名前: `ADMIN_OTP`（OTP 一時保存） | ✓ |

- [ ] 上記 env vars を Cloudflare に登録
- [ ] **Save** → 再デプロイ（または main push）

### 2-3. Resend セットアップ（2FA 実装後）

- [ ] [Resend](https://resend.com/) でアカウント作成
- [ ] API Key 発行 → `RESEND_API_KEY`
- [ ] 送信ドメイン `babytato.link` を verify（DNS レコード追加）
- [ ] 送信元アドレスを決めて `RESEND_FROM` に設定

### 2-4. デプロイ

- [ ] 変更を main に push（Cloudflare Pages 自動ビルド）
- [ ] Deployments で `functions/` 込みで成功しているか確認

### 2-5. カスタムドメイン `manage.babytato.link`

- [ ] Pages プロジェクト → **Custom domains** → `manage.babytato.link` を追加
- [ ] DNS: **`manage`** CNAME → **`babytato-link.pages.dev`**（Proxied）
- [ ] SSL/TLS が **Active** になるまで待つ

### 2-6. 本番ログイン確認

- [ ] `https://manage.babytato.link/` を開く
- [ ] `kakuly` / `ADMIN_PASS_1` でログイン → ダッシュボード表示
- [ ] logout でログイン画面に戻る
- [ ] （任意）`babytato.link/admin/` でも同セッションが使えるか確認

### 2-7. ローカル検証（任意）

```bash
cp .dev.vars.example .dev.vars   # slot 1 を kakuly に合わせて編集
bun run build && bun run pages:dev
```

- [ ] `http://127.0.0.1:8788/admin/login/` でログイン確認

### 2-8. Cloudflare Access（スキップ可）

外側のメール PIN 保護。**今回は省略**（Resend OTP 2FA をアプリ内で実装予定）。

- [ ] ~~Zero Trust Access で `manage.babytato.link` を保護~~（不要ならチェック不要）

---

## 3. To implement（コード — 未着手）

### Phase A — メール OTP 2FA（Resend + KV）

- [ ] `ADMIN_EMAIL_1` / `ADMIN_EMAIL_2` を env 型に追加
- [ ] Cloudflare KV バインディング（`ADMIN_OTP`）を `wrangler.toml` に追加
- [ ] OTP 生成・保存・検証ロジック（有効期限 10 分 · 試行回数制限）
- [ ] Resend 経由で OTP メール送信 API
- [ ] ログインフロー変更: パスワード OK → OTP 入力画面 → セッション発行
- [ ] ログイン UI に OTP 入力ステップ追加
- [ ] `.dev.vars.example` に `ADMIN_EMAIL_*` · `RESEND_*` を追記

**想定フロー:** username/password → メールに 6 桁コード → 入力 → ダッシュボード

### Phase B — コンテンツ編集 API

- [x] GitHub Contents API でファイル read/write（`GITHUB_TOKEN` 使用）
- [x] SNS リンク: `src/data/social-links.json` · `/api/admin/content/links`
- [ ] 編集対象の整理:
  - [ ] `src/data/site.ts`（サイト情報）
  - [ ] `src/data/discography.json`（ディスコグラフィー）→ [`DISCOGRAPHY-TODO.md`](./DISCOGRAPHY-TODO.md)
  - [ ] `src/content/news/*.md`（ニュース）
- [ ] バリデーション · 競合検知（SHA） · commit メッセージ（links で部分実装済）

### Phase C — 管理 UI

- [x] links 編集（`/admin/links/` · manage ホストでは `/links/`）
- [ ] ダッシュボードの残りタイル
  - [ ] site info 編集フォーム
  - [ ] news 一覧 · 新規 · 編集（WYSIWYG）
  - [ ] discography 編集
- [x] 保存 → API → GitHub commit → Pages 再ビルドのフィードバック表示（links）

### Phase D — 運用・セキュリティ（任意）

- [ ] パスワードを平文 env から hash 保存へ移行（`ADMIN_PASS_*` → hash）
- [ ] レートリミット（login / OTP 送信）
- [ ] 監査ログ（誰がいつ何を編集したか）
- [ ] tato アカウント（slot 2）追加時の onboarding 手順を `SETUP-AUTH.md` に追記

---

## 4. 優先順位（おすすめ）

1. **今すぐ** — §2（env · デプロイ · manage ドメイン · ログイン確認）
2. **次** — Phase A（Resend OTP 2FA）
3. **その後** — Phase B → C（編集 API + UI）
4. **余裕があれば** — Phase D

---

## 5. 関連ファイル

| ファイル | 役割 |
|----------|------|
| `src/pages/admin/login.astro` | ログイン UI |
| `src/pages/admin/index.astro` | ダッシュボード |
| `functions/api/admin/` | login / session / logout |
| `functions/_middleware.ts` | manage ホストルーティング |
| `functions/lib/admin-users.ts` | アカウント照合 |
| `functions/lib/session.ts` | セッション Cookie |
| `.dev.vars.example` | ローカル env テンプレート |
| `docs/SETUP-AUTH.md` | 詳細セットアップ手順 |
