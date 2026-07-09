# Domain Pitfalls

**Domain:** Automated Market Intelligence System (India Cosmetics)
**Researched:** 2026-03-29

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Vercel Hobby Plan Kills Your Cron Architecture

**What goes wrong:** The daily scan API (`/api/scan`) needs to call Claude API with web_search across 5 categories, process results, store to Supabase, send email via Resend, and send Telegram notification -- all in a single serverless function invocation. On Vercel Hobby plan, the function timeout is **10 seconds**. Claude API web_search alone takes 5-15 seconds per call. The entire pipeline will timeout consistently.

**Why it happens:** Developers prototype locally (no timeout) or assume Vercel "serverless" means generous limits. Hobby plan caps at 10 seconds and only allows **2 cron jobs** running **once per day** maximum.

**Consequences:** Cron triggers but function times out mid-execution. Partial data gets written to Supabase. No email/Telegram sent. Silent failures with no retry mechanism. You discover this only after deployment.

**Warning signs:**
- Local development works perfectly, production fails silently
- Supabase shows partial data (some categories scanned, others missing)
- Email/Telegram notifications stop arriving intermittently

**Prevention:**
- **Option A (recommended):** Use Vercel Pro plan ($20/month) for 60-second timeout. Still tight -- split the scan into sequential category-specific calls.
- **Option B:** Use Vercel Fluid Compute (free tier gets 1 minute). Requires enabling in project settings.
- **Option C:** Break the pipeline into a chain: cron triggers `/api/scan` which only kicks off individual category scans via fetch calls to separate endpoints. Each endpoint handles one category + storage in under 10 seconds.
- **Option D:** Use Upstash QStash ($0/month free tier) as a message queue to orchestrate multi-step workflows with automatic retries.
- Design for partial failure from day one: each category scan should be idempotent and independently retryable.

**Phase:** Phase 1 (project setup) must decide the hosting tier. Phase 2 (scan API) must implement the timeout-safe architecture. Phase 6 (cron setup) validates it works end-to-end.

**Confidence:** HIGH -- Vercel docs explicitly state these limits.

---

### Pitfall 2: Claude web_search Returns Stale, Irrelevant, or Fabricated India-Market Content

**What goes wrong:** Claude's web_search tool is designed for general web queries, not specialized India cosmetics market intelligence. Results for queries like "India beauty market regulatory changes BIS 2026" return generic global beauty articles, outdated 2023 reports, or completely irrelevant content. Claude then summarizes this low-quality input confidently, producing plausible-sounding but inaccurate intelligence.

**Why it happens:** India's cosmetics regulatory landscape (BIS, CDSCO, FSSAI) publishes primarily through government gazette notifications and Indian trade press -- sources that web_search does not reliably index. BBC research found 51% of AI news summaries had significant issues; India-specific, niche-industry content will be worse.

**Consequences:** The intelligence report looks professional but contains outdated regulatory info, misattributed competitor moves, or hallucinated market data. Decision-makers act on wrong information. The entire value proposition of "market expert replacement" collapses.

**Warning signs:**
- Multiple news items cite the same 2-3 sources repeatedly
- Regulatory updates reference old notifications (check dates in source_url)
- "Insight" fields contain generic advice not specific to India or Laneige
- Consumer voice data seems templated or repetitive across days

**Prevention:**
- Design prompts that force Claude to include source URLs and publication dates for every claim
- Post-process: validate that source_url returns HTTP 200, check publication dates are within 7 days
- Include specific Indian sources in search prompts: "site:economictimes.com", "site:livemint.com", "Nykaa regulatory", "BIS notification cosmetics"
- Add a `confidence` field to `news_items` schema -- let Claude self-rate and flag low-confidence items visually in the dashboard
- Build a manual review flag for high-impact items before they reach the weekly PPT
- Accept that this system is a "starting point" not a "replacement" -- the UI should encourage click-through to sources

**Phase:** Phase 2 (scan API) is the make-or-break phase. Prompt engineering quality determines the entire product value. Budget 40% of Phase 2 time on prompt iteration and output validation.

**Confidence:** HIGH -- well-documented limitation of AI news summarization.

---

### Pitfall 3: Runaway API Costs from Unmonitored web_search Usage

**What goes wrong:** Each Claude web_search call costs $0.01 per search + input/output tokens. Scanning 5 categories daily with multiple searches per category (Claude may invoke web_search 3-5 times per category to build comprehensive results) = 15-25 searches/day. Add consumer voice collection = another 10-15 searches. At $0.02-0.05 effective cost per search (including tokens), daily costs reach $0.50-$2.00/day. Monthly: $15-$60 just for daily scans. Weekly reports add more. Total: $25-$100/month for a single-user tool.

