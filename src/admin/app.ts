// The admin screen (/admin/). Signs in with the Supabase account shared with
// studieslog, lists and edits the `articles` table, and asks the site to
// rebuild after a change so it shows. The body editor and its HTML format
// come from studieslog (editor.mjs / editor-schema.mjs), so both admin
// screens read and write exactly the same content.

import { createClient, type Session } from '@supabase/supabase-js';
import { Plugin, NodeSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase-config.mjs';
import { initSettings, openSettings } from './settings';
import { initSubscribers, openSubscribers } from './subscribers';
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

// The default auth lock is shared by every tab (navigator.locks); a tab or
// refresh stuck holding it freezes the others (a blank admin). One editor at
// a time needs no more than a lock within this page.
let authQueue: Promise<unknown> = Promise.resolve();
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    lock: (_name, _timeout, fn) => {
      // wait for the previous holder, but not for one that never finishes
      const prev = Promise.race([authQueue, new Promise((r) => setTimeout(r, 5000))]);
      const run = prev.then(fn, fn);
      authQueue = run.catch(() => {});
      return run;
    },
  },
});
const IMAGE_BUCKET = 'article-images';
const STATUS_LABEL: Record<string, string> = { draft: '下書き', published: '公開', scheduled: '予約', private: '非公開' };

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const views = ['login', 'mfa', 'list', 'edit', 'settings', 'subscribers'] as const;
type View = (typeof views)[number];
let currentView: View = 'login';
const show = (name: View) => {
  currentView = name;
  views.forEach((v) => ($(`[data-view="${v}"]`).hidden = v !== name));
  document.querySelectorAll<HTMLAnchorElement>('[data-nav]').forEach((a) => {
    a.hidden = name === 'login' || name === 'mfa';
    a.classList.toggle('is-current', a.dataset.nav === (name === 'edit' ? 'list' : name));
  });
};
const field = <T extends HTMLElement = HTMLInputElement>(name: string) => $<T>(`[data-f="${name}"]`);

const msg = (el: HTMLElement, text: string, error = false) => {
  el.textContent = text;
  el.classList.toggle('error', error);
};

// ── session ────────────────────────────────────────────────────────────────
let session: Session | null = null;

async function start() {
  // A stale login can leave the session check hanging (a refresh that never
  // answers): after 6s, carry on signed out instead of a blank screen.
  const timedOut = Symbol();
  const res = await Promise.race([
    sb.auth.getSession().catch(() => null),
    new Promise<typeof timedOut>((r) => setTimeout(() => r(timedOut), 6000)),
  ]);
  if (res === timedOut) {
    // the client is stuck on the old login: forget it and start afresh, once
    let retried = false;
    try {
      retried = sessionStorage.getItem('fragments-admin-reset') === '1';
      if (!retried) {
        sessionStorage.setItem('fragments-admin-reset', '1');
        for (const k of Object.keys(localStorage)) if (k.startsWith('sb-')) localStorage.removeItem(k);
        return location.reload();
      }
    } catch {}
  }
  let wasReset = false;
  try {
    wasReset = sessionStorage.getItem('fragments-admin-reset') === '1';
    sessionStorage.removeItem('fragments-admin-reset');
  } catch {}
  session = res && res !== timedOut ? res.data.session : null;
  // Supabase must not be called from inside this callback (its auth lock is
  // held there): handle the change just after it.
  sb.auth.onAuthStateChange((_e, s) => {
    session = s;
    setTimeout(signedIn);
  });
  signedIn();
  if (!session && (wasReset || res === timedOut || res === null))
    msg($('[data-login-msg]'), 'ログインの状態を確かめられなかったので、ログインし直してください。', true);
}

function signedIn() {
  showSignedIn().catch((e) => {
    // never leave every view hidden
    show('login');
    msg($('[data-login-msg]'), '画面を開けませんでした: ' + (e as Error).message, true);
  });
}
async function showSignedIn() {
  $('[data-signout]').hidden = !session;
  $('[data-who]').textContent = session?.user.email ?? '';
  if (!session) return show('login');
  if (await needsSecondStep()) return;
  if (resumeView) {
    // signed in again after the login ran out: back to the same screen, edits kept
    const view = resumeView;
    resumeView = null;
    show(view);
    const out = view === 'settings' ? $('[data-set-msg]') : $('[data-save-msg]');
    return msg(out, 'ログインし直しました。もう一度「保存」を押してください。');
  }
  // first load (no screen shown yet, e.g. a reload on #/settings) or just signed in
  const none = views.every((v) => $(`[data-view="${v}"]`).hidden);
  const atGate = currentView === 'login' || currentView === 'mfa';
  if (none || atGate || location.hash === '') openFromHash();
}

