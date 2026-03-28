# Architecture Patterns

**Domain:** Automated Market Intelligence System (India Cosmetics / K-Beauty)
**Researched:** 2026-03-29
**Confidence:** HIGH (verified against official Vercel docs and Anthropic API docs)

## Recommended Architecture

### System Overview

Indo Touch is a **cron-driven data pipeline** with a **read-only dashboard**. The system has two operational modes (Daily Scan, Weekly Report) triggered by Vercel Cron Jobs, and two read surfaces (Dashboard UI, Weekly Archive). All state lives in Supabase. All compute is serverless on Vercel.

```
                    VERCEL CRON JOBS
                    ================
                          |
              +-----------+-----------+
              |                       |
         Daily (22:00 UTC)     Weekly (Fri 21:00 UTC)
              |                       |
              v                       v
     /api/scan/route.ts      /api/weekly/route.ts
              |                       |
    +---------+---------+    +--------+--------+
    |                   |    |        |        |
    v                   v    v        v        v
  Claude API       Claude API   Supabase  pptxgenjs  Supabase
  (web_search)     (consumer)   (read)    (generate)  Storage
    |                   |                     |        (upload)
    v                   v                     v
  Supabase           Supabase           Supabase Storage
  (news_items)    (consumer_voices)     (weekly_reports)
    |                   |
    +--------+----------+
             |
    +--------+--------+
    |                 |
    v                 v
  /api/notify/     /api/notify/
  email/           telegram/
    |                 |
    v                 v
  Resend API      Telegram Bot API


         DASHBOARD (read-only)
         =====================
         page.tsx  -->  Supabase (news_items, consumer_voices)
         weekly/  -->  Supabase (weekly_reports + Storage URLs)
```

### Component Boundaries

| Component | Responsibility | Communicates With | Runtime |
|-----------|---------------|-------------------|---------|
| `/api/scan` (Orchestrator) | Trigger daily pipeline: collect news + consumer data, store, notify | Claude API, Supabase, `/api/notify/*` | Serverless (up to 300s) |
| `/api/consumer` | Collect consumer voices via Claude web_search | Claude API, Supabase | Serverless (up to 300s) |
| `/api/weekly` | Aggregate week data, generate summary, create PPT, upload, notify | Supabase, Claude API, pptxgenjs, Supabase Storage, `/api/notify/*` | Serverless (up to 300s) |
| `/api/notify/email` | Send email via Resend | Resend API | Serverless (10s sufficient) |
| `/api/notify/telegram` | Send Telegram message | Telegram Bot API | Serverless (10s sufficient) |
| `lib/claude.ts` | Wrapper for Claude API calls with web_search tool | Claude API | Shared library |
| `lib/supabase.ts` | Supabase client (server-side with service role key) | Supabase | Shared library |
| `lib/ppt-generator.ts` | PPT generation using pptxgenjs | None (pure computation) | Shared library |
| Dashboard (`page.tsx`) | Display daily feed with filters | Supabase (read-only via anon key) | Server Component |
| Weekly Archive (`weekly/page.tsx`) | List past weekly reports with download links | Supabase (read-only) | Server Component |

### Data Flow

#### Daily Pipeline (Detail)

```
1. Vercel Cron triggers GET /api/scan (with CRON_SECRET header)
2. /api/scan validates CRON_SECRET
3. For each category (market, channel, consumer, competitor, regulatory):
   a. Call Claude API with web_search tool enabled
   b. System prompt instructs Claude to search for India beauty/cosmetics news
   c. Claude performs web searches, synthesizes findings
   d. Parse response into structured NewsItem objects
   e. Insert into Supabase news_items table
4. Call consumer voice collection (same function or /api/consumer):
   a. Claude API + web_search for Reddit, social media mentions
   b. Parse into ConsumerVoice objects with sentiment analysis
   c. Insert into Supabase consumer_voices table
5. Call /api/notify/email with today's items
6. Call /api/notify/telegram with summary
7. Return 200 OK
```

#### Weekly Pipeline (Detail)

