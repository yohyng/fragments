// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import rehypeSidenotes from './src/lib/rehype-sidenotes.mjs';

// The site's own URL (canonical, OGP, sitemap, RSS, robots.txt, llms.txt).
// SITE_URL wins when set (e.g. a custom domain); on Vercel it otherwise
// follows the project's production domain, so previews link to production.
const site =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'https://example.com');

// https://astro.build/config
export default defineConfig({
  site,
  trailingSlash: 'always',
  integrations: [mdx()],
  markdown: {
    // smartypants off: keep the text exactly as written
    processor: unified({ smartypants: false, rehypePlugins: [rehypeSidenotes] }),
  },
});
