-- fragments の表示設定(管理画面 → 表示設定)。Supabase の SQL Editor で一度だけ実行する。
-- 1行だけのテーブル: data = 既定値から変えた項目, presets = 保存したテンプレート。
-- 公開サイトのビルドが読めるよう閲覧は誰でも可、書き込みはログインしたユーザーのみ。
-- 旧サイト(studieslog)の site_settings には触れない。

create table if not exists public.fragments_settings (
  id int primary key default 1,
  data jsonb not null default '{}'::jsonb,
  presets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint fragments_settings_singleton check (id = 1)
);

alter table public.fragments_settings enable row level security;

drop policy if exists "fragments_settings_public_read" on public.fragments_settings;
create policy "fragments_settings_public_read" on public.fragments_settings
  for select using (true);

-- 保存。fragments_security.sql を実行済み(管理者を限定済み)なら、そちらの権限のままにする。
do $$ begin
  if to_regclass('public.fragments_admins') is null then
    drop policy if exists "fragments_settings_auth_write" on public.fragments_settings;
    create policy "fragments_settings_auth_write" on public.fragments_settings
      for all to authenticated using (id = 1) with check (id = 1);
  end if;
end $$;

insert into public.fragments_settings (id) values (1)
on conflict (id) do nothing;
