import type { APIRoute } from 'astro';
import { getPosts, isoDate } from '../lib/posts';
import { site } from '../lib/site';

// /elements/ (the element sample) is left out: it is noindex.
export const GET: APIRoute = async ({ site: astroSite }) => {
  const base = astroSite ?? new URL(site.url);
  const posts = await getPosts();
  const urls = [
    { loc: '/', lastmod: posts[0] && isoDate(posts[0].updated ?? posts[0].date) },
    { loc: '/about/' },
    ...posts.map((p) => ({ loc: `/posts/${p.slug}/`, lastmod: isoDate(p.updated ?? p.date) })),
  ];
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map((u) => `  <url><loc>${new URL(u.loc, base).href}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
      .join('\n') +
    '\n</urlset>\n';
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
