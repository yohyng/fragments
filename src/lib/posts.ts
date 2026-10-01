import { getCollection, type CollectionEntry } from 'astro:content';
import type { Category } from '../content.config';

export type { Category };

export interface Note {
  id: string;
  title: string;
  cite?: string;
  body: string;
}

export interface Post {
  slug: string;
  date: Date;
  title: string;
  subtitle: string;
  category: Category;
  updated?: Date;
  description?: string;
  tags: string[];
  /** Markdown source; sidenotes are referenced as `[^id]` */
  body: string;
  notes: Note[];
  entry: CollectionEntry<'posts'>;
}

/** All posts, newest first. */
export async function getPosts(): Promise<Post[]> {
  const entries = await getCollection('posts');
  return entries
    .map((entry) => ({
      slug: entry.id,
      ...entry.data,
      body: entry.body ?? '',
      entry,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** "2026.10.01" */
export function formatDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}.${p(date.getUTCMonth() + 1)}.${p(date.getUTCDate())}`;
}

/** Plain-text start of a post body (Markdown/MDX), for descriptions. */
export function excerpt(post: Post, length = 120): string {
  if (post.description) return post.description;
  const text = post.body
    .replace(/^(import|export) .*$/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\^[\w-]+\]/g, '')
    .replace(/[#>*_`]/g, '')
    .replace(/\s*\n\s*/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
  if (!text) return post.subtitle ? `${post.title} — ${post.subtitle}` : post.title;
  return text.length > length ? text.slice(0, length) + '…' : text;
}

/** "2026-10-01" (frontmatter dates carry no time, so none is invented) */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
