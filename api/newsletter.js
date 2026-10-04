// POST from the admin (購読者 → メールを送る), with the signed-in user's
// Supabase token: sends the newsletter 「fragments folio」.
//   { subject, intro, outro, articles: [{ title, subtitle, date, url, excerpt }], test }
// test: true → only to the saved test addresses (fragments_admin_prefs), or
// the signed-in user, to check it. Otherwise to every
// active subscriber, each with their own unsubscribe link, and recorded in
// fragments_mailings. Needs RESEND_API_KEY, NEWSLETTER_FROM and
// SUPABASE_SERVICE_ROLE_KEY.

import { listActive, mailReady, recordMailing, requireAdmin, sendBatch, siteUrl, testRecipients, unsubscribeUrl } from '../src/lib/newsletter.mjs';
import { renderNewsletter } from '../src/lib/newsletter-mail.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const auth = await requireAdmin(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  if (!auth.user) return res.status(auth.status).json({ error: auth.error });
  const { user } = auth;
  if (!mailReady()) return res.status(500).json({ error: 'RESEND_API_KEY と NEWSLETTER_FROM が Vercel に設定されていません' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  const subject = String(body.subject ?? '').trim();
  const intro = String(body.intro ?? '');
  const outro = String(body.outro ?? '');
  const articles = (Array.isArray(body.articles) ? body.articles : []).slice(0, 30).map((a) => ({
    title: String(a.title ?? ''),
    subtitle: String(a.subtitle ?? ''),
    date: String(a.date ?? ''),
    url: String(a.url ?? ''),
    excerpt: String(a.excerpt ?? ''),
  }));
  if (!subject) return res.status(400).json({ error: '件名を入れてください' });
  if (!intro.trim() && !articles.length) return res.status(400).json({ error: '本文か記事を入れてください' });

  const site = siteUrl();
  const mail = (to, token) => {
    const unsubscribe = token ? unsubscribeUrl(token) : `${site}/subscribe/`;
    const { html, text } = renderNewsletter({ subject, intro, outro, articles, unsubscribe, site });
    return {
      to,
      subject,
      html,
      text,
      ...(token && {
        headers: { 'List-Unsubscribe': `<${unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      }),
    };
  };

  try {
    if (body.test) {
      const to = await testRecipients(user.email);
      await sendBatch(to.map((t) => mail(t, null)));
      return res.status(200).json({ sent: to.length, test: true, to: to.join(', ') });
    }
    const list = await listActive();
    if (!list.length) return res.status(400).json({ error: '登録中の購読者がいません' });
    await sendBatch(list.map((r) => mail(r.email, r.token)));
    await recordMailing({ subject, intro, outro, articles, recipients: list.length }).catch((e) => console.error('[newsletter] record', e));
    return res.status(200).json({ sent: list.length });
  } catch (e) {
    console.error('[newsletter]', e);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
