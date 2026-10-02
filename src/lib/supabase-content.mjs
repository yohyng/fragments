// Articles from Supabase (the `articles` table the previous site, studieslog,
// writes to), converted to the markup the fragments design expects.
//
// The editor's HTML differs from what fragments sets:
// - empty paragraphs (<p><br></p>) were used as blank lines between
//   paragraphs → removed (fragments: no gap, first-line indent)
// - <div> is used as a paragraph → <p>
// - notes are <sup class="footnote-ref" data-note="…">[n]</sup>; the note
//   text holds 見出し / 書誌 / 本文 on separate lines (or just a 本文)
//   → number + floated sidenote + entry in the list after the body
// - images (bare, in a paragraph, or <figure class="image-figure">) keep the
//   width the editor gave them (50% / 75%) → .el-figure--natural
// - <a class="book-link-card"> and the book_links column → .el-book / .el-link
// - inline styles and editor classes are dropped

import { fromHtml } from 'hast-util-from-html';
import { toHtml } from 'hast-util-to-html';
import { toText } from 'hast-util-to-text';
import { el, text, buildNote, notesList } from './rehype-sidenotes.mjs';

export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eiyzlawmcyybchxzyozr.supabase.co';
// The public (anon) key: read access to published articles only, by the
// table's row-level security. It is already public in studieslog's pages.
export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpeXpsYXdtY3l5YmNoeHp5b3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMDI2MjQsImV4cCI6MjA5NTU3ODYyNH0.SZVwqWKkk31npqdiiG5m3HdkF4JnQ7SgEzThaFfZ4q4';

