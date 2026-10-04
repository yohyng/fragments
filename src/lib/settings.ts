// The display settings the build uses: the row saved from /admin/ → 表示設定
// (Supabase `fragments_settings`, see supabase/fragments_settings.sql) over
// the defaults. Read once per build; with Markdown content, or if the table
// is missing or unreachable, the site is built with the defaults.
import { contentSource } from '../content.config';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.mjs';
import { merge, fontsHref, settingsCss, type Settings } from './settings-shared';

/** when the settings this build uses were saved ('' = the defaults) */
export let settingsSavedAt = '';

async function load(): Promise<Settings> {
  if (contentSource !== 'supabase') return merge(null);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/fragments_settings?id=eq.1&select=data,updated_at`, {
      headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const rows = (await res.json()) as { data: unknown; updated_at?: string }[];
    settingsSavedAt = rows[0]?.updated_at ?? '';
    return merge(rows[0]?.data);
  } catch (e) {
    console.warn('[settings] using the defaults:', (e as Error).message.slice(0, 200));
    return merge(null);
  }
}

export const settings = await load();
export const settingsStyle = settingsCss(settings);
export const fontsStylesheet = fontsHref(settings);
