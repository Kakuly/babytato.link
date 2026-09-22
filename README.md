# babytato.link

tato の公式サイト。Astro + Cloudflare Pages Functions。お知らせ本文は D1（即時公開）、その他の CMS は GitHub。

## ページ

| パス | 内容 |
|------|------|
| `/` | プロフィール、お知らせ、SNS、ディスコグラフィー、お問い合わせフォーム |
| `/works/` | YouTube 動画（自動取得） |
| `/about/` | プロフィール |

## 編集場所

| 種類 | ファイル |
|------|----------|
| サイト情報 | `src/data/site.ts` |
| リンク | `src/data/links.ts` |
| お知らせ | 管理画面 `/admin/news/` → D1。ホームは `GET /api/news`。`src/content/news/*.md` は初回シード用 |
| YouTube チャンネル | `src/data/youtube.ts` |

## Works（YouTube 自動取得）

`works` ページはビルド時に YouTube RSS から動画を取得します。

- `@tat040` → `tato` として表示
- `@nocffie` → `nocffie` として表示

YouTube に投稿すれば、次回デプロイ時に自動で反映されます。  
RSS はチャンネルごとに最新 15 本まで。

## お問い合わせ

ホーム下部 `#contact` のフォームは `POST /api/contact`（Cloudflare Pages Function）へ送信します。  
本番では Pages の **Environment variables** に次を設定します（**Resend 優先**。未設定なら Webhook）。

| 変数（ラベル名） | 内容 |
|------------------|------|
| `RESEND_API_KEY` | [Resend](https://resend.com/) の API Key（`re_…`） |
| `RESEND_FROM` | 検証済み送信元。例: `tato <noreply@babytato.link>` |
| `CONTACT_TO_EMAIL` | 受付先メール（任意の受信アドレス） |
| `CONTACT_WEBHOOK_URL` | （任意）Discord / Slack Incoming Webhook。Resend 未設定時のフォールバック |

ローカルは `.dev.vars.example` をコピーした `.dev.vars` に同じ変数を置きます。`astro dev`（`:4322`）の `/api/*` は Vite proxy で `pages:dev`（`:8788`）へ転送するので、**両方起動**してください（推奨: `bun run site:dev`）。

## お知らせ（即時公開）

ホームの news はビルド時に Markdown を焼かず、ブラウザから `GET /api/news` を読みます。admin で保存すると D1 に upsert され、再デプロイなしで公開されます（下書きは公開 API に出ません）。

本番では D1 `babytato-news`（binding `DB`）を **Dashboard → Bindings** で Production + Preview に接続します（`wrangler.toml` の D1 は未作成だと deploy が落ちるため既定オフ。ローカルは `pages:dev` の `--d1=DB`）。R2 `babytato-news-media`（`MEDIA`）は任意 — バケット作成後に toml をアンコメントして接続（未設定時は `public/news/`）。手順: [`docs/SETUP-AUTH.md`](./docs/SETUP-AUTH.md) §4b。

## 開発

```bash
bun install
bun run site:dev     # 推奨: build → pages:dev :8788 + Astro :4322（SITE tato / News）
bun run dev          # http://127.0.0.1:4322 のみ（strictPort）
bun run build && bun run pages:dev   # http://127.0.0.1:8788 （admin / Functions）
```

SITE の tato プレビューでお知らせ API まで使うときは `bun run site:dev`（Ctrl+C で両方停止）。

### ローカルポート（nondesu と分離）

| ポート | プロジェクト | コマンド |
|--------|--------------|----------|
| `:4321` | nondesu | `npm run dev`（Astro デフォルト） |
| `:4322` | **babytatolink** | `bun run dev`（`--port 4322 --strictPort` 固定） |
| `:8788` | **babytatolink** | `bun run pages:dev`（`--port 8788 --ip 127.0.0.1` 固定） |

nondesu の `pages:dev` はポート未指定のため、同時起動すると 8788 でぶつかりうる。Astro は 4321 / 4322 で両立できる。

## デプロイ

GitHub に push → Cloudflare Pages が自動ビルド。

### Cloudflare Dashboard（Build settings）

[Workers & Pages](https://dash.cloudflare.com/) → プロジェクト **`babytato-link`** → **Settings** → **Build**:

| 項目 | 値 |
|------|-----|
| **Build command** | `bun run build`（npm の場合は `npm run build`） |
| **Build output directory** | `dist` |
| **Deploy command** | `bun run pages:deploy`（下記「Deploy command 必須の場合」参照） |

> **重要:** Deploy command に `npx wrangler deploy` を入れると失敗します（**Workers** 用）。  
> Pages では `wrangler pages deploy` を使います。

#### Deploy command が必須の UI の場合

Dashboard で Deploy command を空にできないときは、上記 `bun run pages:deploy` を設定し、**同じプロジェクト**の **Settings → Environment variables**（Production / Preview 両方）に次を追加します。

| 変数 | 必須 | 内容 |
|------|------|------|
| `CLOUDFLARE_API_TOKEN` | はい | [API トークン](https://dash.cloudflare.com/profile/api-tokens) — 権限 **Account → Cloudflare Pages → Edit**（対象アカウント） |
| `CLOUDFLARE_ACCOUNT_ID` | 推奨 | Dashboard 右サイドバーの **Account ID**（`wrangler.toml` の `account_id` でも可） |

CI では対話ログインできないため、トークン未設定だと `In a non-interactive environment... CLOUDFLARE_API_TOKEN` で失敗します。

bun が使えないビルド環境では Deploy command を次に置き換え（`package.json` の `pages:deploy` と同内容）:

```text
npx wrangler pages deploy dist --project-name=babytato-link --commit-dirty=true
```

#### Deploy command を使わない（Git 連携のみ）

**Build command** と **Build output directory**（`dist`）だけで、Cloudflare が `dist/` + `functions/` を自動アップロードする構成にできる場合は、**Deploy command は空のまま**（または未設定）が最も簡単です。UI で空にできないときだけ上記 wrangler 方式を使ってください。

`functions/` はリポジトリ直下に置いておけば Pages Functions として同時にデプロイされます。

### 手動デプロイ（任意）

Dashboard を使わず CLI から上げる場合:

```bash
bun run build
bun run pages:deploy
```

認証: ローカルは `npx wrangler login`。CI / 非対話環境は `CLOUDFLARE_API_TOKEN`（と推奨で `CLOUDFLARE_ACCOUNT_ID`）。