**Why it happens:** The $0.01/search looks cheap in isolation. But Claude decides how many searches to run per prompt -- you do not control this directly. Token costs for processing search results (counted as input tokens) often exceed the search fee by 2-3x.

**Consequences:** Anthropic bill shock. For a personal/small-team tool, $100/month in API costs makes it economically questionable. Cost grows if you add more categories or increase scan frequency.

**Warning signs:**
- Anthropic dashboard shows higher-than-expected daily spend
- Claude's responses include many `web_search` tool invocations per category (visible in API response metadata)
- Token counts per scan request exceed 50K input tokens

**Prevention:**
- Use `claude-sonnet-5` (not Opus) for scans -- cheaper and sufficient for structured extraction. (Updated 2026-07-02: claude-sonnet-4-20250514 is deprecated, retires 2026-06-15.)
- Set `max_tokens` on responses to cap output
- Design prompts that explicitly say "Use at most 2 web searches per category"
- Note (Sonnet 5): `budget_tokens` is removed -- use `output_config: {effort: "low"}` or `thinking: {type: "disabled"}` to constrain thinking spend; `max_uses` on the web_search tool caps searches
- Track daily API spend programmatically (Anthropic Usage API) and alert if exceeding threshold
- Cache results: if scan fails partway, don't re-scan categories already completed today
- Consider whether 5 categories daily is necessary -- start with 3 (market, competitor, regulatory) and add others weekly

**Phase:** Phase 2 (scan API) must implement cost controls. Phase 6 (testing) must validate actual costs over a 1-week trial before committing.

**Confidence:** HIGH -- pricing is documented; token math is straightforward.

---

### Pitfall 4: pptxgenjs Produces Corrupt or Ugly PPT Files in Serverless

**What goes wrong:** pptxgenjs has multiple silent corruption triggers: using "#" in hex colors (e.g., "#FF0000" instead of "FF0000"), encoding opacity in hex strings, reusing presentation objects across calls. In serverless (Vercel), memory constraints and cold starts add additional failure modes. The generated PPT opens with "PowerPoint found a problem with content" error or displays broken formatting.

**Why it happens:** pptxgenjs mutates option objects in-place (unexpected side effect). Color format requirements differ from CSS conventions. Serverless cold starts may affect file generation timing. There's no visual preview in the generation pipeline -- you only discover issues when someone opens the PPT.

**Consequences:** Leadership receives a corrupt PPT on Friday morning. Manual intervention needed every week. Trust in the automated system drops.

**Warning signs:**
- PPT opens with repair dialog in PowerPoint
- Bullet points appear doubled (unicode "bullet" + pptxgenjs bullet)
- Excessive line spacing in bullet sections
- Colors appear wrong or slides are blank

**Prevention:**
- Never use "#" prefix in hex colors -- use "E8732A" not "#E8732A"
- Never reuse pptxgen() instances or option objects -- create fresh for each slide
- Use `bullet: true` property instead of unicode bullet characters
- Use `paraSpaceAfter` instead of `lineSpacing` for bullet spacing
- Create a fresh `PptxGenJS()` instance for every report generation
- Build a PPT validation step: generate, upload to Supabase, then download and check file size is > 10KB (non-trivially small = likely valid)
- Test PPT output in actual PowerPoint (not just Google Slides -- rendering differs)

**Phase:** Phase 5 (PPT generation) -- create a template-driven approach early with hardcoded test data before wiring to real data.

**Confidence:** HIGH -- pptxgenjs GitHub issues document these exact problems.

## Moderate Pitfalls

### Pitfall 5: Supabase Free Tier Storage Fills Up Silently

**What goes wrong:** Supabase free tier provides 1 GB file storage and 500 MB database storage. Weekly PPT files (1-5 MB each) accumulate: 52 weeks = 50-250 MB of PPTs alone. Combined with database growth from daily news_items and consumer_voices, you hit storage limits within 6-12 months.

**Prevention:**
- Implement a retention policy: keep only last 12 weeks of PPT files in Supabase Storage, archive older ones or delete
- Add a `GENERATED ALWAYS AS` week_number column (already in schema) and create a cleanup function that runs monthly
- Monitor storage usage via Supabase dashboard -- set a calendar reminder to check monthly
- Consider Supabase Pro ($25/month) if storage becomes a recurring issue

