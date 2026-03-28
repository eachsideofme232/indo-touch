# Stack Research

**Domain:** Automated market intelligence system (news aggregation + AI analysis + PPT generation)
**Researched:** 2026-03-29
**Confidence:** HIGH

> Stack is LOCKED by project owner. This research validates versions, documents best practices,
> and identifies supporting libraries needed for the locked stack.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2 | Full-stack framework (App Router) | Latest stable. 400% faster dev startup vs 16.0. Turbopack stable as default bundler. App Router is the standard for new Next.js projects. Cron-triggered API routes + dashboard UI in one project. |
| Tailwind CSS | 4.2 | Utility-first styling | CSS-first configuration (no tailwind.config.js needed). 5x faster full builds, 100x faster incremental. New logical property utilities. |
| shadcn/ui | CLI v4 (March 2026) | Component library | Not a dependency -- copies components into your project. CLI v4 supports both Radix and Base UI primitives. Perfect for editorial-style UI with full customization control. |
| TypeScript | 5.7+ | Type safety | Required by Next.js 16. Strict mode enforced per project CLAUDE.md. |

### Database & Storage

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Supabase JS | 2.100.x | Postgres client + Storage | Latest v2 with full TypeScript support. Handles both DB queries and file storage (PPT uploads). Service role key for server-side cron operations, anon key for client dashboard. |
| Supabase (Platform) | -- | Managed Postgres + Storage + Auth | Free tier sufficient for single-user app. Row-level security optional but recommended even for single user. Storage for PPT files with signed URLs. |

### AI & Intelligence

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| @anthropic-ai/sdk | 0.80.x | Claude API client | Official TypeScript SDK. Direct access to Messages API with tool use (web_search). |
| Claude Sonnet 4 (claude-sonnet-4-20250514) | -- | News analysis + summarization | Cost-effective for daily scans. $3/MTok input, $15/MTok output. Good balance of quality and speed for market intelligence tasks. |
| web_search tool | web_search_20250305 | Real-time news gathering | Server-side tool -- Anthropic executes the search, returns results with citations. $10/1,000 searches. Use max_uses to cap costs. |

### Notifications

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Resend | 6.9.x | Email delivery | Simple API, excellent Next.js integration. Free tier: 100 emails/day (more than enough for daily + weekly reports). React Email compatible for templating. |
| grammy | 1.41.x | Telegram Bot API | TypeScript-first, best type safety of all Telegram libraries. 1.4M weekly downloads. Much better DX than node-telegram-bot-api for simple send-message use cases. |

### PPT Generation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| pptxgenjs | 4.0.1 | PowerPoint file creation | Only serious JS PPT library. Full TypeScript definitions. Supports text, tables, shapes, images, charts. Works in Node.js (serverless functions). |

### Infrastructure

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel | -- | Hosting + Cron | Native Next.js host. Cron Jobs trigger API routes on schedule. Free Hobby plan supports daily cron. |
| Vercel Cron Jobs | -- | Scheduled execution | Up to 100 cron jobs per project. Daily minimum frequency on Hobby plan. Triggers via HTTP GET to production deployment. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-email/components | latest | Email templates | Building DailyDigest.tsx and WeeklyReport.tsx email templates with React components |
| zod | 3.x | Runtime validation | Validating Claude API responses, API route inputs, and environment variables |
| date-fns | 4.x | Date manipulation | Week number calculations, date range formatting for reports, KST timezone handling |
| lucide-react | latest | Icons | Dashboard UI icons (impact indicators, category icons, navigation) |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| @playfair-display (Google Fonts) | Editorial heading font | Import via next/font/google for zero layout shift |
| @dm-sans (Google Fonts) | Body text font | Import via next/font/google |
| eslint + eslint-config-next | Linting | Included with create-next-app |
| prettier + prettier-plugin-tailwindcss | Formatting | Auto-sorts Tailwind classes |

## Installation

```bash
# Create project
npx create-next-app@latest indo-touch --typescript --tailwind --eslint --app --src-dir

# Core dependencies
npm install @supabase/supabase-js @anthropic-ai/sdk resend grammy pptxgenjs

# Supporting libraries
npm install zod date-fns @react-email/components lucide-react

# Dev dependencies
npm install -D prettier prettier-plugin-tailwindcss

# shadcn/ui init (after project creation)
npx shadcn@latest init
```

