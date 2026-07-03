---
created: 2026-07-03T16:10:00+09:00
project: ledger-app
summary: 예산에 시작일/종료일 직접 지정 기능 추가 + Home/Analytics 예산 집계 로직 공용화
---

## Session Digest

- 예산(Budget) 데이터 모델을 `month`(YYYY-MM) 단일 필드에서 `start_date`/`end_date`(YYYY-MM-DD) 임의 기간 지정 방식으로 교체 — 2주짜리 예산, 월 경계를 넘는 예산 등도 표현 가능해짐
- 설정 화면 예산 폼에 시작일/종료일 date picker 추가(기본값은 선택 월의 1일~말일, 자유 조정 가능), 예산 목록에도 적용 기간 표시
- `getBudgetsByMonth`를 정확한 월 일치가 아니라 기간이 겹치는 예산을 모두 반환하도록 로직 변경
- `Home.tsx`/`Analytics.tsx`에 중복돼 있던 예산 지출 집계·데일리 페이스 계산 로직을 `src/utils/budget.ts`로 공용화(`computeBudgetSpent`, `computeBudgetPace`, `budgetProgressColor`); 데일리 페이스는 달력 월이 아닌 예산 자체 기간 기준으로 재계산
- 기존 월별 예산 데이터를 백필하는 `supabase/migrate_add_budget_date_range.sql` 마이그레이션 추가(month 컬럼은 보존하되 NOT NULL 해제)

## Progress

**완료된 것**
- ✅ Budget의 `month`(YYYY-MM) 필드를 `start_date`/`end_date`(YYYY-MM-DD) 필드로 교체해 임의 기간(2주 예산, 월 경계를 넘는 예산 등) 지정 가능하도록 변경 (`src/types/index.ts`, `src/db/index.ts`)
- ✅ 설정 화면 예산 폼에 시작일/종료일 date picker 추가 — 기본값은 선택된 월의 1일~말일이며 자유롭게 조정 가능 (`src/pages/Settings.tsx`)
- ✅ 예산 목록에 적용 기간(시작일~종료일) 표시 추가
- ✅ `getBudgetsByMonth`를 "정확한 월 일치"에서 "기간이 겹치는 예산 전체 반환" 방식으로 변경 (`src/db/index.ts`)
- ✅ Home.tsx/Analytics.tsx에 중복돼 있던 예산 지출 집계·데일리 페이스 계산 로직을 `src/utils/budget.ts`로 공용화 (`computeBudgetSpent`, `computeBudgetPace`, `budgetProgressColor`) — 이전 세션 HANDOFF에서 지적된 "양쪽 파일 동시 수정 필요" 리스크를 해소
- ✅ `supabase/migrate_add_budget_date_range.sql` 마이그레이션 작성 (기존 월별 예산을 해당 월 1일~말일로 백필, `month` 컬럼은 보존하되 NOT NULL만 해제)
- ✅ `supabase/schema.sql` 신규 설치 기준 스키마 반영
- ✅ lint / type-check / build 전부 통과 확인 후 커밋(`4ddc549`)·푸시 완료

**안된 것**
- ⬜ **마이그레이션 2개 모두 실제 프로덕션 Supabase DB에 미실행** — `migrate_add_exclude_from_budget.sql`(전 세션분)과 `migrate_add_budget_date_range.sql`(이번 세션분) 둘 다 대기 중
- ⬜ 마이그레이션 실행 후 실 데이터로 종단 검증(예산 생성/수정, 기간 겹침 조회, 데일리 페이스 계산) 미완료
- ⬜ 데일리 페이스 계산 기준이 "달력 월"에서 "예산 자체 기간"으로 바뀐 것에 대한 실사용 검증(경계값 케이스 포함) 미완료
- ⬜ 전전 세션부터 이월: schema_version 갱신, Accounts 페이지 진입 경로 없음, Analytics 카테고리 드릴다운 등 (변동 없음)

## Next Steps

1. **[최우선] Supabase SQL Editor에서 마이그레이션 2개를 순서대로 실행**
   1) `supabase/migrate_add_exclude_from_budget.sql` (전 세션분, 아직 미실행)
   2) `supabase/migrate_add_budget_date_range.sql` (이번 세션분)
   → 실행 전까지는 예산 생성/수정 자체가 컬럼 부재로 실패함
