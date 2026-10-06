/**
 * Site-wide text, links and metadata. The editable parts (name, catch copy,
 * about, author, contact, OGP image, X handle) come from the display
 * settings (/admin/ → 表示設定; src/lib/settings.ts).
 * The site's URL comes from astro.config.mjs (`Astro.site`); `url` here is
 * only a fallback.
 */
import { settings } from './settings';

export const site = {
  name: settings.name,
  url: 'https://fragments-of.space',
  lang: 'ja',
  locale: 'ja_JP',
  /** as typed, line breaks kept (shown where the copy is set) */
  catchJa: settings.catchJa,
  catchEn: settings.catchEn,
  /** on one line, for descriptions and plain text */
  catchJaLine: settings.catchJa.replace(/\s*\n\s*/g, ''),
  catchEnLine: settings.catchEn.replace(/\s*\n\s*/g, ' '),
  /** meta description of the site */
  description: settings.description,
  about: settings.about,
  author: {
    name: settings.authorName,
    url: 'https://fragments-of.space/about/',
  },
  /** absolute or root-relative URL of the default OGP image (1200×630); empty = none */
  ogImage: settings.ogImage,
  /** X (Twitter) handle for twitter:site, e.g. '@fragments'; empty = none */
  twitter: settings.twitter,
  contact: settings.contact,
};
