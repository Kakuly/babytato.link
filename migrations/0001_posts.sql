-- News articles (Cloudflare D1). Applied on first Function request as well.
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
