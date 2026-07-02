# Requirements: Indo Touch

**Defined:** 2026-03-29
**Updated:** 2026-07-02 — added NEWS-07 (dedup), INFR-05 (failure alert), INFR-06 (cost tracking), INFR-07 (PPT retention); flagged v1.5 deferral candidates
**Core Value:** The India subsidiary manager always has current, Laneige-relevant India cosmetics market intelligence — without spending hours manually researching.

## v1 Requirements

### News Collection

- [ ] **NEWS-01**: System automatically scans 5 India cosmetics market categories daily (market, channel, consumer, competitor, regulatory) via Claude API + web_search
- [ ] **NEWS-02**: Each news item has an AI-assigned impact score (high/medium/low) for triage
- [ ] **NEWS-03**: Each news item includes a Laneige-specific strategic insight ("so what for Laneige?")
- [ ] **NEWS-04**: Each news item includes source URL for verification
- [ ] **NEWS-05**: System collects consumer voice from public discourse (Reddit r/IndianSkincare, r/IndianBeautyDeals, Twitter #KBeautyIndia) with sentiment classification
- [ ] **NEWS-06**: User can trigger a manual scan from the dashboard without waiting for next cron
- [ ] **NEWS-07**: System deduplicates news items across scans — an article already stored (matched by normalized source URL, falling back to title similarity) is not re-inserted on subsequent days

### Dashboard

- [ ] **DASH-01**: User can view daily news feed in editorial-style UI with Saffron/Teal/Warm White design
- [ ] **DASH-02**: User can filter news by category (market, channel, consumer, competitor, regulatory)
- [ ] **DASH-03**: User can browse to any date's feed to catch up after absence
- [ ] **DASH-04**: User can see consumer sentiment ratios (positive/negative/neutral) per topic
- [ ] **DASH-05**: User can search across all collected intelligence via full-text search *(v1.5 deferral candidate — only valuable after 2+ weeks of data; decision pending)*
- [ ] **DASH-06**: User can view a competitor action timeline showing recent competitor moves *(v1.5 deferral candidate per research; decision pending)*

### Weekly Report

- [ ] **WEEK-01**: System auto-generates a 7-slide PPT every Friday covering the week's intelligence
- [ ] **WEEK-02**: Weekly PPT includes cross-category pattern detection (connecting dots across categories)
- [ ] **WEEK-03**: PPT is uploaded to Supabase Storage and accessible via download link
- [ ] **WEEK-04**: User can browse an archive of past weekly reports
- [ ] **WEEK-05**: User can customize PPT template (slide count, category inclusion, branding) *(v1.5 deferral candidate per research; decision pending)*
- [ ] **WEEK-06**: User can see trend tracking over time (sentiment shifts, topic frequency changes) *(v1.5 deferral candidate — needs multi-week baseline; decision pending)*

### Notifications

- [ ] **NOTF-01**: User receives a daily email digest with top news items via Resend
- [ ] **NOTF-02**: User receives Telegram notification with high-impact items only

### Infrastructure

- [ ] **INFR-01**: Daily scan runs automatically via Vercel Cron at 07:00 KST
- [ ] **INFR-02**: Weekly PPT generation runs automatically via Vercel Cron every Friday 06:00 KST
- [ ] **INFR-03**: Vercel Fluid Compute is enabled to support function timeouts >10s
- [ ] **INFR-04**: All data stored in Supabase (Postgres for structured data, Storage for PPT files)
- [ ] **INFR-05**: Pipeline failures (scan or weekly report) trigger a Telegram alert so the system never fails silently
- [ ] **INFR-06**: Each scan logs its Claude API usage (tokens, search count, estimated cost) so daily spend is trackable
- [ ] **INFR-07**: Supabase Storage retention policy — PPT files older than a defined window (e.g. 26 weeks) are pruned to stay within the 1 GB free tier

## v2 Requirements

### Enhanced Analytics

- **ANLYT-01**: AI chatbot to ask questions about collected intelligence
- **ANLYT-02**: Complex data visualizations and charts
- **ANLYT-03**: Quick commerce-specific dedicated monitoring dashboard

### Notifications

- **NOTF-03**: Notification preferences and scheduling UI
- **NOTF-04**: Real-time alerts for breaking high-impact news

## Out of Scope

| Feature | Reason |
|---------|--------|
| User authentication / multi-tenancy | Single user system — adds complexity with zero value |
| Direct scraping of Nykaa/Amazon/Instagram | TOS-violating, fragile, maintenance nightmare — use Claude web_search for public discourse instead |
| Hindi/regional language UI | User reads Korean and English; news sources are English |
| Mobile native app | Responsive web + Telegram covers mobile use cases |
| PDF report generation | PPT is the deliverable format for Korean corporate culture |
| Real-time websocket updates | Daily cadence is sufficient; no live feed value |
| Custom ML sentiment model | Claude's built-in classification is sufficient |
| Social media posting/response | This is intelligence gathering, not social media management |
| Competitor price tracking | Requires scraping product pages; out of scope for news intelligence |
| Dark mode | Not needed per project constraints |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| NEWS-01 | Phase 2 | Pending |
| NEWS-02 | Phase 2 | Pending |
| NEWS-03 | Phase 2 | Pending |
| NEWS-04 | Phase 2 | Pending |
| NEWS-05 | Phase 2 | Pending |
| NEWS-06 | Phase 2 | Pending |
| NEWS-07 | Phase 2 | Pending |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 3 | Pending |
| DASH-03 | Phase 3 | Pending |
| DASH-04 | Phase 3 | Pending |
| DASH-05 | Phase 3 | Pending |
| DASH-06 | Phase 3 | Pending |
| WEEK-01 | Phase 5 | Pending |
| WEEK-02 | Phase 5 | Pending |
| WEEK-03 | Phase 5 | Pending |
| WEEK-04 | Phase 5 | Pending |
| WEEK-05 | Phase 5 | Pending |
| WEEK-06 | Phase 5 | Pending |
| NOTF-01 | Phase 4 | Pending |
| NOTF-02 | Phase 4 | Pending |
| INFR-01 | Phase 6 | Pending |
| INFR-02 | Phase 6 | Pending |
| INFR-03 | Phase 1 | Pending |
| INFR-04 | Phase 1 | Pending |
| INFR-05 | Phase 4 | Pending |
| INFR-06 | Phase 2 | Pending |
| INFR-07 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-07-02 after gap analysis (dedup, failure alerting, cost tracking, retention)*
