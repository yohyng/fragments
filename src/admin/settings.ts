// 表示設定 (/admin/#/settings): the site's look and text, after the old
// site's settings screen (tabs, templates, save). Saved as one row of
// overrides in Supabase `fragments_settings`, which the build reads
// (src/lib/settings.ts); the preview on the right applies changes at once.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  defaults,
  leadParagraphs,
  merge,
  diff,
  settingsCss,
  fontsHref,
  jaFonts,
  latinFonts,
  type Settings,
  type Font,
} from '../lib/settings-shared';
import setupSql from '../../supabase/fragments_settings.sql?raw';

type Key = keyof Settings;
interface Field {
  key: Key;
  label: string;
  type: 'text' | 'textarea' | 'color' | 'color-opt' | 'range' | 'check' | 'font-ja' | 'font-latin' | 'contact' | 'heading';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  rows?: number;
  hint?: string;
  placeholder?: string | (() => string);
  /** shows only after saving (the preview cannot show it) */
  later?: boolean;
  /** font fields: a first option for '' (follow another font) */
  sameAs?: string;
}
interface Tab {
  id: string;
  label: string;
  page: string;
  fields: Field[];
}

const tabs: Tab[] = [
  {
    id: 'overall',
    label: '全体設定',
    page: 'top',
    fields: [
      { key: 'name', label: 'サイト名', type: 'text' },
      { key: 'catchJa', label: 'キャッチコピー（日本語）', type: 'text' },
      { key: 'catchEn', label: 'キャッチコピー（英語）', type: 'textarea', rows: 2 },
      { key: 'description', label: 'サイトの説明（検索結果や SNS で使われます）', type: 'textarea', rows: 3, later: true },
      { key: 'bg', label: '背景色', type: 'color' },
      { key: 'text', label: '文字色', type: 'color' },
      { key: 'accent', label: '差し色（リンク、注の番号、選んでいる項目）', type: 'color' },
      { key: 'selBg', label: '文字を選択したときの背景色', type: 'color-opt' },
      { key: 'selFg', label: '文字を選択したときの文字色', type: 'color' },
      { key: 'fontJaHeading', label: '和文フォント（タイトル・見出し）', type: 'font-ja' },
      { key: 'fontJaBody', label: '和文フォント（本文・注・記事一覧）', type: 'font-ja' },
      { key: 'fontLatinHeading', label: '欧文フォント（サイト名）', type: 'font-latin' },
      { key: 'fontLatinBody', label: '欧文フォント（日付・カテゴリ・英文）', type: 'font-latin' },
    ],
  },
  {
    id: 'article',
    label: '記事本文',
    page: 'article',
    fields: [
      { key: 'bodySizePc', label: '本文の文字サイズ（PC）', type: 'range', min: 15, max: 22, step: 0.5, unit: 'px', hint: '画面幅 1400px 以上。それより狭い PC では少し小さくなります。' },
      { key: 'bodySizeTablet', label: '本文の文字サイズ（タブレット・スマホ）', type: 'range', min: 14, max: 19, step: 0.5, unit: 'px', hint: 'スマホと狭いタブレットでの大きさです。広いタブレットでは画面に合わせて最大 2.5px 大きくなります。' },
      { key: 'lineHeight', label: '行間', type: 'range', min: 1.5, max: 2.4, step: 0.05, unit: '' },
      { key: 'paragraphGap', label: '段落の間', type: 'range', min: 0, max: 1.5, step: 0.25, unit: '行', hint: '改行（Enter）で段落を分けたときの間です。0 にすると、字下げだけで区切ります。' },
      { key: 'blankLine', label: '空行の高さ', type: 'range', min: -1.5, max: 1.5, step: 0.25, unit: '行', hint: '文字のない行を入れたところで、段落の間に足す高さです。マイナスにすると、空行のところだけ段落の間が狭くなります（段落の間より狭くはなりません）。0 なら空行は詰めて表示します。' },
      { key: 'letterSpacing', label: '字間', type: 'range', min: 0, max: 0.15, step: 0.01, unit: 'em' },
      { key: 'measure', label: '1行の字数（PC）', type: 'range', min: 26, max: 42, step: 1, unit: '字' },
      { key: 'indent', label: '段落の頭を1字下げる', type: 'check' },
      { key: 'justify', label: '両端揃え', type: 'check' },
      { key: 'titleSizePc', label: '記事タイトルの文字サイズ（PC）', type: 'range', min: 26, max: 44, step: 1, unit: 'px' },
      { key: 'noteSize', label: '注の文字サイズ（PC）', type: 'range', min: 12, max: 16, step: 0.5, unit: 'px' },
    ],
  },
  {
    id: 'index',
    label: 'トップ・記事一覧',
    page: 'top',
    fields: [
      { key: 'siteNameSize', label: 'サイト名の文字サイズ', type: 'range', min: 20, max: 48, step: 1, unit: 'px', hint: 'PC での大きさです。タブレット・スマホでは同じ比率で少し小さくなります（記事ページ上部のサイト名も）。' },
      { key: 'catchJaSize', label: 'キャッチコピー（日本語）の文字サイズ', type: 'range', min: 11, max: 20, step: 0.5, unit: 'px' },
      { key: 'catchEnSize', label: 'キャッチコピー（英語）の文字サイズ', type: 'range', min: 11, max: 20, step: 0.5, unit: 'px' },
      { key: 'fontIndex', label: '記事一覧（記事タイトル）のフォント', type: 'font-ja', sameAs: '本文と同じ' },
      { key: 'indexSize', label: '記事一覧の文字サイズ', type: 'range', min: 12, max: 17, step: 0.5, unit: 'px', hint: 'PC での大きさです。タブレット・スマホでは同じ比率で少し大きくなります。' },
      { key: 'ixHeadGap', label: '間隔：ヘッダー（サイト名の線）とキャッチコピー', type: 'range', min: 0, max: 160, step: 2, unit: 'px', hint: 'PC・タブレットの値です。' },
      { key: 'ixCatchGap', label: '間隔：キャッチコピーの日本語と英語', type: 'range', min: 0, max: 60, step: 1, unit: 'px' },
      { key: 'ixCatsGap', label: '間隔：キャッチコピーとカテゴリ（all / essay …）', type: 'range', min: 0, max: 200, step: 2, unit: 'px', hint: '初期値のままなら、PC では記事一覧の書き出しを右の記事本文の高さにそろえます（タブレットは 62px）。動かすと PC・タブレットともこの間隔になります。' },
      { key: 'ixListGap', label: '間隔：カテゴリと記事一覧', type: 'range', min: 0, max: 80, step: 1, unit: 'px', hint: '初期値のままなら PC 22px・タブレット 12px です。' },
      { key: 'pageSize', label: '一度に表示する記事の数', type: 'range', min: 10, max: 60, step: 5, unit: '件', hint: '「さらに読み込む」で増える数も同じです。', later: true },
      { key: 'welcomeOn', label: 'スマホ（画面幅 759px 以下）', type: 'heading', hint: 'スマホでの文字サイズです。動かすまでは PC の値から決まる大きさで表示します。プレビューを「スマホ」にすると確かめられます。' },
      { key: 'siteNameSizeSp', label: 'スマホ：サイト名の文字サイズ', type: 'range', min: 16, max: 44, step: 1, unit: 'px', hint: '記事ページ・About 上部のサイト名も同じ大きさです。' },
      { key: 'catchJaSizeSp', label: 'スマホ：キャッチコピー（日本語）の文字サイズ', type: 'range', min: 10, max: 20, step: 0.5, unit: 'px' },
      { key: 'catchEnSizeSp', label: 'スマホ：キャッチコピー（英語）の文字サイズ', type: 'range', min: 10, max: 20, step: 0.5, unit: 'px' },
      { key: 'indexSizeSp', label: 'スマホ：記事一覧の文字サイズ', type: 'range', min: 11, max: 20, step: 0.5, unit: 'px' },
      { key: 'ixHeadGapSp', label: 'スマホ：間隔：ヘッダーとキャッチコピー', type: 'range', min: 0, max: 120, step: 2, unit: 'px' },
      { key: 'ixCatchGapSp', label: 'スマホ：間隔：キャッチコピーの日本語と英語', type: 'range', min: 0, max: 60, step: 1, unit: 'px' },
      { key: 'ixCatsGapSp', label: 'スマホ：間隔：キャッチコピーとカテゴリ', type: 'range', min: 0, max: 160, step: 2, unit: 'px' },
      { key: 'ixListGapSp', label: 'スマホ：間隔：カテゴリと記事一覧', type: 'range', min: -10, max: 80, step: 1, unit: 'px' },
    ],
  },
  {
    id: 'about',
    label: 'About・SNS',
    page: 'about',
    fields: [
      { key: 'about', label: 'About の文章', type: 'textarea', rows: 6 },
      { key: 'authorName', label: '著者名（検索エンジン向けの情報に使われます）', type: 'text', later: true },
      { key: 'contact', label: '連絡先（1行に「表示名 | リンク先」）', type: 'contact', rows: 6, hint: 'メールは「mailto:」から書きます。例: mail@example.com | mailto:mail@example.com', later: true },
      { key: 'ogImage', label: 'SNS でシェアされたときの画像（URL、1200×630px）', type: 'text', placeholder: 'https://…', later: true },
      { key: 'twitter', label: 'X のアカウント', type: 'text', placeholder: '@fragments', later: true },
    ],
  },
  {
    id: 'welcome',
    label: 'はじめの案内',
    page: 'welcome',
    fields: [
      { key: 'welcomeOn', label: 'トップページに初めて来た人に、登録の案内を一度だけ出す', type: 'check', later: true },
      { key: 'welcomeTitle', label: 'タイトル', type: 'text' },
      {
        key: 'welcomeLead',
        label: '説明文（日本語）',
        type: 'textarea',
        rows: 3,
        hint: '空欄なら、キャッチコピーと「新しい記事を、メールでお届けします。」になります。',
        placeholder: () => `${state.catchJa.replace(/\s*\/$/, '')}。\n新しい記事を、メールでお届けします。`,
      },
      { key: 'welcomeLeadEn', label: '説明文（英語）', type: 'textarea', rows: 2, hint: '空欄なら英語のキャッチコピーになります。', placeholder: () => state.catchEn },
      { key: 'welcomeReadJa', label: '「記事を読む」の文言（日本語）', type: 'text' },
      { key: 'welcomeReadEn', label: '「記事を読む」の文言（英語）', type: 'text', hint: '空欄なら日本語だけになります。' },
      { key: 'welcomeWidth', label: '説明文と登録欄の幅', type: 'range', min: 280, max: 960, step: 10, unit: 'px', hint: '日本語・英語の説明文とメール登録欄が、この幅にそろいます。狭い画面では画面幅に合わせます。' },
      { key: 'welcomeLogoSize', label: 'サイト名（大きなロゴ）の文字サイズ', type: 'range', min: 48, max: 200, step: 4, unit: 'px', hint: '広い画面での大きさです。狭い画面では画面幅に合わせて小さくなります（最小で半分）。' },
      { key: 'welcomeTitleSize', label: 'タイトルの文字サイズ', type: 'range', min: 18, max: 56, step: 1, unit: 'px' },
      { key: 'welcomeLeadSize', label: '説明文（日本語）の文字サイズ', type: 'range', min: 12, max: 22, step: 0.5, unit: 'px' },
      { key: 'welcomeLeadEnSize', label: '説明文（英語）の文字サイズ', type: 'range', min: 11, max: 20, step: 0.5, unit: 'px' },
      { key: 'welcomeRuleLength', label: 'タイトルと説明文のあいだの区切り線：長さ', type: 'range', min: 0, max: 520, step: 4, unit: 'px', hint: '0 にすると線なしになります。' },
      { key: 'welcomeRuleWeight', label: 'タイトルと説明文のあいだの区切り線：太さ', type: 'range', min: 0.5, max: 4, step: 0.5, unit: 'px' },
      { key: 'welcomeTitleRuleGap', label: '間隔：タイトルと区切り線', type: 'range', min: -240, max: 80, step: 2, unit: 'px', hint: 'マイナスにすると線が上に寄ります。タイトルが空欄のときも、その上の余白（画面の高さの 12%、56〜128px）が残るので、マイナスで詰められます。' },
      { key: 'welcomeRuleLeadGap', label: '間隔：区切り線と説明文（日本語）', type: 'range', min: 0, max: 80, step: 2, unit: 'px', hint: '区切り線がないとき（長さ 0）は、タイトルと説明文のあいだが 16px になります。' },
      { key: 'welcomeLeadEnGap', label: '間隔：説明文の日本語と英語', type: 'range', min: 0, max: 80, step: 2, unit: 'px' },
      { key: 'welcomeLeadParaGap', label: '説明文の中の空行の高さ', type: 'range', min: 0, max: 2, step: 0.25, unit: '行', hint: '説明文に空行（何も書かない行）を入れたところの高さです。日本語・英語とも。' },
      { key: 'welcomeOn', label: 'スマホ（画面幅 759px 以下）', type: 'heading', hint: 'スマホでの大きさと間隔です。動かすまでは PC の値に合わせて表示します（ロゴは PC の半分）。プレビューを「スマホ」にすると確かめられます。' },
      { key: 'welcomeWidthSp', label: 'スマホ：説明文と登録欄の幅', type: 'range', min: 240, max: 760, step: 10, unit: 'px', hint: '普通のスマホでは画面幅が上限なので、主に折りたたみスマホを開いたときなど、幅の広いスマホに効きます。' },
      { key: 'welcomeLogoSizeSp', label: 'スマホ：サイト名（大きなロゴ）の文字サイズ', type: 'range', min: 32, max: 120, step: 2, unit: 'px', hint: '画面幅 390px での大きさです。それより広いスマホでは少し大きくなります。' },
      { key: 'welcomeTitleSizeSp', label: 'スマホ：タイトルの文字サイズ', type: 'range', min: 16, max: 48, step: 1, unit: 'px' },
      { key: 'welcomeLeadSizeSp', label: 'スマホ：説明文（日本語）の文字サイズ', type: 'range', min: 11, max: 20, step: 0.5, unit: 'px' },
      { key: 'welcomeLeadEnSizeSp', label: 'スマホ：説明文（英語）の文字サイズ', type: 'range', min: 10, max: 18, step: 0.5, unit: 'px' },
      { key: 'welcomeRuleLengthSp', label: 'スマホ：区切り線の長さ', type: 'range', min: 0, max: 360, step: 4, unit: 'px', hint: '0 にすると線なしになります。' },
      { key: 'welcomeTitleRuleGapSp', label: 'スマホ：間隔：タイトルと区切り線', type: 'range', min: -240, max: 80, step: 2, unit: 'px' },
      { key: 'welcomeRuleLeadGapSp', label: 'スマホ：間隔：区切り線と説明文（日本語）', type: 'range', min: 0, max: 80, step: 2, unit: 'px' },
      { key: 'welcomeLeadEnGapSp', label: 'スマホ：間隔：説明文の日本語と英語', type: 'range', min: 0, max: 80, step: 2, unit: 'px' },
      { key: 'welcomeLeadParaGapSp', label: 'スマホ：説明文の中の空行の高さ', type: 'range', min: 0, max: 2, step: 0.25, unit: '行' },
    ],
  },
];

