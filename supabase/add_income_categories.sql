-- ============================================================
-- 수입 카테고리 복구
-- import_data.sql이 categories 테이블을 초기화하면서 지출 카테고리만
-- 다시 넣었고(type 컬럼 미지정), migrate_v1_to_v2.sql도 지출 카테고리만
-- 추가해 실제 DB에 type='income' 카테고리가 하나도 남지 않은 상태를 복구합니다.
-- (거래 추가 / 설정 화면에서 '수입' 탭이 비어 보이는 문제)
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- ============================================================

-- 1. 수입 최상위 카테고리
INSERT INTO categories (id, name, color, type, archived, created_at_utc, parent_id) VALUES
  ('inc_p01', '월급/수입', '#10B981', 'income', false, NOW(), NULL)
ON CONFLICT (id) DO NOTHING;

-- 2. 수입 하위 카테고리
INSERT INTO categories (id, name, color, type, archived, created_at_utc, parent_id) VALUES
  ('inc_c01', '금융수입', '#10B981', 'income', false, NOW(), 'inc_p01'),
  ('inc_c02', '용돈',     '#10B981', 'income', false, NOW(), 'inc_p01'),
  ('inc_c03', '상여금',   '#10B981', 'income', false, NOW(), 'inc_p01'),
  ('inc_c04', '더치페이', '#10B981', 'income', false, NOW(), 'inc_p01'),
  ('inc_c05', '앱테크',   '#10B981', 'income', false, NOW(), 'inc_p01'),
  ('inc_c06', '사업수입', '#10B981', 'income', false, NOW(), 'inc_p01'),
  ('inc_c07', '기타',     '#10B981', 'income', false, NOW(), 'inc_p01')
ON CONFLICT (id) DO NOTHING;

-- 3. (선택) import_data.sql로 이미 들어온 수입 거래(월급, 이자, 캐시백 등)는
--    category_id가 NULL이라 자동으로는 분류되지 않습니다.
--    필요하면 아래처럼 원하는 카테고리로 직접 연결하세요.
-- UPDATE transactions SET category_id = 'inc_c07'  -- 기타
--   WHERE type = 'income' AND category_id IS NULL;
