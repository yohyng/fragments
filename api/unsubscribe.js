// GET ?token= (the link in each mail) → the address stops receiving mail;
// then on to /subscribe/ with the result. POST does the same without the
// redirect, for mail apps' one-click unsubscribe (List-Unsubscribe-Post).

import { findByToken, siteUrl, update } from '../src/lib/newsletter.mjs';

export default async function handler(req, res) {
  let status = 'invalid';
  try {
    const row = await findByToken(req.query.token);
    if (row) {
      if (row.status !== 'unsubscribed') await update(row.id, { status: 'unsubscribed', unsubscribed_at: new Date().toISOString() });
      status = 'unsubscribed';
    }
  } catch (e) {
    console.error('[unsubscribe]', e);
    status = 'error';
  }
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST') return res.status(status === 'unsubscribed' ? 200 : 400).json({ status });
  res.redirect(303, `${siteUrl()}/subscribe/?status=${status}`);
}
