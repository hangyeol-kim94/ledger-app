---
name: category-2level-hierarchy
description: 카테고리 2단계 계층(부모/자식) 설계 + type(income/expense) 필드와 노출 지점별 필터링 불변식
type: project
created: 2026-05-27
updated: 2026-07-03
---

categories 테이블의 parent_id 자기 참조 컬럼으로 Level1과 Level2(소분류)를 관리한다. 마이그레이션 시 구형 카테고리는 DELETE 대신 archived=true 처리해 기존 거래 FK 무결성을 유지했다.

**2026-07-03: Category에 `type: 'income' | 'expense'` 필드 추가.** 최상위 카테고리는 지출 그룹(식생활·주거·교통·건강·쇼핑·여가문화·교육·통신·금융·사교, type='expense')과 수입 그룹('월급/수입' 하나, type='income', 자식으로 금융수입/용돈/상여금/더치페이/앱테크/사업수입/기타)으로 나뉜다. 자식 카테고리는 부모의 type을 그대로 상속해 저장한다(insert 시 parentRow.type 복사, 별도 계산 없음).

**불변식: 카테고리 목록을 노출/선택하는 모든 지점은 반드시 type으로 필터링해야 한다.** 하나라도 빠뜨리면 거래 추가 화면이나 설정 화면에서 수입/지출 카테고리가 뒤섞여 나타난다. 현재 필터링이 필요한 지점 4곳:
- AddTransactionModal의 parentCats: 현재 선택된 거래 type과 동일한 카테고리만
- Settings 카테고리 관리(activeCats/archivedCats/새 카테고리 생성): catManageType 탭 상태 기준
- Settings의 activeCatsForBudget(예산 연결 카테고리 선택): **항상 'expense'로 하드코딩** — 예산은 지출만 집계하므로(computeBudgetSpent가 income 거래를 세지 않음) UI 토글과 무관하게 고정
- Transactions 필터의 카테고리 드롭다운: filterType(수입/지출 칩)과 동기화

**Why:** 평면 목록은 세부 분류가 많아질수록 모바일 선택 UI가 복잡해지므로 부모 선택 → 자식 펼침 방식을 채택했고, 수입/지출 분리 후에는 타입이 다른 카테고리가 섞이면 사용자가 지출 거래에 수입 카테고리를 고르는 등 데이터 무결성이 깨진다.
**How to apply:** 새 카테고리 노출 지점을 추가할 때는 반드시 위 4곳과 동일하게 type 필터를 적용할지 검토한다. 예산처럼 의도적으로 한 타입만 써야 하는 경우 UI 상태와 별개로 고정 필터임을 주석으로 남긴다. 새 소분류 추가 시 DB INSERT(부모 type 상속) + categoryIcons.tsx ICON_MAP에 한국어 이름 키 추가. [[supabase-migration-pattern]]
