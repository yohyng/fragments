// POST { id, live } from the admin, with the signed-in admin's token: sends
// the article's story image by mail and LINE (src/lib/story-send.mjs).
// live: true when the article has just been published from the admin — the
// wording says it went live, and it is logged so the nightly rebuild does not
// announce it again. 「メールと LINE に送る」 sends without live.
// Replies { mail, line }: each 'sent', 'off' (not set up in Vercel) or an
// error message.

import { requireAdmin } from '../src/lib/newsletter.mjs';

// any failure comes back as a message for the admin to read, not a bare 500
export default async function handler(req, res) {
  try {
    return await send(req, res);
  } catch (e) {
    console.error('[story-send]', e);
    return res.status(e.status ?? 500).json({ error: String(e?.message || e) });
  }
}

async function send(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const auth = await requireAdmin(token);
  if (!auth.user) return res.status(auth.status).json({ error: auth.error });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
  const id = String(body.id ?? '');
  const live = body.live === true;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // loaded here, so a renderer that will not load is reported, not a crash
  const { deliverStory, logAnnounced } = await import('../src/lib/story-send.mjs').catch((e) => {
    throw new Error(`画像を作る部品を読み込めませんでした（${e.message}）`);
  });
  const out = await deliverStory({ id, key, mailTo: auth.user.email, live });
  if (live) await logAnnounced(id, key).catch(() => {});
  return res.status(200).json(out);
}
