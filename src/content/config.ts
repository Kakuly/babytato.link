import { defineCollection, z } from 'astro:content';

const news = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().optional(),
    emoji: z.string().default('📢'),
    draft: z.boolean().default(false),
  }),
});

const works = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    type: z.enum(['cover', 'original', 'collab', 'live']),
    url: z.string().url(),
    thumbnail: z.string().optional(),
    emoji: z.string().default('🎵'),
    featured: z.boolean().default(false),
  }),
});

export const collections = { news, works };
