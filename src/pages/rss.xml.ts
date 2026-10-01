import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts, excerpt } from '../lib/posts';
import { site } from '../lib/site';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: site.name,
    description: site.description,
    site: context.site ?? site.url,
    items: posts.map((p) => ({
      title: p.subtitle ? `${p.title} — ${p.subtitle}` : p.title,
      pubDate: p.date,
      description: excerpt(p, 200),
      link: `/posts/${p.slug}/`,
      categories: [p.category, ...p.tags],
    })),
    customData: `<language>${site.lang}</language>`,
  });
}
