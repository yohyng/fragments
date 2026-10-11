// The newsletter's full mode (購読者 → メールを送る → 全文): an article's HTML,
// as the editor saves it, turned into blocks of text with their links,
// headings, quotes, list items, images and cards, and the notes ([n] in the
// text, listed after it). src/lib/newsletter-mail.mjs draws them.
type Run = { text: string; href?: string } | { note: number };
type Block =
  | { t: 'p' | 'quote' | 'li'; runs: Run[] }
  | { t: 'h'; text: string }
  | { t: 'img'; src: string; alt: string; caption: string }
  | { t: 'card'; text: string; host: string; img: string; href: string }
  | { t: 'hr' };
type Note = { n: number; title: string; cite: string; body: string };
export function fullArticle(html: string, SITE: string) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const blocks: Block[] = [];
  const notes: Note[] = [];
  const abs = (u: string | null) => {
    try {
      const url = new URL(u ?? '', SITE);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };
  const flat = (s: string) => s.replace(/\s+/g, ' ').trim();
  const isCard = (e: Element) => e.matches('a.book-link-card');
  const runsOf = (node: Node, out: Run[] = []) => {
    node.childNodes.forEach((c) => {
      if (c.nodeType === Node.TEXT_NODE) out.push({ text: (c.textContent ?? '').replace(/\s+/g, ' ') });
      else if (c instanceof HTMLElement) {
        if (c.matches('[data-note]')) {
          const lines = (c.dataset.note ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
          const n = notes.length + 1;
          notes.push(
            lines.length >= 3
              ? { n, title: lines[0], cite: lines[1], body: lines.slice(2).join('\n') }
              : lines.length === 2
                ? { n, title: lines[0], cite: '', body: lines[1] }
                : { n, title: '', cite: '', body: lines[0] ?? '' },
          );
          out.push({ note: n });
        } else if (c.tagName === 'BR') out.push({ text: '\n' });
        else if (c.tagName === 'IMG' || isCard(c)) return;
        else if (c.tagName === 'A' && c.getAttribute('href')) out.push({ text: flat(c.textContent ?? ''), href: abs(c.getAttribute('href')) });
        else runsOf(c, out);
      }
    });
    // join neighbouring plain text, trim the ends
    const merged: Run[] = [];
    for (const r of out) {
      const last = merged[merged.length - 1];
      if ('text' in r && !r.href && last && 'text' in last && !last.href) last.text += r.text;
      else merged.push({ ...r });
    }
    const first = merged[0];
    if (first && 'text' in first) first.text = first.text.replace(/^[\s]+/, '');
    const end = merged[merged.length - 1];
    if (end && 'text' in end) end.text = end.text.replace(/[\s]+$/, '');
    return merged.filter((r) => !('text' in r) || r.text);
  };
  const img = (i: HTMLImageElement, caption = '') => {
    const src = abs(i.getAttribute('src'));
    if (src) blocks.push({ t: 'img', src, alt: i.alt || '', caption: flat(caption) });
  };
  // a link card: its title and site (the editor's two spans), its thumbnail
  const card = (a: Element) => {
    const href = abs(a.getAttribute('href'));
    if (!href) return;
    const spans = [...a.querySelectorAll(':scope > span > span')].map((s) => flat(s.textContent ?? ''));
    const title = spans[0] || flat(a.textContent ?? '');
    const host = spans[1] || (() => {
      try {
        return new URL(href).hostname;
      } catch {
        return '';
      }
    })();
    blocks.push({ t: 'card', text: title.slice(0, 160) || href, host, img: abs(a.querySelector('img')?.getAttribute('src') ?? null), href });
  };
  const text = (t: 'p' | 'quote' | 'li', node: Node) => {
    const runs = runsOf(node);
    if (runs.length) blocks.push({ t, runs });
  };
  const walk = (parent: Node) => {
    parent.childNodes.forEach((c) => {
      if (c.nodeType === Node.TEXT_NODE) {
        if ((c.textContent ?? '').trim()) blocks.push({ t: 'p', runs: [{ text: flat(c.textContent ?? '') }] });
        return;
      }
      if (!(c instanceof HTMLElement)) return;
      const tag = c.tagName;
      if (/^H[1-6]$/.test(tag)) return void (flat(c.textContent ?? '') && blocks.push({ t: 'h', text: flat(c.textContent ?? '') }));
      if (tag === 'HR') return void blocks.push({ t: 'hr' });
      if (tag === 'TABLE' || tag === 'SCRIPT' || tag === 'STYLE') return;
      if (tag === 'IMG') return img(c as HTMLImageElement);
      if (isCard(c)) return card(c);
      if (tag === 'FIGURE') {
        const i = c.querySelector('img');
        if (i) img(i, c.querySelector('figcaption')?.textContent ?? '');
        return;
      }
      if (tag === 'UL' || tag === 'OL') return c.querySelectorAll(':scope > li').forEach((li) => text('li', li));
      if (tag === 'BLOCKQUOTE') {
        const ps = c.querySelectorAll(':scope > p, :scope > div');
        return ps.length ? ps.forEach((p) => text('quote', p)) : text('quote', c);
      }
      if (tag === 'P' || tag === 'DIV') {
        if (c.querySelector('p, div, figure, ul, ol, blockquote, h1, h2, h3, h4')) return walk(c);
        // images and cards in a paragraph stand on their own, in order: the
        // text before one, the image or card, the text after it
        let part = doc.createElement('p');
        const flush = () => {
          text('p', part);
          part = doc.createElement('p');
        };
        [...c.childNodes].forEach((n) => {
          if (n instanceof HTMLElement && (n.tagName === 'IMG' || isCard(n))) {
            flush();
            if (n.tagName === 'IMG') img(n as HTMLImageElement);
            else card(n);
          } else part.append(n.cloneNode(true));
        });
        flush();
        return;
      }
      walk(c);
    });
  };
  walk(doc.body);
  return { blocks, notes };
}