**Phase:** Phase 5 (PPT upload) should implement retention policy. Phase 6 (testing) should validate storage growth projections.

**Confidence:** MEDIUM -- depends on actual PPT file sizes.

---

### Pitfall 6: Resend Free Tier Daily Cap Blocks Notifications

**What goes wrong:** Resend free tier caps at 100 emails/day and 3,000/month. For a single-user system, this is fine initially. But if you add recipients (division team members), or if retry logic sends duplicate emails on failures, you can hit the daily cap unexpectedly. Resend silently drops emails after the cap -- no error returned.

**Prevention:**
- Track email send counts in Supabase before calling Resend
- Implement deduplication: check if today's daily digest was already sent before sending
- For multiple recipients, use a single email with CC/BCC instead of individual sends
- Keep email sends to exactly 1 daily + 1 weekly = 8/month, well within limits

**Phase:** Phase 4 (notifications) must implement send tracking and deduplication.

**Confidence:** MEDIUM -- limits are documented; risk depends on implementation.

---

### Pitfall 7: Consumer Voice Collection is Technically Infeasible via web_search

**What goes wrong:** The CLAUDE.md specifies collecting consumer voices from Reddit, Nykaa reviews, Amazon India reviews, Twitter, Instagram, and YouTube. Claude's web_search tool cannot reliably scrape product reviews from e-commerce sites (Nykaa, Amazon India) -- these are behind dynamic rendering, anti-bot protections, and login walls. Reddit content is accessible but granularity is limited. Instagram/YouTube comments are not indexable via web search.

**Why it happens:** Confusion between "searching the web for mentions" and "scraping structured review data." web_search finds articles *about* consumer sentiment, not individual reviews.

**Consequences:** The consumer_voices table stays empty or fills with AI-paraphrased summaries of "what people generally think" rather than actual consumer quotes with engagement scores.

**Warning signs:**
- consumer_voices entries lack source_url or URLs return 404
- engagement_score is always null or estimated
- Content reads like AI summaries, not actual consumer quotes
- Same generic sentiments appear across multiple days

**Prevention:**
- Redefine "consumer voices" as "public discourse about Indian skincare/K-beauty found via web search" -- NOT individual product reviews
- Focus on Reddit (publicly searchable) and Twitter/X (partially searchable) via web_search
- Drop Nykaa/Amazon review scraping from MVP -- add later only if specific APIs become available
- Adjust the consumer_voices schema: make engagement_score nullable, add a `source_type` field to distinguish "direct quote" from "AI-summarized sentiment"
- Set expectations: this section provides directional sentiment, not quantitative review analysis

**Phase:** Phase 2 (scan API) must scope consumer voice collection realistically. Do not promise structured review data.

**Confidence:** HIGH -- web_search cannot access e-commerce review APIs.

---

### Pitfall 8: India Content Availability Gap

**What goes wrong:** India's cosmetics/beauty market intelligence is not as well-covered in English-language web content as US/EU markets. Regulatory updates (BIS standards, CDSCO approvals, customs duty changes) are published in government gazettes with limited web indexing. Regional language content (Hindi, Tamil, Telugu) contains valuable consumer insights but is invisible to English-only web_search queries.

**Prevention:**
- Include Hindi transliteration terms in search prompts: "beauty cream India", "sunscreen SPF India review"
- Target specific Indian business publications: Economic Times, Mint, Business Standard, MoneyControl
- For regulatory content, search for "gazette notification cosmetics India [year]" and "CDSCO approved cosmetics [year]"
- Accept coverage gaps and be transparent in the dashboard: show data freshness indicators per category
- Consider supplementing automated collection with a manual "tip line" -- a simple form where the user can paste URLs they find manually

**Phase:** Phase 2 (scan API) prompt design must account for India-specific source targeting.

**Confidence:** MEDIUM -- based on general knowledge of Indian digital landscape.

## Minor Pitfalls

### Pitfall 9: Telegram Bot Message Formatting Breaks Silently

**What goes wrong:** Telegram Bot API has strict message formatting rules. HTML mode requires specific tags only (no `<div>`, no CSS). Messages over 4096 characters are rejected silently. Markdown mode has different escape rules than standard Markdown.

**Prevention:**
- Use HTML parse mode (more predictable than Markdown)
- Truncate messages to 4000 characters max with "... [Read more in dashboard]" link
- Test with actual Telegram before deploying -- formatting that looks fine in logs may break in the app
- Wrap Telegram sends in try-catch with fallback to plain text

