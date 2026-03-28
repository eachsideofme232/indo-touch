# Feature Landscape

**Domain:** Market Intelligence / Automated News Monitoring (Single-user, India Cosmetics)
**Researched:** 2026-03-29
**Overall confidence:** MEDIUM-HIGH

## Table Stakes

Features the user (Laneige India subsidiary manager) expects. Missing any of these makes the tool less useful than manual Googling.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Daily automated news scan** | Core value prop — replaces manual morning research across 5 categories | High | Claude API + web_search is the engine. Must run reliably every day via Vercel Cron. |
| **Category-based organization** | 5 categories (market, channel, consumer, competitor, regulatory) mirror how the user thinks about the market | Low | Simple DB filter + UI tabs/filters. Already defined in schema. |
| **Impact scoring (high/medium/low)** | User needs to triage — "what matters today?" without reading everything | Medium | Claude assigns impact via prompt engineering. Quality depends entirely on prompt design. |
| **News item summary + source URL** | User must be able to verify any claim. Raw links = trust. | Low | Claude web_search returns URLs naturally. Store and display them. |
| **Laneige-specific insight per item** | This is what makes it intelligence, not just news. "So what for Laneige?" | Medium | Prompt engineering challenge — Claude needs context about Laneige's India position. |
| **Dashboard UI (editorial style)** | Personal consumption interface for daily review. Must feel like reading a curated briefing, not a data dump. | Medium | Next.js + Tailwind + shadcn/ui. Editorial design with Playfair Display + DM Sans. |
| **Email notification (daily digest)** | User shouldn't have to remember to check the dashboard. Push > pull. | Low | Resend API. Simple HTML template with top items. |
| **Telegram notification** | Quick mobile glance — "anything urgent today?" | Low | Telegram Bot API is trivial to implement. Short message with high-impact items only. |
| **Weekly PPT auto-generation** | The division-level deliverable. This is what the user's boss sees. 7-slide format. | High | pptxgenjs. Most complex feature — must look professional enough to present. |
| **Weekly report archive** | User needs to look back — "what did we cover 3 weeks ago?" | Low | Simple list page pulling from weekly_reports table. |
| **Date-based browsing** | "Show me yesterday's feed" or "last Monday's items" | Low | Date picker + query filter. Essential for catching up after absence. |
| **Consumer sentiment tracking** | Understanding positive/negative/neutral split on K-beauty and Laneige specifically | Medium | Claude classifies sentiment. Display as simple ratios, not complex charts. |

## Differentiators

Features that make Indo Touch significantly better than manual research. Not expected from a v1, but high-value if delivered.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Consumer voice aggregation** | Pulls from Reddit (r/IndianSkincare, r/IndianBeautyDeals), Nykaa reviews, Amazon India reviews, Twitter — impossible to do manually every day | High | Claude web_search can surface Reddit/Twitter content. Direct Nykaa/Amazon scraping is fragile and likely TOS-violating; rely on Claude web_search to find review discussions instead. |
| **Cross-category pattern detection** | Weekly report connects dots: "regulatory change X will affect channel Y and competitor Z is already responding" | Medium | Prompt engineering in weekly summary generation. Claude excels at synthesis when given structured data. |
| **Trend tracking over time** | "Consumer sentiment on Laneige lip sleeping mask has shifted from 70% positive to 55% over 4 weeks" | Medium | Requires enough historical data. Simple line charts from stored sentiment data. Build the data model now, add visualization in v1.5. |
| **Quick commerce channel monitoring** | Blinkit, Zepto, Swiggy Instamart are reshaping India beauty distribution. Dedicated tracking is rare in generic tools. | Medium | Specific search queries for quick commerce beauty news. High value for Laneige's channel strategy. |
| **Competitor action timeline** | Visual timeline of what L'Oreal India, Innisfree, Nykaa private label did this month | Low | UI component pulling from competitor-category items. Simple but visually powerful. |
| **Manual scan trigger** | "I heard something happened — scan now" button instead of waiting for tomorrow's cron | Low | Expose the scan API endpoint via a dashboard button. Very useful, minimal effort. |
| **PPT template customization** | Adjust slide count, which categories to include, branding elements | Medium | pptxgenjs supports Slide Masters. Worth building basic config, but not a priority over getting v1 PPT working. |
| **Search within collected intelligence** | Full-text search across all news_items and consumer_voices | Low | Supabase full-text search (tsvector) or simple ILIKE. High utility once data accumulates. |

## Anti-Features

