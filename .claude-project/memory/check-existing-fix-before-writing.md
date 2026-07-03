---
name: check-existing-fix-before-writing
description: 스키마/데이터 버그 수정 파일을 새로 작성하기 전에 supabase/*.sql과 HANDOFF.md를 먼저 확인 — 이미 존재하는 수정과 중복 생성 방지
type: feedback
created: 2026-07-03
---

수입 카테고리가 화면에 안 보이는 버그(원인: `import_data.sql`이 `DELETE FROM categories` 후
type 컬럼 없이 지출 카테고리만 재삽입)를 고치는 과정에서, 이 세션의 에이전트가 곧바로
`supabase/add_income_categories.sql`이라는 새 수정 파일을 작성했다. 하지만 **이전 세션이
이미 동일한 문제를 위해 `supabase/migrate_add_category_type.sql`과
`supabase/migrate_add_income_subcategories.sql`을 작성해뒀고**, 이 사실은
`.claude-project/HANDOFF.md`의 "Next Steps"에 "아직 프로덕션에 미적용"으로 명시돼 있었다.
세션 시작 시 HANDOFF.md와 supabase/ 디렉토리를 확인하지 않아 이를 놓쳤고, 결과적으로 사용자가
두 수정 경로를 모두 실행하면 '월급/수입' 부모 카테고리가 중복 생성될 위험이 있었다.
발견 후 새 파일을 하드코딩 ID + `ON CONFLICT DO NOTHING` 방식에서, 기존 캐노니컬 마이그레이션과
동일한 이름 기반 `WHERE NOT EXISTS ... AND name = '...'` 멱등 존재 검사 방식으로 재작성해
정합성을 맞췄다.

**Why:** 이 프로젝트는 마이그레이션이 자동 적용되지 않고 파일만 누적되는 구조([[supabase-migration-pattern]]
참고)라, "아직 적용 안 된 미래의 수정"이 여러 개 파일로 흩어져 존재할 수 있다. 이 상태를 모르고
새 수정 파일을 또 만들면 서로 다른 하드코딩 ID/스키마 가정을 가진 두 스크립트가 공존하게 되어,
사용자가 실수로 둘 다 실행하면 데이터 중복·정합성 깨짐이 발생한다.
**How to apply:** 스키마/데이터 버그를 발견해 SQL 수정 파일을 새로 작성하기 전에 반드시
(1) `supabase/` 디렉토리에서 같은 테이블·컬럼을 건드리는 기존 `.sql` 파일이 있는지 검색하고,
(2) `.claude-project/HANDOFF.md`의 "Next Steps"/미완료 항목을 확인한다. 이미 유사한 수정이
존재하면 새로 만들지 말고 기존 파일을 재사용하거나 보완한다. 새로 작성해야 한다면 하드코딩 ID
기반 `ON CONFLICT`보다 이름 기반 `WHERE NOT EXISTS` 존재 검사를 써서 기존 마이그레이션과
동시에 실행돼도 안전하게 만든다. [[supabase-migration-pattern]]
