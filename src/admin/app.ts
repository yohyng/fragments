// The admin screen (/admin/). Signs in with the Supabase account shared with
// studieslog, lists and edits the `articles` table, and asks the site to
// rebuild after a change so it shows. The body editor and its HTML format
// come from studieslog (editor.mjs / editor-schema.mjs), so both admin
// screens read and write exactly the same content.

import { createClient, type Session } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase-config.mjs';
import {
  createEditor,
  getHtml,
  setHtml,
  insertImage,
  insertBookLinkCard,
  listFootnotes,
  insertFootnote,
  updateFootnote,
  renumberFootnotes,
} from './editor.mjs';

type Status = 'draft' | 'published' | 'scheduled' | 'private';
interface Article {
  id?: number;
  date: string; // "2026.08.21"
  title: string;
  subtitle: string;
  category: string;
  content: string;
  status: Status;
  scheduled_at: string | null;
  updated_at?: string;
}

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const IMAGE_BUCKET = 'article-images';
const STATUS_LABEL: Record<string, string> = { draft: '下書き', published: '公開', scheduled: '予約', private: '非公開' };

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const views = ['login', 'list', 'edit'] as const;
const show = (name: (typeof views)[number]) =>
  views.forEach((v) => ($(`[data-view="${v}"]`).hidden = v !== name));
const field = <T extends HTMLElement = HTMLInputElement>(name: string) => $<T>(`[data-f="${name}"]`);

const msg = (el: HTMLElement, text: string, error = false) => {
  el.textContent = text;
  el.classList.toggle('error', error);
};

// ── session ────────────────────────────────────────────────────────────────
let session: Session | null = null;

async function start() {
  const { data } = await sb.auth.getSession();
  session = data.session;
  sb.auth.onAuthStateChange((_e, s) => {
    session = s;
    signedIn();
  });
  signedIn();
}

function signedIn() {
  $('[data-signout]').hidden = !session;
  $('[data-who]').textContent = session?.user.email ?? '';
  if (!session) return show('login');
  if ($('[data-view="login"]').hidden === false || location.hash === '') openFromHash();
}

$<HTMLFormElement>('[data-login]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement;
  const out = $('[data-login-msg]');
  msg(out, 'ログインしています…');
  const { error } = await sb.auth.signInWithPassword({
    email: (form.elements.namedItem('email') as HTMLInputElement).value,
    password: (form.elements.namedItem('password') as HTMLInputElement).value,
  });
  if (error) msg(out, 'ログインできませんでした。メールアドレスとパスワードを確かめてください。', true);
  else msg(out, '');
});
$('[data-signout]').addEventListener('click', () => sb.auth.signOut());

// #/ → list, #/new → new article, #/41 → article 41
addEventListener('hashchange', () => session && openFromHash());
function openFromHash() {
  const m = /^#\/(new|\d+)$/.exec(location.hash);
  if (!m) return openList();
  return openEditor(m[1] === 'new' ? null : Number(m[1]));
}

// ── list ───────────────────────────────────────────────────────────────────
async function openList() {
  show('list');
  const rows = $<HTMLTableSectionElement>('[data-rows]');
  rows.innerHTML = '<tr><td colspan="4" class="date">読み込み中…</td></tr>';
  const { data, error } = await sb
    .from('articles')
    .select('id,date,title,category,status,scheduled_at')
    .order('date', { ascending: false })
    .order('id', { ascending: false });
  if (error) {
    rows.innerHTML = '';
    const tr = rows.insertRow();
    tr.insertCell().textContent = '読み込めませんでした: ' + error.message;
    return;
  }
  rows.innerHTML = '';
  for (const a of data ?? []) {
    const tr = rows.insertRow();
    tr.dataset.id = String(a.id);
    const due = a.status === 'scheduled' && a.scheduled_at && new Date(a.scheduled_at) <= new Date();
    const cells: [string, string][] = [
      ['date', a.date],
      ['', a.title || '（無題）'],
      ['cat', a.category],
      [`badge ${a.status}`, due ? '公開（予約済み）' : (STATUS_LABEL[a.status] ?? a.status)],
    ];
    for (const [cls, text] of cells) {
      const td = tr.insertCell();
      if (cls) td.className = cls;
      td.textContent = text;
    }
    tr.addEventListener('click', () => (location.hash = `#/${a.id}`));
  }
}
$('[data-new]').addEventListener('click', () => (location.hash = '#/new'));
$('[data-back]').addEventListener('click', () => (location.hash = '#/'));

// ── editor ─────────────────────────────────────────────────────────────────
let editor: any = null;
let current: Article | null = null;
let dirty = false;

const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
};
const toInputDate = (s: string) => s.replace(/\./g, '-');
const fromInputDate = (s: string) => s.replace(/-/g, '.');
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

