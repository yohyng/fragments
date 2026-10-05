// Sends an article's story image (src/lib/story-image.mjs) by mail and LINE —
// for the admin's button (api/story-send) and for articles going live
// (published in the admin, or a scheduled one at the nightly rebuild,
// api/rebuild). The image is drawn once, attached to the mail, and put in the
// article-images bucket (stories/…) for LINE to fetch as a plain file.
// Environment: SUPABASE_SERVICE_ROLE_KEY; RESEND_API_KEY + NEWSLETTER_FROM
// (mail); LINE_CHANNEL_ACCESS_TOKEN + LINE_USER_ID (LINE).

import { mailReady, siteUrl, testRecipients } from './newsletter.mjs';
import { SUPABASE_URL } from './supabase-config.mjs';
import { fetchArticle, storyFileName, storyImage } from './story-image.mjs';

const BUCKET = 'article-images';
const LOG = 'fragments_story_log'; // articles whose going live was announced

const auth = (key) => ({ apikey: key, Authorization: `Bearer ${key}` });
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * { mail, line }: each 'sent', 'off' (not set up) or an error message.
 * `live`: the article has just gone live (the wording says so).
 * `mailTo`: where the mail goes when no test addresses are saved.
 */
export async function deliverStory({ id, key, mailTo, live = false }) {
  const article = await fetchArticle(id, key);
  if (!article) throw Object.assign(new Error('記事が見つかりません'), { status: 404 });
  const url = `${siteUrl()}/posts/${id}/`;
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const lineTo = process.env.LINE_USER_ID;
  const out = { mail: 'off', line: 'off' };
  if (!mailReady() && !(lineToken && lineTo)) return out;

  let png;
  try {
    png = Buffer.from(await storyImage(id, { key }));
  } catch (e) {
    throw new Error(`ストーリー画像を作れませんでした（${e.message}）`);
  }
  const lead = live
    ? `記事「${article.title}」が公開されました。この画像をインスタのストーリーに上げてください。`
    : `「${article.title}」のストーリー画像です。`;

  if (mailReady()) {
    try {
      const to = await testRecipients(mailTo);
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: process.env.NEWSLETTER_FROM,
          to: to.filter(Boolean),
          subject: `【ストーリー画像】${article.title}`,
          text: `${lead}（1080×1920、添付）\n\n${url}`,
          html: `<p style="font-family:serif;font-size:14px;line-height:1.8">${esc(lead)}<br>（1080×1920、添付）</p><p style="font-family:serif;font-size:13px"><a href="${url}">${url}</a></p>`,
          attachments: [{ filename: storyFileName(id), content: png.toString('base64') }],
        }),
      });
      out.mail = r.ok ? 'sent' : `メールを送れませんでした（${r.status}: ${(await r.text()).slice(0, 120)}）`;
    } catch (e) {
      out.mail = `メールを送れませんでした（${e.message}）`;
    }
  }

  if (lineToken && lineTo) {
    try {
      // a plain file for LINE to fetch (a new name each time, so no stale copy)
      const path = `stories/story-${id}-${Date.now()}.png`;
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: { ...auth(key), 'content-type': 'image/png', 'x-upsert': 'true' },
        body: png,
      });
      if (!up.ok) throw new Error(`画像を置けませんでした ${up.status}: ${(await up.text()).slice(0, 120)}`);
      const img = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
      const r = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { Authorization: `Bearer ${lineToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          to: lineTo,
          messages: [
            { type: 'text', text: `${lead}\n${url}` },
            { type: 'image', originalContentUrl: img, previewImageUrl: img },
          ],
        }),
      });
      out.line = r.ok ? 'sent' : `LINE に送れませんでした（${r.status}: ${(await r.text()).slice(0, 120)}）`;
    } catch (e) {
      out.line = `LINE に送れませんでした（${e.message}）`;
    }
  }
  return out;
}

/** Marks an article's going live as announced; false when the log table is missing. */
export async function logAnnounced(id, key) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${LOG}`, {
    method: 'POST',
    headers: { ...auth(key), 'content-type': 'application/json', Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({ article_id: Number(id) }),
  });
  return r.ok;
}

/**
 * At the nightly rebuild: scheduled articles whose time has come and whose
 * going live has not been announced yet get their story image. Returns
 * what was done, for the log. Needs supabase/fragments_story.sql (without
 * the log it does nothing, rather than send the same ones every night).
 */
export async function announceScheduled(key) {
  const logged = await fetch(`${SUPABASE_URL}/rest/v1/${LOG}?select=article_id`, { headers: auth(key) });
  if (!logged.ok) return { skipped: `no ${LOG} (${logged.status})` };
  const done = new Set((await logged.json()).map((r) => String(r.article_id)));
  const now = new Date().toISOString();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/articles?status=eq.scheduled&scheduled_at=lte.${encodeURIComponent(now)}&select=id`,
    { headers: auth(key) },
  );
  if (!res.ok) return { skipped: `articles ${res.status}` };
  const due = (await res.json()).map((r) => String(r.id)).filter((id) => !done.has(id));
  const mailTo = await adminEmail(key);
  const sent = {};
  for (const id of due) {
    try {
      sent[id] = await deliverStory({ id, key, mailTo, live: true });
    } catch (e) {
      sent[id] = { error: e.message };
    }
    await logAnnounced(id, key); // once only, even when sending failed
  }
  return { sent };
}

// the first admin's address (fragments_admins), for the mail when no test
// addresses are saved
async function adminEmail(key) {
  try {
    const a = await fetch(`${SUPABASE_URL}/rest/v1/fragments_admins?select=user_id&limit=1`, { headers: auth(key) });
    const id = a.ok ? (await a.json())[0]?.user_id : null;
    if (!id) return null;
    const u = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { headers: auth(key) });
    return u.ok ? (await u.json()).email ?? null : null;
  } catch {
    return null;
  }
}
