// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import rehypeSidenotes from './src/lib/rehype-sidenotes.mjs';

// The site's own URL (canonical, OGP, sitemap, RSS, robots.txt, llms.txt).
// SITE_URL overrides it; previews link to production on purpose.
const site = process.env.SITE_URL || 'https://fragments-of.space';

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
