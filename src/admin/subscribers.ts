// 購読者: the newsletter's subscriber list (supabase/fragments_subscribers.sql),
// read with the signed-in user's session. Sign-ups come in through
// api/subscribe; here they can be seen, copied and removed.
import type { SupabaseClient } from '@supabase/supabase-js';
import setupSql from '../../supabase/fragments_subscribers.sql?raw';
import { renderNewsletter } from '../lib/newsletter-mail.mjs';

type Row = { id: string; email: string; status: 'pending' | 'active' | 'unsubscribed'; created_at: string; confirmed_at: string | null };
const LABEL: Record<Row['status'], string> = { active: '登録中', pending: '確認待ち', unsubscribed: '配信停止' };

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '');
let sb: SupabaseClient;
let rows: Row[] = [];

export function initSubscribers(client: SupabaseClient) {
  sb = client;
  initMail();
  $('[data-sub-sql]').textContent = setupSql.trim();
  $('[data-sub-sql-copy]').addEventListener('click', async () => {
    await navigator.clipboard.writeText(setupSql.trim());
    $('[data-sub-sql-copy]').textContent = 'コピーしました';
  });
  $('[data-sub-copy]').addEventListener('click', async () => {
    const list = rows.filter((r) => r.status === 'active').map((r) => r.email);
    await navigator.clipboard.writeText(list.join('\n'));
    $('[data-sub-msg]').textContent = `登録中の ${list.length} 件をコピーしました（1行に1件）。`;
  });
  $('[data-sub-rows]').addEventListener('click', async (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-sub-del]');
    if (!b) return;
    const row = rows.find((r) => r.id === b.dataset.subDel);
    if (!row || !confirm(`${row.email} を一覧から削除しますか？（元に戻せません）`)) return;
    const { error } = await sb.from('fragments_subscribers').delete().eq('id', row.id);
    if (error) $('[data-sub-msg]').textContent = '削除できませんでした: ' + error.message;
    else openSubscribers();
  });
}

export async function openSubscribers() {
  openMail();
  const body = $('[data-sub-rows]');
  body.innerHTML = '<tr><td colspan="5" class="date">読み込み中…</td></tr>';
  $('[data-sub-msg]').textContent = '';
  const { data, error } = await sb
    .from('fragments_subscribers')
    .select('id,email,status,created_at,confirmed_at')
    .order('created_at', { ascending: false });
  const missing = !!error && (error.code === 'PGRST205' || error.code === '42P01');
  $('[data-sub-missing]').hidden = !missing;
  if (error) {
    rows = [];
    body.innerHTML = '';
    if (!missing) $('[data-sub-msg]').textContent = '読み込めませんでした: ' + error.message;
    $('[data-sub-count]').textContent = '';
    return;
  }
  rows = data as Row[];
  activeCount = rows.filter((r) => r.status === 'active').length;
  preview();
  const n = (s: Row['status']) => rows.filter((r) => r.status === s).length;
  $('[data-sub-count]').textContent = `登録中 ${n('active')}　確認待ち ${n('pending')}　配信停止 ${n('unsubscribed')}`;
  body.replaceChildren(
    ...(rows.length
      ? rows.map((r) => {
          const tr = document.createElement('tr');
          const td = (text: string, cls = '') => Object.assign(document.createElement('td'), { textContent: text, className: cls });
          const del = Object.assign(document.createElement('button'), { type: 'button', className: 'link danger', textContent: '削除' });
          del.dataset.subDel = r.id;
          const last = document.createElement('td');
          last.append(del);
          tr.append(td(r.email), td(LABEL[r.status], `badge ${r.status === 'active' ? 'published' : ''}`), td(day(r.created_at), 'date'), td(day(r.confirmed_at), 'date'), last);
          return tr;
        })
      : [Object.assign(document.createElement('tr'), { innerHTML: '<td colspan="5" class="date">まだ登録はありません。</td>' })]),
  );
}