// Second step (TOTP): after the password, a 6-digit code from an
// authenticator app. The first time, the app is set up from a QR code.
// The database (supabase/fragments_security.sql) and api/newsletter only let
// such a login (aal2) read the subscribers and save settings.
let mfaFactorId: string | null = null;
let mfaChecking = false;
async function needsSecondStep(): Promise<boolean> {
  const { data, error } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  if (data.currentLevel === 'aal2') {
    mfaFactorId = null;
    return false;
  }
  if (currentView === 'mfa' && mfaFactorId) return true; // already asking
  if (mfaChecking) return true;
  mfaChecking = true;
  try {
    const { data: f, error: le } = await sb.auth.mfa.listFactors();
    if (le) throw le;
    const verified = f.totp.find((x) => x.status === 'verified');
    $('[data-mfa-enroll]').hidden = !!verified;
    $('[data-mfa-verify-hint]').hidden = !verified;
    if (verified) mfaFactorId = verified.id;
    else {
      // a setup left unfinished: start again
      for (const x of f.all) if (x.factor_type === 'totp' && x.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: x.id });
      const { data: e, error: ee } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: `fragments ${new Date().toISOString().slice(0, 10)}` });
      if (ee) throw ee;
      mfaFactorId = e.id;
      $<HTMLImageElement>('[data-mfa-qr]').src = e.totp.qr_code;
      $('[data-mfa-secret]').textContent = e.totp.secret;
    }
    msg($('[data-mfa-msg]'), '');
    show('mfa');
    $<HTMLInputElement>('[data-mfa] input[name="code"]').focus();
    return true;
  } finally {
    mfaChecking = false;
  }
}

$<HTMLFormElement>('[data-mfa]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $<HTMLInputElement>('[data-mfa] input[name="code"]');
  const code = input.value.replace(/\D/g, '');
  const out = $('[data-mfa-msg]');
  if (!mfaFactorId || code.length !== 6) return msg(out, '6 桁の数字を入れてください。', true);
  msg(out, '確かめています…');
  const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code });
  if (error) return msg(out, 'コードが違うか、時間切れです。アプリの新しい数字で、もう一度お試しください。', true);
  input.value = '';
  msg(out, '');
  // the session is now aal2: onAuthStateChange opens the screen
});

