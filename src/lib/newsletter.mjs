// The subscriber list (supabase/fragments_subscribers.sql), for the API
// functions in api/. They use the service_role key, which never reaches the
// browser; the table is closed to the public anon key.
// Environment (Vercel):
//   SUPABASE_SERVICE_ROLE_KEY  required
//   RESEND_API_KEY             to send the confirmation mail (double opt-in);
//                              without it a sign-up is active at once
//   NEWSLETTER_FROM            sender, e.g. "fragments <folio@fragments-of.space>"
//   SITE_URL                   optional; https://fragments-of.space by default

import { SUPABASE_URL } from './supabase-config.mjs';

const TABLE = 'fragments_subscribers';
export const siteUrl = () => (process.env.SITE_URL || 'https://fragments-of.space').replace(/\/$/, '');
export const mailReady = () => Boolean(process.env.RESEND_API_KEY && process.env.NEWSLETTER_FROM);

function key() {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return k;
}

async function rest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}${path}`, {
    method,
    headers: {
      apikey: key(),
      Authorization: `Bearer ${key()}`,
      'content-type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export const normalizeEmail = (s) => String(s ?? '').trim().toLowerCase();
// one @, something on each side, a dot in the domain, no spaces
export const validEmail = (s) => s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const validToken = (t) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(t ?? ''));

export async function findByEmail(email) {
  return (await rest(`?email=eq.${encodeURIComponent(email)}&select=*`))[0] ?? null;
}

export async function findByToken(token) {
  if (!validToken(token)) return null;
  return (await rest(`?token=eq.${token}&select=*`))[0] ?? null;
}

export async function insert(row) {
  return (await rest('', { method: 'POST', body: row }))[0];
}

export async function update(id, patch) {
  return (await rest(`?id=eq.${id}`, { method: 'PATCH', body: patch }))[0];
}

export const confirmUrl = (token) => `${siteUrl()}/api/confirm?token=${token}`;
export const unsubscribeUrl = (token) => `${siteUrl()}/api/unsubscribe?token=${token}`;

/** The confirmation mail (Resend). */
export async function sendConfirmation(email, token) {
  const link = confirmUrl(token);
  const text = [
    'fragments のニュースレター「fragments folio」への登録を受け付けました。',
    '次のリンクを開くと、登録が完了します。',
    '',
    link,
    '',
    'お心当たりのない場合は、このメールを破棄してください。登録はされません。',
    '',
    `fragments — ${siteUrl()}`,
  ].join('\n');
  const html = `<div style="font-family:serif;font-size:15px;line-height:1.9;color:#201f1d">
<p>fragments のニュースレター「fragments folio」への登録を受け付けました。<br>次のリンクを開くと、登録が完了します。</p>
<p><a href="${link}" style="color:#0000ff">登録を完了する</a></p>
<p style="font-size:13px;color:#666">お心当たりのない場合は、このメールを破棄してください。登録はされません。</p>
<p style="font-size:13px;color:#666">fragments — <a href="${siteUrl()}" style="color:#666">${siteUrl().replace(/^https?:\/\//, '')}</a></p>
</div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: process.env.NEWSLETTER_FROM, to: [email], subject: '【fragments】登録の確認', text, html }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
