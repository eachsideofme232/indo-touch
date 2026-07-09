# Project Research Summary

**Project:** Indo Touch — India Market Intelligence System
**Domain:** Automated market intelligence / cron-driven data pipeline with read-only dashboard
**Researched:** 2026-03-29
**Re-verified:** 2026-07-02 — model pin moved to `claude-sonnet-5` (sonnet-4-20250514 deprecated), web_search tool moved to `web_search_20260209`, library versions refreshed. See STACK.md for current pins.
**Confidence:** HIGH

## Executive Summary

Indo Touch is a cron-driven intelligence pipeline, not a traditional web app. The system's core value is replacing daily manual research by automatically collecting, analyzing, and delivering India cosmetics market intelligence to a single user. Research confirms the locked stack (Next.js 16 + Supabase + Claude API + pptxgenjs + Vercel Cron) is sound for this use case, with one non-negotiable constraint: Vercel Fluid Compute must be explicitly enabled before deployment to avoid a 10-second timeout that will silently kill every cron job. This is a project-killer if missed in Phase 1.

The recommended approach is a sequential 6-phase build that follows the data dependency chain: schema first, scan API second (the make-or-break phase), dashboard third, notifications fourth, weekly PPT fifth, and cron automation last. Phase 2 (news scan API) consumes 30% of the total effort budget and determines the entire product's value — Claude web_search quality for India cosmetics is unproven and requires significant prompt engineering investment. Phase 5 (weekly PPT generation with pptxgenjs) is the most technically risky implementation phase due to silent corruption issues in the library.

The biggest risk is not technical complexity but content quality: Claude web_search may return stale, generic, or fabricated India-specific news. Mitigation requires forcing source URL citation in every prompt, validating publication recency, and targeting specific Indian business publications (Economic Times, Mint, Business Standard). The system should be positioned as a "research accelerator" not a "research replacement" — the UI should encourage click-through to original sources.

## Key Findings

### Recommended Stack

The locked stack is well-validated by official documentation. All chosen libraries are current stable versions with no deprecated APIs. Key version notes: Next.js 16.2 with Turbopack as default bundler requires React 19; Tailwind CSS 4.x uses CSS-first configuration with no tailwind.config.js; shadcn/ui CLI v4 targets Tailwind 4.x. The Claude web_search tool identifier is `web_search_20260209` (dynamic filtering variant, supported on Sonnet 5) and requires `user_location` to be set to India for better search relevance.

Supporting libraries not in CLAUDE.md but needed: `zod` for validating Claude API response shapes, `date-fns` for KST timezone handling and week number calculations, `@react-email/components` for email templates, `lucide-react` for dashboard icons.

**Core technologies:**
- Next.js 16.2 (App Router): Full-stack framework — latest stable with Turbopack, required for App Router pattern
- Supabase JS 2.100.x: Postgres + Storage client — bundles DB and file storage, dual client pattern (service role for API routes, anon for dashboard)
- @anthropic-ai/sdk 0.110.x: Claude API client — web_search_20260209 tool, Sonnet 5 model (claude-sonnet-5), cap at 10 searches/category
- grammy 1.41.x: Telegram Bot API — TypeScript-first, send-only usage (no polling/webhook needed)
- Resend 6.9.x: Email delivery — 100 emails/day free tier is sufficient for 1 daily + 1 weekly
- pptxgenjs 4.0.1: PPT generation — only viable JS option, pure Node.js, no binary dependencies
- Vercel Cron Jobs: Scheduled execution — Hobby plan allows 2 cron jobs, once per day each, +/-59 min precision

**Monthly cost estimate:** ~$15-25/month (Claude API only; all other services free tier)

### Expected Features

**Must have (table stakes):**
- Daily automated news scan across 5 categories (market, channel, consumer, competitor, regulatory)
- Impact scoring (high/medium/low) per news item via prompt engineering
- Laneige-specific insight field per item — this is what makes it intelligence, not just news
- Category-based dashboard with date browsing
- Email daily digest and Telegram alerts
- Weekly PPT auto-generation (7-slide format, division deliverable)
- Weekly report archive page

