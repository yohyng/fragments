// More for link cards, looked up when the site is built. The editor stores
// only a card's URL, title, domain and image; here each card's page is read
// again for its description and site name, and a book (an ISBN in the URL or
// on the page) is looked up in openBD, then Google Books, for its cover,
// author, publisher and year. Anything that cannot be read (a site refusing
// robots, Amazon, no network) leaves the card as it was.

const TIMEOUT = 7000;
const MAX_HTML = 1_500_000;
const UA = 'Mozilla/5.0 (compatible; fragments-site-build; +https://fragments-of.space)';

/** Card URLs in the articles: editor cards and the book_links column. */
export function cardUrls(rows) {
  const urls = new Set();
  for (const r of rows) {
    for (const m of String(r.content ?? '').matchAll(/<a\b[^>]*>/g)) {
      if (!/class="[^"]*book-link-card/.test(m[0])) continue;
      const href = /href="([^"]+)"/.exec(m[0])?.[1];
      if (href) urls.add(decodeEntities(href));
    }
    for (const b of Array.isArray(r.book_links) ? r.book_links : []) if (b?.url) urls.add(b.url);
  }
  return [...urls];
}

/** url → { description?, siteName?, title?, image?, book?: { title, author, publisher, year, cover } } */
export async function fetchCardMeta(urls, { concurrency = 6 } = {}) {
  const meta = new Map();
  const isbns = new Map(); // url → isbn13
  await pool(urls, concurrency, async (url) => {
    const m = {};
    let isbn = isbnFromUrl(url);
    if (!isAmazon(url)) {
      const page = await readPage(url);
      if (page) {
        Object.assign(m, pageMeta(page));
        isbn ??= isbnFromPage(page);
      }
    }
    meta.set(url, m);
    if (isbn) isbns.set(url, isbn);
  });
  const books = await lookupBooks([...new Set(isbns.values())]);
  for (const [url, isbn] of isbns) {
    const book = books.get(isbn);
    if (book) meta.get(url).book = book;
  }
  const found = [...meta.values()].filter((m) => m.book || m.description).length;
  console.log(`[cards] ${urls.length} cards, ${books.size} books found, ${found} with more to show`);
  return meta;
}

// ── pages ──

async function get(url, accept) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept, 'accept-language': 'ja,en;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT),
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

async function readPage(url) {
  const res = await get(url, 'text/html,application/xhtml+xml');
  if (!res || !/html/i.test(res.headers.get('content-type') ?? '')) return null;
  try {
    const buf = new Uint8Array(await res.arrayBuffer()).slice(0, MAX_HTML);
    // Japanese sites still use Shift_JIS / EUC-JP: the header, then <meta charset>
    const head = new TextDecoder('latin1').decode(buf.slice(0, 4096));
    const charset =
      /charset=["']?([\w-]+)/i.exec(res.headers.get('content-type') ?? '')?.[1] ?? /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1] ?? 'utf-8';
    let dec;
    try {
      dec = new TextDecoder(charset);
    } catch {
      dec = new TextDecoder('utf-8');
    }
    return { url: res.url || url, html: dec.decode(buf) };
  } catch {
    return null;
  }
}

function metaContent(html, ...names) {
  for (const name of names) {
    for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
      const t = tag[0];
      const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(t)?.[1];
      if (key?.toLowerCase() !== name) continue;
      const v = /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(t);
      const value = clean(decodeEntities(v?.[1] ?? v?.[2] ?? ''));
      if (value) return value;
    }
  }
  return '';
}

function pageMeta({ html, url }) {
  const title = metaContent(html, 'og:title', 'twitter:title') || clean(decodeEntities(/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? ''));
  const description = metaContent(html, 'og:description', 'description', 'twitter:description');
  const siteName = metaContent(html, 'og:site_name', 'application-name');
  let image = metaContent(html, 'og:image', 'og:image:url', 'twitter:image');
  try {
    if (image) image = new URL(image, url).href;
  } catch {
    image = '';
  }
  return {
    ...(title && { title }),
    ...(description && { description: shorten(description, 140) }),
    ...(siteName && { siteName }),
    ...(image && { image }),
  };
}

// ── ISBN ──

const isAmazon = (url) => /\/\/[^/]*amazon\./i.test(url);