/** what a phone value follows until set: its PC value times this */
const phoneScale: Partial<Record<Key, number>> = { welcomeLogoSize: 0.5, siteNameSize: 26 / 30, indexSize: 14 / 13 };

const devices = { pc: 1440, tablet: 1024, phone: 390 } as const;
type Device = keyof typeof devices;

interface Preset {
  name: string;
  data: Partial<Settings>;
}

let sb: SupabaseClient;
let rebuild: () => Promise<string | null>;
let state: Settings = merge(null);
let saved: Settings = merge(null);
let presets: Preset[] = [];
let tableMissing = false;
let tab = tabs[0];
let page = 'top';
let device: Device = 'pc';
let articlePath = '/';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const msg = (text: string, error = false) => {
  const out = $('[data-set-msg]');
  out.textContent = text;
  out.classList.toggle('error', error);
};
const isMissing = (e: { code?: string } | null) => !!e && (e.code === 'PGRST205' || e.code === '42P01');

// ── the admin itself follows the settings (the editor shows the article's type) ──

function applyToAdmin(s: Settings) {
  let style = document.getElementById('site-settings');
  if (!style) {
    style = Object.assign(document.createElement('style'), { id: 'site-settings' });
    document.head.append(style);
  }
  style.textContent = settingsCss(s);
  setFonts(document, s, 'site-fonts');
}

