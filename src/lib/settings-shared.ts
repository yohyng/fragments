// Display settings (/admin/ → 表示設定). The defaults are the site as
// designed; the admin saves only a row of overrides (Supabase
// `fragments_settings`), which the build reads (src/lib/settings.ts) and the
// admin's live preview applies directly. Shared by both, so no Node or
// Supabase imports here.

export interface Contact {
  label: string;
  href: string;
}

export interface Settings {
  // 全体設定
  name: string;
  catchJa: string;
  catchEn: string;
  description: string;
  bg: string;
  text: string;
  accent: string;
  /** '' = the accent colour */
  selBg: string;
  selFg: string;
  fontJaHeading: string;
  fontJaBody: string;
  /** article titles in the index; '' = the body font */
  fontIndex: string;
  fontLatinHeading: string;
  fontLatinBody: string;
  // 記事本文
  bodySizePc: number;
  bodySizeTablet: number;
  lineHeight: number;
  /** space between paragraphs, in lines */
  paragraphGap: number;
  /** height of a blank line the writer left (an empty paragraph), in lines; 0 = none */
  blankLine: number;
  letterSpacing: number;
  measure: number;
  indent: boolean;
  justify: boolean;
  titleSizePc: number;
  noteSize: number;
  // 記事一覧
  siteNameSize: number;
  catchJaSize: number;
  catchEnSize: number;
  /** the index on phones (≤759px); as they are, they follow the PC sizes */
  siteNameSizeSp: number;
  catchJaSizeSp: number;
  catchEnSizeSp: number;
  indexSizeSp: number;
  indexSize: number;
  /** index gaps, px: header → catch, Japanese → English, catch → categories, categories → list (PC/tablet, then phones) */
  ixHeadGap: number;
  ixCatchGap: number;
  ixCatsGap: number;
  ixListGap: number;
  /** the thin rule under the catch copy: length (0 = none) and distance below the English, px */
  ixRuleLength: number;
  ixRuleGap: number;
  ixHeadGapSp: number;
  ixCatchGapSp: number;
  ixCatsGapSp: number;
  ixListGapSp: number;
  pageSize: number;
  // About・SNS
  about: string;
  authorName: string;
  contact: Contact[];
  ogImage: string;
  twitter: string;
  // はじめの案内 (fragments folio)
  welcomeOn: boolean;
  welcomeTitle: string;
  /** '' = made from the Japanese catch copy */
  welcomeLead: string;
  /** '' = the English catch copy */
  welcomeLeadEn: string;
  welcomeLogoSize: number;
  welcomeTitleSize: number;
  welcomeLeadSize: number;
  welcomeLeadEnSize: number;
  /** the rule between the title and the lead: length (0 = none) and weight, px */
  welcomeRuleLength: number;
  welcomeRuleWeight: number;
  /** px: title → rule, rule → Japanese lead, Japanese → English lead */
  welcomeTitleRuleGap: number;
  welcomeRuleLeadGap: number;
  welcomeLeadEnGap: number;
  /** a blank line inside the leads, in lines */
  welcomeLeadParaGap: number;
  /** width of the leads and the subscribe form, px */
  welcomeWidth: number;
  /** the link into the site (and the button once subscribed) */
  welcomeReadJa: string;
  welcomeReadEn: string;
  /** the same on phones (≤759px) */
  welcomeLogoSizeSp: number;
  welcomeTitleSizeSp: number;
  welcomeLeadSizeSp: number;
  welcomeLeadEnSizeSp: number;
  welcomeRuleLengthSp: number;
  welcomeTitleRuleGapSp: number;
  welcomeRuleLeadGapSp: number;
  welcomeLeadEnGapSp: number;
  welcomeLeadParaGapSp: number;
  welcomeWidthSp: number;
}