**Should have (v1 differentiators):**
- Consumer voice aggregation from Reddit + Twitter/X (rescoped: public discourse, not individual product reviews)
- Cross-category pattern detection in weekly summary (Claude synthesis prompt)
- Quick commerce channel monitoring (Blinkit, Zepto, Swiggy Instamart) as dedicated search targets
- Manual scan trigger button on dashboard

**Defer (v1.5+):**
- Full-text search across accumulated intelligence (valuable after 2+ weeks of data)
- Trend tracking visualization (requires historical baseline)
- Competitor action timeline UI component
- PPT template customization

**Hard no (anti-features):**
- User authentication (single user, unnecessary complexity)
- Direct Nykaa/Amazon review scraping (TOS-violating, technically infeasible)
- Charts/visualizations (briefing tool, not analytics dashboard)
- AI chatbot/conversational interface (separate product concern)

### Architecture Approach

Indo Touch is a cron-driven data pipeline with a read-only dashboard. Two operational modes (Daily Scan pipeline and Weekly Report pipeline) are triggered by Vercel Cron Jobs and write to Supabase. The dashboard reads from Supabase via Server Components — no client-side data fetching needed. All compute is serverless on Vercel. The critical architectural constraint is keeping the entire daily scan in a single `/api/scan` route with `maxDuration = 300` (Fluid Compute) rather than splitting categories, because Hobby plan cron fires only once per day.

**Major components:**
1. `/api/scan` (Orchestrator) — Runs all 5 category scans sequentially with per-category error isolation, stores to Supabase, triggers notifications
2. `/api/weekly` (Report Generator) — Aggregates week data, calls Claude for synthesis, generates PPT via pptxgenjs, uploads to Supabase Storage, sends email
3. `lib/claude.ts` (AI Wrapper) — Claude API with web_search tool, structured JSON output extraction, cost controls (max_uses: 10 per call)
4. Dashboard (`page.tsx`) — Next.js Server Component, reads from Supabase via anon key, editorial-style feed with category filters
5. Notification routes (`/api/notify/email`, `/api/notify/telegram`) — Decoupled via internal fetch so notification failures do not abort the scan pipeline

### Critical Pitfalls

1. **Vercel Hobby timeout kills all cron jobs** — Enable Fluid Compute in Vercel dashboard (Project Settings > Functions) before first deployment. Set `export const maxDuration = 300` in `/api/scan` and `/api/weekly`. Without this, Claude API calls will timeout every time.

2. **Claude web_search returns stale/generic India content** — Force source URL + publication date in every prompt. Target specific Indian publications in query strings (Economic Times, Mint, Business Standard). Add a `confidence` field to news_items. Budget 40% of Phase 2 time on prompt iteration.

3. **Runaway Claude API costs** — Set `max_uses: 10` on web_search tool. Use Sonnet 5 (not Opus). Set Anthropic spend alerts. Track daily costs programmatically. Estimate: ~$15-25/month for full pipeline.

4. **pptxgenjs silent PPT corruption** — Never use "#" prefix in hex colors ("E8732A" not "#E8732A"). Never reuse PptxGenJS instances across slides. Use `bullet: true` instead of unicode bullet characters. Test output in actual PowerPoint (not Google Slides).

5. **Consumer voice collection is technically limited** — Claude web_search cannot scrape Nykaa/Amazon reviews. Rescope to "public discourse found via web search" from Reddit and Twitter/X. Drop structured review data from MVP.

## Implications for Roadmap

Based on research, the CLAUDE.md 6-phase plan maps cleanly to the dependency chain discovered in research. The phase structure is correct — only the risks within each phase need emphasis.

### Phase 1: Foundation + Schema
**Rationale:** No code can run without the database schema. Also, hosting tier decision (Fluid Compute) must be locked before any API code is written. This is the phase where most projects get quietly sabotaged by wrong assumptions.
**Delivers:** Working Next.js 16 app deployed to Vercel, 3 Supabase tables with RLS + Storage bucket, Fluid Compute enabled, all environment variables wired.
**Addresses:** Schema design, week_number edge cases, hosting configuration
**Avoids:** Pitfall 1 (timeout), Pitfall 10 (week number mismatch), Pitfall 11 (cron timezone)
**Research flag:** Not needed — well-documented patterns.

