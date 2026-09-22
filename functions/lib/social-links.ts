export const SOCIAL_LINKS_PATH = "src/data/social-links.json";

/** Same template set as nocffie cockpit SNS_PRESETS (apple-music → appleMusic). */
export type SocialLinksData = {
  x: string;
  instagram: string;
  youtube: string;
  soundcloud: string;
  tiktok: string;
  fanbox: string;
  booth: string;
  spotify: string;
  appleMusic: string;
  bandcamp: string;
  discord: string;
};

export const SOCIAL_LINK_KEYS = [
  "x",
  "instagram",
  "youtube",
  "soundcloud",
  "tiktok",
  "fanbox",
  "booth",
  "spotify",
  "appleMusic",
  "bandcamp",
  "discord",
] as const satisfies ReadonlyArray<keyof SocialLinksData>;

export const SOCIAL_LINK_LABELS: Record<keyof SocialLinksData, string> = {
  x: "X",
  instagram: "Instagram",
  youtube: "YouTube",
  soundcloud: "SoundCloud",
  tiktok: "TikTok",
  fanbox: "FANBOX",
  booth: "BOOTH",
  spotify: "Spotify",
  appleMusic: "Apple Music",
  bandcamp: "Bandcamp",
  discord: "Discord",
};

export const SOCIAL_LINK_PLACEHOLDERS: Record<keyof SocialLinksData, string> = {
  x: "https://x.com/…",
  instagram: "https://www.instagram.com/…",
  youtube: "https://www.youtube.com/@…",
  soundcloud: "https://soundcloud.com/…",
  tiktok: "https://www.tiktok.com/@…",
  fanbox: "https://….fanbox.cc/",
  booth: "https://….booth.pm/",
  spotify: "https://open.spotify.com/…",
  appleMusic: "https://music.apple.com/…",
  bandcamp: "https://….bandcamp.com",
  discord: "https://discord.gg/…",
};

function emptyLinks(): SocialLinksData {
  return {
    x: "",
    instagram: "",
    youtube: "",
    soundcloud: "",
    tiktok: "",
    fanbox: "",
    booth: "",
    spotify: "",
    appleMusic: "",
    bandcamp: "",
    discord: "",
  };
}

/** Normalize stored / form values: blank and legacy `#` mean hidden. */
export function normalizeSocialUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "#") return "";
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

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
  const result = emptyLinks();

  for (const key of SOCIAL_LINK_KEYS) {
    if (!(key in data)) {
      result[key] = "";
      continue;
    }
    const normalized = normalizeSocialUrl(data[key]);
    if (normalized === null) {
      throw new Error(`${key} の URL が不正です（https:// または空）。`);
    }
    result[key] = normalized;
  }

  return result;
}

export function serializeSocialLinks(data: SocialLinksData): string {
  const ordered = emptyLinks();
  for (const key of SOCIAL_LINK_KEYS) {
    ordered[key] = data[key];
  }
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

export function validateSocialLinksInput(body: unknown): SocialLinksData | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  const result = emptyLinks();

  for (const key of SOCIAL_LINK_KEYS) {
    if (!(key in input)) return null;
    const normalized = normalizeSocialUrl(input[key]);
    if (normalized === null) return null;
    result[key] = normalized;
  }

  return result;
}
