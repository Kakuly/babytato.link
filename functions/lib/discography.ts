export const DISCOGRAPHY_PATH = "src/data/discography.json";
export const RELEASES_PUBLIC_DIR = "public/releases";
export const RELEASES_URL_PREFIX = "/releases/";
export const MAX_JACKET_BYTES = 1_500_000;

export type ReleaseType = "single" | "ep" | "album";
export type DiscographySection = "collabo" | "myReleases";

export type DiscographyEntry = {
  id: string;
  title: string;
  type: ReleaseType;
  date?: string;
  img: string;
  url?: string;
  tracks?: string[];
};

export type DiscographyData = {
  collabo: DiscographyEntry[];
  myReleases: DiscographyEntry[];
};

const RELEASE_TYPES = new Set<ReleaseType>(["single", "ep", "album"]);
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const JACKET_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function jacketExtForMime(mime: string): string | null {
  return JACKET_MIME[mime] ?? null;
}

export function isAllowedJacketMime(mime: string): boolean {
  return mime in JACKET_MIME;
}

export function jacketRepoPath(id: string, ext: string): string {
  return `${RELEASES_PUBLIC_DIR}/${id}.${ext}`;
}

export function jacketPublicPath(id: string, ext: string): string {
  return `${RELEASES_URL_PREFIX}${id}.${ext}`;
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseTracks(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) return undefined;
  const tracks = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return tracks.length > 0 ? tracks : undefined;
}

function parseEntry(value: unknown): DiscographyEntry | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;

  const id = asTrimmedString(input.id);
  const title = asTrimmedString(input.title);
  const type = asTrimmedString(input.type) as ReleaseType;
  const img = asTrimmedString(input.img);
  const date = asTrimmedString(input.date);
  const url = asTrimmedString(input.url);

  if (!ID_RE.test(id) || !title || !RELEASE_TYPES.has(type) || !img) return null;
  if (!img.startsWith("/") && !/^https?:\/\//i.test(img)) return null;
  if (date && !DATE_RE.test(date)) return null;
  if (url && url !== "#" && !/^https?:\/\//i.test(url)) return null;

  const tracks = parseTracks(input.tracks);
  const entry: DiscographyEntry = { id, title, type, img };
  if (date) entry.date = date;
  if (url) entry.url = url;
  if (tracks) entry.tracks = tracks;
  return entry;
}

function parseSection(value: unknown): DiscographyEntry[] | null {
  if (!Array.isArray(value)) return null;
  const entries: DiscographyEntry[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const entry = parseEntry(item);
    if (!entry) return null;
    if (seen.has(entry.id)) return null;
    seen.add(entry.id);
    entries.push(entry);
  }
  return entries;
}

export function parseDiscography(raw: string): DiscographyData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("discography.json の JSON が不正です。");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("discography.json の形式が不正です。");
  }

  const data = parsed as Record<string, unknown>;
  const collabo = parseSection(data.collabo);
  const myReleases = parseSection(data.myReleases);
  if (!collabo || !myReleases) {
    throw new Error("discography.json の collabo / myReleases が不正です。");
  }

  const ids = new Set<string>();
  for (const entry of [...collabo, ...myReleases]) {
    if (ids.has(entry.id)) {
      throw new Error(`discography.json の id が重複しています: ${entry.id}`);
    }
    ids.add(entry.id);
  }

  return { collabo, myReleases };
}

export function serializeDiscography(data: DiscographyData): string {
  return `${JSON.stringify(
    {
      collabo: data.collabo,
      myReleases: data.myReleases,
    },
    null,
    2,
  )}\n`;
}

export function validateDiscographyInput(body: unknown): DiscographyData | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  try {
    return parseDiscography(JSON.stringify({
      collabo: input.collabo,
      myReleases: input.myReleases,
    }));
  } catch {
    return null;
  }
}

export function isValidReleaseId(id: string): boolean {
  return ID_RE.test(id);
}