**Phase:** Phase 4 (notifications).

**Confidence:** HIGH -- Telegram API docs are explicit about these limits.

---

### Pitfall 10: Week Number Calculation Mismatch

**What goes wrong:** The schema uses `EXTRACT(WEEK FROM created_at)` for week_number. PostgreSQL's WEEK extraction follows ISO 8601 (weeks start Monday, week 1 contains Jan 4). This may not match Korean business weeks or the user's mental model of "this week's report." Items created Sunday night KST might fall into a different week than expected.

**Prevention:**
- Test week boundary behavior explicitly with KST timestamps (UTC+9)
- Consider using a custom week calculation based on Monday-Sunday Korean time instead of ISO weeks
- Add `year` alongside `week_number` to avoid year-boundary confusion (week 1 of 2027 vs week 52 of 2026)
- The weekly_reports table already has year + week_number -- ensure news_items queries join correctly

**Phase:** Phase 1 (schema) should validate week numbering. Phase 5 (weekly report) must handle edge cases.

**Confidence:** MEDIUM -- standard timezone/week-boundary issue.

---

### Pitfall 11: Vercel Cron Timezone Confusion

**What goes wrong:** Vercel cron expressions use UTC. The project needs KST 07:00 (UTC 22:00 previous day) for daily scans and KST 06:00 Friday (UTC 21:00 Thursday) for weekly reports. Getting this wrong means reports arrive at the wrong time or on the wrong day.

**Prevention:**
- Document the UTC conversion explicitly in vercel.json comments
- KST 07:00 daily = `0 22 * * *` UTC (previous day)
- KST 06:00 Friday = `0 21 * * 4` UTC (Thursday)
- Test by temporarily setting cron to run in 5 minutes and verifying execution

**Phase:** Phase 6 (cron setup).

**Confidence:** HIGH -- simple but frequently misconfigured.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Project Setup | Choosing Hobby plan, discovering timeout too late | Decide hosting tier upfront; budget $20/mo for Pro or use Fluid Compute |
| Phase 1: Schema | Week number edge cases at year boundaries | Test with KST timestamps across week/year boundaries |
| Phase 2: Scan API | Claude web_search quality for India content | Budget 40% of phase time on prompt engineering and output validation |
| Phase 2: Scan API | Runaway API costs during development | Set Anthropic spend alerts; use cheap model for iteration |
| Phase 2: Consumer Voices | Expecting structured review data from web_search | Rescope to "public discourse" not "product reviews" |
| Phase 3: Dashboard UI | No data to display during development | Create seed data script with realistic test news_items |
| Phase 4: Notifications | Telegram message truncation and formatting | Test with real Telegram bot; cap message length |
| Phase 4: Email | Resend deduplication on retries | Track send status in DB before calling Resend |
| Phase 5: PPT Generation | Corrupt files from color format or object reuse | Follow pptxgenjs pitfall checklist; test in actual PowerPoint |
| Phase 5: PPT Storage | Supabase storage accumulation | Implement retention policy from day one |
| Phase 6: Cron Setup | UTC/KST timezone misconfiguration | Document conversions explicitly; test with short-interval cron |
| Phase 6: End-to-End | Full pipeline exceeds function timeout | Load test the complete scan-store-notify chain under timeout constraints |

## Sources

- [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs) -- cron frequency and plan limits
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations) -- timeout limits per plan
- [Vercel Fluid Compute](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out) -- timeout workarounds
- [Claude API Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- web_search costs
- [Claude Web Search Tool Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) -- tool behavior
- [BBC AI News Accuracy Study](https://www.asisonline.org/security-management-magazine/latest-news/today-in-security/2025/october/ai-assistant-news-inaccuracies/) -- 51% error rate in AI news summaries
- [pptxgenjs GitHub Issues](https://github.com/gitbrent/pptxgenjs/issues) -- color corruption, object reuse bugs
- [Anthropic Skills: pptxgenjs](https://github.com/anthropics/skills/blob/main/skills/pptx/pptxgenjs.md) -- best practices
- [Resend Account Quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits) -- free tier 100/day cap
- [Supabase Storage Limits](https://supabase.com/docs/guides/storage/uploads/file-limits) -- 1 GB free tier
- [QStash Vercel Integration](https://medium.com/@kolbysisk/case-study-solving-vercels-10-second-limit-with-qstash-2bceeb35d29b) -- timeout workaround pattern
