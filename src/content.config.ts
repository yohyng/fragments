import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const categories = ['essay', 'days', 'books', 'spaces'] as const;
export type Category = (typeof categories)[number];

/** A sidenote. Referenced from the body as `[^id]`. */
const note = z.object({
  id: z.string(),
  /** Heading next to the number square */
  title: z.string(),
  /** Bibliographic line (Lora 12px) */
  cite: z.string().optional(),
  /** Note text */
  body: z.string(),
});

const posts = defineCollection({
  // slug = file name (e.g. src/content/posts/2026-10-01.md → "2026-10-01")
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    /** Display format "2026.10.01" is derived from this */
    date: z.coerce.date(),
    title: z.string(),
    subtitle: z.string().default(''),
    category: z.enum(categories),
    notes: z.array(note).default([]),
  }),
});

export const collections = { posts };
