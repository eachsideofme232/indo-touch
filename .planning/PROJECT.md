# Indo Touch

## What This Is

An automated India market intelligence system for Laneige's India subsidiary manager. Delivers daily raw news feeds for personal learning and weekly auto-generated PPT reports for division leadership. Replaces manual research that's hindered by language barriers, IP restrictions, and time constraints.

## Core Value

The India subsidiary manager always has current, Laneige-relevant India cosmetics market intelligence — without spending hours manually researching.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Automated daily news scanning across 5 India cosmetics market categories
- [ ] AI-generated insights tied back to Laneige strategy implications
- [ ] Consumer voice collection from Indian beauty platforms (Reddit, Nykaa, Amazon, etc.)
- [ ] Editorial-style daily dashboard for personal consumption
- [ ] Weekly 7-slide PPT auto-generation for division leadership
- [ ] Email + Telegram notification delivery
- [ ] Cron-based automation (daily scan + weekly report)

### Out of Scope

- Dark mode — not needed for this use case
- Multi-user auth — single user (the India subsidiary manager)
- Real-time alerts — daily cadence is sufficient
- Hindi/regional language translation — Claude handles this via web_search
- Mobile app — responsive web is enough

## Context

- User is Ben, managing Laneige's India subsidiary from Korea HQ
- Currently researches India market manually — painful due to language barriers (Hindi/regional languages) and IP-restricted Indian content
- Daily feed is personal learning tool — raw, unfiltered market intelligence
- Weekly PPT goes to division leadership (directors/VPs) — they care most about "what does this mean for Laneige?"
- Success = save 5+ hrs/week + always look like an India market expert + impress leadership with proactive intelligence
- Key competitors to track: L'Oréal India, Maybelline, Innisfree, Nykaa private label
- Key channels: quick commerce (Blinkit, Zepto, Swiggy Instamart) is reshaping India beauty distribution
- Regulatory bodies: BIS, CDSCO, import tariffs

## Constraints

- **Tech stack**: Next.js 16, Tailwind + shadcn/ui, Supabase, Claude API + web_search, Resend, Telegram Bot API, pptxgenjs, Vercel — locked, no changes
- **Design**: Editorial style, Saffron (#E8732A) + Teal (#1A6B8A) + Warm White (#FFFDF9), Playfair Display + DM Sans
- **Language**: Korean comments, English code, TypeScript strict mode
- **Deploy**: Vercel with Vercel Cron Jobs
- **AI model**: claude-sonnet-4-20250514 with web_search tool for news collection

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Claude API + web_search for news collection | No scraping needed, handles language barriers, returns structured data | — Pending |
| Single-user system (no auth) | Only one user (Ben), simplifies architecture | — Pending |
| Supabase for DB + storage | PPT file storage + structured data in one platform | — Pending |
| pptxgenjs for PPT generation | Server-side JS PPT generation, no external service needed | — Pending |

---
*Last updated: 2026-03-29 after initialization*
