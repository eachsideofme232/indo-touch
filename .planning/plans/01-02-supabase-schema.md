# Plan 01-02: Supabase Schema & Storage

**Phase**: 1 (Foundation)
**Requirements**: INFR-04 (+ NEWS-07 dedup를 위한 스키마 기반 마련)
**Goal**: 3개 테이블 + RLS + PPT 스토리지 버킷이 준비되어 Phase 2가 바로 데이터를 쓸 수 있는 상태.
**Depends on**: 01-01 (env vars)

## Schema

### news_items
```sql
create table news_items (
  id uuid primary key default gen_random_uuid(),
  scan_date date not null,
  category text not null check (category in ('market','channel','consumer','competitor','regulatory')),
  title text not null,
  summary text not null,
  insight text not null,              -- "so what for Laneige?"
  impact text not null check (impact in ('high','medium','low')),
  source_url text not null,
  source_url_normalized text not null unique,  -- NEWS-07 dedup 키 (스킴/트래킹 파라미터 제거 후 정규화)
  source_name text,
  published_at date,
  confidence text check (confidence in ('high','medium','low')),
  created_at timestamptz not null default now()
);
create index idx_news_scan_date on news_items (scan_date desc);
create index idx_news_category on news_items (category, scan_date desc);
```
> `source_url_normalized`의 unique 제약이 NEWS-07의 1차 방어선. upsert `on conflict do nothing`으로 중복 삽입 차단. 제목 유사도 기반 2차 dedup은 Phase 2 애플리케이션 로직.

### consumer_voices
```sql
create table consumer_voices (
  id uuid primary key default gen_random_uuid(),
  scan_date date not null,
  platform text not null,             -- 'reddit' | 'twitter' | ...
  source_type text not null default 'public_discourse',
  topic text not null,
  content_summary text not null,
  sentiment text not null check (sentiment in ('positive','negative','neutral')),
  engagement_score int,               -- nullable (리서치 결정사항)
  source_url text,
  created_at timestamptz not null default now()
);
create index idx_voices_scan_date on consumer_voices (scan_date desc);
```

### weekly_reports
```sql
create table weekly_reports (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  week_number int not null,           -- ISO week (date-fns getISOWeek, KST 기준)
  week_start date not null,
  week_end date not null,
  file_path text not null,            -- Storage 경로
  file_size_bytes int,
  highlights jsonb,                   -- 크로스 카테고리 패턴/트렌드 요약
  created_at timestamptz not null default now(),
  unique (year, week_number)
);
```

### RLS
- 3개 테이블 모두 RLS 활성화
- anon: `select`만 허용 (대시보드는 read-only Server Component)
- 쓰기는 service role 키로만 (RLS 우회) — API 라우트 전용

### Storage
- 버킷 `reports` (private) 생성
- 다운로드는 signed URL로 제공 (Phase 5)
- INFR-07 보존 정책(26주 초과 파일 삭제)은 Phase 5에서 weekly 파이프라인에 포함

## Client wiring
- `src/lib/supabase.ts`: 듀얼 클라이언트 패턴 — `createServiceClient()` (service role, 서버 전용) / `createAnonClient()` (anon, 대시보드)
- 마이그레이션 SQL은 `supabase/migrations/`에 파일로 커밋 (대시보드 수동 실행이라도 SQL은 버전 관리)

## Done when
- [ ] 3개 테이블이 위 스키마/제약으로 존재 (insert 스모크 테스트 통과)
- [ ] `source_url_normalized` 중복 insert가 실패(또는 no-op)함을 확인
- [ ] anon 키로 select 가능, insert 불가 확인 / service role로 insert 가능 확인
- [ ] `reports` 버킷에 테스트 파일 업로드 + signed URL 다운로드 성공
