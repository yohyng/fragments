// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import rehypeSidenotes from './src/lib/rehype-sidenotes.mjs';

// https://astro.build/config
export default defineConfig({
  integrations: [mdx()],
  markdown: {
    // smartypants off: keep the text exactly as written
    processor: unified({ smartypants: false, rehypePlugins: [rehypeSidenotes] }),
  },
});
