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
bun run dev          # :4322（package.json + astro.config で固定・strictPort）
bun run pages:dev    # :8788 @ 127.0.0.1（Functions / admin）
```

### ポート割り当て（nondesu と被らせない）

| ポート | 所有者 | 用途 | 固定方法（babytatolink） |
|--------|--------|------|--------------------------|
| `:4321` | **nondesu** | Astro `npm run dev`（Astro デフォルト） | —（触らない） |
| `:4322` | **babytatolink** | Astro `bun run dev`（SITE iframe） | `--port 4322 --strictPort` |
| `:8788` | **babytatolink** | `bun run pages:dev`（admin / Functions） | `--port 8788 --ip 127.0.0.1` |

nondesu の `pages:dev` はスクリプト上ポート未指定（wrangler デフォルトも 8788 寄り）。両方同時に `pages:dev` しない。Astro 同士は 4321 / 4322 で分離済み。

## Site Studio

- SITE → **tato**: 公開サイトは Astro dev 起動中 `:4322` iframe / 未起動は babytato.link
- SITE → **tato** 管理画面: `pages:dev` 起動中 `:8788/admin/login/` iframe / 未起動は manage.babytato.link へ誘導
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
