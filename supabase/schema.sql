-- ============================================================
-- 가계부 앱 Supabase 스키마
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- ============================================================

-- 계좌
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2563EB',
  initial_balance INTEGER NOT NULL DEFAULT 0,
  memo TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived BOOLEAN NOT NULL DEFAULT FALSE
);

-- 카테고리
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parent_id TEXT REFERENCES categories(id)
);

-- 거래내역
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  to_account_id TEXT REFERENCES accounts(id),
  date TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  memo TEXT NOT NULL DEFAULT '',
  created_at_utc TIMESTAMPTZ NOT NULL,
  updated_at_utc TIMESTAMPTZ NOT NULL,
  deleted_at_utc TIMESTAMPTZ
);

-- 예산 (scaffold)
CREATE TABLE budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id),
  account_id TEXT REFERENCES accounts(id),
  month TEXT NOT NULL,
  limit_amount INTEGER NOT NULL
);

-- 앱 메타 (싱글톤)
CREATE TABLE meta (
  id INTEGER PRIMARY KEY DEFAULT 1,
  schema_version INTEGER NOT NULL DEFAULT 1,
  app_version TEXT NOT NULL DEFAULT '1.0.0',
  last_export_at_utc TIMESTAMPTZ
);

-- 메타 초기 행 삽입
INSERT INTO meta (id, schema_version, app_version)
VALUES (1, 1, '1.0.0')
ON CONFLICT (id) DO NOTHING;

-- ─── RLS 활성화 (단일 사용자 → anon 전체 허용) ───
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON accounts    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON categories  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON transactions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON budgets     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON meta        FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─── 인덱스 ───
CREATE INDEX idx_transactions_date        ON transactions(date);
CREATE INDEX idx_transactions_account_id  ON transactions(account_id);
CREATE INDEX idx_transactions_deleted_at  ON transactions(deleted_at_utc);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