async function openEditor(id: number | null) {
  show('edit');
  const out = $('[data-save-msg]');
  msg(out, '');
  if (id === null) {
    current = { date: today(), title: '', subtitle: '', category: 'sketch', content: '<p></p>', status: 'draft', scheduled_at: null };
  } else {
    msg(out, '読み込み中…');
    const { data, error } = await sb.from('articles').select('*').eq('id', id).single();
    if (error || !data) return msg(out, '記事を読み込めませんでした: ' + (error?.message ?? ''), true);
    current = data as Article;
    msg(out, '');
  }
  field('title').value = current.title;
  field('subtitle').value = current.subtitle ?? '';
  field('date').value = toInputDate(current.date);
  const cat = field<HTMLSelectElement>('category');
  if (![...cat.options].some((o) => o.value === current!.category)) cat.add(new Option(current.category, current.category));
  cat.value = current.category;
  field<HTMLSelectElement>('status').value = current.status;
  field('scheduled_at').value = toLocalInput(current.scheduled_at);
  syncStatus();
  $('[data-delete]').hidden = current.id === undefined;
  const onSite = $<HTMLAnchorElement>('[data-view-on-site]');
  onSite.hidden = current.id === undefined;
  if (current.id !== undefined) onSite.href = `/posts/${current.id}/`;

  if (!editor) {
    editor = createEditor({
      element: $('[data-editor]'),
      content: current.content,
      onUpdate: () => {
        dirty = true;
        renderNotes();
      },
    } as any);
  } else setHtml(editor, current.content);
  renumberFootnotes(editor);
  renderNotes(true);
  dirty = false;
}

for (const name of ['title', 'subtitle', 'date', 'category', 'status', 'scheduled_at'])
  field(name).addEventListener('input', () => (dirty = true));
field('status').addEventListener('change', syncStatus);
function syncStatus() {
  $('[data-scheduled-row]').hidden = field<HTMLSelectElement>('status').value !== 'scheduled';
}
addEventListener('beforeunload', (e) => {
  if (dirty) e.preventDefault();
});

// ── notes: 見出し / 書誌 / 本文, kept as lines of the note text ───────────────
// The site reads 3+ lines as 見出し / 書誌 / 本文, 2 lines as 見出し / 本文 and
// 1 line as 本文 (src/lib/supabase-content.mjs).
const splitNote = (raw: string) => {
  const l = raw.split('\n').map((s) => s.trim()).filter(Boolean);
  if (l.length >= 3) return { title: l[0], cite: l[1], body: l.slice(2).join('\n') };
  if (l.length === 2) return { title: l[0], cite: '', body: l[1] };
  return { title: '', cite: '', body: l[0] ?? '' };
};
const joinNote = (n: { title: string; cite: string; body: string }) =>
  [n.title, n.cite, n.body.replace(/\s*\n\s*/g, ' ')].map((s) => s.trim()).filter(Boolean).join('\n');

let noteCount = -1;
function renderNotes(force = false) {
  const notes = listFootnotes(editor);
  if (!force && notes.length === noteCount) return; // typing inside a note field
  noteCount = notes.length;
  const list = $('[data-notes]');
  list.innerHTML = '';
  if (!notes.length) {
    const li = document.createElement('li');
    li.className = 'hint';
    li.textContent = 'まだ注はありません。';
    list.append(li);
    return;
  }
  notes.forEach((n: { note: string }, i: number) => {
    const v = splitNote(n.note);
    const li = document.createElement('li');
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = String(i + 1);
    const title = Object.assign(document.createElement('input'), { placeholder: '見出し（例：水平遺伝子伝播）', value: v.title });
    const cite = Object.assign(document.createElement('input'), { placeholder: '書誌（著者「題名」『誌名』年）', value: v.cite });
    const body = Object.assign(document.createElement('textarea'), { placeholder: '注の本文', value: v.body });
    const write = () => {
      updateFootnote(editor, i, joinNote({ title: title.value, cite: cite.value, body: body.value }));
      dirty = true;
    };
    [title, cite, body].forEach((el) => el.addEventListener('input', write));
    li.append(num, title, cite, body);
    list.append(li);
  });
}

