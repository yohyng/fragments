// 購読者: the newsletter's subscriber list (supabase/fragments_subscribers.sql),
// read with the signed-in user's session. Sign-ups come in through
// api/subscribe; here they can be seen, copied and removed.
import type { SupabaseClient } from '@supabase/supabase-js';
import setupSql from '../../supabase/fragments_subscribers.sql?raw';

type Row = { id: string; email: string; status: 'pending' | 'active' | 'unsubscribed'; created_at: string; confirmed_at: string | null };
const LABEL: Record<Row['status'], string> = { active: '登録中', pending: '確認待ち', unsubscribed: '配信停止' };

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '');
let sb: SupabaseClient;
let rows: Row[] = [];

export function initSubscribers(client: SupabaseClient) {
  sb = client;
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
