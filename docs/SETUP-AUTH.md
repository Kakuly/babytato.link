# tato admin 認証セットアップ

nondesu の「おもちゃ箱 admin」と同じ方式: **ユーザー名/パスワード → HttpOnly セッション Cookie**（Cloudflare Pages Functions）。

| 項目 | 値 |
|------|-----|
| ログイン URL（推奨） | `https://manage.babytato.link/` |
| ログイン URL（従来） | `https://babytato.link/admin/login/` |
| ダッシュボード（推奨） | `https://manage.babytato.link/`（ログイン後） |
| ダッシュボード（従来） | `https://babytato.link/admin/` |
| API | `/api/admin/login` · `/api/admin/session` · `/api/admin/logout` |

---

## エージェントが実装済み（あなたがやる必要なし）

- `/admin/login/` ログイン画面（白黒ミニマル UI）
- `/admin/` ダッシュボード（セッション確認・ログアウト）
- Cloudflare Pages Functions（login / session / logout）
- HMAC 署名セッション Cookie（`tato_admin_session`）
- 2 アカウント対応（`ADMIN_USER_1` / `ADMIN_PASS_1` など）
- `wrangler.toml` · `pages:dev` スクリプト
- **`manage.babytato.link`** 用ホストベースルーティング（`functions/_middleware.ts`）
- セッション Cookie を **`.babytato.link`** で共有（manage ↔ 本番 `/admin` 両方で有効）

---

## Cloudflare Pages ビルド + GitHub Actions デプロイ

**構成:** Worker Builds = **ビルドのみ** · **本番反映 = GitHub Actions**（`.github/workflows/deploy.yml`）

### Worker Builds（Dashboard — ビルドだけ）

Dashboard → **Workers & Pages** → **`babytato-link`** → **Settings** → **Build**:

| 項目 | 正しい値 |
|------|----------|
| **Build command** | `bun run build` |
| **Build output directory** | `dist` |
| **Deploy command** | **`true`** |
| **Build token** | Dashboard の **Build token** ドロップダウンのみ（Git 連携用） |

**Build 環境変数に `CLOUDFLARE_API_TOKEN` を置かないでください。**

Build env に `CLOUDFLARE_API_TOKEN` があると **Build token を上書き**し、`wrangler whoami` が **left organization** 等のエラーになります。

**Deploy command `true` について**

- **`true`** = シェルの no-op（成功終了するだけ）。Worker Builds 単体では **`dist/` を本番に載せない**
- これは **意図した設定**。本番反映は下記 **GitHub Actions** が担当
- Deploy command に `bun run pages:deploy` や `npx wrangler deploy` を入れると、Build env のトークン問題や **Authentication error [code: 10000]** のループになりやすい

**Deploy command に `npx wrangler deploy` が入っているとデプロイが失敗します。**  
`wrangler deploy` は Workers 用です。Pages では `wrangler pages deploy` を使います。

### GitHub Actions（本番デプロイ）

`main` への push で `.github/workflows/deploy.yml` が実行されます:

1. `bun install --frozen-lockfile` → `bun run build`
2. `cloudflare/wrangler-action@v3` で `pages deploy dist --project-name=babytato-link --branch=main`

**GitHub リポジトリ Secrets（一度だけ設定 — 下記手順 0）**

| Secret | 値 |
|--------|-----|
| `CLOUDFLARE_API_TOKEN` | Pages Edit 権限の API トークン（下記チェックリスト） |
| `CLOUDFLARE_ACCOUNT_ID` | `4d3287a19985d6acc5d19bacf2178d24` |

設定場所: GitHub リポジトリ **`kakuly/babytato.link`** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

> Pages Dashboard の **Environment variables** に `CLOUDFLARE_API_TOKEN` を入れる必要はありません（admin 用の `ADMIN_*` / `SESSION_SECRET` 等は従来どおり Pages 側）。

### API トークン `babytato-link-pages-deploy`（GitHub Secret / 手動 deploy 用）