/** Published articles, plus scheduled ones whose time has come (RLS decides). */
export async function fetchArticles() {
  const cols = 'id,date,title,subtitle,category,content,book_links,updated_at';
  const res = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=${cols}&order=date.desc,id.desc`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`[supabase] articles: ${res.status} ${await res.text()}`);
  return res.json();
}

/** "2026.08.21" → Date (UTC midnight) */
export function parseDate(s) {
  const m = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/.exec(s || '');
  if (!m) throw new Error(`[supabase] unreadable date "${s}"`);
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

const isEl = (n, ...tags) => n && n.type === 'element' && (!tags.length || tags.includes(n.tagName));
const cls = (n) => [].concat(n.properties?.className ?? []);
const isBlank = (n) =>
  (n.type === 'text' && !n.value.trim()) || isEl(n, 'br') || (n.type === 'element' && !n.children?.length && !isEl(n, 'img'));

/** Lines of a data-note: 見出し / 書誌 / 本文, or only a 本文 */
function parseNote(raw) {
  const lines = String(raw || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 3) return { title: lines[0], cite: lines[1], body: lines.slice(2).join('\n') };
  if (lines.length === 2) return { title: lines[0], body: lines[1] };
  return { body: lines[0] ?? '' };
}

function figure(img, caption) {
  const width = /width:\s*([\d.]+%)/.exec(String(img.properties?.style || ''))?.[1];
  const image = el('img', {
    src: img.properties.src,
    alt: img.properties.alt || '',
    loading: 'lazy',
    decoding: 'async',
    ...(width ? { style: `width: ${width}` } : {}),
  }, []);
  return el('figure', { className: ['el-figure', 'el-figure--natural'] }, [
    image,
    ...(caption ? [el('figcaption', {}, caption)] : []),
  ]);
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

/**
 * A card title. The editor stores the URL itself when it could not read the
 * page's title: show the book name from an Amazon URL, or the decoded URL.
 */
function readableTitle(title, url) {
  if (title && !/^https?:\/\//.test(title)) return title;
  let decoded = url;
  try {
    decoded = decodeURIComponent(url);
  } catch {}
  const amazon = /amazon\.[^/]+\/(?:([^/]+)\/)?(?:dp|gp\/product)\//.exec(decoded);
  if (amazon?.[1]) return amazon[1].replace(/-/g, ' ');
  return decoded;
}

/** A link card: with an image it is a book (cover), otherwise a plain link. */
function card({ url, title: rawTitle, image }) {
  const domain = hostOf(url);
  const title = readableTitle(rawTitle, url);
  const attrs = { href: url, target: '_blank', rel: 'noopener' };
  if (image) {
    const store = domain.includes('amazon.') ? 'Amazon' : domain;
    return el('a', { ...attrs, className: ['el-book'] }, [
      el('img', { className: ['el-cover'], src: image, alt: '', loading: 'lazy', decoding: 'async' }, []),
      el('div', { className: ['el-info'] }, [
        el('span', { className: ['el-title'] }, [text(title || domain)]),
        el('span', { className: ['el-store'] }, [text(`${store} ↗`)]),
      ]),
    ]);
  }
  return el('a', { ...attrs, className: ['el-link'] }, [
    el('span', { className: ['el-domain'] }, [text(domain)]),
    el('span', { className: ['el-title'] }, [text(title || url)]),
  ]);
}

/** <a class="book-link-card"> from the editor → card() */
function editorCard(a) {
  const img = (function find(n) {
    if (isEl(n, 'img')) return n;
    for (const c of n.children ?? []) {
      const f = find(c);
      if (f) return f;
    }
  })(a);
  // the card's text column holds the title first, then the domain
  const spans = [];
  (function collect(n) {
    for (const c of n.children ?? []) {
      if (isEl(c, 'span') && !c.children.some((x) => isEl(x, 'span'))) spans.push(toText(c).trim());
      else collect(c);
    }
  })(a);
  return card({ url: a.properties.href, title: spans.find(Boolean), image: img?.properties.src });
}

/**
 * Editor HTML → { html, text } in fragments markup.
 * bookLinks: the article's book_links column [{ url, label, image, domain }]
 */
export function convert(html, bookLinks = []) {
  const root = fromHtml(html || '', { fragment: true });
  let count = 0;
  const listed = [];

  // inline content: notes, cleaned attributes
  const inline = (n) => {
    if (n.type !== 'element') return [n];
    if (isEl(n, 'sup') && cls(n).includes('footnote-ref')) {
      const num = ++count;
      const { ref, aside, item } = buildNote(`n${num}`, num, parseNote(n.properties.dataNote));
      listed.push(item);
      return [ref, aside];
    }
    if (isEl(n, 'a') && cls(n).includes('book-link-card')) return [editorCard(n)];
    const props = {};
    if (isEl(n, 'a')) Object.assign(props, { href: n.properties.href }, n.properties.target ? { target: '_blank', rel: 'noopener' } : {});
    if (isEl(n, 'img')) Object.assign(props, { src: n.properties.src, alt: n.properties.alt || '' });
    return [el(n.tagName, props, n.children.flatMap(inline))];
  };

  // a paragraph (p or div): images and cards come out as blocks of their own
  const paragraph = (n) => {
    const out = [];
    let run = [];
    const flush = () => {
      while (run.length && isBlank(run[0])) run.shift();
      while (run.length && isBlank(run.at(-1))) run.pop();
      if (run.length) {
        const kids = run.flatMap(inline);
        const hasNote = kids.some((k) => isEl(k, 'aside'));
        const blocks = kids.filter((k) => isEl(k, 'a') && cls(k).some((c) => c === 'el-book' || c === 'el-link'));
        if (blocks.length === kids.length) out.push(...blocks);
        else out.push(hasNote ? el('div', { className: ['p'] }, kids) : el('p', {}, kids));
      }
      run = [];
    };
    for (const c of n.children) {
      if (isEl(c, 'p', 'div', 'figure', 'h2', 'h3', 'blockquote', 'ul', 'ol')) {
        // a paragraph inside a paragraph (<div><p>…</p></div>)
        flush();
        out.push(...block(c));
      } else if (isEl(c, 'img')) {
        flush();
        out.push(figure(c));
      } else if (isEl(c, 'a') && cls(c).includes('book-link-card')) {
        flush();
        out.push(editorCard(c));
      } else run.push(c);
    }
    flush();
    return out;
  };

  const block = (n) => {
    if (n.type === 'text') return n.value.trim() ? paragraph({ children: [n] }) : [];
    if (n.type !== 'element') return [];
    if (isEl(n, 'p', 'div')) return paragraph(n);
    if (isEl(n, 'img')) return [figure(n)];
    if (isEl(n, 'figure')) {
      const img = n.children.find((c) => isEl(c, 'img'));
      const cap = n.children.find((c) => isEl(c, 'figcaption'));
      return img ? [figure(img, cap ? cap.children.flatMap(inline) : null)] : [];
    }
    if (isEl(n, 'a') && cls(n).includes('book-link-card')) return [editorCard(n)];
    if (isEl(n, 'h2', 'h3')) return [el(n.tagName, {}, n.children.flatMap(inline))];
    if (isEl(n, 'blockquote')) return [el('blockquote', {}, n.children.flatMap(block))];
    if (isEl(n, 'ul', 'ol')) return [el(n.tagName, {}, n.children.filter((c) => isEl(c, 'li')).map((li) => el('li', {}, li.children.flatMap(inline))))];
    return paragraph(n);
  };

  const children = root.children.flatMap(block);
  for (const b of bookLinks || []) if (b?.url) children.push(card({ url: b.url, title: b.label, image: b.image }));
  if (listed.length) children.push(notesList(listed));

  const tree = { type: 'root', children };
  // plain text of the body (descriptions, RSS, llms.txt), without the notes
  const plain = children
    .filter((c) => !isEl(c, 'section', 'figure') && !cls(c).some((x) => x.startsWith('el-')))
    .map((c) => toText({ type: 'root', children: [c] }).replace(/\s+/g, ' ').trim())
    .join('\n\n');
  return { html: toHtml(tree), text: stripNoteText(children, plain) };
}

// toText of a paragraph includes its floated notes; take them out again
function stripNoteText(children, plain) {
  let out = plain;
  (function walk(n) {
    for (const c of n.children ?? []) {
      if (isEl(c, 'aside') || isEl(c, 'sup')) {
        const t = toText(c).replace(/\s+/g, ' ').trim();
        if (t) out = out.replace(t, '');
      } else walk(c);
    }
  })({ children });
  return out.replace(/ {2,}/g, ' ').trim();
}
