import discographyData from '../data/discography.json';

export type ReleaseType = 'single' | 'ep' | 'album';

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

export const discography = discographyData as DiscographyData;

export function sortByDateDesc(entries: DiscographyEntry[]): DiscographyEntry[] {
  return [...entries].sort((a, b) => {
    const dateA = a.date ?? '';
    const dateB = b.date ?? '';
    return dateB.localeCompare(dateA);
  });
}
