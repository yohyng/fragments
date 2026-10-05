// POST { id } from the admin (on publishing, or 「ストーリー画像を送る」), with
// the signed-in admin's token: sends the article's story image
//   - by mail, attached, to the test addresses (購読者 → テスト送信先) or the
//     admin's own (RESEND_API_KEY, NEWSLETTER_FROM)
//   - by LINE, to you, through a LINE official account's Messaging API
//     (LINE_CHANNEL_ACCESS_TOKEN, LINE_USER_ID — 「Your user ID」 on the
//     channel's Basic settings). The image is drawn once here and put in the
//     article-images bucket (stories/…), so LINE fetches a plain PNG file.
// Replies { mail, line }: each 'sent', 'off' (not set up in Vercel) or an
// error message.

import { mailReady, requireAdmin, siteUrl, testRecipients } from '../src/lib/newsletter.mjs';
import { SUPABASE_URL } from '../src/lib/supabase-config.mjs';

const BUCKET = 'article-images';

// any failure comes back as a message for the admin to read, not a bare 500
export default async function handler(req, res) {
  try {
    return await send(req, res);
  } catch (e) {
    console.error('[story-send]', e);
    return res.status(500).json({ error: String(e?.message || e) });
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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return res.status(500).json({ error: 'Vercel の環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されていません' });
  // loaded here, so a renderer that will not load is reported, not a crash
  const { fetchArticle, storyFileName, storyImage } = await import('../src/lib/story-image.mjs').catch((e) => {
    throw new Error(`画像を作る部品を読み込めませんでした（${e.message}）`);
  });

  const article = await fetchArticle(id, key);
  if (!article) return res.status(404).json({ error: '記事が見つかりません' });
  const url = `${siteUrl()}/posts/${id}/`;
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const lineTo = process.env.LINE_USER_ID;
  const out = { mail: 'off', line: 'off' };
  if (!mailReady() && !(lineToken && lineTo)) return res.status(200).json(out);

  let png;
  try {
    png = Buffer.from(await storyImage(id, { key }));
  } catch (e) {
    return res.status(500).json({ error: `ストーリー画像を作れませんでした（${e.message}）` });
  }

  if (mailReady()) {
    try {
      const to = await testRecipients(auth.user.email);
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: process.env.NEWSLETTER_FROM,
          to,
          subject: `【ストーリー画像】${article.title}`,
          text: `「${article.title}」のストーリー用の画像です（1080×1920）。添付を保存して、インスタのストーリーに上げてください。\n\n${url}`,
          html: `<p style="font-family:serif;font-size:14px;line-height:1.8">「${esc(article.title)}」のストーリー用の画像です（1080×1920）。<br>添付を保存して、インスタのストーリーに上げてください。</p><p style="font-family:serif;font-size:13px"><a href="${url}">${url}</a></p>`,
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
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'content-type': 'image/png', 'x-upsert': 'true' },
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
            { type: 'text', text: `「${article.title}」のストーリー画像です。\n${url}` },
            { type: 'image', originalContentUrl: img, previewImageUrl: img },
          ],
        }),
      });
      out.line = r.ok ? 'sent' : `LINE に送れませんでした（${r.status}: ${(await r.text()).slice(0, 120)}）`;
    } catch (e) {
      out.line = `LINE に送れませんでした（${e.message}）`;
    }
  }
  return res.status(200).json(out);
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
