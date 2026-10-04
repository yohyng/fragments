-- fragments_security.sql を元に戻す(ログインしたユーザーなら読み書きできる状態へ)。
-- テスト送信先のテーブルは残す。管理者の一覧は消す(サーバーはこれがないと、ログインした人を誰でも通す)。

drop policy if exists "fragments_settings_admin_write" on public.fragments_settings;
drop policy if exists "fragments_settings_auth_write" on public.fragments_settings;
create policy "fragments_settings_auth_write" on public.fragments_settings
  for all to authenticated using (id = 1) with check (id = 1);

drop policy if exists "fragments_subscribers_admin_read" on public.fragments_subscribers;
drop policy if exists "fragments_subscribers_admin_delete" on public.fragments_subscribers;
drop policy if exists "fragments_subscribers_auth_read" on public.fragments_subscribers;
drop policy if exists "fragments_subscribers_auth_delete" on public.fragments_subscribers;
create policy "fragments_subscribers_auth_read" on public.fragments_subscribers
  for select to authenticated using (true);
create policy "fragments_subscribers_auth_delete" on public.fragments_subscribers
  for delete to authenticated using (true);

drop policy if exists "fragments_mailings_admin_read" on public.fragments_mailings;
drop policy if exists "fragments_mailings_auth_read" on public.fragments_mailings;
create policy "fragments_mailings_auth_read" on public.fragments_mailings
  for select to authenticated using (true);

drop policy if exists "fragments_admin_prefs_admin" on public.fragments_admin_prefs;
drop policy if exists "fragments_admin_prefs_auth" on public.fragments_admin_prefs;
create policy "fragments_admin_prefs_auth" on public.fragments_admin_prefs
  for all to authenticated using (id = 1) with check (id = 1);

drop function if exists public.fragments_is_admin();
drop table if exists public.fragments_admins cascade;