// The login can run out (a tab left open for long, a refresh that failed);
// then writes go out signed out and change nothing. Before saving, make sure
// there is a session; if not, ask to sign in again over the open screen.
let resumeView: View | null = null;
async function ensureSignedIn(): Promise<boolean> {
  const { data } = await sb.auth.getSession();
  if (data.session) return true;
  const { data: r } = await sb.auth.refreshSession();
  if (r.session) return true;
  resumeView = currentView;
  show('login');
  msg($('[data-login-msg]'), 'ログインが切れていました。ログインし直してください（編集中の内容はそのまま残っています）。', true);
  return false;
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

// #/ → list, #/new → new article, #/41 → article 41, #/settings → 表示設定,
// #/subscribers → 購読者
addEventListener('hashchange', () => session && openFromHash());
function openFromHash() {
  if (location.hash === '#/settings') {
    show('settings');
    return openSettings();
  }
  if (location.hash === '#/subscribers') {
    show('subscribers');
    return openSubscribers();
  }
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
  fitTitle();
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
  syncStory();

  if (!editor) {
    editor = createEditor({
      element: $('[data-editor]'),
      content: current.content,
      onUpdate: () => {
        dirty = true;
        renderNotes();
      },
    } as any);
    editor.registerPlugin(blankLines);
    editor.on('selectionUpdate', placeImageBar);
    editor.on('update', placeImageBar);
    editor.on('blur', () => setTimeout(placeImageBar));
  } else setHtml(editor, current.content);
  renumberFootnotes(editor);
  renderNotes(true);
  dirty = false;
}

// Blank paragraphs (old spacing lines) are dropped on the site, so the editor
// shows them as a thin dotted row instead of a full empty line.
const blankLines = new Plugin({
  props: {
    decorations(state) {
      const marks: Decoration[] = [];
      state.doc.descendants((node, pos) => {
        if (node.type.name !== 'paragraph') return;
        let blank = true;
        node.forEach((c) => { if (c.type.name !== 'hardBreak' && !(c.isText && !c.text!.trim())) blank = false; });
        if (blank) marks.push(Decoration.node(pos, pos + node.nodeSize, { class: 'is-blank' }));
        return false;
      });
      return DecorationSet.create(state.doc, marks);
    },
  },
});

// Image alignment: click an image → 左 / 中央 / 右. Stored as a class on the
// <img> (align-left / align-right; none = centred, the default), which the
// site turns into the figure's alignment (src/lib/supabase-content.mjs).
type Align = 'left' | 'center' | 'right';
const imageBar = $('[data-image-bar]');
function selectedImage(): { node: any; pos: number } | null {
  const sel = editor?.state.selection;
  const node = sel instanceof NodeSelection ? sel.node : null;
  return node && (node.type.name === 'image' || node.type.name === 'imageFigure') ? { node, pos: sel.from } : null;
}
const alignOf = (cls: string | null): Align => (/\balign-left\b/.test(cls ?? '') ? 'left' : /\balign-right\b/.test(cls ?? '') ? 'right' : 'center');
function placeImageBar() {
  const s = selectedImage();
  if (!s || !editor.isFocused) return void (imageBar.hidden = true);
  const dom = editor.view.nodeDOM(s.pos) as HTMLElement | null;
  const img = dom?.tagName === 'IMG' ? dom : dom?.querySelector('img');
  if (!img) return void (imageBar.hidden = true);
  const r = img.getBoundingClientRect();
  const box = $('[data-editor]').getBoundingClientRect();
  imageBar.hidden = false;
  imageBar.style.top = `${r.top - box.top + 10}px`;
  imageBar.style.left = `${r.left - box.left + r.width / 2}px`;
  const current = alignOf(s.node.attrs.class);
  imageBar.querySelectorAll<HTMLButtonElement>('[data-align]').forEach((b) => b.classList.toggle('is-active', b.dataset.align === current));
}
imageBar.addEventListener('mousedown', (e) => e.preventDefault()); // keep the image selected
imageBar.querySelectorAll<HTMLButtonElement>('[data-align]').forEach((b) =>
  b.addEventListener('click', () => {
    const s = selectedImage();
    if (!s) return;
    const classes = String(s.node.attrs.class ?? '')
      .split(/\s+/)
      .filter((c) => c && !/^align-(left|right)$/.test(c));
    if (b.dataset.align !== 'center') classes.push('align-' + b.dataset.align);
    const tr = editor.state.tr.setNodeMarkup(s.pos, undefined, { ...s.node.attrs, class: classes.join(' ') || null });
    editor.view.dispatch(tr.setSelection(NodeSelection.create(tr.doc, s.pos)));
    placeImageBar();
  }),
);

// The title is a textarea so it wraps at the body's width like on the site;
// it grows with its text and Enter does not add a line.
const titleBox = field<HTMLTextAreaElement>('title');
function fitTitle() {
  titleBox.style.height = 'auto';
  titleBox.style.height = titleBox.scrollHeight + 'px';
}
titleBox.addEventListener('input', () => {
  if (/\n/.test(titleBox.value)) titleBox.value = titleBox.value.replace(/\s*\n\s*/g, ' ');
  fitTitle();
});
titleBox.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) e.preventDefault(); });
window.addEventListener('resize', fitTitle);

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
/** Ask Vercel to rebuild the site. null when it started, else why not (for the message). */
// ── the story image (api/story, api/story-send) ──
function syncStory() {
  const saved = current?.id !== undefined;
  $('[data-story]').hidden = !saved;
  if (saved) $<HTMLAnchorElement>('[data-story-view]').href = `/api/story/?id=${current!.id}`;
}
/** Sends the story image; returns how it went, channel by channel. */
async function sendStory(id: number): Promise<string> {
  try {
    const res = await fetch('/api/story-send', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ id }),
    });
    const raw = await res.text();
    let r: any = {};
    try {
      r = JSON.parse(raw);
    } catch {}
    if (!res.ok) return `ストーリー画像を送れませんでした（${res.status}）: ${r.error ?? raw.replace(/\s+/g, ' ').slice(0, 160)}`;
    const done = [r.mail === 'sent' && 'メール', r.line === 'sent' && 'LINE'].filter(Boolean).join('と');
    const why = (ch: string, v: string) =>
      v === 'off'
        ? `${ch}：Vercel の環境変数（${ch === 'メール' ? 'RESEND_API_KEY・NEWSLETTER_FROM' : 'LINE_CHANNEL_ACCESS_TOKEN・LINE_USER_ID'}）が入っていないので送っていません。`
        : v === 'unpublished'
          ? `${ch}：公開済みの記事だけ送れます（予約・下書きは公開後に）。`
          : `${ch}：${v}`;
    const notes = [['メール', r.mail], ['LINE', r.line]].filter(([, v]) => v && v !== 'sent').map(([c, v]) => why(c, v));
    return [done && `ストーリー画像を${done}に送りました。`, ...notes].filter(Boolean).join(' ');
  } catch {
    return 'ストーリー画像を送れませんでした（窓口につながりません）';
  }
}
$('[data-story-send]').addEventListener('click', async () => {
  if (current?.id === undefined) return;
  const out = $('[data-save-msg]');
  msg(out, 'ストーリー画像を送っています…');
  const r = await sendStory(current.id);
  msg(out, r, !/送りました/.test(r));
});

