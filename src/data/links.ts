import { site } from './site';

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

/** 2×3 SNS grid — row-major: X / YOUTUBE, NICONICO / SOUNDCLOUD, SPOTIFY / APPLE MUSIC */
export const socialLinks: SocialLink[] = [
  { id: 'x', label: 'X', url: site.social.x },
  { id: 'youtube', label: 'YOUTUBE', url: site.social.youtube },
  { id: 'niconico', label: 'NICONICO', url: site.social.niconico },
  { id: 'soundcloud', label: 'SOUNDCLOUD', url: site.social.soundcloud },
  { id: 'spotify', label: 'SPOTIFY', url: site.social.spotify },
  { id: 'appleMusic', label: 'APPLE MUSIC', url: site.social.appleMusic },
];
