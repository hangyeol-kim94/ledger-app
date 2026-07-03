-- ============================================================
-- 카테고리 수입/지출 구분 — categories.type 컬럼 마이그레이션
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- 여러 번 실행해도 안전합니다.
-- ============================================================

ALTER TABLE categories ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'expense';
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_type_check;
ALTER TABLE categories ADD CONSTRAINT categories_type_check CHECK (type IN ('income', 'expense'));

-- 기존 데이터 백필: 실제 거래 내역으로 봤을 때 수입에만 쓰인 카테고리는 income으로 전환
UPDATE categories c SET type = 'income'
WHERE EXISTS (SELECT 1 FROM transactions t WHERE t.category_id = c.id AND t.type = 'income')
  AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.category_id = c.id AND t.type = 'expense');

-- 거래 내역이 아직 없는 카테고리는 이름으로 보정
UPDATE categories SET type = 'income' WHERE name IN ('월급/수입', '수입');
