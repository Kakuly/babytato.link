import { youtubeChannels } from '../data/youtube';
import type { YouTubeSource } from '../data/youtube';

export type YouTubeVideo = {
  id: string;
  title: string;
  url: string;
  published: Date;
  source: YouTubeSource;
  sourceLabel: string;
};

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

async function fetchChannelVideos(
  channelId: string,
  source: YouTubeSource,
  sourceLabel: string,
): Promise<YouTubeVideo[]> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  try {
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'babytato.link/build' },
    });

    if (!response.ok) {
      console.warn(`[youtube] Failed to fetch ${source}: ${response.status}`);
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