### Phase 2: News Scan API (Core Intelligence Engine)
**Rationale:** This is the make-or-break phase. Without working data collection, nothing downstream functions. The hardest work is prompt engineering, not code structure.
**Delivers:** Working `/api/scan` route that collects news across 5 categories and consumer voices, stores to Supabase, validates output quality.
**Uses:** `@anthropic-ai/sdk` with `web_search_20260209` tool, `zod` for response validation, sequential category scan pattern with per-category error isolation
**Avoids:** Pitfall 2 (content quality), Pitfall 3 (runaway costs), Pitfall 7 (consumer voice scope), Pitfall 8 (India content gaps)
**Research flag:** Needs research-phase — Claude web_search behavior for India cosmetics is unproven. Budget time for prompt iteration.

### Phase 3: Daily Dashboard UI
**Rationale:** Once data is flowing into Supabase, the dashboard can be built with real content. Building against real data is far better than building against empty tables.
**Delivers:** Editorial-style dashboard at `page.tsx` with category filters, impact badges, news cards, consumer voice section, date browsing. Fonts: Playfair Display + DM Sans. Colors: Saffron + Teal + Warm White.
**Uses:** Server Components (no client-side fetch), shadcn/ui, Tailwind CSS 4, lucide-react icons
**Implements:** Dashboard read-only surface via anon Supabase client
**Research flag:** Not needed — standard Next.js Server Component pattern.

### Phase 4: Notifications
**Rationale:** Notifications are independent of the dashboard and depend only on the scan API. Building email + Telegram after the scan is working means you have real data to test with.
**Delivers:** Daily email digest via Resend, Telegram message with high-impact items. Notifications wired into `/api/scan` as decoupled fetch calls.
**Uses:** Resend 6.9.x, grammy 1.41.x
**Avoids:** Pitfall 6 (Resend deduplication), Pitfall 9 (Telegram message formatting/length)
**Research flag:** Not needed — both APIs are simple and well-documented.

### Phase 5: Weekly PPT Generation
**Rationale:** Most complex single feature. Requires at least one week of accumulated data to be meaningful. Builds on notification infrastructure for PPT delivery.
**Delivers:** 7-slide professional PPT auto-generated every Friday, uploaded to Supabase Storage, emailed as attachment. Weekly archive page at `weekly/page.tsx`.
**Uses:** pptxgenjs 4.0.1 (pure function pattern, Buffer output, no filesystem writes), Supabase Storage, Claude API for weekly synthesis prompt
**Avoids:** Pitfall 4 (pptxgenjs corruption), Pitfall 5 (Supabase storage accumulation — implement retention policy from day one)
**Research flag:** Needs research-phase — pptxgenjs slide layout for professional output needs iteration. Recommend testing with hardcoded data before wiring to real data.

### Phase 6: Cron Automation + End-to-End Testing
**Rationale:** Cron wiring is last because it can only be validated when all pieces exist. End-to-end testing under real timeout constraints is essential before calling the system done.
**Delivers:** `vercel.json` cron config, CRON_SECRET validation on all pipeline routes, 1-week live trial validating costs and data quality.
**Avoids:** Pitfall 1 (timeout validation under production constraints), Pitfall 11 (UTC/KST conversion)
**Research flag:** Not needed — standard Vercel Cron configuration.

### Phase Ordering Rationale

- Phase 1 before everything: Supabase tables must exist before any API can write data
- Phase 2 before Phase 3: Dashboard needs real data to build against; building UI against empty tables wastes iteration cycles
- Phase 3 and 4 can run in parallel: both depend on Phase 2 data but are independent of each other
- Phase 4 before Phase 5: Weekly report reuses email notification infrastructure; build it once
- Phase 5 late: Requires 1 week of accumulated data and is the most complex feature — get everything else stable first
- Phase 6 last: Only possible when all pieces exist; validates the complete system under production constraints

### Research Flags