```
1. Vercel Cron triggers GET /api/weekly (with CRON_SECRET header)
2. /api/weekly validates CRON_SECRET
3. Query Supabase for this week's news_items and consumer_voices
4. Call Claude API to generate:
   a. Executive summary (3-line)
   b. Category-wise analysis
   c. Laneige strategic insights
5. Pass structured content to ppt-generator.ts
6. pptxgenjs generates 7-slide PPT as Buffer
7. Upload Buffer to Supabase Storage bucket
8. Insert record into weekly_reports table with storage URL
9. Call /api/notify/email with PPT attachment
10. Return 200 OK
```

## Critical Architecture Decision: Monolithic Scan Function

**Decision:** Keep the daily scan as ONE function that handles all categories sequentially, rather than splitting into separate functions per category.

**Rationale:**
- Vercel Hobby plan limits cron to **once per day** -- you cannot trigger 5 separate category scans via 5 separate cron jobs at different times
- With Fluid Compute enabled, Hobby plan gets **300 seconds (5 minutes)** max duration -- sufficient for 5 sequential Claude API calls
- Each Claude API call with web_search typically takes 15-45 seconds, so 5 categories fits within 300s
- Splitting would require external orchestration (Supabase Edge Functions, external cron service) which adds unnecessary complexity

**Constraint implication:** The `/api/scan` route MUST set `maxDuration` to 300:

```typescript
// src/app/api/scan/route.ts
export const maxDuration = 300; // 5 minutes (Hobby plan max with Fluid Compute)
```

## Patterns to Follow

### Pattern 1: Sequential Category Scan with Error Isolation

**What:** Process each news category independently with try-catch per category, so one failure does not abort the entire daily scan.

**When:** Always, in the /api/scan route.

**Example:**

```typescript
const categories = ['market', 'channel', 'consumer', 'competitor', 'regulatory'] as const;
const results: ScanResult[] = [];

for (const category of categories) {
  try {
    const items = await scanCategory(category);
    await insertNewsItems(items);
    results.push({ category, status: 'success', count: items.length });
  } catch (error) {
    results.push({ category, status: 'error', error: String(error) });
    // 로깅 후 다음 카테고리 계속 진행
    logger.error(`Scan failed for ${category}`, { error });
  }
}
```

### Pattern 2: Claude API Wrapper with Structured Output

**What:** Use Claude's structured output (JSON mode) to get reliably parseable news items from web_search results.

**When:** Every Claude API call that produces data for storage.

**Example:**

```typescript
// lib/claude.ts
export async function scanCategory(category: NewsCategory): Promise<NewsItem[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    tools: [{ type: 'web_search_20250305' }],
    messages: [{
      role: 'user',
      content: buildCategoryPrompt(category)
    }],
  });

  // Claude의 텍스트 응답에서 JSON 파싱
  // web_search 결과는 자동으로 Claude에게 전달됨
  return parseNewsItems(response, category);
}
```

### Pattern 3: Supabase Service Role for Server-Side Operations

**What:** Use `SUPABASE_SERVICE_ROLE_KEY` in API routes (bypasses RLS), use `NEXT_PUBLIC_SUPABASE_ANON_KEY` in client/dashboard (subject to RLS).

**When:** API routes use service role. Dashboard uses anon key with RLS policies allowing public read.

**Example:**

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// API route용 (서버 전용, RLS 우회)
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 대시보드 UI용 (브라우저, RLS 적용)
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Pattern 4: PPT Generation as Pure Function

**What:** Keep ppt-generator.ts as a pure function that takes structured data in, returns a Buffer out. No side effects, no API calls.

**When:** Always. The weekly route handles orchestration; the generator only handles PPT creation.

**Example:**

```typescript
// lib/ppt-generator.ts
import PptxGenJS from 'pptxgenjs';

export async function generateWeeklyPPT(data: WeeklyReportData): Promise<Buffer> {
  const pptx = new PptxGenJS();

  // Slide 1: 표지
  addCoverSlide(pptx, data);
  // Slide 2-7: 각 섹션
  addExecutiveSummary(pptx, data.summary);
  addMarketNews(pptx, data.marketNews);
  // ... 나머지 슬라이드

  // Buffer로 출력 (파일 시스템 사용 안 함)
  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer as Buffer;
}
```

### Pattern 5: Cron Secret Validation Middleware

**What:** All cron-triggered routes validate `CRON_SECRET` header before processing.

**When:** Every `/api/scan` and `/api/weekly` invocation.

