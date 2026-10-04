// The newsletter mail 「fragments folio」: the admin's preview and the mail
// sent by api/newsletter are both made here, so they match.
//   subject, intro, outro: text (blank line = new paragraph, line break kept)
//   articles: [{ title, subtitle?, date, url, excerpt? }]
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
  const items = articles
    .map(
      (a) => `<tr><td style="padding:22px 0;border-top:1px solid ${C.rule}">
<a href="${esc(a.url)}" style="font-family:${SERIF};font-size:17px;line-height:1.6;color:${C.text};text-decoration:none">${esc(a.title)}</a>
${a.subtitle ? `<div style="font-family:${SERIF};font-size:13px;line-height:1.6;color:${C.sub};margin-top:2px">${esc(a.subtitle)}</div>` : ''}
<div style="font-family:${LATIN};font-size:11px;color:${C.sub};margin-top:4px">${esc(a.date)}</div>
${a.excerpt ? `<div style="font-family:${SERIF};font-size:13.5px;line-height:1.85;color:${C.sub};margin-top:10px">${esc(a.excerpt)}</div>` : ''}
<div style="margin-top:10px"><a href="${esc(a.url)}" style="font-family:${SERIF};font-size:13px;color:${C.accent}">続きを読む ↗</a></div>
</td></tr>`,
    )
    .join('');
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:40px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding-bottom:6px;border-bottom:1px solid ${C.text}">
<a href="${esc(site)}" style="font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;line-height:1.2;color:${C.text};text-decoration:none">fragments</a>
<span style="font-family:${LATIN};font-style:italic;font-size:13px;color:${C.sub};margin-left:10px">folio</span>
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
    ...articles.flatMap((a) => ['――', a.title, ...(a.subtitle ? [a.subtitle] : []), a.date, ...(a.excerpt ? [a.excerpt] : []), a.url, '']),
    ...(paras(outro).length ? ['――', ...paras(outro).flatMap((t) => [t, ''])] : []),
    '――',
    `fragments — ${site}`,
    `配信の停止: ${unsubscribe}`,
  ].join('\n');
  return { html, text };
}
