# Deployment Research — 무료 배포 옵션 비교

**Researched:** 2026-07-02
**Question:** 왜 Vercel인가? 무료로 배포할 방법은 없는가?
**Confidence:** HIGH (공식 문서 기준, 아래 출처 명시)

## 배경: 원래 Vercel을 고른 이유와 실제 문제

원 계획(STACK.md)이 Vercel을 고른 근거는 ① Next.js 네이티브 호스팅 ② Vercel Cron 내장 ③ Hobby 플랜 무료. 기술적 가정은 재검증 결과 유효하다 — **Hobby도 Fluid Compute로 함수 최대 300초 실행 가능** (기본값이자 최대값, 공식 문서 2026-06-19 기준).

실제 문제는 비용이 아니라 **약관**이다: Vercel Hobby는 **비상업적 개인 용도 한정**이며, "관련자 누군가의 금전적 이득을 위한 배포"를 상업 사용으로 정의한다. 이 프로젝트는 Laneige 업무 도구이므로 Hobby 사용은 약관 위반 소지가 있다. 합법적으로 쓰려면 Pro($20/월)가 필요하다.

## 핵심 제약

1. **데일리 스캔 파이프라인**: Claude web_search 5카테고리 순차 실행 — 수 분 소요, 함수 타임아웃 300초급 필요
2. **크론**: 일 1회(스캔) + 주 1회(리포트)
3. **대시보드**: read-only, 요청당 처리 짧음 (아무 무료 호스트나 가능)
4. **상업적 사용 허용** 필수

## 옵션 비교

| 옵션 | 비용 | 파이프라인(수 분 실행) | 크론 | 상업 사용 | 판정 |
|---|---|---|---|---|---|
| Vercel Hobby (현 계획) | $0 | ✅ 300s | 2개, 일 1회, 정밀도 ±59분 | ❌ 금지 | 기술적으론 완벽, ToS 리스크 |
| Vercel Pro | $20/월 | ✅ 800s | 충분 | ✅ | 무료 아님 |
| Netlify Free | $0 | ❌ 동기 10s, 스케줄 함수 30s, 백그라운드 함수(15분)는 유료 플랜 전용 | 스케줄 함수 있음 | ✅ | 파이프라인 불가. 대시보드 호스팅만 적합 |
| Cloudflare Workers Free (OpenNext) | $0 | ⚠️ CPU 10ms/호출(I/O 대기는 미산입이라 이론상 가능하나 여유 없음), Worker 번들 3MiB 제한 | Cron Triggers 무료 | ✅ | Next.js 번들이 3MiB를 넘기 쉬워 위험 |
| Supabase Edge Functions + Supabase Cron | $0 | ⚠️ Free 플랜 wall clock 150s 제한 | pg_cron 무료(전 플랜) | ✅ | 150s로는 스캔이 빠듯 + Deno 재작성 + pptxgenjs 호환 우려 |
| **GitHub Actions(파이프라인) + 무료 호스트(대시보드)** | **$0** | ✅ 사실상 무제한(작업당 최대 6시간) | schedule 트리거 무료 (UTC 기준, 피크 시 10~30분 지연) | ✅ | **권장** |

## 권장안: 파이프라인/대시보드 분리 (Option A)

**파이프라인 → GitHub Actions 스케줄 워크플로**
- `/api/scan`, `/api/weekly`를 API 라우트가 아닌 **Node 스크립트**(`scripts/scan.ts`, `scripts/weekly.ts`)로 작성, `on: schedule` + `workflow_dispatch`로 실행
- Supabase에 직접 쓰고(service role), Resend/Telegram 알림 발송 — 로직은 동일, 배포 위치만 변경
- 타임아웃 제약 소멸(작업당 6시간). private 리포 무료 2,000분/월 중 예상 사용량 ~200분/월(데일리 5분 + 위클리 10분)
- **보안 개선**: 공개 HTTP 엔드포인트가 사라지므로 CRON_SECRET 위협 모델 자체가 축소됨 (수동 트리거용 dispatch 호출만 보호하면 됨)
- 주의: GH Actions 스케줄은 UTC 고정 + 지연 10~30분 가능 → 07:00 KST 목표면 21:30 UTC 등 버퍼를 두고 설정

**대시보드 → Netlify Free** (상업 사용 허용, Next.js 16 지원)
- read-only Server Component 렌더링은 요청당 수백 ms — 10초 제한과 무관
- 수동 스캔 트리거(NEWS-06): 대시보드의 경량 API 라우트가 GitHub `workflow_dispatch` API를 호출 (GITHUB_TOKEN은 서버 env)
- 대안: Cloudflare(번들 3MiB 리스크), 또는 대시보드를 client-side SPA로 바꿔 정적 호스팅(GitHub Pages 등) — 단순화 여지 있으나 현 Next.js 구조 유지 시 Netlify가 최소 변경

**로드맵 영향**
- INFR-01/02(Vercel Cron) → GitHub Actions schedule로 대체
- INFR-03(Fluid Compute) → 불필요해짐 (`/api/health` 검증 라우트도 제거 가능)
- Phase 2 산출물이 API 라우트 → 스크립트로 변경 (공유 lib 구조는 동일)

## 차선책

- **Option B — Vercel Hobby 유지**: 코드 변경 0, 기술적으로 완전 동작. 단 회사 업무 도구를 비상업 약관 플랜에 올리는 컴플라이언스 리스크를 Ben이 감수해야 함
- **Option C — Vercel Pro $20/월**: 가장 단순하고 깔끔하나 무료 아님

## Sources

- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations) — Hobby 300s 기본·최대 (2026-06-19)
- [Vercel Fair Use / Hobby](https://vercel.com/docs/plans/hobby) — 비상업 용도 한정
- [Netlify Functions](https://docs.netlify.com/build/functions/overview/) / [Background Functions](https://docs.netlify.com/build/functions/background-functions/) — 10s 동기, 백그라운드는 유료
- [Netlify Scheduled Functions](https://docs.netlify.com/build/functions/scheduled-functions/) — 30s 제한
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) — free 10ms CPU, 3MiB 번들
- [OpenNext Cloudflare](https://opennext.js.org/cloudflare) — Next.js 16 지원
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits) — free 150s wall clock
- [Supabase Cron](https://supabase.com/docs/guides/cron) — pg_cron 전 플랜 무료
- [GitHub pricing](https://github.com/pricing) / [Actions billing](https://docs.github.com/billing/managing-billing-for-github-actions/about-billing-for-github-actions) — Free 플랜 private 리포 2,000분/월
- [GitHub Actions limits](https://docs.github.com/en/actions/reference/limits) — 스케줄 지연·작업 시간 한도