## Key Configuration Details

### Claude API web_search Tool

Use `web_search_20250305` for the daily scan. Configuration:

```typescript
// lib/claude.ts
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  tools: [{
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 10, // Cap at 10 searches per category scan
    user_location: {
      type: "approximate",
      country: "IN",
      timezone: "Asia/Kolkata"
    }
  }],
  messages: [{ role: "user", content: prompt }]
});
```

**Cost estimate:** 5 categories x ~5 searches each = ~25 searches/day = $0.25/day + token costs.
Monthly: ~$7.50 for searches + ~$5-15 for tokens = **~$15-25/month total AI cost**.

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/scan",
      "schedule": "0 22 * * *"
    },
    {
      "path": "/api/weekly",
      "schedule": "0 21 * * 4"
    }
  ]
}
```

**Critical:** Hobby plan limits cron to once/day minimum. The schedule above works.
Cron timing is approximate (can fire up to 59 min late). This is acceptable for daily intelligence.

### Vercel Function Timeout Strategy

**Problem:** Hobby plan has 10-second default timeout. Scanning 5 news categories with Claude web_search will take 30-60+ seconds.

**Solution:** Split the daily scan into sequential category-specific API calls, or use Vercel Fluid Compute (up to 60s on Hobby). Alternatively, upgrade to Pro plan ($20/month) for 300s timeout.

**Recommended approach:** Use a fan-out pattern where the cron endpoint triggers individual category scans as separate fetch calls, each within timeout limits. Or configure `maxDuration` with Fluid Compute:

```typescript
// app/api/scan/route.ts
export const maxDuration = 60; // Fluid Compute on Hobby plan

export async function GET(request: Request) {
  // Verify cron secret
  // Scan all 5 categories sequentially within 60s
}
```

### Supabase Client Setup

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Server-side (API routes, cron jobs) -- uses service role key
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Client-side (dashboard) -- uses anon key
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Telegram Bot (grammy for simple notifications)

```typescript
// lib/telegram.ts
import { Bot } from "grammy";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

