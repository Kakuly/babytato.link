import type { NewsD1 } from "./env";
import type { PagesEnv } from "./env";
import type { NewsArticle, NewsListItem } from "./news";
import { NEWS_SEED } from "./news-seed";

export const DB_MISSING_MESSAGE =
  "D1 (DB) が未設定です。wrangler.toml の babytato-news を Dashboard の Bindings に接続してください。";

interface PostRow {
  slug: string;
  title: string;
  date: string;
  summary: string;
  body?: string;
  draft: number;
  updated_at: string;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS posts (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  draft INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS posts_date_idx ON posts (date DESC, slug DESC);
CREATE TABLE IF NOT EXISTS news_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

let ready: Promise<void> | null = null;

export function requireNewsDb(env: PagesEnv): NewsD1 {
  if (!env.DB) {
    throw new Error(DB_MISSING_MESSAGE);
  }
  return env.DB;
}

export function ensureNewsDb(db: NewsD1): Promise<void> {
  if (!ready) {
    ready = initNewsDb(db).catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function initNewsDb(db: NewsD1): Promise<void> {
  for (const statement of SCHEMA_SQL.split(";")) {
    const sql = statement.trim();
    if (sql) await db.prepare(sql).run();
  }

  const seeded = await db.prepare("SELECT value FROM news_meta WHERE key = ?").bind("seeded").first<{
    value: string;
  }>();
  if (seeded?.value === "1") return;

  const now = new Date().toISOString();
  const statements = NEWS_SEED.map((article) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO posts (slug, title, date, summary, body, draft, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`,
      )
      .bind(article.slug, article.title, article.date, article.summary ?? "", article.body, now),
  );
  statements.push(
    db
      .prepare(
        `INSERT INTO news_meta (key, value) VALUES ('seeded', '1')
         ON CONFLICT(key) DO UPDATE SET value = '1'`,
      ),
  );
  await db.batch(statements);
}

function rowToArticle(row: PostRow): NewsArticle & { updated_at: string; sha: string } {
  return {
    slug: row.slug,
    title: row.title,
    date: row.date,
    summary: row.summary || undefined,
    draft: row.draft ? true : undefined,
    body: row.body ?? "",
    updated_at: row.updated_at,
    sha: row.updated_at,
  };
}

function rowToListItem(row: PostRow): NewsListItem {
  return {
    slug: row.slug,
    title: row.title,
    date: row.date,
    summary: row.summary || undefined,
    draft: row.draft ? true : undefined,
    sha: row.updated_at,
  };
}

export async function listNewsArticles(db: NewsD1, publishedOnly: boolean): Promise<NewsListItem[]> {
  await ensureNewsDb(db);
  const sql = publishedOnly
    ? "SELECT slug, title, date, summary, draft, updated_at FROM posts WHERE draft = 0 ORDER BY date DESC, slug DESC"
    : "SELECT slug, title, date, summary, draft, updated_at FROM posts ORDER BY date DESC, slug DESC";
  const { results } = await db.prepare(sql).all<PostRow>();
  return results.map(rowToListItem);
}

/** Published posts for the public home list — no body column. */
export async function listPublishedNews(db: NewsD1): Promise<NewsListItem[]> {
  return listNewsArticles(db, true);
}

export async function readNewsArticle(
  db: NewsD1,
  slug: string,
  publishedOnly: boolean,
): Promise<(NewsArticle & { updated_at: string; sha: string }) | null> {
  await ensureNewsDb(db);
  const row = publishedOnly
    ? await db
        .prepare(
          "SELECT slug, title, date, summary, body, draft, updated_at FROM posts WHERE slug = ? AND draft = 0",
        )
        .bind(slug)
        .first<PostRow>()
    : await db
        .prepare("SELECT slug, title, date, summary, body, draft, updated_at FROM posts WHERE slug = ?")
        .bind(slug)
        .first<PostRow>();
  return row ? rowToArticle(row) : null;
}

export async function newsSlugExists(db: NewsD1, slug: string): Promise<boolean> {
  await ensureNewsDb(db);
  const row = await db.prepare("SELECT slug FROM posts WHERE slug = ?").bind(slug).first<{ slug: string }>();
  return Boolean(row);
}

export async function ensureUniqueSlug(db: NewsD1, baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let suffix = 2;
  while (await newsSlugExists(db, slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

export async function upsertNewsArticle(db: NewsD1, article: NewsArticle): Promise<NewsArticle & { sha: string; updated_at: string }> {
  await ensureNewsDb(db);
  const updatedAt = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO posts (slug, title, date, summary, body, draft, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         title = excluded.title,
         date = excluded.date,
         summary = excluded.summary,
         body = excluded.body,
         draft = excluded.draft,
         updated_at = excluded.updated_at`,
    )
    .bind(
      article.slug,
      article.title,
      article.date,
      article.summary ?? "",
      article.body,
      article.draft ? 1 : 0,
      updatedAt,
    )
    .run();

  return { ...article, updated_at: updatedAt, sha: updatedAt };
}

export async function deleteNewsArticle(db: NewsD1, slug: string): Promise<boolean> {
  await ensureNewsDb(db);
  const existing = await readNewsArticle(db, slug, false);
  if (!existing) return false;
  await db.prepare("DELETE FROM posts WHERE slug = ?").bind(slug).run();
  return true;
}

export function publicNewsListPayload(article: Pick<NewsArticle, "slug" | "title" | "date" | "summary">) {
  return {
    slug: article.slug,
    title: article.title,
    date: article.date,
    summary: article.summary,
  };
}

export function publicNewsPayload(article: NewsArticle) {
  return {
    ...publicNewsListPayload(article),
    body: article.body,
  };
}
