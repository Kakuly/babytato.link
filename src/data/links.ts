import socialLinksData from './social-links.json';

/** SNS templates — same set as nocffie SITE cockpit SNS_PRESETS. */
export type SocialPlatform =
  | 'x'
  | 'instagram'
  | 'youtube'
  | 'soundcloud'
  | 'tiktok'
  | 'fanbox'
  | 'booth'
  | 'spotify'
  | 'appleMusic'
  | 'bandcamp'
  | 'discord';

export type SocialLink = {
  id: SocialPlatform;
  label: string;
  url: string;
};

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  'x',
  'instagram',
  'youtube',
  'soundcloud',
  'tiktok',
  'fanbox',
  'booth',
  'spotify',
  'appleMusic',
  'bandcamp',
  'discord',
] as const;

const LABELS: Record<SocialPlatform, string> = {
  x: 'X',
  instagram: 'INSTAGRAM',
  youtube: 'YOUTUBE',
  soundcloud: 'SOUNDCLOUD',
  tiktok: 'TIKTOK',
  fanbox: 'FANBOX',
  booth: 'BOOTH',
  spotify: 'SPOTIFY',
  appleMusic: 'APPLE MUSIC',
  bandcamp: 'BANDCAMP',
  discord: 'DISCORD',
};

function isPublicUrl(url: string): boolean {
  const trimmed = url.trim();
  return trimmed !== '' && trimmed !== '#' && /^https?:\/\//i.test(trimmed);
}

/** Visible SNS only — empty / `#` slots are hidden. */
export const socialLinks: SocialLink[] = SOCIAL_PLATFORMS.filter((id) =>
  isPublicUrl((socialLinksData as Record<string, string>)[id] ?? ''),
).map((id) => ({
  id,
  label: LABELS[id],
  url: ((socialLinksData as Record<string, string>)[id] ?? '').trim(),
}));
