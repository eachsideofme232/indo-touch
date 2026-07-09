# Supabase 공유/격리 분석 — digda ↔ indo-touch

**Researched:** 2026-07-02
**Question:** digda와 Supabase를 공유 중인데 격리되어 있는지, 별도로 쓰는 데 이슈 없는지. 비용 절감 위해 하나로 합쳐 쓸 수 있는지.
**Confidence:** HIGH (MCP로 실제 프로젝트 상태 확인)

## 현재 상태 (사실)

| 프로젝트 | ref | 용도 | Auth | 상태 |
|---|---|---|---|---|
| **Tarae = digda** | wbnlgsianlabbsozsvqo | SaaS (profiles/projects/usage/waitlist + auth.users) | ✅ 사용 | ACTIVE |
| **indo-touch** | evyhsnfmpgvouhxbufgs | 시장 인텔리전스 (news_items/consumer_voices/weekly_reports) | ❌ 미사용(단일 사용자) | ACTIVE |
| promo-hub | czczrmlpcknxgolginjq | (별건) | — | INACTIVE |

- **조직 W2Q는 Pro 플랜** ($25/월). 무료 아님.
- 현재 둘은 **별개 프로젝트** → DB, anon/service 키, Auth, 스토리지가 전부 물리적으로 분리됨 = **최대 격리 상태**.

## 비용: 통합하면 ~$10/월 절감 (실측)

Pro 조직은 프로젝트마다 컴퓨트 인스턴스가 붙고, 기본 $25에 컴퓨트 크레딧 $10이 포함된다. get_cost 실측:
- **indo-touch 생성 *전*: 새 프로젝트 비용 $0/월** (포함 크레딧이 첫 추가 프로젝트를 커버).
- **indo-touch 생성 *후*: 새 프로젝트 비용 $10/월** (크레딧이 소진됨).

즉 이 조직에서 **활성 프로젝트를 하나 늘리면 ~$10/월**이 든다. indo-touch를 별도 프로젝트로 유지하는 것이 실질 ~$10/월(=연 $120)의 비용이거나, 최소한 다른 프로젝트(promo-hub 재개 등)를 무료로 올릴 크레딧 슬롯을 잡아먹고 있다.

**→ 통합하면 이 ~$10/월을 절감한다.** (정확히 어느 프로젝트가 크레딧으로 커버되는지는 대시보드 Billing의 프로젝트별 청구 라인에서 확인 가능 — indo-touch 라인이 $0인지 $10인지.)

## 통합 시 공유되는 것 (격리 불가 항목)

하나의 프로젝트에 두 앱을 넣으면 다음은 **공유**되며 스키마/RLS로도 분리 불가:

1. **API 키 (anon + service_role)** — 가장 큰 리스크.
   - service_role 키는 **모든 RLS를 우회**한다. indo-touch 파이프라인(GitHub Actions/서버)이 든 service_role 키로 digda의 user 데이터(profiles, auth.users)까지 읽고 쓸 수 있다. 반대도 성립. 소유자가 동일(Ben)하면 신뢰는 되지만, **키 하나 유출 시 두 앱 데이터가 동시에 노출**된다.
   - ⚠️ **즉시 문제**: 현재 indo-touch 테이블에는 `anon read` RLS 정책이 걸려 있다. 통합하면 digda의 **공개 anon 키**(브라우저에 박히는 키)로 누구나 REST API로 `news_items`를 조회할 수 있다 → **시장 인텔리전스 유출**.
2. **Auth** — digda는 실제 로그인 유저가 있고 indo-touch는 Auth 미사용. 같은 auth.users 풀을 공유하게 됨.
3. **Storage** — 버킷 이름은 프로젝트 전역. `reports` 버킷이 digda 버킷과 충돌하지 않아야 함(현재는 무충돌).
4. **컴퓨트/DB 용량/egress** — 한 인스턴스가 둘을 서빙. indo-touch는 단일 사용자·저빈도라 실질 경합은 없음.

## 안전 통합안 (통합을 택할 경우)

두 가지 변경으로 위 anon 유출을 막고 논리적 격리를 유지한다:

1. **전용 스키마 `indo` 사용** — `public`이 아닌 `indo` 스키마에 3개 테이블을 두고, Supabase API 설정의 "Exposed schemas"에서 **제외**한다. 그러면 REST/GraphQL API로는 아예 접근 불가 → digda의 anon 키로 절대 못 읽음.
2. **`anon read` 정책 제거 + 대시보드는 service_role 서버 렌더** — indo-touch 대시보드는 Server Component라 브라우저에서 Supabase를 직접 부를 일이 없다. 서버에서 service_role(또는 `indo` 스키마 전용 접근)로 읽으면 된다. 단일 사용자라 이 방식이 오히려 더 깔끔.
3. `reports` 버킷 이름 충돌 여부만 확인.

남는 공유 표면(service_role 키 1개가 두 앱 지배 + 컴퓨트 공유)은 동일 소유자·저트래픽 전제에서 수용 가능.

## 권장

활성 프로젝트당 ~$10/월이 실측되므로 **통합에 비용 이점이 있다.** digda가 Auth·실유저를 쓰는 만큼 아래 안전 통합안으로 진행:

1. digda(Tarae) 프로젝트에 **`indo` 전용 스키마** 생성, 3개 테이블을 그리로 이전. API "Exposed schemas"에서 제외.
2. indo-touch 테이블의 `anon read` 정책 제거. 대시보드는 Server Component에서 **service_role**로 읽기 (lib/supabase.ts에서 anon 클라이언트 제거, 서버 전용 클라이언트만 유지).
3. `reports` 스토리지 버킷을 digda 프로젝트에 생성(이름 충돌 없음 확인).
4. 현재의 별도 indo-touch 프로젝트(evyhsnfmpgvouhxbufgs)는 이전 완료 후 삭제 → $10/월 절감 확정.
5. env: indo-touch가 쓰는 SUPABASE_URL/키를 digda 프로젝트 것으로 교체. **service_role 키가 두 앱 데이터를 모두 지배**하므로 GitHub Actions secret 등 키 관리 주의.

대안: 비용보다 격리를 우선한다면 현행 분리 유지($10/월 지불). 단일 소유자·저트래픽이라 통합 리스크는 위 3단계로 충분히 통제 가능하므로 통합을 권장.

## 미해결

- dedup 스모크 테스트(unique 제약 동작 확인)는 세션 중 Supabase MCP 권한 스트림이 반복적으로 끊겨 미실행. unique 제약은 Postgres가 강제하므로 리스크는 낮음. Phase 2 시작 시 재확인.