**Example:**

```typescript
// 모든 cron route 상단에 배치
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ... 실제 로직
}
```

### Pattern 6: Notification as Internal Fetch (Not Direct Import)

**What:** The scan and weekly routes call notification endpoints via internal `fetch()` rather than importing notification logic directly.

**Why:** Keeps notification concerns decoupled. If email fails, the scan data is already saved. Also allows manual re-triggering of notifications independently.

**When:** After data is successfully stored in Supabase.

**Example:**

```typescript
// /api/scan/route.ts 내부
// 데이터 저장 완료 후
const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

// 알림 실패가 전체 파이프라인을 중단하지 않도록
try {
  await fetch(`${baseUrl}/api/notify/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: today, items: newsItems }),
  });
} catch (error) {
  logger.error('Email notification failed', { error });
}
```

**Alternative consideration:** On Vercel, internal fetch creates a new serverless function invocation. This is fine for decoupling but adds latency. If the 300s budget is tight, consider importing notification logic directly instead.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Splitting Cron into Multiple Daily Jobs

**What:** Creating separate cron entries for each category scan.

**Why bad:** Vercel Hobby plan only allows once-per-day cron frequency. Multiple cron entries would all fire at the same time (within the same hour), not sequentially. No benefit, just complexity.

**Instead:** Single /api/scan route that handles all categories sequentially.

### Anti-Pattern 2: Storing PPT Files Locally

**What:** Using `fs.writeFile()` to save PPT before uploading.

**Why bad:** Serverless functions have ephemeral filesystems. Files disappear after function execution. The `/tmp` directory has limited space and is not persistent.

**Instead:** Generate PPT as Buffer in memory, upload directly to Supabase Storage.

### Anti-Pattern 3: Using NEXT_PUBLIC_ Keys in API Routes

**What:** Using the anon key in server-side API routes for database operations.

**Why bad:** Anon key is subject to Row Level Security. API routes that INSERT data need the service role key to bypass RLS (or you need to configure RLS INSERT policies, which is unnecessary complexity for a single-user system).

**Instead:** Use `SUPABASE_SERVICE_ROLE_KEY` in all API routes. Use anon key only in browser-side dashboard reads.

### Anti-Pattern 4: Client-Side Data Fetching for Dashboard

**What:** Using `useEffect` + `fetch` to load dashboard data.

**Why bad:** Unnecessary client-side waterfall. This is a read-only dashboard with no user interaction required before data display.

**Instead:** Use Next.js Server Components with direct Supabase queries. Data is fetched at build/request time on the server and streamed as HTML. Faster, simpler, better SEO (though SEO is not critical here).

### Anti-Pattern 5: Polling Claude API for web_search Results

**What:** Sending a search query separately, then polling for results.

**Why bad:** Claude's web_search is a server-side tool -- Claude handles the search internally. You send ONE request with web_search tool enabled, Claude performs searches as needed, and returns the synthesized result. No polling needed.

**Instead:** Single `messages.create()` call with `tools: [{ type: 'web_search_20250305' }]`.

## Vercel-Specific Constraints

| Constraint | Impact | Mitigation |
|-----------|--------|------------|
| **Hobby cron: once per day only** | Cannot run hourly scans or split categories across hours | Single daily scan function that does everything sequentially |
| **Hobby cron: +/- 59 min precision** | 07:00 KST target may fire between 07:00-07:59 | Acceptable for this use case. Not time-critical. |
| **Function timeout: 300s (Fluid Compute)** | Must complete all category scans + notifications within 5 min | Sequential processing, error isolation per category, skip slow categories if timeout approaches |
| **Request body: 4.5 MB max** | PPT files must be under 4.5MB if passed between functions | Generate PPT in same function that uploads it. 7-slide text PPT is well under 4.5MB. |
| **No persistent filesystem** | Cannot write temp files reliably | Use in-memory Buffers for PPT generation |
| **Cold starts** | First invocation may be slow | Not critical for cron jobs (no user waiting) |
| **Fluid Compute must be enabled** | Default without it may be 10s on Hobby | Enable in Vercel dashboard: Project Settings > Functions > Enable Fluid Compute |

**CRITICAL:** Fluid Compute must be explicitly enabled in the Vercel dashboard to get the 300s timeout on Hobby plan. Without it, the default timeout may be as low as 10 seconds, which is completely insufficient for Claude API calls.

## Scalability Considerations

| Concern | Current (1 user) | At 5 users | At team-wide |
|---------|-------------------|------------|--------------|
| Data volume | ~5-15 news items/day | Same (shared data) | Same |
| API costs | ~$1-3/day (Claude + web_search) | Same | Same |
| Storage | ~1 PPT/week (~1MB) | Same | Same |
| Cron frequency | 1x daily (Hobby limit) | Upgrade to Pro for 2x daily | Pro plan |
| Dashboard load | Server-rendered, instant | Add caching if needed | Supabase handles well |
| PPT generation | ~10-30s per report | Same | Same |

This system does NOT need to scale horizontally. It is a single-tenant intelligence tool. The architecture should optimize for **simplicity and reliability**, not throughput.

## Suggested Build Order (Dependencies)

```
Phase 1: Foundation
  ├── Project setup (Next.js 16, TypeScript, Tailwind, shadcn/ui)
  ├── Supabase schema (3 tables + RLS policies + Storage bucket)
  └── Vercel deployment (verify basic deploy works)
       No dependencies. Must be first.