// ── メールを送る ──────────────────────────────────────────────────────────
type Art = { id: number; title: string; subtitle: string; date: string; url: string; excerpt: string };
const SITE = (import.meta.env.SITE || 'https://fragments-of.space').replace(/\/$/, '');
const DRAFT = 'fragments-mail-draft';
let arts: Art[] = [];
let activeCount = 0;
const f = (k: string) => $<HTMLInputElement | HTMLTextAreaElement>(`[data-mail-f="${k}"]`);
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};
const ymd = (s: string) => {
  const m = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/.exec(s || '');
  return m ? `${m[1]}.${m[2].padStart(2, '0')}.${m[3].padStart(2, '0')}` : s;
};
// the opening of the body, as plain text (without the notes and cards)
function excerpt(html: string, n = 110) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  doc.querySelectorAll('[data-note], sup, aside, figure, img, .book-link-card, table').forEach((e) => e.remove());
  const t = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n).trimEnd() + '…' : t;
}
const chosen = () => arts.filter((a) => $<HTMLInputElement>(`[data-mail-art="${a.id}"]`)?.checked);
const payload = () => ({
  subject: f('subject').value.trim(),
  intro: f('intro').value,
  outro: f('outro').value,
  articles: chosen().map(({ title, subtitle, date, url, excerpt }) => ({ title, subtitle, date, url, excerpt })),
});

function preview() {
  const p = payload();
  $<HTMLIFrameElement>('[data-mail-preview]').srcdoc = renderNewsletter({ ...p, subject: p.subject || '（件名）', unsubscribe: `${SITE}/subscribe/`, site: SITE }).html;
  try {
    localStorage.setItem(DRAFT, JSON.stringify({ subject: f('subject').value, intro: f('intro').value, outro: f('outro').value }));
  } catch {}
  $('[data-mail-send]').textContent = activeCount ? `配信する（${activeCount}人）` : '配信する';
}

function initMail() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT) || '{}');
    for (const k of ['subject', 'intro', 'outro']) if (typeof d[k] === 'string') f(k).value = d[k];
  } catch {}
  $('[data-mail]').addEventListener('input', (e) => {
    if ((e.target as HTMLElement).matches('[data-mail-to]')) return;
    preview();
  });
  $('[data-mail-to]').addEventListener('change', saveTestTo);
  $('[data-mail-test]').addEventListener('click', () => send(true));
  $('[data-mail-send]').addEventListener('click', () => send(false));
}