function setFonts(doc: Document, s: Settings, id: string) {
  const href = fontsHref(s);
  let link = doc.getElementById(id) as HTMLLinkElement | null;
  if (href === fontsHref(defaults)) return link?.remove();
  if (!link) {
    link = Object.assign(doc.createElement('link'), { id, rel: 'stylesheet' });
    doc.head.append(link);
  }
  if (link.href !== href) link.href = href;
}

/** Load the saved settings (public) and apply them to the admin. */
let ensureSignedIn: () => Promise<boolean> = async () => true;
export async function initSettings(client: SupabaseClient, rebuildSite: () => Promise<string | null>, signedIn?: () => Promise<boolean>) {
  if (signedIn) ensureSignedIn = signedIn;
  sb = client;
  rebuild = rebuildSite;
  await load();
  applyToAdmin(saved);
}

let savedAt = '';
async function load() {
  const { data, error } = await sb.from('fragments_settings').select('data,presets,updated_at').eq('id', 1).maybeSingle();
  savedAt = data?.updated_at ?? '';
  tableMissing = isMissing(error);
  if (error && !tableMissing) msg('設定を読み込めませんでした: ' + error.message, true);
  saved = merge(data?.data);
  presets = Array.isArray(data?.presets) ? data.presets : [];
}

// ── the screen ──

