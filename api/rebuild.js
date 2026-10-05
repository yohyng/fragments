// Rebuilds the site (Vercel deploy hook), so new or changed articles show.
// - POST from the admin page, with the signed-in user's Supabase token
// - GET from Vercel Cron once a day (vercel.json), with CRON_SECRET, so
//   scheduled articles appear once their time has come
//   — and then sends the story image of each scheduled article whose time
//   has come (src/lib/story-send.mjs; once per article, logged)
// Environment: VERCEL_DEPLOY_HOOK (required), CRON_SECRET (for the cron).

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../src/lib/supabase-config.mjs';

export default async function handler(req, res) {
  const hook = process.env.VERCEL_DEPLOY_HOOK;
  if (!hook) {
    res.status(500).json({ error: 'VERCEL_DEPLOY_HOOK is not set' });
    return;
  }
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const cron = Boolean(process.env.CRON_SECRET) && token === process.env.CRON_SECRET;
  let allowed = cron;
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
  let stories;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (cron && r.ok && key) {
    try {
      const { announceScheduled } = await import('../src/lib/story-send.mjs');
      stories = await announceScheduled(key);
    } catch (e) {
      console.error('[rebuild] stories', e);
      stories = { error: String(e?.message || e) };
    }
    console.log('[rebuild] stories', JSON.stringify(stories));
  }
  res.status(r.ok ? 200 : 502).json({ triggered: r.ok, ...(stories && { stories }) });
}