[Cloudflare Dashboard → My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → **Create Custom Token**

| 項目 | 設定値 |
|------|--------|
| **Token name** | `babytato-link-pages-deploy` |
| **Account resources** | **Include** → **Specific account** → 対象アカウント（Account ID `4d3287a19985d6acc5d19bacf2178d24` のアカウント） |
| **Zone resources** | **All zones** または **All zones from an account**（Pages deploy 単体では Zone 権限は通常不要。カスタムトークン UI で必須なら上記） |
| **Client IP / TTL** | 任意（未設定で可） |

**Permissions（チェックリスト — すべて必要）**

| Permission group | 権限 | 用途 |
|------------------|------|------|
| **Account** | **Cloudflare Pages** → **Edit** | `wrangler pages deploy` — デプロイ作成・アップロード（[Cloudflare CI ドキュメント](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/) の必須権限） |
| **Account** | **Cloudflare Pages** → **Read** | Edit と別行で出る UI では **Read も付与**（Edit のみテンプレートでも可だが、Read 欠落で API が拒否される報告あり） |
| **User** | **User Memberships** → **Read** | `wrangler whoami` — アカウント一覧の取得 |
| **User** | **User Details** → **Read** | Memberships Read の代替（[wrangler 非対話 CI](https://developers.cloudflare.com/workers/wrangler/ci-cd/) ではどちらか一方で可。両方付与が無難） |
| **Account** | **Account Settings** → **Read** | アカウント解決・検証（[workers-sdk #](https://github.com/cloudflare/workers-sdk/issues) で whoami 成功後 deploy 失敗時の追加権限として言及されることがある） |

**付けない権限（Pages Git デプロイだけなら不要）**

- **Workers Scripts** Edit — Workers 用。Pages デプロイには不要（Deploy command に `wrangler deploy` を入れると別エラーになる）
- **Account Workers Scripts** 等 — 同上

**Dashboard テンプレートとの違い**

「Edit Cloudflare Workers」テンプレートは **Workers** 向け。Pages 用には上記カスタムトークンを使う。

**GitHub Secrets への反映**

1. トークンを再作成したら **値は作成時一度だけ**表示 — リポジトリやチャットに貼らない
2. GitHub → **`kakuly/babytato.link`** → **Settings** → **Secrets and variables** → **Actions**
3. **`CLOUDFLARE_API_TOKEN`** を作成または更新（Pages Edit 権限のトークン）
4. **`CLOUDFLARE_ACCOUNT_ID`** = `4d3287a19985d6acc5d19bacf2178d24`（未設定なら追加）
5. main に push → **Actions** タブで **Deploy to Cloudflare Pages** が成功するか確認

**Pages Dashboard 側:** Build env に **`CLOUDFLARE_API_TOKEN` が残っていれば削除** · Deploy command = **`true`**

**ローカル検証（任意）**

```bash
export CLOUDFLARE_API_TOKEN='（Dashboard で新規作成したトークン）'
export CLOUDFLARE_ACCOUNT_ID='4d3287a19985d6acc5d19bacf2178d24'
wrangler whoami          # Super Admin 等が表示されれば User 系 OK
bun run build && bun run pages:deploy   # Pages API まで通るか確認
```

> wrangler **4.40** には `pages deploy` 用の `--account-id` フラグは**ありません**。Cloudflare **Pages** の CI では **`CLOUDFLARE_ACCOUNT_ID` 環境変数のみ**（`wrangler.toml` の `account_id` は Pages 設定でサポートされずデプロイが失敗する）。

**プロジェクト名 `babytato-link` について**

- API が **`Authentication error [code: 10000]`**（`/accounts/.../pages/projects/babytato-link`）→ トークンは有効だが **Pages 権限または Account resources のスコープ不足**の可能性が高い。**Not found / Could not find project** ではないので、プロジェクト自体は存在していると考えてよい
- 念のため Dashboard → **Workers & Pages** でプロジェクト名が **`babytato-link`**（`package.json` の `pages:deploy` と一致）か確認。別名（例: `babytato.link`）なら `--project-name` を合わせる

`pages:deploy` スクリプト（手動デプロイ用）:

```text
rm -rf node_modules/.cache/wrangler 2>/dev/null; wrangler pages deploy dist --project-name=babytato-link --branch=main --commit-dirty=true
```

設定変更後: main に push（GitHub Actions が本番反映）· Worker Builds はビルド確認用

---

## あなたがやること（順番どおり）

### 0. GitHub Actions 用 Secrets を設定（本番デプロイ — 最初に）

1. [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) で下記 **`babytato-link-pages-deploy`** チェックリストのトークンを作成
2. GitHub → **`kakuly/babytato.link`** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
3. 次の 2 つを追加:

| Secret | 値 |
|--------|-----|
| `CLOUDFLARE_API_TOKEN` | 手順 1 の API トークン（Pages Edit） |
| `CLOUDFLARE_ACCOUNT_ID` | `4d3287a19985d6acc5d19bacf2178d24` |

4. Cloudflare Pages → **`babytato-link`** → **Settings** → **Build** で Deploy command = **`true`** · Build env に **`CLOUDFLARE_API_TOKEN` が無い**ことを確認

### 1. GitHub Personal Access Token を作成

1. [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. **Fine-grained token**（推奨）または **Classic token** を新規作成
3. 対象リポジトリ: **`kakuly/babytato.link`**
4. 権限: **Contents — Read and write**
5. 生成されたトークン（`ghp_...` または `github_pat_...`）を控える

> 将来コンテンツ編集 API を追加したときに GitHub commit 用。今すぐログインだけ試すなら省略可（ただし本番では設定推奨）。

### 2. セッション署名用シークレットを生成

ターミナルで:

```bash
openssl rand -base64 32
```

出力された文字列を `SESSION_SECRET` として使う（32 文字以上推奨）。

### 3. 初期パスワードを決める

2 アカウント分（例）:

| 変数 | 例 | 用途 |
|------|-----|------|
| `ADMIN_USER_1` | `tato` | tato 本人 |
| `ADMIN_PASS_1` | （強めのパスワード） | 上記のパスワード |
| `ADMIN_USER_2` | `kakuly` | 運用者 |
| `ADMIN_PASS_2` | （別の強めのパスワード） | 上記のパスワード |

### 4. Cloudflare Pages に環境変数を設定

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages**
2. プロジェクト **`babytato-link`**（または babytato.link に接続した Pages プロジェクト）を開く
3. **Settings** → **Environment variables**
4. **Production** と **Preview** の両方に以下を追加:

| 名前 | 値 | 必須 |
|------|-----|------|
| `ADMIN_USER_1` | 例: `tato` | ✓ |
| `ADMIN_PASS_1` | 初期パスワード | ✓ |
| `ADMIN_USER_2` | 例: `kakuly` | ✓ |
| `ADMIN_PASS_2` | 初期パスワード | ✓ |
| `SESSION_SECRET` | 手順 2 で生成した文字列 | ✓ |
| `GITHUB_TOKEN` | 手順 1 の PAT | 編集 API 用（推奨） |
| `GITHUB_REPO` | `kakuly/babytato.link` | 省略可（デフォルト同値） |
| `GITHUB_BRANCH` | `main` | 省略可 |

5. **Save** → 再デプロイ（main に push 済みなら自動、未反映なら **Retry deployment**）

### 4b. News 用 D1 / R2（即時公開）

お知らせ**本文**は GitHub ではなく **D1**。admin で保存した時点で `GET /api/news` が新内容を返し、ホームは再デプロイなしで更新されます。links / discography / お問い合わせ webhook は従来どおり。

`wrangler.toml` に D1 枠は入れてあります。**R2 `MEDIA` はバケット未作成だと Function publish が失敗するため、既定ではコメントアウト**（画像は GitHub `public/news/` フォールバック）。本番では Dashboard で実リソースを接続してください（リモート `d1 create` は `CLOUDFLARE_API_TOKEN` があれば実行可。無ければ Dashboard から作れます）。

```bash
npx wrangler d1 create babytato-news
# R2 を使うときだけ:
npx wrangler r2 bucket create babytato-news-media
```

1. `wrangler d1 create` が出す **database_id** を `wrangler.toml` の `[[d1_databases]]` に貼る（ローカル用プレースホルダ `00000000-0000-4000-8000-000000000001` を差し替え）
2. Dashboard → **Workers & Pages** → **`babytato-link`** → **Settings** → **Bindings**
   - **D1**: 変数名 `DB` → データベース `babytato-news`
   - **R2（任意）**: バケット作成後、`wrangler.toml` の `[[r2_buckets]]` をアンコメントし、変数名 `MEDIA` → `babytato-news-media` を接続
3. Production / Preview の両方に付ける
4. スキーマは Function が初回リクエストで `CREATE TABLE IF NOT EXISTS`（空 DB なら `src/content/news/*.md` 相当をシード）
5. 任意: `npx wrangler d1 execute babytato-news --file=migrations/0001_posts.sql --remote`

**ローカル:** `bun run build && bun run pages:dev`（`:8788`）。`wrangler.toml` のプレースホルダ ID のままでも miniflare がローカル D1 を立てます。ホームを `bun run dev`（`:4322`）で見る場合は、`/api/news` が Vite proxy 経由で `:8788` に届くので **pages:dev も同時起動**してください（SITE iframe も同様）。

**画像:** `MEDIA` があれば R2 → `GET /api/news/media/:key`（デプロイ不要）。未接続なら GitHub `public/news/`（こちらは Pages 再ビルドが走る）。

`GITHUB_TOKEN` は **news 本文の保存には不要**（links / discography / GitHub 画像フォールバック用）。

### 5. コードをデプロイ

```bash
cd babytatolink
git add .
git commit -m "your message"
git push origin main
```

- **GitHub Actions** が `bun run build` → `wrangler pages deploy` で **`dist/` + `functions/`** を本番反映
- **Worker Builds** は同じ push で `bun run build` のみ実行（Deploy command **`true`**）

### 6. manage.babytato.link を Cloudflare に接続

同じ Pages プロジェクト（`babytato-link`）に **追加カスタムドメイン** として `manage.babytato.link` を割り当てます。コード側のルーティングは実装済みです。

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → プロジェクト **`babytato-link`** を開く
2. **Custom domains** → **Set up a custom domain**
3. **`manage.babytato.link`** を入力 → **Continue**
4. Cloudflare が DNS を案内するので、**babytato.link ゾーン**側で次を確認:
   - 自動追加される場合: レコード **`manage`** · 種別 **CNAME** · 値 **`babytato-link.pages.dev`**（または表示された Pages ターゲット）
   - 手動の場合: **DNS** → **Records** → **Add record**
     - Type: **CNAME**
     - Name: **`manage`**
     - Target: **`babytato-link.pages.dev`**（Pages の Custom domains 画面に表示される値）
     - Proxy status: **Proxied**（オレンジ雲）
5. **SSL/TLS** → **Overview** で **`manage.babytato.link`** が **Active** になるまで数分待つ（通常 1〜15 分）
6. コードを main に push 済みなら再デプロイ不要。未反映なら **Deployments** → 最新 → **Retry deployment**

**動作:**

| URL | 結果 |
|-----|------|
| `https://manage.babytato.link/` | 未ログイン → ログイン画面 / ログイン後 → ダッシュボード |
| `https://manage.babytato.link/about/` 等 | `/` へリダイレクト（公開ページは表示しない） |
| `https://babytato.link/admin/login/` | 従来どおり利用可（Cookie 共有） |

### 7. 本番でログイン確認

1. ブラウザで **`https://manage.babytato.link/`** を開く（または `https://babytato.link/admin/login/`）
2. `ADMIN_USER_1` / `ADMIN_PASS_1` で **enter**
3. ダッシュボードに遷移し、「`tato logged in`」等が表示されれば OK
4. **logout** でログイン画面に戻ることを確認
5. （任意）`babytato.link/admin/` でも同じセッションが使えることを確認

### 8. （推奨）Cloudflare Access で二段階保護

admin はサイト書き換え権限に直結するため、**Zero Trust Access** で外側からも保護することを推奨（nondesu と同様）。

**manage サブドメインのみ守る場合（推奨）:**

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Access** → **Applications** → **Add an application**
2. 種類: **Self-hosted**
3. Application domain: **`manage.babytato.link`**（Path は空 = サブドメイン全体）
4. **Policy**: tato / 運用者の **メールアドレス** のみ **Allow**
5. **Identity providers**: **One-time PIN**（メール）を有効化

**従来パスも含めて守る場合:**

- 追加アプリまたは同一ポリシーで `babytato.link` · Path: `/admin` および `/api/admin`

流れ: **メール PIN（Access）** → **username/password（tato admin）** → 編集

---

## ローカル検証

`astro dev`（`:4322`）だけでは **Functions が動かない**。Pages 付きプレビューが必要:

```bash
bun install
cp .dev.vars.example .dev.vars   # 値を編集
bun run build
bun run pages:dev
```

1. 表示された URL（例: `http://127.0.0.1:8788/admin/login/`）を開く
2. `.dev.vars` のユーザー名/パスワードでログイン

**SITE ハブ iframe（自動ログイン）**

Kakuly 用 SITE ハブから admin iframe を開くとき、毎回手入力を避ける場合:

1. `.dev.vars` に `DEV_AUTO_LOGIN_USER=kakuly` を追加（`.dev.vars.example` 参照）
2. `bun run pages:dev` を起動
3. SITE → **tato** 管理画面 iframe が `http://127.0.0.1:8788/admin/login/` を読み込むと、**127.0.0.1 / localhost のみ** Kakuly として自動ログイン → ダッシュボードへ

> 本番（`manage.babytato.link`）では無効。`DEV_AUTO_LOGIN_USER` 未設定でも無効。

**iframe でログイン画面のままになる場合**

- SITE を `http://127.0.0.1:4001` で開く（`localhost:4001` だと iframe の `127.0.0.1:8788` と cross-site になり Cookie が弾かれることがある）
- `curl -sI http://127.0.0.1:8788/admin/login/` で `Set-Cookie` に `SameSite=None`（Secure なし）が付いているか確認
- `bun run build && bun run pages:dev` で Functions を再ビルド・再起動

**manage ホストのローカル検証（任意）:**

```bash
# /etc/hosts に追加: 127.0.0.1 manage.babytato.link
bun run pages:dev
# ブラウザ: http://manage.babytato.link:8788/
```

> `Secure` Cookie のため HTTPS 相当の `pages:dev` 環境で検証。本番確認は `manage.babytato.link` 推奨。

---

## トラブルシュート

| 症状 | 確認すること |
|------|----------------|
| 500「SESSION_SECRET が未設定」 | Cloudflare env に `SESSION_SECRET` があるか |
| 500「ADMIN_USER_1 … 未設定」 | 4 変数（USER/PASS × 2）が Production に入っているか |
| 401「ログイン情報が正しくありません」 | ユーザー名の大文字小文字・余分なスペース |
| ログイン後すぐ落ちる | HTTPS か（本番は OK）。Cookie がブロックされていないか |
| `/api/admin/login` が 404 | `functions/` がデプロイされているか · GitHub Actions deploy が成功しているか |
| Worker Builds で **left organization** | Build env の **`CLOUDFLARE_API_TOKEN` を削除** · Build token はドロップダウンのみ |
| ビルド Success だが本番が古いまま | Deploy command = **`true`** のまま **GitHub Actions が失敗**していないか · Secrets 2 つを確認 |
| GitHub Actions で **Authentication error [code: 10000]** | **`CLOUDFLARE_API_TOKEN`** に **Pages Edit（+ Read）** · Account resources が正しいアカウント · 上記チェックリストで再作成 |
| ビルド成功後に「Missing entry-point to Worker script」 | Deploy command が `wrangler deploy`（Workers 用）→ **`true`** に戻す |
| `Could not find project` / アカウントエラー | プロジェクト名が **`babytato-link`** か · Secret **`CLOUDFLARE_ACCOUNT_ID=4d3287a19985d6acc5d19bacf2178d24`** |
| auth 成功（whoami）の直後に deploy が exit 1 | トークンに **User Memberships Read** 等 · `pages:deploy` 前に `rm -rf node_modules/.cache/wrangler` |
| 複数アカウントで CI が非対話エラー | GitHub Secret **`CLOUDFLARE_ACCOUNT_ID`** を必ず設定 |

---

## 関連ファイル

| ファイル | 役割 |
|----------|------|
| `src/pages/admin/login.astro` | ログイン UI |
| `src/pages/admin/index.astro` | ダッシュボード |
| `src/layouts/AdminLayout.astro` | admin レイアウト |
| `src/styles/admin.css` | 白黒ミニマルスタイル |
| `functions/api/admin/` | login / session / logout API |
| `functions/lib/session.ts` | HMAC セッション Cookie |
| `functions/lib/admin-users.ts` | 複数アカウント照合 |
| `functions/_middleware.ts` | `manage.babytato.link` のホストベースルーティング |
| `functions/lib/manage-host.ts` | manage ホスト判定 |
| `src/lib/admin-paths.ts` | クライアント側の admin URL 解決 |
| `wrangler.toml` | Pages 設定 · D1 `DB` · R2 `MEDIA`（任意・既定オフ） |
| `.github/workflows/deploy.yml` | GitHub Actions 本番デプロイ |
