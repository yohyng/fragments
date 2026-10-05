// The subscriber list (supabase/fragments_subscribers.sql), for the API
// functions in api/. They use the service_role key, which never reaches the
// browser; the table is closed to the public anon key.
// Environment (Vercel):
//   SUPABASE_SERVICE_ROLE_KEY  required
//   RESEND_API_KEY             to send the confirmation mail (double opt-in);
//                              without it a sign-up is active at once
//   NEWSLETTER_FROM            sender, e.g. "fragments <folio@fragments-of.space>"
//   SITE_URL                   optional; https://fragments-of.space by default

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.mjs';

const TABLE = 'fragments_subscribers';
export const siteUrl = () => (process.env.SITE_URL || 'https://fragments-of.space').replace(/\/$/, '');
export const mailReady = () => Boolean(process.env.RESEND_API_KEY && process.env.NEWSLETTER_FROM);

function key() {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return k;
}

async function rest(path, { method = 'GET', body, table = TABLE } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${path}`, {
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

export async function remove(id) {
  await rest(`?id=eq.${id}`, { method: 'DELETE' });
}

export async function update(id, patch) {
  return (await rest(`?id=eq.${id}`, { method: 'PATCH', body: patch }))[0];
}

/** Everyone who receives the newsletter. */
export async function listActive() {
  return rest('?status=eq.active&select=email,token&order=created_at.asc');
}

/** A sent newsletter, for the admin's history (fragments_mailings). */
export async function recordMailing(row) {
  return (await rest('', { method: 'POST', body: row, table: 'fragments_mailings' }))[0];
}

/** The signed-in user behind a Supabase access token, or null. */
export async function authUser(token) {
  if (!token) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
  return res.ok ? res.json() : null;
}

// the claims of a token already checked by authUser
function claims(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  } catch {
    return {};
  }
}

/**
 * The admin behind a token: a user listed in fragments_admins, signed in with
 * the second step (aal2) — as supabase/fragments_security.sql has the
 * database require. Before that SQL is run (no fragments_admins), any
 * signed-in user. Returns { user } or { error, status }.
 */
export async function requireAdmin(token) {
  const user = await authUser(token);
  if (!user) return { status: 401, error: 'ログインし直してください' };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { status: 500, error: 'Vercel の環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されていません' };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/fragments_admins?user_id=eq.${user.id}&select=user_id`, {
    headers: { apikey: key(), Authorization: `Bearer ${key()}` },
  });
  if (res.status === 404) return { user }; // not set up yet
  if (!res.ok) return { status: 500, error: `管理者を確かめられませんでした（${res.status}）` };
  if (!(await res.json()).length) return { status: 403, error: 'このアカウントには権限がありません' };
  if (claims(token).aal !== 'aal2') return { status: 403, error: '二段階認証を通してから、もう一度お試しください' };
  return { user };
}

/** Where 「テスト送信」 goes: the saved addresses (up to 3), else the user. */
export async function testRecipients(fallback) {
  try {
    const rows = await rest('?id=eq.1&select=test_recipients', { table: 'fragments_admin_prefs' });
    const list = String(rows[0]?.test_recipients ?? '')
      .split(/[\s,、]+/)
      .map(normalizeEmail)
      .filter(validEmail);
    if (list.length) return [...new Set(list)].slice(0, 3);
  } catch {}
  return [fallback];
}

/** Mails through Resend, up to 100 a call; each { to, subject, html, text, headers? }. */
export async function sendBatch(mails) {
  for (let i = 0; i < mails.length; i += 100) {
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(mails.slice(i, i + 100).map((m) => ({ from: process.env.NEWSLETTER_FROM, ...m, to: [m.to] }))),
    });
    if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)} (sent ${i} of ${mails.length})`);
  }
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
