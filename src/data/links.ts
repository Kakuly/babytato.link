import socialLinksData from './social-links.json';

export type SocialPlatform =
  | 'x'
  | 'youtube'
  | 'niconico'
  | 'soundcloud'
  | 'spotify'
  | 'appleMusic';

export type SocialLink = {
  id: SocialPlatform;
  label: string;
  url: string;
};

const LABELS: Record<SocialPlatform, string> = {
  x: 'X',
  youtube: 'YOUTUBE',
  niconico: 'NICONICO',
  soundcloud: 'SOUNDCLOUD',
  spotify: 'SPOTIFY',
  appleMusic: 'APPLE MUSIC',
};

/** 2×3 SNS grid — row-major: X / YOUTUBE, NICONICO / SOUNDCLOUD, SPOTIFY / APPLE MUSIC */
export const socialLinks: SocialLink[] = (
  Object.entries(socialLinksData) as [SocialPlatform, string][]
).map(([id, url]) => ({
  id,
  label: LABELS[id],
  url,
}));