Phases needing deeper research during planning:
- **Phase 2:** Claude web_search quality for India-specific cosmetics content is unproven. Prompt engineering strategy needs iteration. Consumer voice collection scope needs explicit definition before building.
- **Phase 5:** pptxgenjs slide layout patterns for professional 7-slide output need prototyping with hardcoded data before wiring to live data.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Next.js + Supabase + Vercel setup is fully documented with no novel patterns.
- **Phase 3:** Next.js Server Components + shadcn/ui dashboard is well-established.
- **Phase 4:** Resend and grammy integrations are simple API wrappers with clear documentation.
- **Phase 6:** Vercel Cron configuration is fully documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against official docs and npm. No deprecated APIs. Compatibility matrix checked. |
| Features | MEDIUM-HIGH | Table stakes are clear. Consumer voice scope needs adjustment from CLAUDE.md — direct review scraping is not feasible. |
| Architecture | HIGH | Verified against Vercel, Anthropic, Supabase official documentation. Timeout limits and cron constraints confirmed. |
| Pitfalls | HIGH | Top pitfalls are documented with specific line-item prevention strategies. pptxgenjs issues confirmed via GitHub Issues. |

**Overall confidence:** HIGH

### Gaps to Address

- **Claude web_search India content quality:** Cannot be validated until Phase 2 prompt iteration. Accept that 1-2 weeks of live output will be needed before prompt quality is dialed in. Plan for manual review of first week's output.
- **Consumer voice definition:** CLAUDE.md specifies Nykaa + Amazon review scraping which is technically infeasible via web_search. Rescope to "public discourse" (Reddit, Twitter/X) in Phase 2 implementation. Update schema to make `engagement_score` nullable and add `source_type` field.
- **pptxgenjs slide aesthetics:** Library produces functional but not beautiful output by default. Budget extra iteration time in Phase 5 for visual polish before first live report.
- **Vercel Fluid Compute availability:** Must be confirmed enabled in dashboard settings before Phase 2 testing. If Fluid Compute is unavailable on the project's Hobby plan for any reason, Vercel Pro ($20/month) is the fallback.

## Sources

### Primary (HIGH confidence)
- [Next.js 16.2 Blog Post](https://nextjs.org/blog/next-16-2) — version features, Turbopack as default
- [Claude API Web Search Tool Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) — tool identifier, pricing, max_uses parameter
- [Anthropic API Pricing](https://platform.claude.com/docs/en/about-claude/pricing) — Sonnet 4 cost per token
- [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs) — frequency limits, plan constraints, precision
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations) — 300s max with Fluid Compute on Hobby
- [Supabase JS npm](https://www.npmjs.com/package/@supabase/supabase-js) — v2.100.x, Node 20+ requirement
- [Resend npm](https://www.npmjs.com/package/resend) — v6.9.4, 100/day free tier
- [grammy npm](https://www.npmjs.com/package/grammy) — v1.41.1, TypeScript-first
- [pptxgenjs npm](https://www.npmjs.com/package/pptxgenjs) — v4.0.1, Node buffer output
- [Tailwind CSS v4 Release](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-first config
- [Resend Account Quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits) — free tier limits
- [Supabase Storage Limits](https://supabase.com/docs/guides/storage/uploads/file-limits) — 1 GB free tier

### Secondary (MEDIUM confidence)
- [grammy vs Telegraf comparison](https://grammy.dev/resources/comparison) — TypeScript support comparison
- [pptxgenjs GitHub Issues](https://github.com/gitbrent/pptxgenjs/issues) — color corruption, object reuse bugs
- [Anthropic Skills: pptxgenjs](https://github.com/anthropics/skills/blob/main/skills/pptx/pptxgenjs.md) — best practices
- [India K-Beauty Market — Credence Research](https://www.credenceresearch.com/report/india-k-beauty-product-market) — market context

### Tertiary (MEDIUM-LOW confidence)
- [BBC AI News Accuracy Study](https://www.asisonline.org/security-management-magazine/latest-news/today-in-security/2025/october/ai-assistant-news-inaccuracies/) — 51% error rate in AI news summaries (used to support content quality risk)
- [India digital landscape notes] — India-specific web content availability for regulatory/trade topics is sparse; based on general knowledge, needs live validation

---
*Research completed: 2026-03-29*
*Ready for roadmap: yes*
