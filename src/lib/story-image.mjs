// A 1080×1920 image of an article for an Instagram story: the article page
// as the site shows it on a phone, scaled up — the header rule with the site
// name, the title, subtitle and date over a light rule, the first image of
// the article if it has one, then the opening of the text fading out, and the
// site's address at the foot. Set with the site's fonts (表示設定), fetched
// from Google Fonts for just the characters used.
// Story apps cover the top and bottom ~220px with their own controls, so
// nothing that matters sits there.

import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { fromHtml } from 'hast-util-from-html';
import { toText } from 'hast-util-to-text';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.mjs';

const W = 1080;
const H = 1920;
const X = 84; // side margin
const C = { accent: '#0000ff', bg: '#ffffff', text: '#201f1d', sub: '#605d5d', light: '#9b9797', divider: '#d4d3d2' };
const SITE = 'fragments-of.space';
const FOOT = 310; // the white band under the bottom rule, for the link sticker
// the arrow's box; its stroke (viewBox -1…25, path 2…22) shows from 6px to
// 76px down the box. It sits at the foot: the stroke ends 24px above the
// image's bottom edge.
const ARROW = { x: 864, y: FOOT - 24 - 76, size: 82 };
// the middle of the arrow's stroke (viewBox -1…25, stroke 2…22)
const ARROW_MID = Math.round(ARROW.x + (ARROW.size * 13) / 26);
// 「記事を読む」 (31px high) just above the arrow's stroke, centred over it
const READ_TOP = ARROW.y + 6 - 10 - 31;

const anon = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };

/** An article, or null. With the public key only a published one (row-level
 *  security hides the rest); the server's key reads any (for the admin). */
export async function fetchArticle(id, key) {
  if (!/^\d+$/.test(String(id))) return null;
  const headers = key ? { apikey: key, Authorization: `Bearer ${key}` } : anon;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/articles?id=eq.${id}&select=id,title,subtitle,date,category,content,status`, { headers });
  if (!res.ok) return null;
  return (await res.json())[0] ?? null;
}

async function fetchSettings() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/fragments_settings?id=eq.1&select=data`, { headers: anon });
    return res.ok ? ((await res.json())[0]?.data ?? {}) : {};
  } catch {
    return {};
  }
}

const ymd = (s) => {
  const m = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/.exec(String(s ?? ''));
  return m ? `${m[1]}.${m[2].padStart(2, '0')}.${m[3].padStart(2, '0')}` : String(s ?? '');
};

// ── the article: its first image and opening paragraphs ──

const isEl = (n, tag) => n?.type === 'element' && (!tag || n.tagName === tag);
const cls = (n) => [].concat(n.properties?.className ?? []).join(' ');

function readContent(html) {
  const tree = fromHtml(String(html ?? ''), { fragment: true });
  let image = null;
  (function find(n, inCard) {
    for (const c of n.children ?? []) {
      if (image) return;
      const card = inCard || (isEl(c, 'a') && /card|el-/.test(cls(c)));
      if (isEl(c, 'img') && !card && c.properties?.src) image = String(c.properties.src);
      else find(c, card);
    }
  })(tree, false);
  // notes, note numbers and pictures out of the text
  (function strip(n) {
    n.children = (n.children ?? []).filter(
      (c) => !(isEl(c) && (c.properties?.dataNote !== undefined || ['sup', 'aside', 'img', 'figure', 'table'].includes(c.tagName) || /card/.test(cls(c)))),
    );
    n.children.forEach(strip);
  })(tree);
  const paras = [];
  let total = 0;
  for (const c of tree.children) {
    if (!isEl(c) || !['p', 'blockquote', 'h2', 'h3'].includes(c.tagName)) continue;
    const t = toText(c).replace(/\s+/g, ' ').trim();
    if (!t) continue;
    paras.push(t);
    total += t.length;
    if (total > 420) break;
  }
  return { image, paras };
}

// ── images: PNG or JPEG, with their size ──

function imageSize(b) {
  if (b[0] === 0x89 && b[1] === 0x50) return { type: 'png', w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { type: 'jpeg', h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + len;
    }
  }
  return null;
}

