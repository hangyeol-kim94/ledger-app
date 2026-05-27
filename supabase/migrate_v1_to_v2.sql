-- ============================================================
-- 카테고리 2단계 계층화 마이그레이션
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- 기존 거래내역을 새 카테고리로 자동 매핑합니다
-- ============================================================

-- 1. parent_id 컬럼 추가
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES categories(id);

-- 2. Level 1 부모 카테고리 삽입
INSERT INTO categories (id, name, color, archived, created_at_utc, parent_id) VALUES
  ('mig_p01', '식생활',   '#F97316', false, NOW(), NULL),
  ('mig_p02', '주거',     '#3B82F6', false, NOW(), NULL),
  ('mig_p03', '교통',     '#10B981', false, NOW(), NULL),
  ('mig_p04', '건강',     '#EF4444', false, NOW(), NULL),
  ('mig_p05', '쇼핑',     '#0EA5E9', false, NOW(), NULL),
  ('mig_p06', '여가/문화','#EC4899', false, NOW(), NULL),
  ('mig_p07', '교육',     '#F59E0B', false, NOW(), NULL),
  ('mig_p08', '통신',     '#8B5CF6', false, NOW(), NULL),
  ('mig_p09', '금융',     '#1D4ED8', false, NOW(), NULL),
  ('mig_p10', '사교',     '#84CC16', false, NOW(), NULL)
ON CONFLICT (id) DO NOTHING;

-- 3. Level 2 하위 카테고리 삽입
INSERT INTO categories (id, name, color, archived, created_at_utc, parent_id) VALUES
  -- 식생활
  ('mig_c01', '마트/식재료', '#F97316', false, NOW(), 'mig_p01'),
  ('mig_c02', '외식',        '#F97316', false, NOW(), 'mig_p01'),
  ('mig_c03', '배달',        '#F97316', false, NOW(), 'mig_p01'),
  ('mig_c04', '카페/음료',   '#F97316', false, NOW(), 'mig_p01'),
  -- 주거
  ('mig_c05', '월세/관리비', '#3B82F6', false, NOW(), 'mig_p02'),
  ('mig_c06', '공과금',      '#3B82F6', false, NOW(), 'mig_p02'),
  ('mig_c07', '생활용품',    '#3B82F6', false, NOW(), 'mig_p02'),
  ('mig_c08', '가구/인테리어','#3B82F6',false, NOW(), 'mig_p02'),
  -- 교통
  ('mig_c09', '대중교통',    '#10B981', false, NOW(), 'mig_p03'),
  ('mig_c10', '택시/호출',   '#10B981', false, NOW(), 'mig_p03'),
  ('mig_c11', '자동차',      '#10B981', false, NOW(), 'mig_p03'),
  ('mig_c12', '여행교통',    '#10B981', false, NOW(), 'mig_p03'),
  -- 건강
  ('mig_c13', '병원/의원',   '#EF4444', false, NOW(), 'mig_p04'),
  ('mig_c14', '약국',        '#EF4444', false, NOW(), 'mig_p04'),
  ('mig_c15', '피트니스',    '#EF4444', false, NOW(), 'mig_p04'),
  ('mig_c16', '미용/위생',   '#EF4444', false, NOW(), 'mig_p04'),
  -- 쇼핑
  ('mig_c17', '의류/패션',   '#0EA5E9', false, NOW(), 'mig_p05'),
  ('mig_c18', '전자기기',    '#0EA5E9', false, NOW(), 'mig_p05'),
  ('mig_c19', '기타쇼핑',    '#0EA5E9', false, NOW(), 'mig_p05'),
  -- 여가/문화
  ('mig_c20', '엔터테인먼트','#EC4899', false, NOW(), 'mig_p06'),
  ('mig_c21', '취미',        '#EC4899', false, NOW(), 'mig_p06'),
  ('mig_c22', '여행/숙박',   '#EC4899', false, NOW(), 'mig_p06'),
  ('mig_c23', '구독서비스',  '#EC4899', false, NOW(), 'mig_p06'),
  -- 교육
  ('mig_c24', '학원/강좌',   '#F59E0B', false, NOW(), 'mig_p07'),
  ('mig_c25', '도서/자료',   '#F59E0B', false, NOW(), 'mig_p07'),
  ('mig_c26', '자격증/시험', '#F59E0B', false, NOW(), 'mig_p07'),
  -- 통신
  ('mig_c27', '휴대폰/인터넷','#8B5CF6',false, NOW(), 'mig_p08'),
  ('mig_c28', '앱/소프트웨어','#8B5CF6',false, NOW(), 'mig_p08'),
  -- 금융
  ('mig_c29', '보험료',      '#1D4ED8', false, NOW(), 'mig_p09'),
  ('mig_c30', '수수료/이자', '#1D4ED8', false, NOW(), 'mig_p09'),
  -- 사교
  ('mig_c31', '경조사',      '#84CC16', false, NOW(), 'mig_p10'),
  ('mig_c32', '선물',        '#84CC16', false, NOW(), 'mig_p10'),
  ('mig_c33', '회식/모임',   '#84CC16', false, NOW(), 'mig_p10')
ON CONFLICT (id) DO NOTHING;

-- 4. 기존 거래내역을 새 Level 2 카테고리로 매핑
UPDATE transactions SET category_id = 'mig_c02'  -- 외식
  WHERE category_id IN (SELECT id FROM categories WHERE name = '식비'  AND id NOT LIKE 'mig_%');
UPDATE transactions SET category_id = 'mig_c09'  -- 대중교통
  WHERE category_id IN (SELECT id FROM categories WHERE name = '교통'  AND id NOT LIKE 'mig_%');
UPDATE transactions SET category_id = 'mig_c20'  -- 엔터테인먼트
  WHERE category_id IN (SELECT id FROM categories WHERE name = '여가'  AND id NOT LIKE 'mig_%');
UPDATE transactions SET category_id = 'mig_c05'  -- 월세/관리비
  WHERE category_id IN (SELECT id FROM categories WHERE name = '주거'  AND id NOT LIKE 'mig_%');
UPDATE transactions SET category_id = 'mig_c27'  -- 휴대폰/인터넷
  WHERE category_id IN (SELECT id FROM categories WHERE name = '통신'  AND id NOT LIKE 'mig_%');
UPDATE transactions SET category_id = 'mig_c13'  -- 병원/의원
  WHERE category_id IN (SELECT id FROM categories WHERE name = '의료'  AND id NOT LIKE 'mig_%');
UPDATE transactions SET category_id = 'mig_c24'  -- 학원/강좌
  WHERE category_id IN (SELECT id FROM categories WHERE name = '교육'  AND id NOT LIKE 'mig_%');
UPDATE transactions SET category_id = NULL        -- 기타 → 미분류
  WHERE category_id IN (SELECT id FROM categories WHERE name = '기타'  AND id NOT LIKE 'mig_%');

-- 5. 기존 (구형) 플랫 카테고리 보관처리
UPDATE categories
SET archived = true
WHERE name IN ('식비', '교통', '여가', '주거', '통신', '의료', '교육', '기타')
  AND id NOT LIKE 'mig_%';
