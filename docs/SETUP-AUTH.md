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

## Cloudflare Pages ビルド設定（デプロイ失敗時は最初に確認）

Dashboard → **Workers & Pages** → **`babytato-link`** → **Settings** → **Build**:

| 項目 | 正しい値 |
|------|----------|
| **Build command** | `bun run build` |
| **Build output directory** | `dist` |
| **Deploy command** | `bun run pages:deploy`（空にできるなら **未設定がおすすめ**） |

**Deploy command に `npx wrangler deploy` が入っているとデプロイが失敗します。**  
`wrangler deploy` は Workers 用です。Pages では `wrangler pages deploy` を使います。

`package.json` の `pages:deploy`（ビルド後の deploy 段階）:

```text
rm -rf node_modules/.cache/wrangler 2>/dev/null; wrangler pages deploy dist --project-name=babytato-link --branch=main --commit-dirty=true
```

**Dashboard → Settings → Build → Deploy command**（bun あり）:

```text
bun run pages:deploy
```

Deploy command で wrangler を走らせる場合、**Settings → Environment variables**（Production / Preview）に追加:

| 変数 | 必須 | 内容 |
|------|------|------|
| `CLOUDFLARE_API_TOKEN` | はい | API トークン（下記「トークン権限」参照） |
| `CLOUDFLARE_ACCOUNT_ID` | はい（CI） | `4d3287a19985d6acc5d19bacf2178d24` |

**API トークン権限（Deploy command / wrangler 用）**

- **Account** → **Cloudflare Pages** → **Edit**
- **User** → **User Memberships** → **Read**（`wrangler whoami` でアカウント一覧を取るのに必要。無いと auth 成功後に deploy が exit 1 になることがある）

> wrangler **4.40** には `pages deploy` 用の `--account-id` フラグは**ありません**。アカウントは `CLOUDFLARE_ACCOUNT_ID` 環境変数か `wrangler.toml` の `account_id` で指定します。

**wrangler の pages.json キャッシュ**

CI で別アカウント ID に切り替えたのに古いアカウントが使われる場合、`node_modules/.cache/wrangler` が `CLOUDFLARE_ACCOUNT_ID` を無視することがあります。`pages:deploy` スクリプトはデプロイ前にこのキャッシュを削除します。

bun なし環境の Deploy command:

```text
rm -rf node_modules/.cache/wrangler 2>/dev/null; npx wrangler pages deploy dist --project-name=babytato-link --branch=main --commit-dirty=true
```

**（実験）Git 連携だけで dist が上がる場合**

Deploy command を空にできない UI では、ビルド成果物の自動アップロードに任せる試行として次を使う人もいます（**二重デプロイや挙動差があるため自己責任・要確認**）:

```text
true
```

設定変更後: **Deployments** → 失敗したデプロイ → **Retry deployment**、または main に push。

---

## あなたがやること（順番どおり）

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

### 5. コードをデプロイ

```bash
cd babytatolink
git add .
git commit -m "add tato admin login"
git push origin main
```

Cloudflare Pages が `bun run build`（または設定済みビルドコマンド）→ `dist/` + `functions/` をデプロイ。

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

**manage ホストのローカル検証（任意）:**

```bash
# /etc/hosts に追加: 127.0.0.1 manage.babytato.link
bun run pages:dev -- --ip 127.0.0.1 --port 8788
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
| `/api/admin/login` が 404 | `functions/` がデプロイされているか · 再デプロイ |
| ビルド成功後に「Missing entry-point to Worker script」 | Deploy command が `wrangler deploy`（Workers 用）になっていないか → **`bun run pages:deploy` に変更して Retry** |
| deploy 段階で `CLOUDFLARE_API_TOKEN` / non-interactive | Deploy command 使用時 → 上記 API トークンを Pages 環境変数に設定 |
| `Could not find project` / アカウントエラー | プロジェクト名が **`babytato-link`** か · `CLOUDFLARE_ACCOUNT_ID=4d3287a19985d6acc5d19bacf2178d24` · `wrangler.toml` の `account_id` |
| auth 成功（whoami）の直後に deploy が exit 1・ログが少ない | トークンに **User Memberships Read** があるか · `rm -rf node_modules/.cache/wrangler` 後に再 deploy · `WRANGLER_LOG=debug`（例: `WRANGLER_LOG=debug bun run pages:deploy`） |
| 複数アカウントで CI が非対話エラー | `CLOUDFLARE_ACCOUNT_ID` を必ず設定（上記 ID） |

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
| `wrangler.toml` | Pages 設定 |