export const defaults: Settings = {
  name: 'fragments',
  catchJa: '建築・空間・デザインをめぐる思索、試論 /',
  catchEn: 'Explorations and Abductive Speculations on Architecture, Space, and Design.',
  description:
    '建築・空間・デザインをめぐる思索、試論。批評・エッセイ・論考を中心とした個人メディア。Explorations and Abductive Speculations on Architecture, Space, and Design.',
  bg: '#f3f2f2',
  text: '#201f1d',
  accent: '#0000ff',
  selBg: '',
  selFg: '#ffffff',
  fontJaHeading: 'Shippori Mincho',
  fontJaBody: 'Zen Old Mincho',
  fontIndex: '',
  fontLatinHeading: 'Cormorant Garamond',
  fontLatinBody: 'Lora',
  bodySizePc: 18,
  bodySizeTablet: 15.5,
  lineHeight: 1.9,
  paragraphGap: 1,
  blankLine: 0,
  letterSpacing: 0.02,
  measure: 34,
  indent: true,
  justify: true,
  titleSizePc: 36,
  noteSize: 14,
  siteNameSize: 30,
  catchJaSize: 13,
  catchEnSize: 13,
  siteNameSizeSp: 26,
  catchJaSizeSp: 13,
  catchEnSizeSp: 13,
  indexSizeSp: 14,
  indexSize: 13,
  ixHeadGap: 56,
  ixCatchGap: 4,
  ixCatsGap: 62,
  ixListGap: 22,
  ixRuleLength: 40,
  ixRuleGap: 16,
  ixHeadGapSp: 40,
  ixCatchGapSp: 4,
  ixCatsGapSp: 40,
  ixListGapSp: 0,
  pageSize: 20,
  about: 'メディアについての説明文（運営者、更新の方針など）がここに入ります。',
  authorName: '著者名',
  contact: [
    { label: 'mail@example.com', href: 'mailto:mail@example.com' },
    { label: 'Twitter', href: '#' },
    { label: 'Instagram', href: '#' },
    { label: 'Facebook', href: '#' },
    { label: 'Website', href: '#' },
  ],
  ogImage: '',
  twitter: '',
  welcomeOn: true,
  welcomeTitle: 'fragments folio',
  welcomeLead: '',
  welcomeLeadEn: '',
  welcomeLogoSize: 128,
  welcomeTitleSize: 32,
  welcomeLeadSize: 15,
  welcomeLeadEnSize: 13,
  welcomeRuleLength: 64,
  welcomeRuleWeight: 1,
  welcomeTitleRuleGap: 22,
  welcomeRuleLeadGap: 22,
  welcomeLeadEnGap: 6,
  welcomeLeadParaGap: 1,
  welcomeWidth: 520,
  welcomeReadJa: '記事を読む',
  welcomeReadEn: 'Read the articles',
  welcomeLogoSizeSp: 64,
  welcomeTitleSizeSp: 32,
  welcomeLeadSizeSp: 15,
  welcomeLeadEnSizeSp: 13,
  welcomeRuleLengthSp: 64,
  welcomeTitleRuleGapSp: 22,
  welcomeRuleLeadGapSp: 22,
  welcomeLeadEnGapSp: 6,
  welcomeLeadParaGapSp: 1,
  welcomeWidthSp: 520,
};

/** A welcome lead's text → paragraphs (split at blank lines) of lines. */
export const leadParagraphs = (text: string): string[][] =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((p) => p.length);

/** Saved overrides on top of the defaults; unknown or mistyped keys are dropped. */
export function merge(saved: unknown): Settings {
  const out: Settings = structuredClone(defaults);
  if (!saved || typeof saved !== 'object') return out;
  for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
    if (!(k in defaults)) continue;
    const d = (defaults as any)[k];
    if (Array.isArray(d)) {
      if (Array.isArray(v)) (out as any)[k] = v.filter((c) => c && typeof c.label === 'string' && typeof c.href === 'string');
    } else if (typeof v === typeof d && (typeof v !== 'number' || Number.isFinite(v))) (out as any)[k] = v;
  }
  return out;
}

/** Only the keys that differ from the defaults (what gets saved). */
export function diff(s: Settings): Partial<Settings> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(defaults) as (keyof Settings)[])
    if (JSON.stringify(s[k]) !== JSON.stringify(defaults[k])) out[k] = s[k];
  return out as Partial<Settings>;
}

// ── Fonts (Google Fonts) ──

export interface Font {
  family: string;
  label: string;
  group: string;
  /** has a 500 weight (Japanese headings use 500) */
  w500?: boolean;
  /** has an italic (Latin body text uses italics) */
  ital?: boolean;
}

export const jaFonts: Font[] = [
  { family: 'Zen Old Mincho', label: 'Zen Old Mincho', group: '明朝体', w500: true },
  { family: 'Shippori Mincho', label: '秀英明朝 (Shippori Mincho)', group: '明朝体', w500: true },
  { family: 'Shippori Mincho B1', label: '秀英明朝 B1', group: '明朝体', w500: true },
  { family: 'Noto Serif JP', label: 'Noto Serif JP', group: '明朝体', w500: true },
  { family: 'Kaisei Tokumin', label: 'Kaisei Tokumin', group: '明朝体', w500: true },
  { family: 'Kaisei Decol', label: 'Kaisei Decol', group: '明朝体', w500: true },
  { family: 'BIZ UDPMincho', label: 'BIZ UDPMincho', group: '明朝体' },
  { family: 'Sawarabi Mincho', label: 'さわらび明朝', group: '明朝体' },
  { family: 'Noto Sans JP', label: 'Noto Sans JP', group: 'ゴシック体', w500: true },
  { family: 'Zen Kaku Gothic New', label: 'Zen Kaku Gothic New', group: 'ゴシック体', w500: true },
  { family: 'Zen Kaku Gothic Antique', label: 'Zen Kaku Gothic Antique', group: 'ゴシック体', w500: true },
  { family: 'Murecho', label: 'Murecho', group: 'ゴシック体', w500: true },
  { family: 'BIZ UDPGothic', label: 'BIZ UDPGothic', group: 'ゴシック体' },
  { family: 'M PLUS 1p', label: 'M PLUS 1p', group: 'ゴシック体', w500: true },
  { family: 'Zen Maru Gothic', label: 'Zen Maru Gothic', group: '丸ゴシック体', w500: true },
  { family: 'M PLUS Rounded 1c', label: 'M PLUS Rounded 1c', group: '丸ゴシック体', w500: true },
  { family: 'Klee One', label: 'Klee One', group: '手書き風' },
  { family: 'New Tegomin', label: 'New Tegomin', group: 'カリグラフィー風' },
  { family: 'Yuji Syuku', label: 'Yuji Syuku', group: 'カリグラフィー風' },
];