async function loadImage(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const size = imageSize(buf);
    if (!size || !size.w || !size.h) return null; // WebP and the rest: left out
    return { src: `data:image/${size.type};base64,${buf.toString('base64')}`, ...size };
  } catch {
    return null;
  }
}

// ── fonts: Google Fonts, cut to the characters used ──

async function loadFont(family, weight, text, style = 'normal') {
  const axis = style === 'italic' ? `:ital,wght@1,${weight}` : weight !== 400 ? `:wght@${weight}` : '';
  const q = `family=${encodeURIComponent(family).replace(/%20/g, '+')}${axis}&text=${encodeURIComponent(text)}`;
  const css = await fetch(`https://fonts.googleapis.com/css2?${q}`).then((r) => (r.ok ? r.text() : ''));
  const url = /src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/.exec(css)?.[1];
  if (!url) return null;
  const data = await fetch(url).then((r) => (r.ok ? r.arrayBuffer() : null));
  return data && { name: family, data, weight, style };
}

// ── layout (satori elements) ──

const h = (type, style, ...children) => {
  const kids = children.flat().filter((c) => c !== null && c !== false && c !== undefined);
  // blocks keep their height (satori's flex items shrink by default)
  return { type, props: { style: { flexShrink: 0, ...style }, children: kids.length === 1 ? kids[0] : kids } };
};

