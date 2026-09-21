export const SOCIAL_LINKS_PATH = "src/data/social-links.json";

export type SocialLinksData = {
  x: string;
  youtube: string;
  niconico: string;
  soundcloud: string;
  spotify: string;
  appleMusic: string;
};

export const SOCIAL_LINK_KEYS = [
  "x",
  "youtube",
  "niconico",
  "soundcloud",
  "spotify",
  "appleMusic",
] as const satisfies ReadonlyArray<keyof SocialLinksData>;

export const SOCIAL_LINK_LABELS: Record<keyof SocialLinksData, string> = {
  x: "X",
  youtube: "YouTube",
  niconico: "ニコニコ",
  soundcloud: "SoundCloud",
  spotify: "Spotify",
  appleMusic: "Apple Music",
};

export function parseSocialLinks(raw: string): SocialLinksData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("social-links.json の JSON が不正です。");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("social-links.json の形式が不正です。");
  }

  const data = parsed as Record<string, unknown>;
  const result = {} as SocialLinksData;

  for (const key of SOCIAL_LINK_KEYS) {
    const value = data[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`${key} の URL が未設定または不正です。`);
    }
    result[key] = value.trim();
  }

  return result;
}

export function serializeSocialLinks(data: SocialLinksData): string {
  const ordered: SocialLinksData = {
    x: data.x,
    youtube: data.youtube,
    niconico: data.niconico,
    soundcloud: data.soundcloud,
    spotify: data.spotify,
    appleMusic: data.appleMusic,
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

export function validateSocialLinksInput(body: unknown): SocialLinksData | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  const result = {} as SocialLinksData;

  for (const key of SOCIAL_LINK_KEYS) {
    const value = input[key];
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed !== "#" && !/^https?:\/\//i.test(trimmed)) return null;
    result[key] = trimmed;
  }

  return result;
}
