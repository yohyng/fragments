// The newsletter mail 「fragments folio」: the admin's preview and the mail
// sent by api/newsletter are both made here, so they match.
//   subject, intro, outro: text (blank line = new paragraph, line break kept)
//   articles: [{ title, subtitle?, date, url, excerpt?, blocks?, notes? }]
//     blocks / notes (full: the whole article in the mail, no 続きを読む):
//     made in the admin from the article's HTML (src/admin/subscribers.ts),
//     cleaned here (cleanArticle) before use; every string is escaped and
//     only http(s) links and images are kept
//   unsubscribe: this recipient's link; site: the site's URL

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const paras = (t) =>
  String(t ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

// ── the full article: blocks ──────────────────────────────────────────────
//   { t: 'p' | 'quote' | 'li', runs: [{ text } | { text, href } | { note: n }] }
//   { t: 'h', text }  { t: 'img', src, alt?, caption? }  { t: 'card', text, host?, img?, href }  { t: 'hr' }
//   notes: [{ n, title?, cite?, body }]
const TYPES = new Set(['p', 'quote', 'li', 'h', 'img', 'card', 'hr']);
const str = (v, max = 4000) => String(v ?? '').slice(0, max);
const httpUrl = (v) => (/^https?:\/\//i.test(String(v ?? '')) ? str(v, 2000) : '');
const cleanRuns = (runs) =>
  (Array.isArray(runs) ? runs : []).slice(0, 400).flatMap((r) => {
    if (!r || typeof r !== 'object') return [];
    if (Number.isInteger(r.note)) return [{ note: r.note }];
    const text = str(r.text);
    if (!text) return [];
    const href = httpUrl(r.href);
    return [href ? { text, href } : { text }];
  });
/** Keeps only what the full-article mail draws, in the shapes above. */
export function cleanArticle(a) {
  const blocks = (Array.isArray(a?.blocks) ? a.blocks : []).slice(0, 600).flatMap((b) => {
    if (!b || !TYPES.has(b.t)) return [];
    if (b.t === 'p' || b.t === 'quote' || b.t === 'li') {
      const runs = cleanRuns(b.runs);
      return runs.length ? [{ t: b.t, runs }] : [];
    }
    if (b.t === 'h') return b.text ? [{ t: 'h', text: str(b.text, 400) }] : [];
    if (b.t === 'img') {
      const src = httpUrl(b.src);
      return src ? [{ t: 'img', src, alt: str(b.alt, 400), caption: str(b.caption, 1000) }] : [];
    }
    if (b.t === 'card') {
      const href = httpUrl(b.href);
      return href ? [{ t: 'card', text: str(b.text, 400), host: str(b.host, 200), img: httpUrl(b.img), href }] : [];
    }
    return [{ t: 'hr' }];
  });
  const notes = (Array.isArray(a?.notes) ? a.notes : []).slice(0, 200).flatMap((n) =>
    n && Number.isInteger(n.n) ? [{ n: n.n, title: str(n.title, 400), cite: str(n.cite, 1000), body: str(n.body) }] : [],
  );
  return { blocks, notes };
}

const C = { text: '#201f1d', sub: '#6b6862', rule: '#dddad4', accent: '#0000ff', bg: '#f2f2f2' };
const SERIF = "'Zen Old Mincho','Hiragino Mincho ProN','Yu Mincho',serif";
const LATIN = "'Lora',Georgia,serif";

/**
 * @param {{ subject: string, intro?: string, outro?: string, unsubscribe: string, site: string,
 *   articles?: { title: string, subtitle?: string, date: string, url: string, excerpt?: string }[] }} mail
 */
export function renderNewsletter({ subject, intro, outro, articles = [], unsubscribe, site }) {
  const host = String(site).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const p = (t, extra = '') =>
    `<p style="margin:0 0 1.2em;font-family:${SERIF};font-size:15px;line-height:1.9;color:${C.text};${extra}">${esc(t).replace(/\n/g, '<br>')}</p>`;
  const runs = (rs) =>
    rs
      .map((r) =>
        r.note != null
          ? `<sup style="font-family:${LATIN};font-size:10px;line-height:0;color:${C.accent}">[${r.note}]</sup>`
          : r.href
            ? `<a href="${esc(r.href)}" style="color:${C.text};text-decoration:underline;text-decoration-color:${C.rule}">${esc(r.text).replace(/\n/g, '<br>')}</a>`
            : esc(r.text).replace(/\n/g, '<br>'),
      )
      .join('');
  const body = `font-family:${SERIF};font-size:15px;line-height:1.95;color:${C.text}`;
  const block = (b) => {
    if (b.t === 'p') return `<p style="margin:0 0 1em;${body}">${runs(b.runs)}</p>`;
    if (b.t === 'li') return `<p style="margin:0 0 0.4em;padding-left:1em;text-indent:-1em;${body}">・${runs(b.runs)}</p>`;
    if (b.t === 'quote')
      return `<p style="margin:0 0 1em;padding-left:14px;border-left:2px solid ${C.rule};${body};font-size:14px;color:${C.sub}">${runs(b.runs)}</p>`;
    if (b.t === 'h') return `<p style="margin:1.8em 0 0.8em;font-family:${SERIF};font-size:16.5px;line-height:1.6;color:${C.text}">${esc(b.text)}</p>`;
    if (b.t === 'img')
      return `<div style="margin:1.4em 0">${b.src ? `<img src="${esc(b.src)}" alt="${esc(b.alt)}" width="560" style="display:block;width:100%;max-width:100%;height:auto;border:0">` : ''}${
        b.caption ? `<div style="margin-top:6px;font-family:${SERIF};font-size:12px;line-height:1.7;color:${C.sub}">${esc(b.caption)}</div>` : ''
      }</div>`;
    if (b.t === 'card')
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:1.2em 0 1.4em;border:1px solid ${C.rule}"><tr>
<td style="padding:12px 14px;vertical-align:middle"><a href="${esc(b.href)}" style="font-family:${SERIF};font-size:13px;line-height:1.7;color:${C.text};text-decoration:none">${esc(b.text)} <span style="color:${C.accent}">↗</span></a>${
        b.host ? `<div style="font-family:${LATIN};font-size:11px;color:${C.sub};margin-top:2px">${esc(b.host)}</div>` : ''
      }</td>${b.img ? `<td width="72" style="width:72px;padding:8px;vertical-align:middle"><a href="${esc(b.href)}"><img src="${esc(b.img)}" alt="" width="64" style="display:block;width:64px;height:auto;border:0"></a></td>` : ''}
</tr></table>`;
    return `<div style="margin:1.6em 0;border-top:1px solid ${C.rule};font-size:0;line-height:0">&nbsp;</div>`;
  };
  const notesHtml = (notes) =>
    notes.length
      ? `<div style="margin-top:1.6em;padding-top:14px;border-top:1px solid ${C.rule}">${notes
          .map(
            (n) => `<p style="margin:0 0 0.9em;font-family:${SERIF};font-size:12.5px;line-height:1.8;color:${C.sub}"><span style="font-family:${LATIN};color:${C.accent}">[${n.n}]</span> ${
              n.title ? `<span style="color:${C.text}">${esc(n.title)}</span><br>` : ''
            }${n.cite ? `${esc(n.cite)}<br>` : ''}${esc(n.body).replace(/\n/g, '<br>')}</p>`,
          )
          .join('')}</div>`
      : '';
  const items = articles
    .map((a) => {
      const full = Array.isArray(a.blocks) && a.blocks.length > 0;
      return `<tr><td style="padding:${full ? '28px' : '22px'} 0;border-top:1px solid ${C.rule}">
<a href="${esc(a.url)}" style="font-family:${SERIF};font-size:${full ? 20 : 17}px;line-height:1.6;color:${C.text};text-decoration:none">${esc(a.title)}</a>
${a.subtitle ? `<div style="font-family:${SERIF};font-size:13px;line-height:1.6;color:${C.sub};margin-top:2px">${esc(a.subtitle)}</div>` : ''}
<div style="font-family:${LATIN};font-size:11px;color:${C.sub};margin-top:4px">${esc(a.date)}</div>
${
  full
    ? `<div style="margin-top:22px">${a.blocks.map(block).join('')}</div>${notesHtml(a.notes ?? [])}`
    : `${a.excerpt ? `<div style="font-family:${SERIF};font-size:13.5px;line-height:1.85;color:${C.sub};margin-top:10px">${esc(a.excerpt)}</div>` : ''}
<div style="margin-top:10px"><a href="${esc(a.url)}" style="font-family:${SERIF};font-size:13px;color:${C.accent}">続きを読む ↗</a></div>`
}
</td></tr>`;
    })
    .join('');
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:40px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding-bottom:6px;border-bottom:1px solid ${C.text}">
<a href="${esc(site)}" style="font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;line-height:1.2;color:${C.text};text-decoration:none">fragments</a>
<span style="font-family:${LATIN};font-style:italic;font-size:22px;color:${C.sub};margin-left:10px">folio</span>
</td></tr>
<tr><td style="padding-top:32px">${paras(intro).map((t) => p(t)).join('')}</td></tr>
${items ? `<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table></td></tr>` : ''}
${paras(outro).length ? `<tr><td style="padding-top:24px;border-top:1px solid ${C.rule}">${paras(outro).map((t) => p(t)).join('')}</td></tr>` : ''}
<tr><td style="padding-top:28px;border-top:1px solid ${C.text};font-family:${SERIF};font-size:11.5px;line-height:1.8;color:${C.sub}">
fragments — <a href="${esc(site)}" style="color:${C.sub}">${esc(host)}</a><br>
このメールは fragments folio に登録された方にお送りしています。<a href="${esc(unsubscribe)}" style="color:${C.sub}">配信を停止する</a>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    'fragments folio',
    '',
    ...paras(intro).flatMap((t) => [t, '']),
    ...articles.flatMap((a) => [
      '――',
      a.title,
      ...(a.subtitle ? [a.subtitle] : []),
      a.date,
      ...(a.blocks?.length ? ['', ...a.blocks.map(textBlock), ...(a.notes ?? []).map((n) => [`[${n.n}]`, n.title, n.cite, n.body].filter(Boolean).join(' '))] : a.excerpt ? [a.excerpt] : []),
      a.url,
      '',
    ]),
    ...(paras(outro).length ? ['――', ...paras(outro).flatMap((t) => [t, ''])] : []),
    '――',
    `fragments — ${site}`,
    `配信の停止: ${unsubscribe}`,
  ].join('\n');
  return { html, text };
}

// a block as plain text (the mail's text part)
function textBlock(b) {
  const r = (rs) => rs.map((x) => (x.note != null ? `[${x.note}]` : x.href && x.href !== x.text ? `${x.text}（${x.href}）` : x.text)).join('');
  if (b.t === 'p') return r(b.runs) + '\n';
  if (b.t === 'li') return '・' + r(b.runs);
  if (b.t === 'quote') return '> ' + r(b.runs) + '\n';
  if (b.t === 'h') return '\n' + b.text + '\n';
  if (b.t === 'img') return `[画像${b.caption ? `：${b.caption}` : ''}]\n`;
  if (b.t === 'card') return `${b.text} ${b.href}\n`;
  return '――\n';
}