Phase 2: Core Pipeline
  ├── lib/claude.ts (Claude API wrapper with web_search)
  ├── lib/supabase.ts (service client + browser client)
  ├── /api/scan/route.ts (news collection, all 5 categories)
  └── /api/consumer/route.ts (consumer voice collection)
       Depends on: Phase 1 (Supabase tables must exist)

Phase 3: Dashboard UI
  ├── DailyFeed.tsx (Server Component reading from Supabase)
  ├── CategoryFilter.tsx (client-side filtering)
  ├── NewsCard.tsx (display component)
  └── ConsumerVoice.tsx (consumer section)
       Depends on: Phase 1 (tables) + Phase 2 (data to display)

Phase 4: Notifications
  ├── /api/notify/email/route.ts (Resend integration)
  ├── /api/notify/telegram/route.ts (Telegram Bot API)
  ├── emails/DailyDigest.tsx (email template)
  └── Wire notifications into /api/scan
       Depends on: Phase 2 (scan must work to have data to notify about)

Phase 5: Weekly Report
  ├── lib/ppt-generator.ts (pptxgenjs, 7-slide template)
  ├── /api/weekly/route.ts (orchestrator: aggregate, summarize, generate, upload)
  ├── emails/WeeklyReport.tsx (email template with attachment)
  └── weekly/page.tsx (archive UI)
       Depends on: Phase 1 (Storage bucket) + Phase 2 (week of data) + Phase 4 (email)

Phase 6: Automation
  ├── vercel.json cron configuration
  ├── CRON_SECRET validation
  ├── Enable Fluid Compute in Vercel dashboard
  └── End-to-end testing of both pipelines
       Depends on: All previous phases
```

**Build order rationale:**
- Phase 1 is pure setup with no code dependencies
- Phase 2 is the core value -- without data collection, nothing else works
- Phase 3 can be built in parallel with Phase 4 (both depend on Phase 2)
- Phase 4 before Phase 5 because weekly reports reuse the notification infrastructure
- Phase 5 is the most complex single feature (Claude + pptxgenjs + Storage)
- Phase 6 is just wiring -- only possible when all pieces exist

## Sources

- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations) -- confirmed 300s max on Hobby with Fluid Compute (HIGH confidence)
- [Vercel Cron Jobs Usage & Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) -- confirmed Hobby: once per day, +/-59min precision (HIGH confidence)
- [Claude Web Search Tool Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) -- server-side tool, $10/1000 searches (HIGH confidence)
- [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- JSON mode support (HIGH confidence)
- [PptxGenJS Docs](https://gitbrent.github.io/PptxGenJS/docs/introduction/) -- supports Node buffer output, zero dependencies (HIGH confidence)
- [Supabase JavaScript Reference](https://supabase.com/docs/reference/javascript/storage-from-upload) -- Storage upload from buffer (HIGH confidence)
- [Next.js after() function](https://nextjs.org/docs/app/api-reference/functions/after) -- fire-and-forget pattern for background work (MEDIUM confidence)
