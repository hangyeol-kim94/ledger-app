-- ============================================================
-- 예산 시작일/종료일 지정 기능 — budgets.start_date / end_date 컬럼 마이그레이션
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- 여러 번 실행해도 안전합니다.
-- ============================================================

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS start_date TEXT;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS end_date TEXT;

-- 기존 월별(month) 예산을 해당 월의 1일~말일 범위로 백필
UPDATE budgets
SET start_date = month || '-01'
WHERE start_date IS NULL AND month IS NOT NULL;

UPDATE budgets
SET end_date = to_char((to_date(month || '-01', 'YYYY-MM-DD') + INTERVAL '1 month - 1 day'), 'YYYY-MM-DD')
WHERE end_date IS NULL AND month IS NOT NULL;

ALTER TABLE budgets ALTER COLUMN start_date SET NOT NULL;
ALTER TABLE budgets ALTER COLUMN end_date SET NOT NULL;

-- month는 더 이상 앱에서 사용하지 않음 — 컬럼은 보존하되 NOT NULL 제약만 해제
ALTER TABLE budgets ALTER COLUMN month DROP NOT NULL;

DROP INDEX IF EXISTS idx_budgets_month;
CREATE INDEX IF NOT EXISTS idx_budgets_date_range ON budgets(start_date, end_date);
