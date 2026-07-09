# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** The India subsidiary manager always has current, Laneige-relevant India cosmetics market intelligence — without spending hours manually researching.
**Current focus:** Phase 1: Foundation

## Current Position

Phase: 1 of 6 (Foundation)
Plan: 2 of 2 executed (deploy steps pending — see below)
Status: Code + schema done; Vercel deploy/Fluid Compute is the remaining manual step
Last activity: 2026-07-02 — Phase 1 executed: Next.js 16 scaffold + theme + /api/health, Supabase project created (evyhsnfmpgvouhxbufgs, ap-northeast-2) with schema/RLS/reports bucket applied

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 6-phase sequential build following data dependency chain
- [Roadmap]: Phases 3 and 4 can run in parallel (both depend on Phase 2 only)
- [Research]: Consumer voice rescoped to public discourse (Reddit, Twitter/X) — no direct Nykaa/Amazon scraping
- [Research]: Fluid Compute must be enabled in Phase 1 before any API work — project-killer if missed
- [Refresh 2026-07-02]: Model pin moved to claude-sonnet-5 (sonnet-4-20250514 deprecated, retires 2026-06-15); web_search tool moved to web_search_20260209
- [Refresh 2026-07-02]: CRON_SECRET protection pulled from Phase 6 into Phase 2 (route is exposed from first deploy)
- [Refresh 2026-07-02]: 4 new requirements — NEWS-07 dedup, INFR-05 failure alert, INFR-06 cost tracking, INFR-07 PPT retention (v1: 24 → 28)
- [Supabase 2026-07-02]: digda = **Tarae 프로젝트**(wbnlgsianlabbsozsvqo, Auth 사용하는 SaaS). indo-touch(evyhsnfmpgvouhxbufgs)와 **별개 프로젝트로 물리적 완전 격리**(DB/키/Auth/스토리지 분리). 조직 W2Q는 **Pro 플랜**($25/월). 단 indo-touch 신규 프로젝트 get_cost 견적은 $0/월 → 별도 프로젝트라도 추가 비용 없을 가능성 → 실제 청구는 대시보드 확인 필요. 통합할 경우 anon/service key 공유가 핵심 리스크(특히 내 테이블의 anon read 정책이 digda 공개 anon 키로 노출됨). 안전 통합안: 전용 `indo` 스키마(API 미노출) + anon 정책 제거 + 대시보드는 service_role 서버 렌더. 상세는 research/SUPABASE_SHARING.md

### Pending Todos

- Ben to decide: keep or defer the 4 v1.5 deferral candidates (DASH-05 search, DASH-06 timeline, WEEK-05 PPT customization, WEEK-06 trend tracking) — flagged in REQUIREMENTS.md, kept in v1 until decided
- **Manual (Ben)**: Vercel 프로젝트 생성 + main 연결, Project Settings > Functions에서 Fluid Compute 활성화, 프로덕션에서 /api/health 15초 응답 확인
- **Manual (Ben)**: .env.local + Vercel 환경변수 등록 (.env.example 참고; Supabase URL/keys는 대시보드 project evyhsnfmpgvouhxbufgs에서)
- Supabase dedup 스모크 테스트 (unique 제약 동작 확인) — MCP 연결 불안정으로 미실행, Phase 2 시작 시 수행

### Blockers/Concerns

- Phase 2 is highest risk: Claude web_search quality for India cosmetics is unproven, needs prompt iteration
- Phase 5: pptxgenjs has known silent corruption issues (color format, object reuse)
- Sonnet 5 API differences vs the original Sonnet 4 plan: adaptive thinking on by default (control cost with effort/disabled), sampling params rejected — reflected in STACK.md

## Session Continuity

Last session: 2026-07-02
Stopped at: Phase 1 code/schema executed and pushed. Vercel deploy + env vars are manual next steps, then Phase 2 (Intelligence Engine)
Resume file: .planning/plans/01-02-supabase-schema.md (verification checklist)
