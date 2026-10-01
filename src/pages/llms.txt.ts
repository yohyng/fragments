import type { APIRoute } from 'astro';
import { getPosts, excerpt, formatDate } from '../lib/posts';
import { categories } from '../content.config';
import { site } from '../lib/site';

// https://llmstxt.org/ — what the site is, then its articles by category.
export const GET: APIRoute = async ({ site: astroSite }) => {
  const base = astroSite ?? new URL(site.url);
  const posts = await getPosts();
  const link = (path: string) => new URL(path, base).href;
  const lines = [
    `# ${site.name}`,
    '',
    `> ${site.catchJa.replace(/\s*\/$/, '')} — ${site.catchEn}`,
    '',
    `${site.name} は、建築・空間・デザインをめぐる長文（批評・エッセイ・論考）を中心とした個人メディアです。著者：${site.author.name}。言語：日本語。`,
    '記事ページは本文・注（出典の書誌情報つき）を含めてすべて静的な HTML です。',
    '',
    '## About',
    '',
    `- [about](${link('/about/')}): メディアについて、連絡先`,
    `- [RSS](${link('/rss.xml')}): 新着記事のフィード`,
    `- [Sitemap](${link('/sitemap.xml')}): 全ページの一覧`,
    '',
  ];
  for (const cat of categories) {
    const inCat = posts.filter((p) => p.category === cat);
    if (!inCat.length) continue;
    lines.push(`## ${cat}`, '');
    for (const p of inCat) {
      const title = p.subtitle ? `${p.title}：${p.subtitle}` : p.title;
      lines.push(`- [${title}](${link(`/posts/${p.slug}/`)}): ${formatDate(p.date)}。${p.body.trim() ? excerpt(p, 80) : ''}`.replace(/。$/, ''));
    }
    lines.push('');
  }
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
