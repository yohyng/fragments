-- fragments の購読者(ニュースレター「fragments folio」)。Supabase の SQL Editor で一度だけ実行する。
-- 登録・確認・配信停止はサーバー(api/subscribe, api/confirm, api/unsubscribe)が
-- service_role キーで行う。閲覧と削除はログインしたユーザー(管理画面)のみ
-- (fragments_security.sql を実行すると、二段階認証を通した管理者だけ)。
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

-- 管理画面からの閲覧・削除。fragments_security.sql を実行済み(管理者を限定済み)なら、
-- そちらの権限のままにする。
do $$ begin
  if to_regclass('public.fragments_admins') is null then
    drop policy if exists "fragments_subscribers_auth_read" on public.fragments_subscribers;
    create policy "fragments_subscribers_auth_read" on public.fragments_subscribers
      for select to authenticated using (true);
    drop policy if exists "fragments_subscribers_auth_delete" on public.fragments_subscribers;
    create policy "fragments_subscribers_auth_delete" on public.fragments_subscribers
      for delete to authenticated using (true);
  end if;
end $$;

-- 送ったニュースレターの記録(管理画面 → 購読者 → 送信履歴)。書き込みはサーバーのみ。
create table if not exists public.fragments_mailings (
  id bigint generated always as identity primary key,
  subject text not null,
  intro text not null default '',
  outro text not null default '',
  articles jsonb not null default '[]'::jsonb,
  recipients int not null default 0,
  sent_at timestamptz not null default now()
);

alter table public.fragments_mailings enable row level security;

do $$ begin
  if to_regclass('public.fragments_admins') is null then
    drop policy if exists "fragments_mailings_auth_read" on public.fragments_mailings;
    create policy "fragments_mailings_auth_read" on public.fragments_mailings
      for select to authenticated using (true);
  end if;
end $$;
