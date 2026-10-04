-- fragments の管理画面を「あなただけ・二段階認証つき」にする。Supabase の SQL Editor で実行する
-- (何度実行してもよい)。先に管理画面で二段階認証を設定してから実行すること。
-- 1 行目の YOUR_EMAIL を、管理画面にログインするメールアドレスに書き換える。
--
-- ・fragments_admins に載ったアカウントで、かつ二段階認証を通ったログイン(aal2)だけが、
--   購読者・送信履歴・テスト送信先を読み書きし、表示設定を保存できる。
-- ・旧サイト(studieslog)と共有の articles と画像の権限には触れない。
-- ・元に戻すときは fragments_security_revert.sql を実行する。

-- 管理者
create table if not exists public.fragments_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.fragments_admins enable row level security;
drop policy if exists "fragments_admins_self_read" on public.fragments_admins;
create policy "fragments_admins_self_read" on public.fragments_admins
  for select to authenticated using (user_id = auth.uid());

insert into public.fragments_admins (user_id)
select id from auth.users where email = lower('YOUR_EMAIL')
on conflict do nothing;

-- 管理者で、二段階認証を通ったログインか
create or replace function public.fragments_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (select 1 from public.fragments_admins where user_id = auth.uid());
$$;

-- 表示設定: 閲覧は誰でも(公開サイトのビルド)、保存は管理者だけ
drop policy if exists "fragments_settings_auth_write" on public.fragments_settings;
drop policy if exists "fragments_settings_admin_write" on public.fragments_settings;
create policy "fragments_settings_admin_write" on public.fragments_settings
  for all to authenticated using (id = 1 and public.fragments_is_admin()) with check (id = 1 and public.fragments_is_admin());

-- 購読者: 管理者だけ(登録・確認・停止はサーバーが行う)
drop policy if exists "fragments_subscribers_auth_read" on public.fragments_subscribers;
drop policy if exists "fragments_subscribers_auth_delete" on public.fragments_subscribers;
drop policy if exists "fragments_subscribers_admin_read" on public.fragments_subscribers;
drop policy if exists "fragments_subscribers_admin_delete" on public.fragments_subscribers;
create policy "fragments_subscribers_admin_read" on public.fragments_subscribers
  for select to authenticated using (public.fragments_is_admin());
create policy "fragments_subscribers_admin_delete" on public.fragments_subscribers
  for delete to authenticated using (public.fragments_is_admin());

-- 送信履歴: 管理者だけ
drop policy if exists "fragments_mailings_auth_read" on public.fragments_mailings;
drop policy if exists "fragments_mailings_admin_read" on public.fragments_mailings;
create policy "fragments_mailings_admin_read" on public.fragments_mailings
  for select to authenticated using (public.fragments_is_admin());

-- 管理画面の非公開の設定(テスト送信先など): 管理者だけ
create table if not exists public.fragments_admin_prefs (
  id int primary key default 1 check (id = 1),
  test_recipients text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.fragments_admin_prefs enable row level security;
drop policy if exists "fragments_admin_prefs_admin" on public.fragments_admin_prefs;
create policy "fragments_admin_prefs_admin" on public.fragments_admin_prefs
  for all to authenticated using (id = 1 and public.fragments_is_admin()) with check (id = 1 and public.fragments_is_admin());
insert into public.fragments_admin_prefs (id) values (1) on conflict (id) do nothing;

-- 確認: 管理者として登録されたアカウント(1 行出れば OK)
select u.email from public.fragments_admins a join auth.users u on u.id = a.user_id;