export async function openSettings() {
  await load();
  state = structuredClone(saved);
  $('[data-set-missing]').hidden = !tableMissing;
  $('[data-set-sql]').textContent = setupSql.trim();
  if (!tableMissing) msg('');
  renderTabs();
  renderFields();
  renderPresets();
  checkBuild();
  dirty = false;
  const { data } = await sb.from('articles').select('id').eq('status', 'published').order('date', { ascending: false }).limit(1);
  articlePath = data?.[0] ? `/posts/${data[0].id}/` : '/';
  loadPreview();
}

let dirty = false;

function renderTabs() {
  const nav = $('[data-set-tabs]');
  nav.innerHTML = '';
  for (const t of tabs) {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: t.label });
    b.classList.toggle('is-active', t === tab);
    b.addEventListener('click', () => {
      tab = t;
      renderTabs();
      renderFields();
      if (page !== t.page) {
        page = t.page;
        syncPreviewControls();
        loadPreview();
      }
    });
    nav.append(b);
  }
}

const fontOptions = (select: HTMLSelectElement, list: Font[]) => {
  for (const group of [...new Set(list.map((f) => f.group))]) {
    const og = Object.assign(document.createElement('optgroup'), { label: group });
    for (const f of list.filter((f) => f.group === group)) og.append(new Option(f.label, f.family));
    select.append(og);
  }
};

