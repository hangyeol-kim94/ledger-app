-- ============================================================
-- 월별 카테고리/계좌 예산 기능 — budgets 테이블 마이그레이션
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- budgets 테이블이 아예 없는 경우와 구버전 스키마로 이미 존재하는 경우
-- 모두 안전하게 처리합니다. 여러 번 실행해도 안전합니다.
-- ============================================================

-- ─── 테이블이 없으면 최종 스키마로 생성 ───
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  category_id TEXT REFERENCES categories(id),
  account_id TEXT REFERENCES accounts(id),
  month TEXT NOT NULL,
  limit_amount INTEGER NOT NULL,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 구버전 스키마로 이미 존재하는 경우 누락된 컬럼 보강 ───
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES accounts(id);

-- ─── RLS + 정책 (단일 사용자 → anon 전체 허용) ───
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all" ON budgets;
CREATE POLICY "anon_all" ON budgets FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
