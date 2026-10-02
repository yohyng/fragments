// Rebuilds the site (Vercel deploy hook), so new or changed articles show.
// - POST from the admin page, with the signed-in user's Supabase token
// - GET from Vercel Cron once a day (vercel.json), with CRON_SECRET, so
//   scheduled articles appear once their time has come
// Environment: VERCEL_DEPLOY_HOOK (required), CRON_SECRET (for the cron).

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../src/lib/supabase-config.mjs';

export default async function handler(req, res) {
  const hook = process.env.VERCEL_DEPLOY_HOOK;
  if (!hook) {
    res.status(500).json({ error: 'VERCEL_DEPLOY_HOOK is not set' });
    return;
  }
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  let allowed = Boolean(process.env.CRON_SECRET) && token === process.env.CRON_SECRET;
  if (!allowed && token) {
    const user = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    allowed = user.ok;
  }
  if (!allowed) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const r = await fetch(hook, { method: 'POST' });
  res.status(r.ok ? 200 : 502).json({ triggered: r.ok });
}