const contactText = (c: Settings['contact']) => c.map((x) => `${x.label} | ${x.href}`).join('\n');
const parseContact = (t: string) =>
  t
    .split('\n')
    .map((line) => line.split('|').map((s) => s.trim()))
    .filter(([label, href]) => label && href)
    .map(([label, href]) => ({ label, href }));

function renderFields() {
  const box = $('[data-set-fields]');
  box.innerHTML = '';
  for (const f of tab.fields) box.append(fieldRow(f));
}

function fieldRow(f: Field): HTMLElement {
  const row = document.createElement('div');
  row.className = 'set-row';
  if (f.type === 'heading') {
    row.classList.add('set-heading');
    row.append(Object.assign(document.createElement('h3'), { textContent: f.label }));
    if (f.hint) row.append(Object.assign(document.createElement('p'), { className: 'hint', textContent: f.hint }));
    return row;
  }
  const set = (v: unknown) => {
    (state as any)[f.key] = v;
    dirty = true;
    refresh(f.key);
    reset.hidden = JSON.stringify(state[f.key]) === JSON.stringify(defaults[f.key]);
  };
  const label = Object.assign(document.createElement('div'), { className: 'set-label', textContent: f.label });
  const reset = Object.assign(document.createElement('button'), { type: 'button', className: 'link set-reset', textContent: '既定に戻す' });
  reset.hidden = JSON.stringify(state[f.key]) === JSON.stringify(defaults[f.key]);
  reset.addEventListener('click', () => {
    (state as any)[f.key] = structuredClone(defaults[f.key]);
    dirty = true;
    row.replaceWith(fieldRow(f));
    refresh(f.key);
  });
  label.append(reset);
  if (f.type !== 'check') row.append(label);
  // a phone value left as it is follows the PC one: show what is in effect
  let value = state[f.key];
  const pcKey = f.key.endsWith('Sp') ? (f.key.slice(0, -2) as Key) : null;
  // (the index gaps on phones have their own defaults and follow nothing)
  if (pcKey && pcKey in defaults && !pcKey.startsWith('ix') && value === defaults[f.key])
    value = (Math.round((state[pcKey] as number) * (phoneScale[pcKey] ?? 1) * 2) / 2) as never;
  const ph = typeof f.placeholder === 'function' ? f.placeholder() : (f.placeholder ?? '');

  if (f.type === 'text' || f.type === 'textarea' || f.type === 'contact') {
    const input =
      f.type === 'text'
        ? Object.assign(document.createElement('input'), { type: 'text' })
        : Object.assign(document.createElement('textarea'), { rows: f.rows ?? 3 });
    input.placeholder = ph;
    input.value = f.type === 'contact' ? contactText(value as Settings['contact']) : String(value);
    input.addEventListener('input', () => set(f.type === 'contact' ? parseContact(input.value) : input.value));
    row.append(input);
  } else if (f.type === 'color' || f.type === 'color-opt') {
    const line = Object.assign(document.createElement('div'), { className: 'set-color' });
    const color = Object.assign(document.createElement('input'), { type: 'color' });
    const hex = Object.assign(document.createElement('input'), { type: 'text', className: 'hex', spellcheck: false });
    const current = () => (value as string) || state.accent;
    color.value = current();
    hex.value = current();
    color.addEventListener('input', () => {
      hex.value = color.value;
      set(color.value);
      if (same) same.checked = false;
    });
    hex.addEventListener('change', () => {
      if (!/^#[0-9a-f]{6}$/i.test(hex.value.trim())) return void (hex.value = color.value);
      color.value = hex.value.trim().toLowerCase();
      set(color.value);
      if (same) same.checked = false;
    });
    line.append(color, hex);
    let same: HTMLInputElement | null = null;
    if (f.type === 'color-opt') {
      same = Object.assign(document.createElement('input'), { type: 'checkbox', checked: !value });
      const l = document.createElement('label');
      l.className = 'set-inline';
      l.append(same, '差し色と同じ');
      same.addEventListener('change', () => {
        set(same!.checked ? '' : color.value);
        color.value = hex.value = (state[f.key] as string) || state.accent;
      });
      line.append(l);
    }
    row.append(line);
  } else if (f.type === 'range') {
    const line = Object.assign(document.createElement('div'), { className: 'set-range' });
    const range = Object.assign(document.createElement('input'), { type: 'range', min: String(f.min), max: String(f.max), step: String(f.step) });
    const num = Object.assign(document.createElement('input'), { type: 'number', min: String(f.min), max: String(f.max), step: String(f.step) });
    range.value = num.value = String(value);
    const unit = Object.assign(document.createElement('span'), { className: 'unit', textContent: f.unit ?? '' });
    range.addEventListener('input', () => {
      num.value = range.value;
      set(Number(range.value));
    });
    num.addEventListener('change', () => {
      const n = Math.min(f.max!, Math.max(f.min!, Number(num.value) || (defaults[f.key] as number)));
      num.value = range.value = String(n);
      set(n);
    });
    line.append(range, num, unit);
    row.append(line);
  } else if (f.type === 'check') {
    const l = document.createElement('label');
    l.className = 'set-inline';
    const box = Object.assign(document.createElement('input'), { type: 'checkbox', checked: !!value });
    box.addEventListener('change', () => set(box.checked));
    l.append(box, f.label);
    row.append(l, reset);
  } else {
    const select = document.createElement('select');
    const list = f.type === 'font-ja' ? jaFonts : latinFonts;
    if (f.sameAs) select.append(new Option(f.sameAs, ''));
    fontOptions(select, list);
    select.value = String(value);
    select.style.fontFamily = value ? `'${value}'` : '';
    select.addEventListener('change', () => {
      set(select.value);
      select.style.fontFamily = select.value ? `'${select.value}'` : '';
    });
    row.append(select);
  }
  if (f.hint || f.later) {
    const hint = Object.assign(document.createElement('p'), { className: 'hint' });
    hint.textContent = [f.hint, f.later ? 'プレビューには出ません。保存してサイトに反映されると変わります。' : ''].filter(Boolean).join(' ');
    row.append(hint);
  }
  return row;
}

// ── templates ──

function renderPresets() {
  const select = $<HTMLSelectElement>('[data-set-preset]');
  select.innerHTML = '';
  select.append(new Option(presets.length ? 'テンプレートを選ぶ…' : '保存したテンプレートはまだありません', ''));
  presets.forEach((p, i) => select.append(new Option(p.name, String(i))));
}

async function savePresets(next: Preset[], done: string) {
  if (!(await ensureSignedIn())) return;
  const { error } = await sb.from('fragments_settings').upsert({ id: 1, data: diff(saved), presets: next });
  if (error) return msg('テンプレートを保存できませんでした: ' + error.message, true);
  presets = next;
  renderPresets();
  msg(done);
}

$('[data-set-preset-apply]').addEventListener('click', () => {
  const p = presets[Number($<HTMLSelectElement>('[data-set-preset]').value)];
  if (!p) return;
  state = merge(p.data);
  dirty = true;
  renderFields();
  refresh();
  msg(`「${p.name}」を当てはめました。よければ「保存」を押してください。`);
});
$('[data-set-preset-delete]').addEventListener('click', () => {
  const i = Number($<HTMLSelectElement>('[data-set-preset]').value);
  const p = presets[i];
  if (!p || !confirm(`テンプレート「${p.name}」を削除しますか？`)) return;
  savePresets(presets.filter((_, j) => j !== i), `「${p.name}」を削除しました。`);
});
$('[data-set-preset-save]').addEventListener('click', () => {
  const input = $<HTMLInputElement>('[data-set-preset-name]');
  const name = input.value.trim();
  if (!name) return msg('テンプレートの名前を入れてください。', true);
  const i = presets.findIndex((p) => p.name === name);
  if (i >= 0 && !confirm(`「${name}」はもうあります。いまの設定で上書きしますか？`)) return;
  const next = [...presets];
  const entry = { name, data: diff(state) };
  if (i >= 0) next[i] = entry;
  else next.push(entry);
  input.value = '';
  savePresets(next, `いまの設定を「${name}」として保存しました。`);
});

// ── save ──

$('[data-set-save]').addEventListener('click', async () => {
  const button = $<HTMLButtonElement>('[data-set-save]');
  button.disabled = true;
  if (tableMissing) {
    // the SQL may have been run since this screen was opened: look again
    const { error } = await sb.from('fragments_settings').select('id').limit(1);
    tableMissing = isMissing(error);
    $('[data-set-missing]').hidden = !tableMissing;
    if (tableMissing) {
      button.disabled = false;
      return msg('表示設定のテーブルがまだ見つかりません。上の SQL を Supabase で実行してから、もう一度押してください。', true);
    }
  }
  msg('保存しています…');
  if (!(await ensureSignedIn())) return void (button.disabled = false);
  const { error } = await sb.from('fragments_settings').upsert({ id: 1, data: diff(state), presets, updated_at: new Date().toISOString() });
  button.disabled = false;
  if (error) return msg('保存できませんでした: ' + error.message, true);
  saved = structuredClone(state);
  dirty = false;
  applyToAdmin(saved);
  await load();
  const why = await rebuild();
  msg(why ? `保存しました。ただ、サイトに反映できませんでした: ${why}。` : '保存しました。1〜2分でサイトに反映されます。', !!why);
  if (!why) watchBuild();
});
$('[data-set-reset-all]').addEventListener('click', () => {
  if (!confirm('すべての項目を既定（デザインどおり）に戻しますか？「保存」を押すまでサイトは変わりません。')) return;
  state = merge(null);
  dirty = true;
  renderFields();
  refresh();
});
$('[data-set-sql-copy]').addEventListener('click', async () => {
  await navigator.clipboard.writeText(setupSql.trim());
  $('[data-set-sql-copy]').textContent = 'コピーしました';
});

// ── has the live site caught up? ──
// Every page carries when it was built and which saved settings it used
// (Base.astro); compare that with the last save.

const fmt = (iso: string) => new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

async function checkBuild(): Promise<boolean> {
  const out = $('[data-set-status]');
  out.className = 'set-status';
  if (tableMissing || !savedAt) return void (out.textContent = ''), true;
  try {
    const html = await (await fetch('/?build-check=' + Date.now(), { cache: 'no-store' })).text();
    const tag = /<meta name="fragments-build"[^>]*>/.exec(html)?.[0] ?? '';
    const built = /content="([^"]+)"/.exec(tag)?.[1] ?? '';
    const used = /data-settings-saved="([^"]*)"/.exec(tag)?.[1] ?? '';
    if (!built) return void (out.textContent = ''), true;
    const done = !!used && new Date(used).getTime() >= new Date(savedAt).getTime() - 1000;
    out.textContent = done
      ? `サイトは最新の設定で表示されています（サイトのビルド ${fmt(built)}）。`
      : `サイトはまだ前の設定のままです（最後の保存 ${fmt(savedAt)}／サイトのビルド ${fmt(built)}）。`;
    out.classList.add(done ? 'is-done' : 'is-behind');
    return done;
  } catch {
    out.textContent = '';
    return true;
  }
}

