-- ストーリー画像の「公開のお知らせ」を送った記事の記録。Supabase の SQL Editor で一度だけ実行する。
-- 予約記事が公開された夜の再ビルド(api/rebuild)で、まだ送っていない記事にだけ送るために使う。
-- 読み書きはサーバー(service_role)だけ。

create table if not exists public.fragments_story_log (
  article_id bigint primary key,
  sent_at timestamptz not null default now()
);

alter table public.fragments_story_log enable row level security;

-- すでに公開済みの予約記事は「送った」扱いにする(最初の夜にまとめて届かないように)
insert into public.fragments_story_log (article_id)
select id from public.articles where status = 'scheduled' and scheduled_at <= now()
on conflict (article_id) do nothing;