// ── toolbar ────────────────────────────────────────────────────────────────
$('[data-toolbar]').addEventListener('click', async (e) => {
  const cmd = (e.target as HTMLElement).closest<HTMLElement>('[data-cmd]')?.dataset.cmd;
  if (!cmd || !editor) return;
  const c = editor.chain().focus();
  switch (cmd) {
    case 'p': return c.setParagraph().run();
    case 'h2': return c.toggleHeading({ level: 2 }).run();
    case 'h3': return c.toggleHeading({ level: 3 }).run();
    case 'quote': return c.toggleBlockquote().run();
    case 'ul': return c.toggleBulletList().run();
    case 'ol': return c.toggleOrderedList().run();
    case 'undo': return c.undo().run();
    case 'redo': return c.redo().run();
    case 'link': {
      const prev = editor.getAttributes('link').href ?? '';
      const href = prompt('リンク先の URL（空にするとリンクを外します）', prev);
      if (href === null) return;
      return href ? c.extendMarkRange('link').setLink({ href }).run() : c.extendMarkRange('link').unsetLink().run();
    }
    case 'image':
      return $<HTMLInputElement>('[data-image-file]').click();
    case 'card':
      return addCard();
    case 'note':
      insertFootnote(editor, '');
      renderNotes(true);
      ($('[data-notes] li:last-child input') as HTMLInputElement | null)?.focus();
      return;
  }
});

$<HTMLInputElement>('[data-image-file]').addEventListener('change', async (e) => {
  const input = e.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const out = $('[data-save-msg]');
  msg(out, '画像をアップロードしています…');
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
  const { error } = await sb.storage.from(IMAGE_BUCKET).upload(path, file);
  if (error) return msg(out, '画像をアップロードできませんでした: ' + error.message, true);
  const { data } = sb.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  insertImage(editor, data.publicUrl);
  msg(out, '画像を入れました。');
});

async function addCard() {
  const url = prompt('書籍やページの URL');
  if (!url?.trim()) return;
  const out = $('[data-save-msg]');
  msg(out, 'リンク先の情報を取得しています…');
  let info: { title?: string; image?: string; domain?: string } = {};
  try {
    const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url.trim())}`);
    info = await res.json();
  } catch {}
  const domain = info.domain || new URL(url.trim()).hostname;
  insertBookLinkCard(editor, { href: url.trim(), label: info.title || url.trim(), domain, image: info.image || '' });
  msg(out, info.title ? 'カードを入れました。' : 'カードを入れました（タイトルを取得できなかったので URL のままです）。');
}

// ── save / delete ──────────────────────────────────────────────────────────
async function rebuild() {
  try {
    const res = await fetch('/api/rebuild', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}` } });
    return res.ok;
  } catch {
    return false;
  }
}

$('[data-save]').addEventListener('click', async () => {
  if (!current) return;
  const out = $('[data-save-msg]');
  const button = $<HTMLButtonElement>('[data-save]');
  const status = field<HTMLSelectElement>('status').value as Status;
  const scheduledLocal = field('scheduled_at').value;
  if (status === 'scheduled' && !scheduledLocal) return msg(out, '予約する日時を入れてください。', true);
  const row = {
    title: field('title').value.trim(),
    subtitle: field('subtitle').value.trim(),
    date: fromInputDate(field('date').value) || today(),
    category: field<HTMLSelectElement>('category').value,
    content: getHtml(editor),
    status,
    scheduled_at: status === 'scheduled' ? new Date(scheduledLocal).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  if (!row.title) return msg(out, 'タイトルを入れてください。', true);
  button.disabled = true;
  msg(out, '保存しています…');
  const wasVisible = current.status === 'published' || current.status === 'scheduled';
  const res = current.id === undefined
    ? await sb.from('articles').insert(row).select('id').single()
    : await sb.from('articles').update(row).eq('id', current.id).select('id').single();
  button.disabled = false;
  if (res.error) return msg(out, '保存できませんでした: ' + res.error.message, true);
  const isNew = current.id === undefined;
  current = { ...current, ...row, id: res.data.id };
  dirty = false;
  const visible = status === 'published' || status === 'scheduled';
  if (visible || wasVisible) {
    msg(out, '保存しました。サイトに反映しています…');
    const ok = await rebuild();
    msg(out, ok ? '保存しました。1〜2分でサイトに反映されます。' : '保存しました。ただ、サイトへの反映を始められませんでした（VERCEL_DEPLOY_HOOK の設定を確かめてください）。', !ok);
  } else msg(out, '保存しました（下書き・非公開なので、サイトには出ません）。');
  if (isNew) history.replaceState(null, '', `#/${current.id}`);
  $('[data-delete]').hidden = false;
  const onSite = $<HTMLAnchorElement>('[data-view-on-site]');
  onSite.hidden = false;
  onSite.href = `/posts/${current.id}/`;
});

$('[data-delete]').addEventListener('click', async () => {
  if (!current?.id || !confirm(`「${current.title}」を削除します。元に戻せません。よろしいですか？`)) return;
  const wasVisible = current.status === 'published' || current.status === 'scheduled';
  const { error } = await sb.from('articles').delete().eq('id', current.id);
  if (error) return msg($('[data-save-msg]'), '削除できませんでした: ' + error.message, true);
  if (wasVisible) await rebuild();
  dirty = false;
  location.hash = '#/';
});

start();
