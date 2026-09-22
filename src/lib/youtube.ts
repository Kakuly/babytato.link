import { youtubeChannels } from '../data/youtube';
import type { YouTubeSource } from '../data/youtube';

export type YouTubeVideo = {
  id: string;
  title: string;
  url: string;
  published: Date;
  source: YouTubeSource;
  sourceLabel: string;
  thumbnailUrl?: string;
};

/** YouTube RSS rejects some custom UAs; use a stable browser-like string. */
const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
} as const;

const THUMBNAIL_VARIANTS = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault'] as const;

/** maxresdefault returns a ~1 KB placeholder when unavailable; real assets are much larger. */
const MIN_MAXRES_BYTES = 5_000;

function thumbnailUrlFor(videoId: string, variant: (typeof THUMBNAIL_VARIANTS)[number]): string {
  return `https://i.ytimg.com/vi/${videoId}/${variant}.jpg`;
}

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseFeed(xml: string, source: YouTubeSource, sourceLabel: string): YouTubeVideo[] {
  const videos: YouTubeVideo[] = [];

  for (const chunk of xml.split('<entry>').slice(1)) {
    const title = decodeXml(chunk.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? '');
    const url = chunk.match(/<link rel="alternate" href="([^"]+)"/)?.[1] ?? '';
    const publishedRaw = chunk.match(/<published>([^<]+)<\/published>/)?.[1] ?? '';
    const id = url.match(/[?&]v=([^&]+)/)?.[1] ?? '';

    if (!title || !url || !publishedRaw) continue;

    videos.push({
      id,
      title,
      url,
      published: new Date(publishedRaw),
      source,
      sourceLabel,
    });
  }

  return videos;
}

async function readContentLength(url: string): Promise<number> {
  const head = await fetch(url, { method: 'HEAD', headers: FETCH_HEADERS });
  if (head.ok) {
    const length = Number(head.headers.get('content-length') ?? 0);
    if (length > 0) return length;
  }

  const range = await fetch(url, {
    headers: { ...FETCH_HEADERS, Range: 'bytes=0-0' },
  });
  if (!range.ok) return 0;

  const total = range.headers.get('content-range')?.split('/')[1];
  return Number(total ?? 0);
}

async function probeThumbnailVariant(
  videoId: string,
  variant: (typeof THUMBNAIL_VARIANTS)[number],
): Promise<boolean> {
  const url = thumbnailUrlFor(videoId, variant);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: FETCH_HEADERS,
    });

    if (!response.ok) return false;

    if (variant !== 'maxresdefault') return true;

    const length = Number(response.headers.get('content-length') ?? 0);
    if (length >= MIN_MAXRES_BYTES) return true;
    if (length > 0 && length < MIN_MAXRES_BYTES) return false;

    const totalLength = await readContentLength(url);
    return totalLength >= MIN_MAXRES_BYTES;
  } catch {
    return false;
  }
}

/** Resolve and lock the highest-quality thumbnail URL available for a single video. */
export async function resolveVideoThumbnailUrl(videoId: string): Promise<string> {
  for (const variant of THUMBNAIL_VARIANTS) {
    if (await probeThumbnailVariant(videoId, variant)) {
      return thumbnailUrlFor(videoId, variant);
    }
  }

  return thumbnailUrlFor(videoId, 'mqdefault');
}

async function lockVideoThumbnails(videos: YouTubeVideo[]): Promise<YouTubeVideo[]> {
  return Promise.all(
    videos.map(async (video) => ({
      ...video,
      thumbnailUrl: await resolveVideoThumbnailUrl(video.id),
    })),
  );
}

async function fetchChannelVideos(
  channelId: string,
  source: YouTubeSource,
  sourceLabel: string,
): Promise<YouTubeVideo[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  try {
    let response: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(feedUrl, { headers: FETCH_HEADERS });
      if (response.ok) break;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }

    if (!response?.ok) {
      console.warn(`[youtube] Failed to fetch ${source}: ${response?.status}`);
      return [];
    }

    return parseFeed(await response.text(), source, sourceLabel);
  } catch (error) {
    console.warn(`[youtube] Failed to fetch ${source}:`, error);
    return [];
  }
}

export async function getYouTubeVideos(): Promise<YouTubeVideo[]> {
  const results = await Promise.all(
    youtubeChannels.map(({ channelId, source, label }) =>
      fetchChannelVideos(channelId, source, label),
    ),
  );

  return results
    .flat()
    .sort((a, b) => b.published.getTime() - a.published.getTime());
}

export async function getTatoYouTubeVideos(limit = 10): Promise<YouTubeVideo[]> {
  const channel = youtubeChannels.find(({ source }) => source === 'tato');
  if (!channel) return [];

  const videos = await fetchChannelVideos(channel.channelId, channel.source, channel.label);
  return lockVideoThumbnails(videos.slice(0, limit));
}