export async function sendTelegramMessage(text: string) {
  await bot.api.sendMessage(process.env.TELEGRAM_CHAT_ID!, text, {
    parse_mode: "HTML"
  });
}
```

Note: For this project, grammy is used only for sending messages (not receiving). No webhook or polling setup needed. The Bot instance is created per-request in serverless -- this is fine for send-only usage.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| grammy (Telegram) | node-telegram-bot-api | If you want dead-simple API with zero abstraction. But grammy has better TypeScript types and is more actively maintained. |
| grammy (Telegram) | Telegraf | Never for new projects. TypeScript migration was problematic. grammy was built by Telegraf contributors to fix its issues. |
| Resend (email) | SendGrid, AWS SES | If you need >100 emails/day on free tier, or already have AWS/SendGrid infrastructure. Resend is simpler for this use case. |
| pptxgenjs (PPT) | officegen, python-pptx | officegen is unmaintained. python-pptx requires Python runtime. pptxgenjs is the only viable JS option. |
| date-fns (dates) | dayjs, luxon | dayjs if you prefer moment-like API. luxon for heavy timezone work. date-fns is tree-shakeable and sufficient here. |
| Supabase (DB) | PlanetScale, Neon | If you need MySQL (PlanetScale) or want separate DB from storage. Supabase bundles Postgres + Storage + optional Auth in one service. |
| web_search_20250305 | web_search_20260209 (dynamic filtering) | Use 20260209 if you have Opus 4.6 budget and need code-based filtering of search results. For Sonnet-based daily scans, 20250305 is sufficient and cheaper. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| node-telegram-bot-api | Weaker TypeScript support, lower weekly downloads than grammy, less active maintenance | grammy 1.41.x |
| Telegraf | Messy TS migration from v3 to v4, grammy was specifically built to replace it | grammy 1.41.x |
| officegen | Unmaintained, last publish years ago | pptxgenjs 4.0.1 |
| Puppeteer/Playwright for scraping | Overkill and won't work in Vercel serverless (binary dependencies too large) | Claude web_search tool handles news gathering natively |
| Custom web scraping | Fragile, requires maintenance, blocked by many sites | Claude web_search tool -- Anthropic handles the scraping |
| Tailwind CSS v3 | v4 is stable and significantly faster. shadcn CLI v4 targets v4. | Tailwind CSS v4.2 |
| next-auth / Auth.js | Single-user app with no public access needed. Auth adds unnecessary complexity. | CRON_SECRET header check for API routes is sufficient |
| React Query / SWR | Dashboard data is mostly static (daily refresh). Server Components with revalidation handle this without client-side data fetching libraries. | Next.js App Router Server Components + revalidatePath |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.2 | React 19, Tailwind CSS 4.x | Turbopack is default bundler. React 19 is required. |
| Next.js 16.2 | Node.js 18.18+ | Node 18.18 minimum. Vercel serverless uses Node 20 by default. |
| @supabase/supabase-js 2.100.x | Node.js 20+ | Dropped Node 18 support at v2.79.0. Vercel serverless runs Node 20, so this is fine. |
| shadcn/ui CLI v4 | Tailwind CSS 4.x, Next.js 16.x | Uses CSS variables for theming. Supports both Radix and Base UI primitives. |
| Resend 6.9.x | Next.js 16.x | Works as simple API client. No framework-specific integration needed. |
| pptxgenjs 4.0.1 | Node.js 18+ | Pure JS, no native dependencies. Works in Vercel serverless. |
| grammy 1.41.x | Node.js 18+ | Pure TypeScript. No native dependencies. |

## Cost Estimate (Monthly, Hobby Plan)

| Service | Free Tier | Estimated Usage | Monthly Cost |
|---------|-----------|-----------------|--------------|
| Vercel Hosting | Hobby (free) | 1 user, low traffic | $0 |
| Vercel Cron | Included | 2 cron jobs (daily + weekly) | $0 |
| Supabase | Free tier (500MB DB, 1GB storage) | ~100 rows/day, PPT files | $0 |
| Claude API | Pay-per-use | ~25 searches/day + tokens | ~$15-25 |
| Resend | 100 emails/day free | 1 daily + 1 weekly email | $0 |
| Telegram Bot | Free | 1 message/day | $0 |
| **Total** | | | **~$15-25/month** |

**Note:** If Vercel Hobby plan's function timeout (10s or 60s with Fluid Compute) is insufficient, Pro plan at $20/month gives 300s timeout. This could bring total to ~$35-45/month.

## Sources

- [Next.js 16.2 Blog Post](https://nextjs.org/blog/next-16-2) -- Next.js version and features (HIGH confidence)
- [Claude API Web Search Tool Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) -- web_search configuration, pricing, tool versions (HIGH confidence)
- [Anthropic API Pricing](https://platform.claude.com/docs/en/about-claude/pricing) -- Claude Sonnet 4 pricing (HIGH confidence)
- [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs) -- Cron limitations and configuration (HIGH confidence)
- [Vercel Function Duration Docs](https://vercel.com/docs/functions/configuring-functions/duration) -- Timeout limits by plan (HIGH confidence)
- [Supabase JS npm](https://www.npmjs.com/package/@supabase/supabase-js) -- v2.100.x, Node.js compatibility (HIGH confidence)
- [Resend npm](https://www.npmjs.com/package/resend) -- v6.9.4 (HIGH confidence)
- [grammy npm](https://www.npmjs.com/package/grammy) -- v1.41.1, weekly downloads (HIGH confidence)
- [grammy vs Telegraf comparison](https://grammy.dev/resources/comparison) -- TypeScript comparison (MEDIUM confidence)
- [pptxgenjs npm](https://www.npmjs.com/package/pptxgenjs) -- v4.0.1 (HIGH confidence)
- [Tailwind CSS v4 Release](https://tailwindcss.com/blog/tailwindcss-v4) -- v4 features (HIGH confidence)
- [shadcn/ui CLI v4 Changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4) -- CLI v4 features (HIGH confidence)

---
*Stack research for: Indo Touch -- India Market Intelligence System*
*Researched: 2026-03-29*
