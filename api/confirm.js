// GET ?token= (the link in the confirmation mail) → the address is active;
// then on to /subscribe/ with the result.

import { findByToken, siteUrl, update } from '../src/lib/newsletter.mjs';

export default async function handler(req, res) {
  let status = 'invalid';
  try {
    const row = await findByToken(req.query.token);
    if (row?.status === 'active') status = 'confirmed';
    else if (row) {
      await update(row.id, { status: 'active', confirmed_at: new Date().toISOString(), unsubscribed_at: null });
      status = 'confirmed';
    }
  } catch (e) {
    console.error('[confirm]', e);
    status = 'error';
  }
  res.setHeader('Cache-Control', 'no-store');
  res.redirect(303, `${siteUrl()}/subscribe/?status=${status}`);
}
