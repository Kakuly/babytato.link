# babytato.link

歌い手向け公式サイトの骨組み。Astro + Markdown で、お知らせ・リンク・作品集を管理します。

## ページ構成

| パス | 内容 |
|------|------|
| `/` | トップ（ヒーロー + 最新お知らせ + ピックアップ作品） |
| `/news/` | お知らせ一覧 |
| `/news/[slug]/` | お知らせ詳細 |
| `/works/` | 作品集 |
| `/links/` | SNS・配信リンク集 |
| `/about/` | プロフィール |

## コンテンツの編集場所

| 種類 | ファイル |
|------|----------|
| サイト名・プロフィール | `src/data/site.ts` |
| リンク集 | `src/data/links.ts` |
| お知らせ | `src/content/news/*.md` |
| 作品 | `src/content/works/*.md` |

## ローカル開発

```bash
npm install
npm run dev
```

http://localhost:4321 でプレビューできます。

## ビルド

```bash
npm run build
```

出力は `dist/` です。

## Cloudflare Pages 設定

| 項目 | 値 |
|------|-----|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 以上推奨 |

GitHub リポジトリ `babytato.link` を接続し、カスタムドメイン `babytato.link` を Pages に設定してください。

## 今後の拡張（Phase 2）

- `/admin` に Decap CMS を追加 → 友達が Git を意識せず編集
- 認証は GitHub OAuth + Cloudflare Functions

## デザイン

ポップ寄りの配色（ピンク・イエロー・ブルー）と、M PLUS Rounded 1c フォントを使用しています。
