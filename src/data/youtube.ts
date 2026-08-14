export type YouTubeSource = 'tato' | 'nocffie';

export type YouTubeChannelConfig = {
  channelId: string;
  source: YouTubeSource;
  label: string;
  url: string;
};

export const youtubeChannels: YouTubeChannelConfig[] = [
  {
    channelId: 'UCI7qTUtZDlb5asKbftwrhJA',
    source: 'tato',
    label: 'tato',
    url: 'https://www.youtube.com/@tat040',
  },
  {
    channelId: 'UC1wI6Abu0QGKepbaBl3Qc0Q',
    source: 'nocffie',
    label: 'nocffie',
    url: 'https://www.youtube.com/@nocffie',
  },
];

/** RSS feed returns the latest 15 videos per channel. */
export const youtubeFetchLimit = 15;
