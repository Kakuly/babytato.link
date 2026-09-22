import type { NewsArticle } from "./news";

/**
 * Fallback seed for an empty D1 database.
 * Mirrors `src/content/news/*.md` (kept as seed source only — not baked into the home page).
 */
export const NEWS_SEED: NewsArticle[] = [
  {
    slug: "2026-08-14-welcome",
    title: "サイトを公開しました",
    date: "2026-09-23",
    summary: "tato の公式サイトを開設しました。",
    body: "お知らせや作品はこのサイトに載せていきます。",
  },
];
