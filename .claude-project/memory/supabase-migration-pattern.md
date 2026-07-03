---
name: supabase-migration-pattern
description: 기존 Supabase 데이터를 보존하면서 스키마를 변경하는 4단계 마이그레이션 패턴 — 실제 적용은 CLI가 아니라 SQL Editor 수동 붙여넣기
type: project
created: 2026-05-27
updated: 2026-07-03
---



migrate_v1_to_v2.sql 패턴:
1. ALTER TABLE ADD COLUMN IF NOT EXISTS (멱등 보장)
2. INSERT 신규 행 ON CONFLICT DO NOTHING (재실행 안전)
3. UPDATE 기존 거래 FK → 새 ID로 재매핑
4. UPDATE 구형 행 SET archived=true (삭제 금지)

**실제 적용 방식은 CLI가 아니라 수동 SQL Editor 붙여넣기다.** 이 프로젝트에는 마이그레이션
자동 배포 파이프라인이 없다 — `migrate_v1_to_v2.sql`, `migrate_add_budget_fields.sql`,
`migrate_add_exclude_from_budget.sql`, `migrate_add_budget_date_range.sql` 등 지금까지
작성된 모든 마이그레이션 파일 헤더에 예외 없이 "Supabase 대시보드 > SQL Editor에서
실행하세요"라고 명시돼 있다. 아래의 `supabase db query --linked --file` CLI 명령은
과거 메모에 남아있었지만 실제로 쓰인 적이 없는 것으로 보이는 방법이므로 참고만 하고,
기본 안내는 "SQL Editor에 붙여넣어 실행"으로 한다.

- Claude/에이전트가 할 수 있는 것은 마이그레이션 `.sql` 파일을 작성하는 것까지이며,
  실제 프로덕션 DB 적용은 사용자가 Supabase 대시보드에서 직접 실행해야 한다. 마이그레이션
  파일을 만든 뒤에는 사용자에게 "SQL Editor에 붙여넣어 실행해달라"고 안내하고, 사용자가
  적용 완료를 알려주기 전까지는 반영됐다고 가정하면 안 된다.
- (참고, 실사용 미확인) CLI 명령: `supabase link --project-ref <ref>` 후
  `supabase db query --linked --file <file.sql>`

**Why:** 마이그레이션 SQL이 idempotent해야 Supabase 대시보드에서 중복 실행해도 안전하다.
실제 적용 경로가 수동 SQL Editor 붙여넣기이므로, "마이그레이션 파일을 만들었다"와 "프로덕션에
적용됐다"는 서로 다른 상태이며 후자는 항상 사용자 확인이 필요하다는 점이 매 마이그레이션마다
반복되는 프로젝트 구조적 특성이다.
**How to apply:** 다음 스키마 변경 시에도 동일한 4단계 패턴의 SQL을 작성하고, 파일 헤더에
"Supabase 대시보드 > SQL Editor에서 실행하세요" 안내를 넣는다. 마이그레이션 작성 후에는
자동으로 적용됐다고 가정하지 말고 사용자에게 수동 실행을 요청하며, 적용 여부는 사용자의
명시적 확인에 의존한다. supabase/.temp/ 디렉토리는 .gitignore에 추가하거나 커밋 전
git restore --staged로 제외한다.

**2026-07-03: 관계 데이터로부터 값을 추론하는 백필 기법 (migrate_add_category_type.sql).**
기존 categories에 type 컬럼을 추가할 때, 카테고리 이름 하드코딩만으로 값을 채우지 않고
transactions 테이블의 실제 사용 이력으로 먼저 추론했다: 어떤 카테고리가 income 거래에서만
쓰이고 expense 거래에서는 전혀 쓰이지 않았다면 그 카테고리를 type='income'으로 UPDATE하고,
거래 이력이 아직 없는 카테고리만 이름 매칭으로 보정한다(순서: ① ALTER TABLE ADD COLUMN
DEFAULT 'expense' ② 거래 이력 기반 UPDATE ③ 이름 기반 fallback UPDATE). 이름 하드코딩만
하면 사용자가 커스텀 생성한 카테고리의 타입을 놓칠 수 있으므로, 실제 거래 이력이 더 정확한
백필 소스가 된다.

**2026-07-03: 신규 행이 참조할 부모 행의 존재를 가정하지 말 것 (migrate_add_income_subcategories.sql).**
자식 카테고리를 INSERT하며 부모를 `CROSS JOIN (SELECT id FROM categories WHERE name = '...')`으로
찾는 패턴을 쓸 때, 부모 행이 라이브 DB에 아직 없으면 CROSS JOIN 결과가 조용히 0행이 되어
**에러 없이 아무것도 삽입되지 않는다.** 발견 후 스크립트 맨 앞에 `INSERT ... WHERE NOT EXISTS`로
부모 행을 먼저 보장하는 방어 구문을 추가해 고쳤다.
**How to apply:** 부모-자식 마이그레이션 스크립트는 부모를 이름으로 조회해 JOIN하기 전에,
그 부모가 없으면 먼저 생성하는 자기완결적(self-healing) INSERT를 앞에 둔다. "이전 마이그레이션이
먼저 실행됐을 것"이라는 가정에만 의존하지 않는다.

**2026-07-03: `supabase/import_data.sql`은 위 4단계 마이그레이션 패턴과 다른, 위험한 전체
재시딩 스크립트다.** `DELETE FROM categories` 후 지출 카테고리만 `type` 컬럼을 아예 지정하지
않고 재삽입해서, 컬럼 기본값에 의존한 결과 라이브 DB에 income 타입 카테고리 행이 0개가 되는
버그가 있었다(거래 추가 모달·설정 카테고리 관리 화면 모두에서 수입 카테고리가 안 보이는 원인).
이 버그는 앱 코드 리뷰로는 절대 못 잡는다 — 원인이 수동 실행 SQL 데이터 스크립트에만 있었기
때문이다.
**How to apply:** `import_data.sql`처럼 테이블을 통째로 지우고 재삽입하는 스크립트를 수정할
때는 매 INSERT마다 `type` 컬럼 값을 명시적으로 지정한다(컬럼 기본값에 의존 금지). 이런 전체
재시딩 스크립트를 다시 실행하기 전에는 항상 파일 내용 전체를 다시 확인해, 스키마에 새로 추가된
컬럼(type 등)이 모든 INSERT 문에 반영돼 있는지 검증한다. [[check-existing-fix-before-writing]]
