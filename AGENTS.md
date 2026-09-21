# babytatolink — エージェント向けメモ

## エージェント境界（必読）

**このフォルダは tatolinkエージェント の管轄。** ここで作業するエージェントは tatolinkエージェント として振る舞う。

| ルール | 内容 |
|--------|------|
| **編集してよい** | `babytatolink/` 配下、tato サイト情報、SITE で **tato 選択後**の編集・プレビュー画面 |
| **編集禁止** | `Kakuly.github.io/`、`nondesu/`、Kakuly 用 nocffie・SITE ハブの**サイトピッカー** |
| **境界** | ポートフォリオエージェント は SITE ハブでサイトを選ぶ画面まで。tato を選んだ先は **tatolinkエージェント** |

詳細: [`../WORKSPACES.md`](../WORKSPACES.md) の「エージェント境界」

---

**tato 公式（Astro）。Kakuly.github.io ではない。** → [`../WORKSPACES.md`](../WORKSPACES.md)

| 項目 | 値 |
|------|-----|
| 公開 | [babytato.link](https://babytato.link/) |
| パッケージ | bun · デプロイ: push → Cloudflare Pages |

## 開発

```bash
bun install
bun run dev -- --port 4322   # SITE ハブ前提。:4321 は nondesu と競合
```

## Site Studio

- SITE → **tato**: dev 起動中は `:4322` iframe / 未起動は公開サイト
- **CMS 未接続** — このリポジトリを直接編集
- `admin/` ハブ UI 変更時のみ → `../discord-notify/bin/sync-jekyll-site`

## 編集入口

`src/data/site.ts` · `links.ts` · `youtube.ts` · `src/content/news/*.md`  
Works = ビルド時 YouTube RSS（`@tat040`, `@nocffie`、各 15 本）

## ホロ合成（触る前に読む）

トップ `.holo` のイラスト合成（JPG + `mix-blend-mode: lighten`）は壊れやすい。  
**変更前に必読:** [`docs/HOLO-COMPOSITING.md`](docs/HOLO-COMPOSITING.md)

## ⚠️

- 別 Git — Kakuly.github.io に混ぜない
- コンテンツ変更だけなら Studio 再起動不要
- 詳細: [`README.md`](README.md)
