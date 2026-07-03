-- ============================================================
-- 수입 카테고리 복구 (참고용 — 아래 "권장" 항목을 먼저 확인하세요)
--
-- 이 파일은 애초에 categories 테이블 초기화(import_data.sql)로 사라진
-- 수입(income) 카테고리를 복구하려고 작성했으나, 이후 확인 결과
-- 이전 세션에서 이미 동일한 목적의 마이그레이션 두 개가 준비되어 있었습니다:
--   1. migrate_add_category_type.sql        (categories.type 컬럼 추가 + 백필)
--   2. migrate_add_income_subcategories.sql (월급/수입 + 하위 8종 삽입, '월급' 포함)
--
-- 권장: 아직 라이브 DB에 마이그레이션을 실행하지 않았다면 위 두 파일을
-- 순서대로 실행하세요. 그쪽이 categories.type 컬럼 생성까지 포함하는
-- 더 완전한 경로입니다.
--
-- 이 파일은 이름 기준으로 존재 여부를 확인하므로(고정 id로 INSERT하지 않음)
-- 위 두 마이그레이션을 이미 실행한 뒤에 실행해도, 또는 이 파일을 먼저
-- 실행한 뒤에 위 마이그레이션을 실행해도 카테고리가 중복 생성되지 않습니다.
-- (단, categories.type 컬럼 자체가 없다면 이 파일의 INSERT는 실패합니다 —
--  그 경우 migrate_add_category_type.sql을 먼저 실행하세요.)
-- ============================================================

-- 1. 수입 최상위 카테고리 (이름 기준으로 없을 때만 생성)
INSERT INTO categories (id, name, color, type, archived, created_at_utc, parent_id)
SELECT 'inc_p01', '월급/수입', '#10B981', 'income', false, NOW(), NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '월급/수입' AND parent_id IS NULL);

-- 2. 수입 하위 카테고리 (부모를 이름으로 찾아 연결, 이름 중복 시 건너뜀)
INSERT INTO categories (id, name, color, type, archived, created_at_utc, parent_id)
SELECT new_cats.gen_id, new_cats.name, parent.color, 'income', false, NOW(), parent.id
FROM (
  VALUES
    ('inc_c08', '월급'),
    ('inc_c01', '금융수입'),
    ('inc_c02', '용돈'),
    ('inc_c03', '상여금'),
    ('inc_c04', '더치페이'),
    ('inc_c05', '앱테크'),
    ('inc_c06', '사업수입'),
    ('inc_c07', '기타')
) AS new_cats(gen_id, name)
CROSS JOIN (
  SELECT id, color FROM categories WHERE name = '월급/수입' AND parent_id IS NULL LIMIT 1
) AS parent
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.name = new_cats.name AND c.parent_id = parent.id
);

-- 3. (선택) import_data.sql로 이미 들어온 수입 거래(월급, 이자, 캐시백 등)는
--    category_id가 NULL이라 자동으로는 분류되지 않습니다.
--    필요하면 아래처럼 원하는 카테고리로 직접 연결하세요.
-- UPDATE transactions SET category_id = (SELECT id FROM categories WHERE name = '월급' AND parent_id IS NOT NULL LIMIT 1)
--   WHERE type = 'income' AND category_id IS NULL;
