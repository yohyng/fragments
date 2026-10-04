-- fragments の購読者(ニュースレター「fragments folio」)。Supabase の SQL Editor で一度だけ実行する。
-- 登録・確認・配信停止はサーバー(api/subscribe, api/confirm, api/unsubscribe)が
-- service_role キーで行う。閲覧と削除はログインしたユーザー(管理画面)のみ。
-- 旧サイト(studieslog)の subscribers には触れない。

create table if not exists public.fragments_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and length(email) <= 254),
  -- pending: 確認メールの返事待ち / active: 登録中 / unsubscribed: 配信停止
  status text not null default 'pending' check (status in ('pending', 'active', 'unsubscribed')),
  -- 確認と配信停止のリンクに入る合言葉
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz
);

create index if not exists fragments_subscribers_token on public.fragments_subscribers (token);

alter table public.fragments_subscribers enable row level security;

drop policy if exists "fragments_subscribers_auth_read" on public.fragments_subscribers;
create policy "fragments_subscribers_auth_read" on public.fragments_subscribers
  for select to authenticated using (true);

drop policy if exists "fragments_subscribers_auth_delete" on public.fragments_subscribers;
create policy "fragments_subscribers_auth_delete" on public.fragments_subscribers
  for delete to authenticated using (true);