export const latinFonts: Font[] = [
  { family: 'Cormorant Garamond', label: 'Cormorant Garamond', group: 'セリフ', ital: true },
  { family: 'Lora', label: 'Lora', group: 'セリフ', ital: true },
  { family: 'EB Garamond', label: 'EB Garamond', group: 'セリフ', ital: true },
  { family: 'Cormorant', label: 'Cormorant', group: 'セリフ', ital: true },
  { family: 'Libre Baskerville', label: 'Libre Baskerville', group: 'セリフ', ital: true },
  { family: 'Crimson Pro', label: 'Crimson Pro', group: 'セリフ', ital: true },
  { family: 'Playfair Display', label: 'Playfair Display', group: 'セリフ', ital: true },
  { family: 'Fraunces', label: 'Fraunces', group: 'セリフ', ital: true },
  { family: 'Bodoni Moda', label: 'Bodoni Moda', group: 'セリフ', ital: true },
  { family: 'Italiana', label: 'Italiana', group: '装飾' },
  { family: 'Inter', label: 'Inter', group: 'サンセリフ', ital: true },
  { family: 'Work Sans', label: 'Work Sans', group: 'サンセリフ', ital: true },
];

const find = (list: Font[], family: string) => list.find((f) => f.family === family);

/** The Google Fonts stylesheet for the chosen fonts. With the defaults it is
 *  exactly the URL the design uses. */
export function fontsHref(s: Settings): string {
  const specs = new Map<string, string>();
  const add = (family: string, spec: string) => {
    if (!family) return;
    if (!specs.has(family) || (spec && !specs.get(family))) specs.set(family, spec);
  };
  add(s.fontLatinHeading, '');
  add(s.fontLatinBody, find(latinFonts, s.fontLatinBody)?.ital ? 'ital@0;1' : '');
  add(s.fontJaHeading, find(jaFonts, s.fontJaHeading)?.w500 ? 'wght@400;500' : '');
  add(s.fontJaBody, '');
  add(s.fontIndex, find(jaFonts, s.fontIndex)?.w500 ? 'wght@400;500' : '');
  const q = [...specs].map(([f, spec]) => 'family=' + f.replace(/ /g, '+') + (spec ? ':' + spec : '')).join('&');
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
}

// ── CSS ──

const latinStack = (f: string) => `"${f}", Georgia, system-ui, sans-serif`;
// stand-ins until the web font arrives: a system face of the same kind
const jaStack = (f: string) => {
  const group = find(jaFonts, f)?.group ?? '明朝体';
  return group === '明朝体' || group === 'カリグラフィー風'
    ? `'${f}', var(--font-ja-fallback)`
    : `'${f}', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', YuGothic, 'Noto Sans JP', sans-serif`;
};
const mix = (a: string, pct: number, b: string) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;

/** `:root` overrides for the site's CSS (tokens.css and the `--s-*` hooks in
 *  the layouts). Empty with the defaults, so the designed site is untouched. */