let watching = 0;
function watchBuild() {
  const id = ++watching;
  const started = Date.now();
  const tick = async () => {
    if (id !== watching) return;
    const done = await checkBuild();
    if (!done && Date.now() - started < 6 * 60_000) setTimeout(tick, 15_000);
    else if (!done)
      msg('6分たってもサイトが新しい設定になりません。Vercel の Deployments でビルドが失敗していないか確かめてください。', true);
  };
  setTimeout(tick, 20_000);
}

// ── preview ──

const frame = () => $<HTMLIFrameElement>('[data-pv]');
const pathFor = (p: string) => ({ top: '/', article: articlePath, about: '/about/', welcome: '/subscribe/' })[p] ?? '/';

function syncPreviewControls() {
  $<HTMLSelectElement>('[data-pv-page]').value = page;
  document.querySelectorAll<HTMLButtonElement>('[data-pv-device]').forEach((b) => b.classList.toggle('is-active', b.dataset.pvDevice === device));
}

function loadPreview() {
  syncPreviewControls();
  fit();
  frame().src = pathFor(page);
}

function fit() {
  const pane = $('[data-pv-pane]');
  const w = devices[device];
  const scale = Math.min(1, pane.clientWidth / w);
  const f = frame();
  f.style.width = w + 'px';
  f.style.height = pane.clientHeight / scale + 'px';
  f.style.transform = `scale(${scale})`;
}

