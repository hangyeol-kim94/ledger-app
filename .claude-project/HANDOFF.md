---
created: 2026-07-03T16:45:00+09:00
project: ledger-app
summary: 수입 카테고리 누락 문제 진단·수정·마이그레이션 적용까지 완료, 사용자가 라이브에서 정상 표시 확인함
---

## Session Digest

이번 세션은 가계부 앱의 "설정 > 카테고리 관리" 및 "거래 추가" 화면에서 **수입(income) 카테고리가 전혀 보이지 않는 문제**를 진단하고 수정하는 작업이었다.

근본 원인을 추적한 결과, `supabase/import_data.sql`이 `DELETE FROM categories` 후 지출(expense) 카테고리만 `type` 컬럼 지정 없이(DEFAULT 값에 의존) 재삽입하면서, 라이브 Supabase DB에 `type = 'income'`인 카테고리 행이 하나도 남지 않게 된 것이 원인이었다. 앱 코드(`c.type === 'income'`로 필터링하는 로직)는 정상이었고, 순수하게 **라이브 DB 데이터 문제**였다.

수정 과정에서 새 SQL 스크립트(`add_income_categories.sql`)를 먼저 작성했으나, 마무리 전 재확인하는 과정에서 **이전 세션이 이미 동일한 목적의 마이그레이션 두 개**(`migrate_add_category_type.sql`, `migrate_add_income_subcategories.sql`)를 준비해두고 아직 실행하지 않은 상태였다는 사실을 발견했다. 이에 따라 새 스크립트를 이름 기반 idempotent 방식으로 재작성해 기존 마이그레이션과 순서/중복 걱정 없이 공존하도록 하고, 기존 마이그레이션 파일에도 누락되어 있던 '월급' 리프 카테고리를 추가했다. 또한 앱 코드 상에서 '월급' 카테고리가 아이콘을 지정받지 못해 '기타'와 동일한 fallback 아이콘(MoreHorizontal)을 공유하던 버그도 함께 수정했다.

세션 중 발견된 프로세스 실수: `.claude-project/HANDOFF.md`나 기존 `supabase/*.sql` 목록을 먼저 확인하지 않고 새 SQL 픽스 파일부터 작성하여, 이전 세션이 이미 끝내놓은 작업을 중복 생산할 뻔했다. 라이브 DB에 실제로 중복 적용되기 전에 재확인을 통해 발견하고 바로잡았다.

## Progress (완료/미완료)

### 완료
- 원인 진단: `import_data.sql`이 수입 카테고리를 전혀 남기지 않는다는 것 확인 (라이브 DB 데이터 문제, 앱 코드 버그 아님)
- `src/db/index.ts`의 기본 시드 데이터에 '월급' 수입 리프 카테고리 추가
- `src/utils/categoryIcons.tsx`에서 '월급' 카테고리를 Wallet 아이콘으로 명시 매핑 (기존에는 매핑이 없어 '기타'와 동일한 MoreHorizontal fallback을 공유하던 버그 수정)
- `supabase/migrate_add_income_subcategories.sql`에 누락되어 있던 '월급' 리프 카테고리(`mig_inc08`) 추가
- `supabase/add_income_categories.sql` 작성 — 이름 기준 존재 여부 체크로 완전히 idempotent하게 재작성, 실행 순서/중복과 무관하게 안전하도록 처리, 파일 상단에 "권장: 아래 정식 마이그레이션 2개를 먼저 실행하라"는 안내 주석 추가
- 기존 마이그레이션 2개(`migrate_add_category_type.sql`, `migrate_add_income_subcategories.sql`) 내용을 직접 Read로 재확인 — 둘 다 `IF NOT EXISTS` / `WHERE NOT EXISTS` / `ON CONFLICT DO NOTHING` 패턴으로 이미 idempotent하며, '월급' 포함 8개 리프 카테고리가 모두 반영되어 있음. **추가 수정 불필요, 지금 상태로 실행 가능**
- 4개 커밋 모두 `origin/master`에 push 완료 (`47df132`, `d445193`, `16423ee`, `3fdbede`)
- **사용자가 Supabase SQL Editor에서 마이그레이션을 직접 실행함.** 이후 라이브 앱에서 "월급" 카테고리가 정상 표시되고, "기타"와 아이콘도 구분됨을 직접 확인·확정함 (2026-07-03). 이 세션의 작업은 완전히 종료된 상태.

### 미완료
- 없음. (선택 항목이었던 기존 수입 거래의 category_id 수동 연결, `add_income_categories.sql` 정리 여부는 급하지 않아 보류 중 — 아래 Next Steps 참고)

## Next Steps (우선순위 순)

1. (선택) `import_data.sql`로 이미 들어와 있던 수입 거래(월급, 이자, 캐시백 등)는 `category_id`가 NULL일 가능성이 높음 — 필요하면 `add_income_categories.sql` 하단에 주석 처리된 UPDATE 문을 참고해 수동으로 분류 연결
2. (선택, 낮은 우선순위) `add_income_categories.sql`은 정식 마이그레이션 2개로 목적이 흡수되었으므로 참고/폴백용으로만 남겨두거나 정리 여부 판단 — 기능상 문제는 없으므로 급하지 않음

## Blockers

없음.

## Watch Out

- `migrate_add_category_type.sql`을 **먼저** 실행해야 한다. `categories.type` 컬럼이 없는 상태에서 `add_income_categories.sql`이나 `migrate_add_income_subcategories.sql`을 실행하면 INSERT 문이 실패한다.
- 세 스크립트 모두 이름 기반(`WHERE NOT EXISTS ... name = ...`) 체크로 idempotent하게 작성되어 있어 어떤 순서/조합으로 실행해도 카테고리가 중복 생성되지 않지만, **정식 경로는 `migrate_add_category_type.sql` → `migrate_add_income_subcategories.sql` 순서**이며 `add_income_categories.sql`은 참고/폴백용이다. 굳이 셋 다 실행할 필요는 없다.
- 향후 유사한 "카테고리/시드 데이터 복구" 요청을 받으면, 새 SQL 파일을 작성하기 전에 반드시 `.claude-project/HANDOFF.md`와 `supabase/*.sql` 기존 파일 목록을 먼저 확인할 것 — 이번 세션에서 이 절차를 건너뛰어 이미 존재하던 마이그레이션과 중복 작업을 할 뻔했다.
- `import_data.sql`은 여전히 `categories.type`을 지정하지 않고 지출 카테고리만 재삽입하는 구조를 그대로 가지고 있다. 앞으로 이 스크립트를 다시 실행하면(예: DB를 초기화하는 상황) 동일한 문제가 재발할 수 있으므로, 필요하다면 이 스크립트 자체를 수입 카테고리 포함하도록 보강하는 것을 고려할 것 (이번 세션에서는 손대지 않음).

## Files Touched

- `src/db/index.ts` — 기본 시드 데이터에 '월급' 수입 리프 카테고리 추가
- `src/utils/categoryIcons.tsx` — '월급' → Wallet 아이콘 명시 매핑 (기존 '기타'와 공유하던 fallback 아이콘 버그 수정)
- `supabase/add_income_categories.sql` (신규) — 이름 기반 idempotent 복구 스크립트, 상단에 정식 마이그레이션 2개를 권장하는 안내 주석 포함
- `supabase/migrate_add_income_subcategories.sql` (기존 파일 수정) — 누락되어 있던 '월급' 리프 카테고리(`mig_inc08`) 추가
- (변경 없음, 재확인만 함) `supabase/migrate_add_category_type.sql` — 현재 상태로 실행 가능, 추가 수정 불필요