async function openMail() {
  if (!f('subject').value) f('subject').value = `fragments folio — ${today()}`;
  loadTestTo();
  const [a, h] = await Promise.all([
    sb.from('articles').select('id,date,title,subtitle,content,status').eq('status', 'published').order('date', { ascending: false }).order('id', { ascending: false }).limit(15),
    sb.from('fragments_mailings').select('subject,recipients,sent_at').order('sent_at', { ascending: false }).limit(10),
  ]);
  arts = ((a.data ?? []) as any[]).map((r) => ({ id: r.id, title: r.title ?? '', subtitle: r.subtitle ?? '', date: ymd(r.date ?? ''), url: `${SITE}/posts/${r.id}/`, excerpt: excerpt(r.content) }));
  const last = (h.data?.[0] as any)?.sent_at as string | undefined;
  const since = last ? ymd(new Date(last).toLocaleDateString('sv-SE')) : ymd(new Date(Date.now() - 7 * 864e5).toLocaleDateString('sv-SE'));
  $('[data-mail-arts]').replaceChildren(
    ...arts.map((x) => {
      const l = Object.assign(document.createElement('label'), { className: 'mail-art' });
      const c = Object.assign(document.createElement('input'), { type: 'checkbox', checked: x.date >= since });
      c.dataset.mailArt = String(x.id);
      l.append(c, Object.assign(document.createElement('span'), { className: 'date', textContent: x.date }), Object.assign(document.createElement('span'), { textContent: x.title }));
      return l;
    }),
  );
  const hist = (h.data ?? []) as { subject: string; recipients: number; sent_at: string }[];
  $('[data-mail-history]').replaceChildren(
    ...(hist.length
      ? hist.map((m) => {
          const li = document.createElement('li');
          li.append(Object.assign(document.createElement('span'), { className: 'date', textContent: new Date(m.sent_at).toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' }) }), `${m.subject}（${m.recipients}人）`);
          return li;
        })
      : [Object.assign(document.createElement('li'), { className: 'hint', textContent: h.error ? '送信履歴のテーブルがまだありません（上の SQL を実行してください）' : 'まだ送っていません。' })]),
  );
  preview();
}

let sending = false;
async function send(test: boolean) {
  if (sending) return;
  const out = $('[data-mail-msg]');
  const p = payload();
  if (!p.subject) return void ((out.textContent = '件名を入れてください。'), out.classList.add('error'));
  if (!p.intro.trim() && !p.articles.length) return void ((out.textContent = 'はじめの文か、添える記事を入れてください。'), out.classList.add('error'));
  if (!test && !confirm(`登録中の ${activeCount} 人に「${p.subject}」を送ります。よろしいですか？（取り消せません）`)) return;
  sending = true;
  if (test && !toInput().disabled) await saveTestTo();
  out.classList.remove('error');
  out.textContent = test ? 'テスト送信しています…' : '配信しています…';
  try {
    const { data } = await sb.auth.getSession();
    const res = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
      body: JSON.stringify({ ...p, test }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || (res.status === 404 ? '送信の窓口（/api/newsletter）が見つかりません。Vercel 以外で開いていませんか' : `送れませんでした（${res.status}）`));
    out.textContent = test ? `${body.to} にテスト送信しました。届き方を確かめてください。` : `${body.sent} 人に配信しました。`;
    if (!test) {
      try {
        localStorage.removeItem(DRAFT);
      } catch {}
      f('subject').value = '';
      f('intro').value = '';
      f('outro').value = '';
      openMail();
    }
  } catch (e) {
    out.textContent = (e as Error).message;
    out.classList.add('error');
  } finally {
    sending = false;
  }
}

// テスト送信先: kept in fragments_admin_prefs (admins only; see
// supabase/fragments_security.sql), so api/newsletter sends the test there
const toInput = () => $<HTMLInputElement>('[data-mail-to]');
const parseTo = (v: string) => [...new Set(v.split(/[\s,、]+/).map((x) => x.trim().toLowerCase()).filter(Boolean))];
async function loadTestTo() {
  const { data, error } = await sb.from('fragments_admin_prefs').select('test_recipients').eq('id', 1).maybeSingle();
  const missing = !!error && (error.code === 'PGRST205' || error.code === '42P01');
  toInput().disabled = missing;
  $('[data-mail-to-hint]').textContent = missing
    ? 'テスト送信先を保存するには、supabase/fragments_security.sql を実行してください。それまではログイン中のアドレスに送ります。'
    : 'カンマで区切って 3 件まで。入れたアドレスは、管理者だけが読める場所に保存されます。';
  if (!error) toInput().value = (data as any)?.test_recipients ?? '';
}
async function saveTestTo() {
  const out = $('[data-mail-msg]');
  const list = parseTo(toInput().value);
  const bad = list.filter((x) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
  out.classList.toggle('error', !!bad.length || list.length > 3);
  if (bad.length) return void (out.textContent = `メールアドレスの形ではありません: ${bad.join(', ')}`);
  if (list.length > 3) return void (out.textContent = 'テスト送信先は 3 件までです。');
  toInput().value = list.join(', ');
  const { error } = await sb.from('fragments_admin_prefs').upsert({ id: 1, test_recipients: toInput().value, updated_at: new Date().toISOString() });
  out.classList.toggle('error', !!error);
  out.textContent = error ? 'テスト送信先を保存できませんでした: ' + error.message : 'テスト送信先を保存しました。';
}
