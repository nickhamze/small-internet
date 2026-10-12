import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const fields = {
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  category: z.string(),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  order: z.number().default(0),
};
const httpsUrl = z.url({ protocol: /^https$/ });

export const collections = {
  notes: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
    schema: z.object(fields),
  }),
  projects: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
    schema: z.object({ ...fields, href: httpsUrl.optional() }),
  }),
  items: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/items' }),
    schema: z.object({ ...fields, href: httpsUrl.optional() }),
  }),
};
