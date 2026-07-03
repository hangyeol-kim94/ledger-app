---
name: budget-feature-architecture
description: 예산 기간(start_date/end_date) 데이터 모델과 공용 집계 유틸(computeBudgetSpent/computeBudgetPace) — Home/Analytics 중복 해소됨
type: project
created: 2026-07-03
updated: 2026-07-03
---

Budget은 `category_id` / `account_id` 중 하나만 설정되거나 둘 다 null(자유 항목)인
상호 배타적 구조다. `name` 필드는 카테고리/계좌 선택 시 자동 채워지지만 항상 편집 가능.

- Settings.tsx: CRUD (연결 대상 3버튼 토글 — 자유 항목/카테고리/계좌 — 로 linkType 선택,
  선택된 타입에 따라 category_id 또는 account_id만 저장). BudgetForm에 시작일/종료일
  date picker가 있고 목록에도 `formatDateRangeKorean`으로 적용 기간이 표시된다.
- **예산 기간은 `month`(YYYY-MM) 대신 `start_date`/`end_date`(YYYY-MM-DD, 양끝 포함)로
  표현한다.** 임의 기간(2주 예산, 월 경계를 넘는 예산 등)을 지정할 수 있다. DB의 `month`
  컬럼은 완전히 제거되지 않고 보존됨 — `supabase/migrate_add_budget_date_range.sql`이
  NOT NULL 제약만 해제했다. 앱 코드에서는 더 이상 `month`를 참조하지 않는다.
- `getBudgetsByMonth(month)`는 이름과 달리 **정확한 월 일치가 아니라 기간이 겹치는 예산
  전체**를 반환한다 (`start_date <= 그달말일 AND end_date >= 그달1일`). 한 달을 조회해도
  그 달과 일부만 겹치는 예산(예: 전월 말~이번달 초 2주 예산)까지 함께 나올 수 있다 —
  Home/Analytics에서 이 겹침 의미를 전제로 화면을 구성해야 한다.
- **예산 진행률/지출 집계 로직은 `src/utils/budget.ts`에 공용화되어 있다**:
  `computeBudgetSpent(budget, transactions)`, `computeBudgetPace(budget, spent, todayStr)`,
  `budgetProgressColor(ratio)`. 과거에는 Home.tsx/Analytics.tsx 각각에
  `expenseByCategory`/`expenseByAccount` Map을 만들어 중복 구현했었지만 (아래 "과거 이력"
  참고), 이 유틸 추출로 해소되었다 — **새 필터/제외 규칙을 추가할 때는 이제 budget.ts
  한 곳만 수정하면 Home/Analytics 양쪽에 자동 반영된다.**
  - `computeBudgetSpent`: 거래의 `date`가 `[start_date, end_date]` 구간 안에 있고
    `type === 'expense' && !exclude_from_budget`인 것만 category_id 또는 account_id로
    매칭해 합산. 자유 항목(둘 다 null)이면 `null` 반환.
  - `computeBudgetPace`: **달력 월이 아니라 예산 자체의 start_date~end_date 기간**을
    기준으로 일할 계산해 "오늘까지 쓸 수 있었던 금액 - 실제 지출"을 반환. Home.tsx에서
    "OOO원 더 사용할 수 있어요"/"OOO원 초과했어요" 텍스트에 쓰인다. Analytics.tsx는
    페이스 계산을 쓰지 않고 `computeBudgetSpent` + `budgetProgressColor`만으로 진행률
    바만 표시 — 두 화면의 표시 정보 차이(Home이 더 많음)는 여전히 남아있다.
- `exclude_from_budget` (Transaction 필드, boolean): 체크되면 해당 거래는
  `computeBudgetSpent` 집계에서 빠진다. AddTransactionModal에서 **expense 타입일 때만**
  체크박스가 노출되고, income/transfer 타입은 항상 `exclude_from_budget: false`로 강제
  저장된다.
- 진행률 색상 임계치(`budgetProgressColor`): 80% 미만 초록(#059669), 80~100% 주황(#D97706),
  100% 이상 빨강(#EF4444).
- budgets 테이블은 최초 schema.sql에 존재했지만 실제로 생성되지 않은 프로젝트도 있었음 —
  마이그레이션은 `CREATE TABLE IF NOT EXISTS`부터 시작해야 함 ([[supabase-migration-pattern]] 참고,
  단 이 경우는 컬럼 추가가 아니라 테이블 자체 부재였던 케이스).

### 과거 이력 (해소됨)

이전에는 진행률 표시가 Home.tsx와 Analytics.tsx 두 곳에 중복 구현되어 있어서,
`exclude_from_budget` 추가 같은 변경 시 두 파일을 동시에 고쳐야 했고 한쪽만 고치면 두
화면의 예산 진행률이 서로 달라지는 버그가 났었다. `start_date`/`end_date` 전환 작업
때 `src/utils/budget.ts`로 공용 추출하면서 이 문제는 해결되었다.

**Why:** 사용자가 "예산에 시작일/종료일을 직접 지정하고 싶다"(2주짜리 예산, 월 경계를 넘는
예산 등)고 요청해 `month` 필드를 날짜 구간으로 교체했다. 이 작업을 하는 김에, 예전부터 메모에
경고돼 있던 Home/Analytics 집계 로직 중복 문제도 공용 유틸(`src/utils/budget.ts`)로 추출해
함께 해소했다.
**How to apply:** 예산 집계 로직을 바꿀 때는 `src/utils/budget.ts`만 수정한다 — 더 이상
Home.tsx/Analytics.tsx를 각각 찾아 고칠 필요 없다. 새 예산 관련 화면을 만들 때도
`expenseByCategory`/`expenseByAccount`를 직접 다시 만들지 말고 `computeBudgetSpent`/
`computeBudgetPace`/`budgetProgressColor`를 재사용할 것. `getBudgetsByMonth`를 호출하는
곳에서는 반환값이 "그 달과 정확히 일치"가 아니라 "겹치는 기간"이라는 점을 항상 염두에 두고,
화면에 예산의 실제 적용 기간(`start_date`~`end_date`)을 함께 보여줘 사용자가 혼동하지 않게
한다 (Settings.tsx의 `formatDateRangeKorean` 패턴 참고). category_id/account_id 상호배타
원칙과 `type === 'expense'` 기준 필터는 계속 유지한다.
