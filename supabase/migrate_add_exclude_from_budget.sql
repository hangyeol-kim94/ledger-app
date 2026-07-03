-- ============================================================
-- 거래내역 예산 제외 기능 — transactions.exclude_from_budget 컬럼 마이그레이션
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- 여러 번 실행해도 안전합니다.
-- ============================================================

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS exclude_from_budget BOOLEAN NOT NULL DEFAULT FALSE;
