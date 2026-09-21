export const NEWS_DIR = "src/content/news";
export const NEWS_IMAGE_DIR = "public/news";
export const NEWS_IMAGE_URL_PREFIX = "/news/";
/** 10MB binary, same cap as discography jackets. */
export const MAX_NEWS_IMAGE_BYTES = 10 * 1024 * 1024;

const NEWS_IMAGE_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export interface NewsFrontmatter {
  title: string;
  date: string;
  summary?: string;
  draft?: boolean;
}

export interface NewsArticle extends NewsFrontmatter {
  slug: string;
  body: string;
}

export interface NewsListItem extends NewsFrontmatter {
  slug: string;
  sha: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

function parseYamlLine(line: string): [string, string] | null {
  const match = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
  if (!match) return null;
  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return [match[1], value];
}

function parseFrontmatterYaml(yaml: string): NewsFrontmatter | null {
  const fields: Record<string, string> = {};
  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const parsed = parseYamlLine(trimmed);
    if (parsed) fields[parsed[0]] = parsed[1];
  }

  const title = fields.title?.trim();
  const date = fields.date?.trim();
  if (!title || !date || !DATE_RE.test(date)) return null;

  const summary = fields.summary?.trim() || undefined;
  const draft = fields.draft === "true";

  return { title, date, summary, draft: draft || undefined };
}

export function slugFromFilename(filename: string): string | null {
  if (!filename.endsWith(".md")) return null;
  const slug = filename.slice(0, -3);
  return SLUG_RE.test(slug) ? slug : null;
}

export function parseNewsMarkdown(content: string, slug: string): NewsArticle | null {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return null;

  const frontmatter = parseFrontmatterYaml(match[1]);
  if (!frontmatter) return null;

  return {
    slug,
    ...frontmatter,
    body: match[2].replace(/^\n/, "").trimEnd(),
  };
}

function yamlValue(value: string): string {
  if (/[:#\n"'&*]|^\s/.test(value) || value === "") {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

export function serializeNewsMarkdown(article: NewsArticle): string {
  const lines = ["---", `title: ${yamlValue(article.title)}`, `date: ${article.date}`];
  if (article.summary) lines.push(`summary: ${yamlValue(article.summary)}`);
  if (article.draft) lines.push("draft: true");
  lines.push("---", "", article.body);
  if (article.body && !article.body.endsWith("\n")) lines.push("");
  return lines.join("\n");
}

export function newsFilePath(slug: string): string {
  return `${NEWS_DIR}/${slug}.md`;
}

export function slugifyTitle(title: string): string {
  const ascii = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return ascii || "article";
}

export function makeNewsSlug(date: string, title: string): string {
  return `${date}-${slugifyTitle(title)}`;
}

export function isValidNewsSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function newsImageExtForMime(mime: string): string | null {
  return NEWS_IMAGE_MIME[mime] ?? null;
}

export function isAllowedNewsImageMime(mime: string): boolean {
  return mime in NEWS_IMAGE_MIME;
}

export function mimeFromNewsImageFile(file: File): string {
  if (file.type && isAllowedNewsImageMime(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return file.type || "";
}

export function newsImagePrefix(slug?: string): string {
  const trimmed = slug?.trim() ?? "";
  return trimmed && isValidNewsSlug(trimmed) ? trimmed : "article";
}

export function newsImageFilename(prefix: string, hash: string, ext: string): string {
  return `${prefix}-${hash}.${ext}`;
}

export function newsImageRepoPath(filename: string): string {
  return `${NEWS_IMAGE_DIR}/${filename}`;
}

export function newsImagePublicPath(filename: string): string {
  return `${NEWS_IMAGE_URL_PREFIX}${filename}`;
}

export interface NewsInput {
  slug?: string;
  title?: string;
  date?: string;
  summary?: string;
  draft?: boolean;
  body?: string;
}

export function validateNewsInput(input: NewsInput, existingSlug?: string): NewsArticle | null {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const date = typeof input.date === "string" ? input.date.trim() : "";
  const body = typeof input.body === "string" ? input.body.trimEnd() : "";

  if (!title) return null;
  if (!DATE_RE.test(date)) return null;

  const summary =
    typeof input.summary === "string" && input.summary.trim() ? input.summary.trim() : undefined;
  const draft = input.draft === true;

  let slug = existingSlug ?? "";
  if (!slug) {
    const requested = typeof input.slug === "string" ? input.slug.trim() : "";
    slug = requested || makeNewsSlug(date, title);
  }
  if (!isValidNewsSlug(slug)) return null;

  return { slug, title, date, summary, draft: draft || undefined, body };
}
