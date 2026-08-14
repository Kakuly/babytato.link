import { site } from './site';

export type LinkItem = {
  label: string;
  url: string;
};

export const links: LinkItem[] = [
  { label: 'X', url: site.social.x },
  { label: 'tato youtube', url: site.social.youtube },
  { label: 'nocffie youtube', url: site.social.nocffieYoutube },
];
