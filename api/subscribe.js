// POST {email, website} → adds the address to the subscriber list.
// With mail set up (RESEND_API_KEY, NEWSLETTER_FROM) it is "pending" until the
// link in the confirmation mail is opened (api/confirm); without, it is active
// at once. `website` is a field people never see: filled in, it is a bot.
// Replies { state: 'pending' | 'active' } — an address already on the list
// gets the same reply as a new one, so the form does not reveal who is on it.

import { findByEmail, insert, mailReady, normalizeEmail, sendConfirmation, update, validEmail } from '../src/lib/newsletter.mjs';

const RESEND_AFTER_MS = 60_000; // one confirmation mail a minute per address

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body ?? {};
  const email = normalizeEmail(body.email);
  if (!validEmail(email)) return res.status(400).json({ error: 'invalid email' });
  const mail = mailReady();
  if (body.website) return res.status(200).json({ state: mail ? 'pending' : 'active' });

  try {
    const now = new Date().toISOString();
    let row = await findByEmail(email);
    if (row?.status === 'active') return res.status(200).json({ state: mail ? 'pending' : 'active' });
    if (!mail) {
      const patch = { status: 'active', confirmed_at: now, unsubscribed_at: null, requested_at: now };
      row = row ? await update(row.id, patch) : await insert({ email, ...patch });
      return res.status(200).json({ state: 'active' });
    }
    if (row && row.status === 'pending' && Date.now() - Date.parse(row.requested_at) < RESEND_AFTER_MS) {
      return res.status(200).json({ state: 'pending' });
    }
    row = row
      ? await update(row.id, { status: 'pending', requested_at: now, unsubscribed_at: null })
      : await insert({ email, status: 'pending', requested_at: now });
    await sendConfirmation(email, row.token);
    return res.status(200).json({ state: 'pending' });
  } catch (e) {
    console.error('[subscribe]', e);
    return res.status(500).json({ error: 'failed' });
  }
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
