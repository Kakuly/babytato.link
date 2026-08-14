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
