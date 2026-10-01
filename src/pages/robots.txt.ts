import type { APIRoute } from 'astro';
import { site } from '../lib/site';

// Every crawler is welcome, AI crawlers included. They are also named
// explicitly so a later blanket rule cannot shut them out by accident.
const aiBots = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'Meta-ExternalAgent',
  'Amazonbot',
  'DuckAssistBot',
  'cohere-ai',
];

export const GET: APIRoute = ({ site: astroSite }) => {
  const base = astroSite ?? new URL(site.url);
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    ...aiBots.map((b) => `User-agent: ${b}`),
    'Allow: /',
    '',
    `Sitemap: ${new URL('/sitemap.xml', base).href}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
