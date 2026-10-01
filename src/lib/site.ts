/**
 * Site-wide text, links and metadata.
 * TODO(before launch): `url`, `author` and `ogImage` are placeholders.
 * `url` must also be set as `site` in astro.config.mjs.
 */
export const site = {
  name: 'fragments',
  url: 'https://example.com',
  lang: 'ja',
  locale: 'ja_JP',
  catchJa: '建築・空間・デザインをめぐる思索、試論 /',
  catchEn: 'Explorations and Abductive Speculations on Architecture, Space, and Design.',
  /** meta description of the site */
  description:
    '建築・空間・デザインをめぐる思索、試論。批評・エッセイ・論考を中心とした個人メディア。Explorations and Abductive Speculations on Architecture, Space, and Design.',
  about: 'メディアについての説明文（運営者、更新の方針など）がここに入ります。',
  author: {
    name: '著者名',
    url: 'https://example.com/about/',
  },
  /** absolute or root-relative URL of the default OGP image (1200×630); empty = none */
  ogImage: '',
  /** X (Twitter) handle for twitter:site, e.g. '@fragments'; empty = none */
  twitter: '',
  contact: [
    { label: 'mail@example.com', href: 'mailto:mail@example.com' },
    { label: 'Twitter', href: '#' },
    { label: 'Instagram', href: '#' },
    { label: 'Facebook', href: '#' },
    { label: 'Website', href: '#' },
  ],
};