export function settingsCss(s: Settings): string {
  const d = defaults;
  const v: Record<string, string> = {};
  if (s.bg !== d.bg) v['--color-bg'] = s.bg;
  if (s.text !== d.text) {
    v['--color-text'] = s.text;
    v['--color-divider'] = mix(s.text, 16, 'transparent');
  }
  if (s.bg !== d.bg || s.text !== d.text) v['--color-surface'] = mix(s.bg, 95, s.text);
  if (s.accent !== d.accent) {
    const a = s.accent;
    Object.assign(v, {
      '--color-accent': a,
      '--color-accent-100': mix(a, 9, '#fff'),
      '--color-accent-200': mix(a, 18, '#fff'),
      '--color-accent-300': mix(a, 37, '#fff'),
      '--color-accent-400': mix(a, 62, '#fff'),
      '--color-accent-500': a,
      '--color-accent-600': mix(a, 85, '#000'),
      '--color-accent-700': a,
      '--color-accent-800': mix(a, 69, '#000'),
      '--color-accent-900': mix(a, 50, '#000'),
    });
  }
  if (s.selBg) v['--sel-bg'] = s.selBg;
  if (s.selFg !== d.selFg) v['--sel-fg'] = s.selFg;
  if (s.fontJaHeading !== d.fontJaHeading) v['--font-mincho-heading'] = jaStack(s.fontJaHeading);
  if (s.fontJaBody !== d.fontJaBody) v['--font-mincho'] = jaStack(s.fontJaBody);
  if (s.fontIndex) v['--font-index'] = jaStack(s.fontIndex);
  if (s.fontLatinHeading !== d.fontLatinHeading) v['--font-heading'] = latinStack(s.fontLatinHeading);
  if (s.fontLatinBody !== d.fontLatinBody) v['--font-body'] = latinStack(s.fontLatinBody);
  const num: [keyof Settings, string][] = [
    ['bodySizePc', '--s-body-pc'],
    ['bodySizeTablet', '--s-body-tab'],
    ['lineHeight', '--s-lh'],
    ['paragraphGap', '--s-para'],
    ['blankLine', '--s-blank'],
    ['letterSpacing', '--s-ls'],
    ['measure', '--s-measure'],
    ['titleSizePc', '--s-title-pc'],
    ['noteSize', '--s-note'],
    ['siteNameSize', '--s-site-name'],
    ['ixHeadGap', '--s-ix-a'],
    ['ixCatchGap', '--s-ix-b'],
    ['ixCatsGap', '--s-ix-c'],
    ['ixListGap', '--s-ix-d'],
    ['ixRuleLength', '--s-ix-rule'],
    ['ixRuleGap', '--s-ix-rule-gap'],
    ['ixHeadGapSp', '--s-ix-a-sp'],
    ['ixCatchGapSp', '--s-ix-b-sp'],
    ['ixCatsGapSp', '--s-ix-c-sp'],
    ['ixListGapSp', '--s-ix-d-sp'],
    ['welcomeLogoSize', '--s-wl-logo'],
    ['welcomeTitleSize', '--s-wl-title'],
    ['welcomeLeadSize', '--s-wl-lead'],
    ['welcomeLeadEnSize', '--s-wl-lead-en'],
    ['welcomeRuleLength', '--s-wl-rule'],
    ['welcomeRuleWeight', '--s-wl-rule-w'],
    ['welcomeWidth', '--s-wl-width'],
    ['welcomeWidthSp', '--s-wl-width-sp'],
    ['welcomeLogoSizeSp', '--s-wl-logo-sp'],
    ['welcomeTitleSizeSp', '--s-wl-title-sp'],
    ['welcomeLeadSizeSp', '--s-wl-lead-sp'],
    ['welcomeLeadEnSizeSp', '--s-wl-lead-en-sp'],
    ['welcomeRuleLengthSp', '--s-wl-rule-sp'],
    ['welcomeTitleRuleGapSp', '--s-wl-gap-title-sp'],
    ['welcomeRuleLeadGapSp', '--s-wl-gap-rule-sp'],
    ['welcomeLeadEnGapSp', '--s-wl-gap-en-sp'],
    ['welcomeLeadParaGapSp', '--s-wl-para-sp'],
    ['welcomeTitleRuleGap', '--s-wl-gap-title'],
    ['welcomeRuleLeadGap', '--s-wl-gap-rule'],
    ['welcomeLeadEnGap', '--s-wl-gap-en'],
    ['welcomeLeadParaGap', '--s-wl-para'],
    ['catchJaSize', '--s-catch-ja'],
    ['catchEnSize', '--s-catch-en'],
    ['siteNameSizeSp', '--s-site-name-sp'],
    ['catchJaSizeSp', '--s-catch-ja-sp'],
    ['catchEnSizeSp', '--s-catch-en-sp'],
    ['indexSizeSp', '--s-index-sp'],
    ['indexSize', '--s-index'],
  ];
  for (const [k, name] of num) if (s[k] !== d[k]) v[name] = String(s[k]);
  // the PC index sets its categories by its height (auto) until a gap is set
  if (s.ixCatsGap !== d.ixCatsGap) {
    v['--s-ix-c-pc'] = `${s.ixCatsGap - 14 - s.ixCatchGap}px`; // less the categories' padding and the catch gap
    v['--s-ix-c-minh'] = '0px';
  }
  if (!s.indent) v['--s-indent'] = '0';
  if (!s.justify) v['--s-align'] = 'left';
  const body = Object.entries(v)
    .map(([k, val]) => `${k}:${val}`)
    .join(';');
  // :root:root outranks tokens.css, which Astro may place after this style
  return body ? `:root:root{${body}}` : '';
}
