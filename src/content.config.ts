import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import type { Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { fetchArticles, convert, parseDate } from './lib/supabase-content.mjs';
import { cardUrls, fetchCardMeta } from './lib/card-meta.mjs';

/**
 * Where posts come from. CONTENT_SOURCE=supabase reads the `articles` table
 * the previous site (studieslog) writes to; anything else uses the Markdown
 * files in src/content/posts.
 */
export const contentSource: 'supabase' | 'markdown' = process.env.CONTENT_SOURCE === 'supabase' ? 'supabase' : 'markdown';

export const categories =
  contentSource === 'supabase'
    ? (['essay', 'sketch', 'log'] as const)
    : (['essay', 'days', 'books', 'spaces'] as const);
export type Category = string;

/** A sidenote. Referenced from the body as `[^id]` (Markdown posts). */
const note = z.object({
  id: z.string(),
  /** Heading next to the number square */
  title: z.string(),
  /** Bibliographic line (Lora 12px) */
  cite: z.string().optional(),
  /** Note text */
  body: z.string(),
});

const schema = z.object({
  /** Display format "2026.10.01" is derived from this */
  date: z.coerce.date(),
  title: z.string(),
  subtitle: z.string().default(''),
  category: z.enum(categories as unknown as [string, ...string[]]),
  /** last substantial edit; dateModified falls back to `date` */
  updated: z.coerce.date().optional(),
  /** meta / OGP description; falls back to the start of the body */
  description: z.string().optional(),
  /** keywords (JSON-LD) and article:tag (OGP) */
  tags: z.array(z.string()).default([]),
  notes: z.array(note).default([]),
});

/** Published articles from Supabase, converted to fragments markup. */
const supabaseLoader: Loader = {
  name: 'supabase-articles',
  async load({ store, parseData, logger }) {
    const rows = await fetchArticles();
    const meta = await fetchCardMeta(cardUrls(rows));
    store.clear();
    for (const r of rows) {
      const id = String(r.id);
      const { html, text } = convert(r.content, r.book_links, meta);
      const data = await parseData({
        id,
        data: {
          date: parseDate(r.date),
          title: r.title,
          subtitle: r.subtitle ?? '',
          category: (categories as readonly string[]).includes(r.category) ? r.category : 'log',
          updated: r.updated_at ? new Date(r.updated_at) : undefined,
        },
      });
      store.set({ id, data, body: text, rendered: { html } });
    }
    logger.info(`${rows.length} articles from Supabase`);
  },
};

const posts = defineCollection({
  // Markdown: slug = file name (e.g. src/content/posts/2026-10-01.md → "2026-10-01")
  // Supabase: slug = the article's id (e.g. /posts/41/)
  loader: contentSource === 'supabase' ? supabaseLoader : glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema,
});

export const collections = { posts };