function isbnFromUrl(url) {
  const asin = /\/(?:dp|gp\/product|ASIN)\/([0-9]{9}[0-9X])(?=[/?#]|$)/i.exec(url)?.[1];
  if (asin) return toIsbn13(asin);
  const m = /(97[89]\d{10})/.exec(url.replace(/-/g, ''));
  return m && validIsbn13(m[1]) ? m[1] : null;
}

function isbnFromPage({ html }) {
  const text = html.replace(/<[^>]+>/g, ' ');
  for (const m of text.matchAll(/ISBN[^0-9]{0,12}((?:97[89][-\s]?)?[0-9][-\s0-9]{8,15}[0-9X])/gi)) {
    const d = m[1].replace(/[-\s]/g, '');
    if (d.length === 13 && validIsbn13(d)) return d;
    if (d.length === 10) {
      const i = toIsbn13(d);
      if (i) return i;
    }
  }
  const og = metaContent(html, 'books:isbn', 'book:isbn');
  return og && validIsbn13(og.replace(/-/g, '')) ? og.replace(/-/g, '') : null;
}

function validIsbn13(d) {
  if (!/^97[89]\d{10}$/.test(d)) return false;
  const sum = [...d].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0);
  return sum % 10 === 0;
}

function toIsbn13(isbn10) {
  if (!/^\d{9}[\dX]$/i.test(isbn10)) return null;
  const sum10 = [...isbn10.toUpperCase()].reduce((s, c, i) => s + (c === 'X' ? 10 : Number(c)) * (10 - i), 0);
  if (sum10 % 11 !== 0) return null; // an Amazon ASIN, not an ISBN
  const core = '978' + isbn10.slice(0, 9);
  const check = (10 - ([...core].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0) % 10)) % 10;
  return core + check;
}

// ── books ──

async function lookupBooks(isbns) {
  const books = new Map();
  for (let i = 0; i < isbns.length; i += 100) {
    const batch = isbns.slice(i, i + 100);
    const res = await get(`https://api.openbd.jp/v1/get?isbn=${batch.join(',')}`, 'application/json');
    const data = res ? await res.json().catch(() => null) : null;
    (Array.isArray(data) ? data : []).forEach((d, j) => {
      const s = d?.summary;
      if (!s?.title) return;
      books.set(batch[j], {
        title: clean(s.title),
        author: clean(s.author ?? ''),
        publisher: clean(s.publisher ?? ''),
        year: /\d{4}/.exec(s.pubdate ?? '')?.[0] ?? '',
        cover: s.cover || '',
      });
    });
  }
  // what openBD does not have (the book, or its cover): Google Books
  await pool(
    isbns.filter((i) => !books.get(i)?.cover),
    4,
    async (isbn) => {
      const res = await get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`, 'application/json');
      const v = res ? (await res.json().catch(() => null))?.items?.[0]?.volumeInfo : null;
      if (!v?.title) return;
      const known = books.get(isbn);
      const cover = (v.imageLinks?.thumbnail ?? '').replace(/^http:/, 'https:');
      if (known) return void (known.cover = cover);
      books.set(isbn, {
        title: clean([v.title, v.subtitle].filter(Boolean).join(' ')),
        author: (v.authors ?? []).join('、'),
        publisher: clean(v.publisher ?? ''),
        year: /\d{4}/.exec(v.publishedDate ?? '')?.[0] ?? '',
        cover,
      });
    },
  );
  return books;
}

/** "トム・スタンデージ／著 服部桂／訳" → "トム・スタンデージ（著） 服部桂（訳）"; a bare name gets （著） */
export function bookLine({ author, publisher, year }) {
  // openBD writes "名前／著": as （著）, so ／ only separates the publisher
  const named = String(author ?? '').replace(/\s*／\s*(監修|監訳|編著|著|訳|編|監)/g, '（$1）');
  const who = named ? (/（(監修|監訳|編著|著|訳|編|監)）/.test(named) ? named : `${named}（著）`) : '';
  const rest = [publisher, year && `${year}年`].filter(Boolean).join('、');
  return [who, rest].filter(Boolean).join('／');
}

// ── helpers ──

async function pool(items, n, fn) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

const clean = (s) => String(s).replace(/\s+/g, ' ').trim();
const shorten = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}
