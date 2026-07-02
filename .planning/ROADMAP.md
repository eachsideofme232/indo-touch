# Roadmap: Indo Touch

## Overview

Indo Touch follows the data dependency chain: foundation first, then the intelligence engine that collects data, then the dashboard that displays it, then notifications that push it, then weekly PPT reports that synthesize it, and finally cron automation that runs the whole system unattended. Each phase delivers a coherent, independently verifiable capability. Phase 2 (Intelligence Engine) is the make-or-break phase consuming the most effort — everything downstream depends on quality data flowing into Supabase.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffolding, Supabase schema, Vercel deploy with Fluid Compute
- [ ] **Phase 2: Intelligence Engine** - News scan API + consumer voice collection via Claude web_search
- [ ] **Phase 3: Daily Dashboard** - Editorial-style UI for browsing and filtering daily intelligence
- [ ] **Phase 4: Notifications** - Email digest via Resend + Telegram alerts for high-impact items
- [ ] **Phase 5: Weekly Reports** - Auto-generated 7-slide PPT with archive and trend tracking
- [ ] **Phase 6: Automation** - Vercel Cron wiring + end-to-end production validation

## Phase Details

### Phase 1: Foundation
**Goal**: A deployed Next.js 16 app with Supabase schema and storage ready to receive data
**Depends on**: Nothing (first phase)
**Requirements**: INFR-03, INFR-04
**Success Criteria** (what must be TRUE):
  1. Next.js 16 app is deployed and accessible on Vercel with a working root page
  2. All 3 Supabase tables (news_items, consumer_voices, weekly_reports) exist with correct schemas and constraints
  3. Supabase Storage bucket for PPT files exists and accepts uploads
  4. Vercel Fluid Compute is enabled and functions can run beyond 10 seconds (maxDuration = 300 verified)
  5. All environment variables are wired in Vercel and .env.local
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Intelligence Engine
**Goal**: The system collects high-quality, Laneige-relevant India market intelligence across 5 categories and stores it in Supabase
**Depends on**: Phase 1
**Requirements**: NEWS-01, NEWS-02, NEWS-03, NEWS-04, NEWS-05, NEWS-06, NEWS-07, INFR-06
**Success Criteria** (what must be TRUE):
  1. Calling /api/scan returns news items across all 5 categories (market, channel, consumer, competitor, regulatory) with source URLs that resolve to real articles
  2. Each news item has an impact score (high/medium/low) and a Laneige-specific strategic insight that is contextually relevant (not generic)
  3. Consumer voice items are collected from public discourse (Reddit, Twitter/X) with sentiment classification (positive/negative/neutral)
  4. User can trigger a manual scan from the dashboard and see fresh results appear in Supabase within minutes
  5. Claude API costs per scan stay under $1 (max_uses: 10 per category, Sonnet 5 only) and each scan logs tokens/searches/estimated cost (INFR-06)
  6. Running /api/scan twice in a row does not produce duplicate news items — already-stored articles are skipped (NEWS-07)
  7. /api/scan rejects requests without a valid CRON_SECRET (route is protected from its first deploy, not deferred to Phase 6)
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Daily Dashboard
**Goal**: The user can browse, filter, and search daily intelligence in a polished editorial-style interface
**Depends on**: Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06
**Success Criteria** (what must be TRUE):
  1. User sees today's news feed in editorial-style UI with Saffron/Teal/Warm White design, Playfair Display headings, DM Sans body text
  2. User can filter news by any of the 5 categories and see only matching items
  3. User can navigate to any past date's feed and see that day's collected intelligence
  4. User can see consumer sentiment breakdown (positive/negative/neutral ratios) for topics
  5. User can search across all collected intelligence via full-text search and get relevant results
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Notifications
**Goal**: The user receives daily intelligence via email and Telegram without opening the dashboard
**Depends on**: Phase 2
**Requirements**: NOTF-01, NOTF-02, INFR-05
**Success Criteria** (what must be TRUE):
  1. User receives a daily email digest via Resend with top news items formatted for quick scanning
  2. User receives a Telegram message containing only high-impact items with clickable source links
  3. Notification failures do not abort or delay the scan pipeline (decoupled via internal fetch)
  4. A failed scan or report pipeline sends a Telegram alert with the failure reason — the system never fails silently (INFR-05)
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Weekly Reports
**Goal**: Division leadership receives a professional 7-slide PPT every week summarizing India market intelligence
**Depends on**: Phase 2, Phase 4
**Requirements**: WEEK-01, WEEK-02, WEEK-03, WEEK-04, WEEK-05, WEEK-06, INFR-07
**Success Criteria** (what must be TRUE):
  1. Calling /api/weekly generates a 7-slide PPT covering the week's intelligence with cross-category pattern detection
  2. Generated PPT opens correctly in Microsoft PowerPoint with no corruption (colors, bullets, layout intact)
  3. PPT is uploaded to Supabase Storage and downloadable via a persistent link
  4. User can browse an archive of past weekly reports on the /weekly page and download any past PPT
  5. User can see trend tracking over time showing sentiment shifts and topic frequency changes across weeks
  6. A storage retention policy prunes PPT files beyond the retention window so the bucket stays within the free tier (INFR-07)
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: Automation
**Goal**: The entire system runs unattended on schedule, validated under production constraints
**Depends on**: Phase 1, Phase 2, Phase 3, Phase 4, Phase 5
**Requirements**: INFR-01, INFR-02
**Success Criteria** (what must be TRUE):
  1. Daily scan fires automatically at 07:00 KST (UTC 22:00 previous day) via Vercel Cron and completes within timeout
  2. Weekly PPT generation fires automatically every Friday at 06:00 KST via Vercel Cron and completes within timeout
  3. CRON_SECRET validation (implemented in Phase 2) is verified against the production deployment for all pipeline routes
  4. System runs for at least 3 consecutive days with no manual intervention and produces expected outputs (news items, notifications, or weekly report)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6
Note: Phases 3 and 4 can execute in parallel (both depend on Phase 2 only).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/TBD | Not started | - |
| 2. Intelligence Engine | 0/TBD | Not started | - |
| 3. Daily Dashboard | 0/TBD | Not started | - |
| 4. Notifications | 0/TBD | Not started | - |
| 5. Weekly Reports | 0/TBD | Not started | - |
| 6. Automation | 0/TBD | Not started | - |
