---
created: 2026-07-03T15:20:00+09:00
project: ledger-app
summary: 홈 화면에 예산(잔여/퍼센트) 섹션 추가 + 거래별 예산 제외 기능 구현
---

## Session Digest

- 홈 화면에 이번 달 예산 섹션 추가: 잔여 예산 및 항목별(카테고리/계좌) 진행률 바 표시
- 거래 입력/수정 폼에 "이 항목은 예산에서 제외" 체크박스 추가
- exclude_from_budget 플래그가 켜진 거래는 홈/분석 화면의 예산 지출 합계 계산에서 제외되도록 로직 수정
- 홈 화면 예산 카드에 항목별 잔여 금액(남음/초과)과 소진율(%) 표시 추가
- transactions 테이블에 exclude_from_budget 컬럼 추가 마이그레이션 스크립트 작성

## Progress

**완료된 것**
- ✅ 홈 화면에 "이번 달 예산" 섹션 추가 — 전체 잔여 예산 합계 + 예산별 진행률 바/잔여금액/퍼센트 표시 (`src/pages/Home.tsx`)
- ✅ 예산이 없을 때/로딩 중 상태 처리 (안내 문구 표시)
- ✅ 거래 추가/수정 폼에 "이 항목은 예산에서 제외" 체크박스 추가 (지출 타입에서만 노출) (`src/components/AddTransactionModal.tsx`)
- ✅ `Transaction` 타입에 `exclude_from_budget: boolean` 필드 추가 (`src/types/index.ts`)
- ✅ Home.tsx / Analytics.tsx 지출 집계 로직에 `!t.exclude_from_budget` 조건 반영
- ✅ `supabase/schema.sql`에 `exclude_from_budget` 컬럼 반영 (신규 설치 기준)
- ✅ 마이그레이션 스크립트 작성 (`supabase/migrate_add_exclude_from_budget.sql`, `ADD COLUMN IF NOT EXISTS`로 재실행 안전)
- ✅ lint / type-check / build 전부 통과 확인 후 커밋·푸시 완료

**안된 것**
- ⬜ **마이그레이션 SQL이 실제 프로덕션 Supabase에 아직 미실행** (아래 Watch Out 참조)
- ⬜ 마이그레이션 실행 후 실 데이터로 종단 검증(체크박스 저장 → 홈/Analytics 반영) 미완료
- ⬜ 전 세션부터 이월: schema_version 갱신, Accounts 페이지 진입 경로 없음, Analytics 카테고리 드릴다운 등 (변동 없음)

## Next Steps

1. **[최우선] Supabase SQL Editor에서 `supabase/migrate_add_exclude_from_budget.sql` 실행** — 실행 전까지는 체크박스를 켠 채 거래를 저장하면 프로덕션에서 컬럼 부재로 실패함
2. 마이그레이션 실행 후, 실 데이터로 체크박스 on/off 거래를 만들어 홈 "이번 달 예산" 섹션과 Analytics 진행률에 정상 반영되는지 종단 확인
3. (선택) 예산 섹션에 카테고리형/계좌형 예산이 섞여 있을 때 표시 우선순위·정렬 기준 점검
4. (선택, 전 세션 이월) Accounts 페이지 nav 진입 경로 추가, schema_version 1→2 갱신

## Blockers

없음 — 코드 작업 자체는 막힘 없이 완료됨. 다만 마이그레이션 미실행 상태이므로 프로덕션에서 관련 기능을 실사용하기 전에 반드시 사용자가 SQL을 실행해야 함 (작업 진행을 막는 블로커는 아니지만 배포 전 필수 선행 조건).

## Watch Out

- **Supabase 마이그레이션 미실행**: `supabase/migrate_add_exclude_from_budget.sql`이 아직 실제/프로덕션 Supabase DB에 적용되지 않았음. 이 상태에서 체크박스를 체크한 채 거래를 저장하면 `exclude_from_budget` 컬럼이 없어 insert/update가 실패한다. 다음 세션 시작 시 가장 먼저 실행 여부부터 확인할 것.
- **Home.tsx / Analytics.tsx 예산 계산 로직 중복**: 지출 집계(`expenseByCategory`, `expenseByAccount`, budget별 `spent`/`ratio` 계산)가 두 파일에 거의 동일하게 복사되어 있음. 한쪽만 고치고 다른 쪽을 빠뜨리기 쉬우므로, 예산 관련 로직(색상 임계치 80%/100%, `exclude_from_budget` 필터, transfer 제외 등)을 수정할 때는 반드시 **양쪽 파일을 함께** 확인/수정할 것. 공통 유틸로 뽑아내는 리팩터링을 고려해볼 만함.
- 예산 지출 집계는 기존과 동일하게 `type === 'expense'`만 카운트 — `exclude_from_budget`은 그 위에 추가된 필터일 뿐, transfer/income은 여전히 미포함.
- `exclude_from_budget`은 지출(expense) 타입에서만 UI/로직상 의미가 있음 — 수입/이체 저장 시에는 항상 `false`로 강제 저장됨(`AddTransactionModal.tsx`).
- 신규 컬럼은 `NOT NULL DEFAULT FALSE`라 기존 행에는 영향 없음 — 하지만 마이그레이션 실행 전에는 컬럼 자체가 없으므로 위 블로킹 이슈가 발생.

## Files Touched

- `src/pages/Home.tsx` — "이번 달 예산" 섹션 추가, 예산별 지출 집계 로직
- `src/pages/Analytics.tsx` — 지출 집계에 `exclude_from_budget` 필터 반영
- `src/components/AddTransactionModal.tsx` — "예산에서 제외" 체크박스 UI 및 저장 로직
- `src/types/index.ts` — `Transaction.exclude_from_budget` 필드 추가
- `supabase/schema.sql` — `exclude_from_budget` 컬럼 반영
- `supabase/migrate_add_exclude_from_budget.sql` — 신규 마이그레이션 (미실행 상태)