$<HTMLSelectElement>('[data-pv-page]').addEventListener('change', (e) => {
  page = (e.target as HTMLSelectElement).value;
  loadPreview();
});
document.querySelectorAll<HTMLButtonElement>('[data-pv-device]').forEach((b) =>
  b.addEventListener('click', () => {
    device = b.dataset.pvDevice as Device;
    loadPreview();
  }),
);
addEventListener('resize', () => !$('[data-view="settings"]').hidden && fit());
frame().addEventListener('load', () => {
  const doc = frame().contentDocument;
  if (!doc) return;
  doc.documentElement.removeAttribute('data-welcome'); // no first-visit overlay in the preview
  doc.documentElement.classList.remove('fonts-wait', 'fonts-wait-pane');
  doc.querySelector('style[data-settings]')?.remove(); // the built settings; the preview's replace them
  refresh();
});

/** Show the current settings in the preview (CSS and the texts it can). */
function refresh(changed?: Key) {
  const doc = frame().contentDocument;
  if (!doc?.head) return;
  let style = doc.getElementById('pv-settings');
  if (!style) {
    style = Object.assign(doc.createElement('style'), { id: 'pv-settings' });
    doc.head.append(style);
  }
  style.textContent = settingsCss(state);
  setFonts(doc, state, 'pv-fonts');
  const s = state;
  const text = (sel: string, t: string) => doc.querySelectorAll(sel).forEach((n) => (n.textContent = t));
  text('.index .site, .rule .site, .welcome .logo', s.name);
  text('.intro-ja, .catch-ja', s.catchJa);
  text('.intro-en, .catch-en', s.catchEn);
  text('.desc', s.about);
  text('#welcome-title', s.welcomeTitle);
  // the leads as Welcome.astro sets them: paragraphs at blank lines, <br> within
  const setLead = (sel: string, t: string) => {
    const el = doc.querySelector(sel);
    if (!el) return;
    el.replaceChildren(
      ...leadParagraphs(t).map((lines) => {
        const para = doc.createElement('span');
        para.className = el.querySelector('.para')?.className || 'para';
        para.append(...lines.flatMap((l, i) => (i ? [doc.createElement('br'), l] : [l])));
        return para;
      }),
    );
  };
  setLead('.welcome .lead', s.welcomeLead || `${s.catchJa.replace(/\s*\/$/, '')}。\n新しい記事を、メールでお届けします。`);
  setLead('.welcome .lead-en', s.welcomeLeadEn || s.catchEn);
  // placeholders that follow other fields
  if (changed === 'catchJa' || changed === 'catchEn' || !changed)
    document.querySelectorAll<HTMLTextAreaElement>('[data-set-fields] textarea').forEach((t) => {
      if (t.placeholder.includes('メールでお届け')) t.placeholder = `${s.catchJa.replace(/\s*\/$/, '')}。\n新しい記事を、メールでお届けします。`;
    });
}
