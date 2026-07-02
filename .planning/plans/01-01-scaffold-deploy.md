# Plan 01-01: Scaffold & Deploy

**Phase**: 1 (Foundation)
**Requirements**: INFR-03
**Goal**: A Next.js 16 app deployed on Vercel with Fluid Compute verified, fonts/theme in place, and all env vars wired.
**Depends on**: Nothing (first plan)

## Tasks

### 1. Project scaffold
- `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir` (Next.js 16.2.x, React 19, Turbopack default)
- TypeScript strict mode 확인 (`tsconfig.json` — create-next-app 기본값이지만 `strict: true` 명시 검증)
- Prettier + prettier-plugin-tailwindcss 설정

### 2. Dependencies
```bash
npm install @supabase/supabase-js @anthropic-ai/sdk resend grammy pptxgenjs
npm install zod date-fns @react-email/components lucide-react
npx shadcn@latest init
```
버전 기준: STACK.md (2026-07-02 재검증 핀). zod는 4.x — `@anthropic-ai/sdk`의 zod 헬퍼 호환 여부는 Phase 2에서 확인.

### 3. Design foundation
- `next/font/google`으로 Playfair Display(헤딩) + DM Sans(본문) 로드
- Tailwind 4 CSS-first 설정(`globals.css`)에 브랜드 토큰 정의: Saffron `#E8732A`, Teal `#1A6B8A`, Warm White `#FFFDF9`
- 루트 페이지: 에디토리얼 스타일 플레이스홀더 (프로젝트명 + "대시보드 준비 중")

### 4. Vercel deploy + Fluid Compute
- Vercel 프로젝트 생성, main 브랜치 연결
- **Project Settings > Functions에서 Fluid Compute 활성화** (프로젝트 킬러 — Phase 2 이전 필수)
- 검증용 라우트 `/api/health`: `export const maxDuration = 300;` 선언 + 15초 sleep 후 200 응답 → 프로덕션에서 타임아웃 없이 완료되는지 확인 (Hobby 기본 10초 제한을 넘겨야 검증됨)

### 5. Environment variables
`.env.local` + Vercel 환경변수 동시 등록:
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`, `NOTIFICATION_EMAIL`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `CRON_SECRET` (Phase 2에서 사용하지만 지금 발급)
- `.env.example` 커밋 (값 없이 키만)

## Done when
- [ ] 프로덕션 URL에서 루트 페이지가 브랜드 폰트/컬러로 렌더링됨
- [ ] `/api/health`가 15초 이상 실행 후 정상 응답 (Fluid Compute 검증)
- [ ] 모든 env var가 Vercel과 .env.local에 존재, `.env.example` 커밋됨
