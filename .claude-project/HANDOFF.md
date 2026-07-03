---
created: 2026-07-03T16:40:00+09:00
project: ledger-app
summary: 카테고리에 수입/지출 type 필드 추가로 픽커 분리 + 수입 세부 카테고리 7종 추가
---

## Session Digest

카테고리에 수입/지출을 구분하지 않아 예산·거래 필터가 뒤섞이던 문제를 해결하기 위해, `Category`에 `type`(income/expense) 필드를 추가하고 거래 추가 모달·거래내역 필터·설정의 카테고리 관리 화면에서 현재 타입에 맞는 카테고리만 노출하도록 필터링했다(예산 연결은 지출 타입만 노출). 아울러 '월급/수입' 하위에 금융수입/용돈/상여금/더치페이/앱테크/사업수입/기타 세부 카테고리와 아이콘을 추가했다. 기존 라이브 Supabase 데이터에는 스키마 변경이 자동 반영되지 않으므로, 사용자가 직접 두 마이그레이션 SQL을 Supabase SQL Editor에서 순서대로 실행해야 한다.

## Progress

**완료**
- `Category` 타입에 `type: 'income' | 'expense'` 필드 추가 (`src/types/index.ts`)
- `AddTransactionModal.tsx`: 거래 추가 시 선택된 타입에 맞는 카테고리만 노출
- `Settings.tsx`: 카테고리 관리 화면에 지출/수입 탭 추가 + 예산 폼 카테고리 선택은 지출 타입만 노출
- `Transactions.tsx`: 필터 칩(수입/지출) 선택 시 카테고리 드롭다운 동기화
- `src/db/index.ts`, `src/utils/categoryIcons.tsx`: 신규 설치용 기본 시드에 '월급/수입' 최상위 카테고리 + 하위 7개(금융수입/용돈/상여금/더치페이/앱테크/사업수입/기타) 및 아이콘 매핑 추가
- `supabase/schema.sql`: `categories.type` 컬럼 정의 추가 (신규 설치 스키마용)
- 마이그레이션 SQL 2건 작성 및 방어 로직 보강: `supabase/migrate_add_category_type.sql`, `supabase/migrate_add_income_subcategories.sql`(부모 카테고리 부재 시 자동 생성하도록 수정 완료 — commit `ef6587c`)
- lint / typecheck / build 전부 통과, 커밋 2건 push 완료 (`a831147`, `ef6587c`)

**미완료**
- **라이브 Supabase DB에 마이그레이션 미적용** — 로컬 시드 변경은 신규 설치에만 적용되고, 기존 운영 데이터에는 SQL을 직접 실행해야 반영됨. 아직 실행 안 됨.
- 마이그레이션 적용 후 실제 화면(거래 추가/설정/거래내역 필터)에서 수입 카테고리가 정상 노출되는지 라이브 DB 기준 검증 안 됨

## Next Steps

1. **[최우선] Supabase SQL 마이그레이션 실행 — 반드시 이 순서로:**
   - ① `supabase/migrate_add_category_type.sql` 먼저 실행 (categories.type 컬럼 추가 + 거래 이력 기반 백필)
   - ② `supabase/migrate_add_income_subcategories.sql` 그다음 실행 ('월급/수입' 부모가 없으면 자동 생성 후 자식 7개 삽입)
   - Supabase 대시보드 > SQL Editor에서 직접 실행 (사용자가 수동으로 해야 함)
2. 마이그레이션 실행 후 라이브 앱에서 거래 추가 모달 / 설정 카테고리 관리 / 거래내역 필터가 수입·지출 타입별로 올바르게 분리되는지 직접 확인
3. 필요하면 Settings 카테고리 관리 화면에서 기존 카테고리의 type을 수동 재조정(현재 UI는 생성 시점에만 type을 지정하고, 생성 후 타입 변경 UI는 없음 — 백필 결과가 틀렸다면 Supabase에서 직접 UPDATE 필요)

## Blockers

없음 — 이전에 발견됐던 "'월급/수입' 부모 카테고리가 라이브 DB에 없으면 두 마이그레이션이 에러 없이 조용히 아무 것도 하지 않는" 문제는 `migrate_add_income_subcategories.sql`에 self-healing INSERT를 추가해 해결함(commit `ef6587c`).

## Watch Out

- 두 마이그레이션 SQL은 재실행해도 안전하게 설계됨(idempotent) — 컬럼 존재 체크, 이름 중복 체크, `ON CONFLICT DO NOTHING` 사용. 실수로 여러 번 돌려도 무방.
- 예산(Budget) 폼의 카테고리 선택은 의도적으로 지출(expense) 타입만 노출하도록 필터링됨 — 수입 카테고리가 예산 폼에 안 보이는 건 버그 아니라 의도된 동작.
- 마이그레이션 미실행 상태에서 라이브 DB에 이 세션의 프론트엔드 코드가 배포되면, `categories.type` 컬럼이 없어서 카테고리 관련 쿼리/필터링이 깨질 수 있음 — SQL 마이그레이션을 먼저 끝내고 배포/사용을 진행할 것.
- 카테고리 생성 후 type을 바꾸는 UI는 없음(의도적으로 범위에서 제외) — 잘못 분류된 카테고리는 Supabase에서 직접 UPDATE하거나 삭제 후 재생성해야 함.

## Files Touched

- `src/types/index.ts`
- `src/components/AddTransactionModal.tsx`
- `src/pages/Settings.tsx`
- `src/pages/Transactions.tsx`
- `src/db/index.ts`
- `src/utils/categoryIcons.tsx`
- `supabase/schema.sql`
- `supabase/migrate_add_category_type.sql` (신규, 미실행)
- `supabase/migrate_add_income_subcategories.sql` (신규, 미실행)