function layout({ name, title, subtitle, date, image, paras, fonts }) {
  const imgW = W - X * 2;
  let imgH = 0;
  // its own shape, up to 840px tall (a tall one, e.g. a book cover, whole
  // and centred, as the site shows it); smaller when the title is long, so
  // the text below keeps its five lines
  if (image) imgH = Math.round(Math.min(840, (imgW * image.h) / image.w));
  const line = 38 * 1.9;
  return h(
    'div',
    { width: W, height: H, display: 'flex', flexDirection: 'column', background: C.bg, padding: `200px ${X}px 0`, color: C.text },
    // header: the site name over the rule, and at its right end 「new post」 (italic) in
    // white on the accent (as the site's note numbers), clear of the
    // story's own controls above
    h(
      'div',
      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 14, borderBottom: `2px solid ${C.sub}` },
      h('div', { display: 'flex', fontFamily: fonts.latinHeading, fontSize: 76, lineHeight: 1.2 }, name),
      h(
        'div',
        { display: 'flex', marginBottom: 12, padding: '8px 22px 11px 20px', background: C.accent, color: '#fff', fontFamily: fonts.latinBody, fontStyle: 'italic', fontSize: 38, lineHeight: 1.2, letterSpacing: 1 },
        'new post',
      ),
    ),
    // title block
    h('div', { display: 'flex', marginTop: 52, fontFamily: fonts.jaHeading, fontWeight: fonts.headingWeight, fontSize: 62, lineHeight: 1.5, letterSpacing: 1 }, title),
    subtitle ? h('div', { display: 'flex', marginTop: 14, fontFamily: fonts.jaHeading, fontSize: 36, lineHeight: 1.6, color: C.sub }, subtitle) : null,
    h('div', { display: 'flex', marginTop: 28, paddingBottom: 30, borderBottom: `2px solid ${C.divider}`, fontFamily: fonts.latinBody, fontSize: 30, color: C.sub, letterSpacing: 1 }, date),
    // the first image
    image ? { type: 'img', props: { src: image.src, width: imgW, height: imgH, style: { flexShrink: 1, minHeight: 200, marginTop: 64, width: imgW, height: imgH, objectFit: 'contain' } } } : null,
    // the opening, fading out
    h(
      'div',
      // with an image: five lines; without: down to the foot
      image
        ? { display: 'flex', flexDirection: 'column', height: Math.round(line * 5), overflow: 'hidden', position: 'relative', margin: '56px 0 32px' }
        : { display: 'flex', flexDirection: 'column', flexGrow: 1, flexShrink: 1, minHeight: 0, overflow: 'hidden', position: 'relative', margin: '60px 0 32px' },
      paras.map((t, i) =>
        h('div', { display: 'flex', marginTop: i ? 40 : 0, fontFamily: fonts.jaBody, fontSize: 38, lineHeight: 1.9, textAlign: 'justify' }, `　${t}`),
      ),
      h('div', { display: 'flex', position: 'absolute', left: 0, right: 0, bottom: 0, height: image ? Math.round(line * 1.6) : 260, backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0), ${C.bg})` }, []),
    ),
    // what the image and five lines leave goes above the foot
    image ? h('div', { display: 'flex', flexGrow: 1 }, []) : null,
    // foot: the rule, and under it a band (white, as the whole image and the link
    // sticker put there) with ↗ at its right end — the sticker goes to its
    // left and reads as one line with it
    h('div', { display: 'flex', borderTop: `2px solid ${C.sub}` }, []),
    h(
      'div',
      { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative', height: FOOT, margin: `0 -${X}px`, background: '#fff' },
      // 「記事を読む」, small, just under the rule, centred over the ↗
      h(
        'div',
        { display: 'flex', justifyContent: 'center', position: 'absolute', left: ARROW_MID - 100, top: READ_TOP, width: 200, fontFamily: fonts.jaBody, fontSize: 24, lineHeight: 1.3, color: C.sub },
        '記事を読む',
      ),
      // ↗ where the sticker's own arrow would be (a little to its right), as
      // tall as the sticker's capitals and about as heavy; the sticker is
      // set with its text alone (「READ THE ARTICLE」) to its left
      {
        type: 'svg',
        props: {
          style: { position: 'absolute', left: ARROW.x, top: ARROW.y, width: ARROW.size, height: ARROW.size },
          width: ARROW.size,
          height: ARROW.size,
          viewBox: '-1 -1 26 26',
          children: { type: 'path', props: { d: 'M2 22 L22 2 M7 2 H22 V17', stroke: '#000', strokeWidth: 2.2, fill: 'none' } },
        },
      },
    ),
  );
}

/** The story image of an article, as PNG bytes; null if there is none (with
 *  the public key: none published). `key`: the server's key, for any article. */
export async function storyImage(id, { key } = {}) {
  const [a, s] = await Promise.all([fetchArticle(id, key), fetchSettings()]);
  if (!a) return null;
  return renderStory(a, s);
}

async function renderStory(a, s) {
  const { image: imageUrl, paras } = readContent(a.content);
  const image = imageUrl ? await loadImage(imageUrl) : null;
  const name = s.name || 'fragments';
  const title = String(a.title ?? '');
  const subtitle = String(a.subtitle ?? '');
  const date = ymd(a.date);
  const text = [name, title, subtitle, date, '記事を読む', '　', ...paras].join('');
  const fam = {
    latinHeading: s.fontLatinHeading || 'Cormorant Garamond',
    latinBody: s.fontLatinBody || 'Lora',
    jaHeading: s.fontJaHeading || 'Shippori Mincho',
    jaBody: s.fontJaBody || 'Zen Old Mincho',
  };
  const heading500 = await loadFont(fam.jaHeading, 500, title + subtitle);
  const loaded = await Promise.all([
    loadFont(fam.latinHeading, 400, name),
    loadFont(fam.latinBody, 400, date),
    loadFont(fam.latinBody, 400, 'new post', 'italic'),
    heading500 ?? loadFont(fam.jaHeading, 400, title + subtitle),
    heading500 ? loadFont(fam.jaHeading, 400, subtitle) : null,
    loadFont(fam.jaBody, 400, text),
  ]);
  const fonts = loaded.filter(Boolean);
  if (!fonts.length) throw new Error('fonts could not be loaded');
  const svg = await satori(
    layout({
      name,
      title,
      subtitle,
      date,
      image,
      paras,
      fonts: {
        ...Object.fromEntries(Object.entries(fam).map(([k, v]) => [k, `'${v}', '${fam.jaBody}'`])),
        headingWeight: heading500 ? 500 : 400,
      },
    }),
    { width: W, height: H, fonts },
  );
  return new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
}

/** For the file name: 「fragments-story-41.png」 */
export const storyFileName = (id) => `fragments-story-${id}.png`;
