// GET ?token= (the link in each mail) → the address is deleted from the list
// (as the privacy policy says); then on to /subscribe/ with the result. A
// second click finds nothing and reads the same. POST does the same without
// the redirect, for mail apps' one-click unsubscribe (List-Unsubscribe-Post).

import { findByToken, remove, siteUrl } from '../src/lib/newsletter.mjs';

const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  let status = TOKEN.test(String(req.query.token ?? '')) ? 'unsubscribed' : 'invalid';
  try {
    const row = status === 'unsubscribed' ? await findByToken(req.query.token) : null;
    if (row) await remove(row.id);
  } catch (e) {
    console.error('[unsubscribe]', e);
    status = 'error';
  }
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST') return res.status(status === 'unsubscribed' ? 200 : 400).json({ status });
  res.redirect(303, `${siteUrl()}/subscribe/?status=${status}`);
}
