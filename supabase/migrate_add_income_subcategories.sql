-- ============================================================
-- 수입 세부 카테고리 추가 — 금융수입/용돈/상여금/더치페이/앱테크/사업수입/기타
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- migrate_add_category_type.sql 선행 실행 필요 (categories.type 컬럼)
-- 여러 번 실행해도 안전합니다 (이름 중복 시 건너뜀).
-- ============================================================

-- '월급/수입' 최상위 카테고리가 없으면 먼저 생성 (이미 있으면 건너뜀)
INSERT INTO categories (id, name, color, type, archived, created_at_utc, parent_id)
SELECT 'mig_incparent01', '월급/수입', '#10B981', 'income', false, NOW(), NULL
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = '월급/수입' AND parent_id IS NULL);

INSERT INTO categories (id, name, color, type, archived, created_at_utc, parent_id)
SELECT gen_id, name, parent.color, 'income', false, NOW(), parent.id
FROM (
  VALUES
    ('mig_inc01', '금융수입'),
    ('mig_inc02', '용돈'),
    ('mig_inc03', '상여금'),
    ('mig_inc04', '더치페이'),
    ('mig_inc05', '앱테크'),
    ('mig_inc06', '사업수입'),
    ('mig_inc07', '기타')
) AS new_cats(gen_id, name)
CROSS JOIN (
  SELECT id, color FROM categories WHERE name = '월급/수입' AND parent_id IS NULL LIMIT 1
) AS parent
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.name = new_cats.name AND c.parent_id = parent.id
)
ON CONFLICT (id) DO NOTHING;
