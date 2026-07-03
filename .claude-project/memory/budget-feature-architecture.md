---
name: budget-feature-architecture
description: 월별 예산(Budget) 기능의 데이터 모델과 진행률 추적 로직 (Home.tsx + Analytics.tsx 중복 구현 포함)
type: project
created: 2026-07-03
---

Budget은 `category_id` / `account_id` 중 하나만 설정되거나 둘 다 null(자유 항목)인
상호 배타적 구조다. `name` 필드는 카테고리/계좌 선택 시 자동 채워지지만 항상 편집 가능.

- Settings.tsx: CRUD (연결 대상 3버튼 토글 — 자유 항목/카테고리/계좌 — 로 linkType 선택,
  선택된 타입에 따라 category_id 또는 account_id만 저장)
- 진행률 표시는 **Home.tsx와 Analytics.tsx 두 곳에 중복 구현**되어 있다. 두 파일 모두
  동일한 패턴의 `expenseByCategory`/`expenseByAccount` Map을 각자 useMemo로 만들고,
  category_id 있으면 해당 카테고리 지출 합산, account_id 있으면 해당 계좌 지출 합산과
  비교한다. **이체(transfer)는 지출 집계에서 제외** — `type === 'expense'`인 거래만 카운트한다.
- 지출 집계에 새 필터/제외 규칙을 추가할 때(예: exclude_from_budget) **Home.tsx와
  Analytics.tsx 양쪽의 expenseByCategory/expenseByAccount 계산을 모두 수정해야 한다**.
  공용 훅으로 추출되어 있지 않으므로 한쪽만 고치면 두 화면의 예산 진행률이 서로 달라지는
  버그가 생긴다. (실제로 exclude_from_budget 추가 시 두 파일을 동시에 수정했다.)
- `exclude_from_budget` (Transaction 필드, boolean): 체크되면 해당 거래는 두 화면의
  expenseByCategory/expenseByAccount 집계에서 모두 빠진다. AddTransactionModal에서
  **expense 타입일 때만** 체크박스가 노출되고, income/transfer 타입은 항상
  `exclude_from_budget: false`로 강제 저장된다 — 예산은 지출(expense)만 추적하므로
  수입/이체에는 이 개념 자체가 적용되지 않기 때문.
- Home.tsx의 예산 카드는 Analytics.tsx보다 표시 정보가 더 많다: 전체 잔여 예산 합계
  (totalLimit - totalSpent)와 항목별 잔여 금액(남음/초과 텍스트) + 소진율(%)까지 표시한다.
  Analytics.tsx는 진행률 바만 표시하는 더 단순한 버전이므로, 두 화면 중 하나를 기준으로
  기능을 맞출 때 표시 항목 차이를 확인할 것.
- 진행률 색상 임계치: 80% 미만 초록(#059669), 80~100% 주황(#D97706), 100% 이상 빨강(#EF4444)
- budgets 테이블은 최초 schema.sql에 존재했지만 실제로 생성되지 않은 프로젝트도 있었음 —
  마이그레이션은 `CREATE TABLE IF NOT EXISTS`부터 시작해야 함 ([[supabase-migration-pattern]] 참고,
  단 이 경우는 컬럼 추가가 아니라 테이블 자체 부재였던 케이스).

**Why:** 사용자가 "월 총예산이 아니라 여러 항목(생활비/취미예산/비상금 등)으로 나눠서" 요청했고,
이후 대화에서 계좌 연결도 필요하다고 확장됨 (계좌명과 항목명이 우연히 같아서 발견). 이후
"예산을 설정에서만 확인할 수 있어 찾기 어렵다"는 피드백으로 홈 화면에도 동일한 진행률 UI가
추가되면서 로직이 두 파일에 중복됐고, 곧이어 "특정 거래는 예산 계산에서 빼고 싶다"는 요청으로
exclude_from_budget이 추가되며 두 파일을 동시에 고쳐야 하는 상황이 실제로 발생했다.
**How to apply:** 예산 관련 기능을 추가로 확장할 때 category_id/account_id 상호배타 원칙을 유지하고,
지출 집계 로직은 항상 `type === 'expense'` 필터를 기준으로 한다. 집계 로직(필터, 제외 규칙 등)을
바꿀 때는 반드시 Home.tsx와 Analytics.tsx 양쪽에서 expenseByCategory/expenseByAccount를 모두
검색해서 함께 수정할 것 — 가능하면 다음 변경 시 공용 훅(예: useBudgetSpendMaps)으로 추출하는 것을
고려한다. 새로운 거래 필드가 예산 계산에만 영향을 줘야 한다면 AddTransactionModal에서 type이
'expense'일 때만 UI를 노출하고 그 외 타입은 기본값(false 등)으로 강제 저장한다.
