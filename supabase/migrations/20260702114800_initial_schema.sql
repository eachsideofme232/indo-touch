-- Indo Touch 초기 스키마: 뉴스, 컨슈머 보이스, 주간 리포트
-- 적용됨: 2026-07-02, Supabase project evyhsnfmpgvouhxbufgs (ap-northeast-2)

create table news_items (
  id uuid primary key default gen_random_uuid(),
  scan_date date not null,
  category text not null check (category in ('market','channel','consumer','competitor','regulatory')),
  title text not null,
  summary text not null,
  insight text not null,
  impact text not null check (impact in ('high','medium','low')),
  source_url text not null,
  source_url_normalized text not null unique,
  source_name text,
  published_at date,
  confidence text check (confidence in ('high','medium','low')),
  created_at timestamptz not null default now()
);
create index idx_news_scan_date on news_items (scan_date desc);
create index idx_news_category on news_items (category, scan_date desc);

create table consumer_voices (
  id uuid primary key default gen_random_uuid(),
  scan_date date not null,
  platform text not null,
  source_type text not null default 'public_discourse',
  topic text not null,
  content_summary text not null,
  sentiment text not null check (sentiment in ('positive','negative','neutral')),
  engagement_score int,
  source_url text,
  created_at timestamptz not null default now()
);
create index idx_voices_scan_date on consumer_voices (scan_date desc);

create table weekly_reports (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  week_number int not null,
  week_start date not null,
  week_end date not null,
  file_path text not null,
  file_size_bytes int,
  highlights jsonb,
  created_at timestamptz not null default now(),
  unique (year, week_number)
);

-- RLS: 대시보드(anon)는 읽기 전용, 쓰기는 service role만
alter table news_items enable row level security;
alter table consumer_voices enable row level security;
alter table weekly_reports enable row level security;

create policy "anon can read news" on news_items for select to anon using (true);
create policy "anon can read voices" on consumer_voices for select to anon using (true);
create policy "anon can read reports" on weekly_reports for select to anon using (true);
