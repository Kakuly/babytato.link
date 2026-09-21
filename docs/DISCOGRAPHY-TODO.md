# Discography · News 編集 — Phase 2 計画

Phase 1（SNS リンク編集）完了後の実装ロードマップ。nocffie の SITE エディタ（`Kakuly.github.io/admin/`）を参考に、tato 向けに簡素化する。

---

## 参照: nocffie discography

| 項目 | nocffie（Kakuly.github.io） |
|------|----------------------------|
| データ | `_data/nocffie-discography.json` |
| 公開 | `_includes/nocffie-discography-grid.html` |
| 管理 UI | SITE cockpit → **Discography** パネル |
| API | `/api/discography`（GET/POST/PATCH/DELETE） |
| ジャケット | `/assets/img/releases/` へアップロード → JSON の `img` にパス |

**エントリ例:**

```json
{
  "id": "tell",
  "title": "tell",
  "type": "single",
  "date": "2026-03-15",
  "img": "/assets/img/releases/cover_tell.png",
  "url": "https://big-up.style/wQL2tkuWkF",
  "tracks": ["曲A", "曲B"]
}
```

**管理 UI の機能（nocffie）:**

- リリース単位の一覧（ジャケットサムネ付き）
- タイトル · 種別（single/EP/album）· 日付 · リンク URL · 収録曲
- ジャケット画像アップロード / 削除
- 手動追加 · 削除 · 保存 → JSON commit

---

## tato 側（Phase 2 以降）

### データモデル（骨組み済み）

- `src/data/discography.json`
  - `collabo[]` — コラボリリース
  - `myReleases[]` — ソロリリース
- 公開: `src/pages/works/index.astro` + `DiscographyGrid.astro`
- 型: `src/lib/discography.ts`

### Phase 2a — Discography 管理 API + UI

- [ ] GitHub Contents API で `discography.json` read/write（links API と同パターン）
- [ ] ジャケット画像: R2 または `public/releases/` へアップロード API
  - nocffie はローカル filesystem + optimize スクリプト。Cloudflare では R2 推奨
- [ ] `/admin/discography/` — collabo / my releases タブ
- [ ] 各行: ジャケット · タイトル · type · date · URL · tracks
- [ ] 追加 / 削除 / 並び替え（date desc）

### Phase 2b — News WYSIWYG

- [ ] 現状: `src/content/news/*.md`（Astro Content Collections）
- [ ] 目標: Note 風 WYSIWYG（見出し · 本文 · 画像 · 公開日）
- [ ] 保存先: Markdown 生成 → GitHub commit（frontmatter + body）
- [ ] 管理 UI: `/admin/news/` — 一覧 · 新規 · 編集
- [ ] エディタ候補: TipTap / Lexical（軽量）— 画像は R2 URL 挿入

### Phase 2c — site info

- [ ] `src/data/site.ts` の profile / tagline 等を管理画面から編集

---

## 優先順位

1. **Discography 管理** — 公開ページの骨組みは済。データ投入 + 管理 UI が最優先
2. **News WYSIWYG** — 記事量が増えたタイミングで
3. **site info** — 低頻度更新のため後回し可

---

## 関連ファイル

| ファイル | 役割 |
|----------|------|
| `src/data/discography.json` | リリースデータ（collabo / myReleases） |
| `src/pages/works/index.astro` | 公開 discography ページ |
| `src/components/DiscographyGrid.astro` | ジャケットグリッド |
| `functions/api/admin/content/links.ts` | Phase 1 リンク API（テンプレート） |
| `docs/ADMIN-TODO.md` | 全体 TODO · env 設定 |