2. 마이그레이션 실행 후 실 데이터로 예산 생성/수정, 시작일~종료일 자유 조정, 기간이 겹치는 예산 여러 개 동시 표시 여부를 종단 확인
3. 데일리 페이스 문구가 "예산 기간" 기준으로 정확히 계산되는지 확인 (특히 오늘 날짜가 기간 시작 전/종료 후인 경우, 기간이 1개월보다 짧거나 월 경계를 넘는 경우)
4. (선택) 오래된 로컬 백업 JSON을 가진 경우 가져오기(import) 시 `month` 필드만 있고 `start_date`/`end_date`가 없는 데이터를 어떻게 처리할지 결정 (Watch Out 참조)
5. (선택, 전전 세션 이월) Accounts 페이지 nav 진입 경로 추가, schema_version 갱신

## Blockers

없음 — 코드 작업 자체는 막힘 없이 완료됨. 다만 마이그레이션 2건이 모두 미실행 상태이므로, 프로덕션에서 예산 관련 기능(생성/수정 포함)을 실사용하기 전에 반드시 사용자가 두 SQL을 순서대로 실행해야 함 (배포 전 필수 선행 조건).

## Watch Out

- **[최우선] Supabase 마이그레이션이 2개나 밀려 있음**: `migrate_add_exclude_from_budget.sql`(전 세션분)과 `migrate_add_budget_date_range.sql`(이번 세션분) 모두 실제 프로덕션 DB에 미적용 상태. 이번 세션 변경으로 문제가 더 심각해졌다 — 이 상태에서는 거래의 "예산 제외" 체크박스뿐 아니라 **예산 생성/수정 자체**가 `start_date`/`end_date` 컬럼 부재로 실패한다. 다음 세션 시작 시 가장 먼저 두 마이그레이션의 실행 여부를 확인할 것.
- **오래된 JSON 백업 가져오기(import) 호환성 문제**: `month` 필드 기반이던 구버전 백업 JSON을 가져오면 `start_date`/`end_date`가 없어 예산 데이터가 깨지거나 가져오기 자체가 실패할 수 있다. import 로직에 `month`→기간 변환용 백필 처리가 없다면 추가 검토가 필요함.
- **데일리 페이스 계산 기준 변경**: 예산 자체 기간 기준으로 바뀌었으므로, 기간이 매우 짧거나(예: 1주) 월 경계를 넘는 예산에서 페이스 문구가 직관과 다르게 나올 수 있음 — 실 데이터로 경계값 확인 필요.
- `getBudgetsByMonth`가 이제 "정확한 월 일치"가 아니라 "기간이 겹치는 예산 전체"를 반환하므로, 한 달에 예산이 여러 개 겹쳐 보일 수 있음 — 홈/Analytics 화면에서 중복/우선순위 표시가 의도대로 동작하는지 확인할 것.
- `month` 컬럼은 삭제하지 않고 보존(NOT NULL만 해제)했으므로 기존 코드에서 `month`를 참조하는 부분이 남아있지 않은지(특히 export/백업 관련 코드) 재확인 권장.

## Files Touched

- `src/types/index.ts` — Budget의 `month` → `start_date`/`end_date` 필드 교체
- `src/db/index.ts` — `getBudgetsByMonth`를 기간 겹침 조회로 변경
- `src/pages/Settings.tsx` — 예산 폼에 시작일/종료일 date picker 추가, 목록에 적용 기간 표시
- `src/pages/Home.tsx` — 중복 예산 집계/페이스 로직 제거, `src/utils/budget.ts` 유틸 사용으로 교체
- `src/pages/Analytics.tsx` — 동일하게 `src/utils/budget.ts` 유틸 사용으로 교체
- `src/utils/budget.ts` — 신규 공용 유틸 (`computeBudgetSpent`, `computeBudgetPace`, `budgetProgressColor`)
- `src/utils/format.ts` — `daysInMonth` 헬퍼 추가
- `supabase/schema.sql` — 신규 설치 기준 스키마 반영
- `supabase/migrate_add_budget_date_range.sql` — 신규 마이그레이션 (미실행 상태)