async function rebuild(): Promise<string | null> {
  try {
    const res = await fetch('/api/rebuild', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token}` } });
    if (res.ok) return null;
    const body = await res.json().catch(() => ({}));
    if (res.status === 500 && /VERCEL_DEPLOY_HOOK/.test(body.error ?? ''))
      return 'Vercel の環境変数 VERCEL_DEPLOY_HOOK が設定されていません（Settings → Environment Variables に Deploy Hook の URL を入れて、再デプロイしてください）';
    if (res.status === 401) return 'ログインを確かめられませんでした。ログインし直してから、もう一度保存してください';
    if (res.status === 502) return 'Deploy Hook に断られました（VERCEL_DEPLOY_HOOK の URL が正しいか、そのフックが消されていないか確かめてください）';
    if (res.status === 404) return '再ビルドの窓口（/api/rebuild）が見つかりません。Vercel 以外で開いていませんか';
    return `再ビルドを始められませんでした（${res.status}）`;
  } catch {
    return '再ビルドの窓口につながりませんでした';
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
  if (!(await ensureSignedIn())) return void (button.disabled = false);
  const wasVisible = current.status === 'published' || current.status === 'scheduled';
  const wasPublished = current.id !== undefined && current.status === 'published';
  const res = current.id === undefined
    ? await sb.from('articles').insert(row).select('id').single()
    : await sb.from('articles').update(row).eq('id', current.id).select('id').single();
  button.disabled = false;
  // no row changed: signed out after all (or the article is gone)
  if (res.error?.code === 'PGRST116') {
    if (!(await ensureSignedIn())) return;
    return msg(out, '保存できませんでした。記事が見つからないか、書き込みが許可されていません。ページを再読み込みしてください。', true);
  }
  if (res.error) return msg(out, '保存できませんでした: ' + res.error.message, true);
  const isNew = current.id === undefined;
  current = { ...current, ...row, id: res.data.id };
  dirty = false;
  const visible = status === 'published' || status === 'scheduled';
  if (visible || wasVisible) {
    msg(out, '保存しました。サイトに反映しています…');
    const why = await rebuild();
    msg(out, why ? `保存しました。ただ、サイトに反映できませんでした: ${why}。` : '保存しました。1〜2分でサイトに反映されます。', !!why);
    // just published: the story image goes out by mail and LINE
    if (status === 'published' && !wasPublished && !why) {
      const sent = await sendStory(current.id!);
      if (sent) msg(out, `保存しました。1〜2分でサイトに反映されます。${sent}`);
    }
  } else msg(out, '保存しました（下書き・非公開なので、サイトには出ません）。');
  syncStory();
  if (isNew) history.replaceState(null, '', `#/${current.id}`);
  $('[data-delete]').hidden = false;
  const onSite = $<HTMLAnchorElement>('[data-view-on-site]');
  onSite.hidden = false;
  onSite.href = `/posts/${current.id}/`;
});

$('[data-delete]').addEventListener('click', async () => {
  if (!current?.id || !confirm(`「${current.title}」を削除します。元に戻せません。よろしいですか？`)) return;
  const wasVisible = current.status === 'published' || current.status === 'scheduled';
  if (!(await ensureSignedIn())) return;
  const { error } = await sb.from('articles').delete().eq('id', current.id);
  if (error) return msg($('[data-save-msg]'), '削除できませんでした: ' + error.message, true);
  if (wasVisible) await rebuild();
  dirty = false;
  location.hash = '#/';
});

// the saved display settings are public: apply them (the editor shows the
// article's type) whether or not anyone is signed in
initSettings(sb, rebuild, ensureSignedIn);
initSubscribers(sb);
start();
