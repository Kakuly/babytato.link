export type LinkItem = {
  label: string;
  url: string;
  description?: string;
  emoji?: string;
};

export type LinkCategory = {
  title: string;
  emoji: string;
  items: LinkItem[];
};

export const linkCategories: LinkCategory[] = [
  {
    title: 'SNS',
    emoji: '💬',
    items: [
      {
        label: 'X (Twitter)',
        url: 'https://x.com/example',
        description: '日常と告知',
        emoji: '𝕏',
      },
      {
        label: 'YouTube',
        url: 'https://youtube.com/@example',
        description: '動画・歌ってみた',
        emoji: '▶️',
      },
      {
        label: 'ニコニコ動画',
        url: 'https://www.nicovideo.jp/user/example',
        description: '投稿動画',
        emoji: '📺',
      },
    ],
  },
  {
    title: '配信・音楽',
    emoji: '🎧',
    items: [
      {
        label: 'Spotify',
        url: 'https://open.spotify.com/artist/example',
        description: '楽曲配信',
        emoji: '🎵',
      },
      {
        label: 'BOOTH',
        url: 'https://example.booth.pm/',
        description: 'グッズ・音源',
        emoji: '🛍️',
      },
    ],
  },
  {
    title: 'その他',
    emoji: '🔗',
    items: [
      {
        label: 'お問い合わせ',
        url: 'mailto:hello@babytato.link',
        description: '仕事の依頼など',
        emoji: '✉️',
      },
    ],
  },
];