Features to explicitly NOT build for v1. Each one is a time sink that doesn't serve a single-user intelligence tool.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **User authentication / multi-tenancy** | Single user. Auth adds complexity with zero value. The user is Ben (or whoever runs the India subsidiary). | Deploy behind Vercel's preview protection or a simple ENV-based password middleware if needed. |
| **Real-time websocket updates** | News updates daily. There's no "live feed" value. The cron runs once a day. | Standard page refresh or SWR polling is sufficient. |
| **Direct scraping of Nykaa/Amazon/Instagram** | Fragile, TOS-violating, maintenance nightmare. These platforms actively block scrapers. | Use Claude web_search to find review discussions and social media mentions. It won't get individual product reviews, but it will surface trending discussions. |
| **Custom ML sentiment model** | Overkill. Claude's built-in classification is good enough for positive/negative/neutral. | Prompt-based sentiment classification via Claude API. |
| **Multi-language support** | User reads Korean and English. News sources are English. No Hindi UI needed. | Keep UI in English (with Korean comments in code per CLAUDE.md rules). |
| **Complex data visualization / charts** | Dashboard is for reading, not data analysis. Charts add complexity without insight for a briefing-style tool. | Simple stats (count badges, sentiment ratios). Save charts for v2 if needed. |
| **PDF report generation** | PPT is the deliverable format for Korean corporate culture. Nobody asked for PDF. | PPT only via pptxgenjs. |
| **Notification preferences / scheduling UI** | One user, one schedule. Hardcode the cron. | Configure via vercel.json and environment variables. |
| **AI chatbot / conversational interface** | "Ask questions about your intelligence" sounds cool but is a separate product. The value is in the curated daily brief, not ad-hoc Q&A. | Structured daily feed + weekly report. If Q&A is needed later, it's a v2 feature. |
| **Social media posting / response tools** | This is intelligence gathering, not social media management. Don't mix concerns. | Read-only. Observe and report. |
| **Competitor price tracking** | Requires scraping product pages regularly. Fragile and out of scope for a news intelligence tool. | Note pricing news when it appears in general market coverage. |
| **Mobile app** | Responsive web + Telegram notifications cover mobile use cases. A native app is massive scope creep. | Mobile-responsive Next.js dashboard + Telegram for push notifications. |

## Feature Dependencies

```
Supabase Schema + DB Setup
  |
  +---> News Scan API (Claude + web_search)
  |       |
  |       +---> Daily Dashboard UI (reads from DB)
  |       |
  |       +---> Email Notification (triggered after scan)
  |       |
  |       +---> Telegram Notification (triggered after scan)
  |
  +---> Consumer Voice Collection API (Claude + web_search)
  |       |
  |       +---> Consumer Voice UI Section (reads from DB)
  |
  +---> Weekly Report Generation
          |
          +--- Requires: news_items + consumer_voices data (at least 1 week)
          |
          +---> PPT Generation (pptxgenjs)
          |       |
          |       +---> Supabase Storage Upload
          |
          +---> Weekly Email with PPT attachment
```

Key dependency chain:
- **DB must exist** before any API can store data
- **Scan API must work** before dashboard has anything to show
- **1 week of data** must accumulate before weekly report makes sense
- **Email/Telegram** are independent of each other but both depend on scan completing
- **PPT generation** depends on weekly aggregation logic, which depends on having data

## MVP Recommendation

### Must ship (Phase 1-3 priority):

1. **Supabase schema + project setup** — Foundation for everything
2. **News scan API with Claude web_search** — The engine. Without this, nothing works. Focus prompt engineering here.
3. **Daily dashboard UI** — The primary consumption interface. Editorial style, category filters, impact badges.
4. **Laneige-specific insights** — What transforms generic news into intelligence. Per-item "So what?" driven by prompt engineering.
5. **Date browsing** — Navigate to any day's feed

### Ship next (Phase 4-5):

6. **Email daily digest** — Push notification for daily consumption
7. **Telegram alerts** — High-impact items only, mobile-friendly
8. **Consumer voice collection** — Separate API route, sentiment classification
9. **Weekly PPT generation** — The division deliverable. Most complex single feature.
10. **Weekly report archive page** — Simple list UI

### Defer to v1.5+:

- **Manual scan trigger button** — Quick win once scan API is stable
- **Full-text search** — Valuable once 2+ weeks of data exist
- **Trend tracking visualization** — Needs historical data baseline
- **Competitor action timeline** — Nice UI but not blocking any workflow
- **PPT template customization** — Get basic PPT working first

## Complexity Budget

Given the 6-phase build plan in CLAUDE.md, here is the estimated effort distribution:

| Phase | Features | Effort Weight |
|-------|----------|---------------|
| Phase 1: Setup | Project init, Supabase schema, Vercel deploy | 10% |
| Phase 2: Scan API | News collection + consumer voice via Claude API | 30% (hardest prompt engineering) |
| Phase 3: Dashboard UI | Feed display, filters, cards, editorial design | 20% |
| Phase 4: Notifications | Email (Resend) + Telegram | 10% |
| Phase 5: Weekly PPT | Aggregation + pptxgenjs generation + storage | 25% (hardest implementation) |
| Phase 6: Cron + Polish | Vercel Cron, error handling, testing | 5% |

**Phase 2 and Phase 5 are the risk phases.** Phase 2 because Claude web_search quality for India-specific cosmetics news is unproven. Phase 5 because pptxgenjs requires significant iteration to produce professional-looking slides.

## Sources

- [Cypris - Top Market Intelligence Platforms 2026](https://www.cypris.ai/insights/top-market-intelligence-platforms-for-different-business-functions-in-2026)
- [Muck Rack - Media Monitoring Tools Guide](https://muckrack.com/blog/2024/05/24/media-monitoring-tools-guide-guide/)
- [Meltwater - Competitive Intelligence Tools](https://www.meltwater.com/en/blog/competitive-intelligence-tools)
- [Claude API Web Search Tool Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)
- [PptxGenJS GitHub](https://github.com/gitbrent/PptxGenJS)
- [Feedly - Topic and Trend Tracking](https://feedly.com/)
- [India K-Beauty Market - Credence Research](https://www.credenceresearch.com/report/india-k-beauty-product-market)
- [AlphaSense - Market Intelligence Tools](https://www.alpha-sense.com/resources/product-articles/market-intelligence-tools/)
