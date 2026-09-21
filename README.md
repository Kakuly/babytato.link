# babytato.link

tato の公式サイト。Astro + Markdown で管理。

## ページ

| パス | 内容 |
|------|------|
| `/` | プロフィール、お知らせ、リンク |
| `/works/` | YouTube 動画（自動取得） |
| `/about/` | プロフィール |

## 編集場所

| 種類 | ファイル |
|------|----------|
| サイト情報 | `src/data/site.ts` |
| リンク | `src/data/links.ts` |
| お知らせ | `src/content/news/*.md` |
| YouTube チャンネル | `src/data/youtube.ts` |

## Works（YouTube 自動取得）

`works` ページはビルド時に YouTube RSS から動画を取得します。

- `@tat040` → `tato` として表示
- `@nocffie` → `nocffie` として表示

YouTube に投稿すれば、次回デプロイ時に自動で反映されます。  
RSS はチャンネルごとに最新 15 本まで。

## 開発

```bash
bun install
bun run dev
```

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
