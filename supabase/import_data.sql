-- ============================================================
-- 가계부 데이터 임포트 (구글 시트 → Supabase)
-- 기간: 2026년 4월~5월
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- ─── 기존 데이터 초기화 ───
DELETE FROM transactions;
DELETE FROM accounts;
DELETE FROM categories;

-- ─── 계좌 (초기잔액 = 2026-04-23 기준 잔액) ───
INSERT INTO accounts (id, name, color, initial_balance, memo, sort_order, created_at_utc, archived) VALUES
  ('acc_life',      '생활비',   '#2563EB', 678129,  '생활비 계좌',   0, NOW(), false),
  ('acc_emergency', '비상금',   '#7C3AED', 1350864, '비상금 계좌',   1, NOW(), false),
  ('acc_woori',     '우리은행', '#059669', 103537,  '우리은행 계좌', 2, NOW(), false);

-- ─── 카테고리 ───
INSERT INTO categories (id, name, color, archived, created_at_utc) VALUES
  ('cat_card',    '💳카드',        '#3B82F6', false, NOW()),
  ('cat_gift',    '🎁선물',        '#EC4899', false, NOW()),
  ('cat_drink',   '🍻술/유흥',    '#F97316', false, NOW()),
  ('cat_food',    '🥄식비',        '#10B981', false, NOW()),
  ('cat_finance', '🏦금융',        '#6366F1', false, NOW()),
  ('cat_music',   '💽음반',        '#8B5CF6', false, NOW()),
  ('cat_shop',    '🛍️쇼핑',        '#F59E0B', false, NOW()),
  ('cat_daily',   '⚡생필품',      '#06B6D4', false, NOW()),
  ('cat_market',  '🛒마트/식자재', '#84CC16', false, NOW()),
  ('cat_event',   '🎫공연',        '#EF4444', false, NOW()),
  ('cat_hobby',   '취미',          '#A855F7', false, NOW()),
  ('cat_life',    '생활',          '#059669', false, NOW()),
  ('cat_comm',    '📱통신',        '#0EA5E9', false, NOW()),
  ('cat_etc',     '기타',          '#6B7280', false, NOW());

-- ─── 거래내역 ───
-- 계좌 미지정 지출 → 생활비(acc_life)
-- 계좌 미지정 수입 → 우리은행(acc_woori)
-- 카드 정산/선결제  → 우리은행(acc_woori)
INSERT INTO transactions
  (id, type, amount, account_id, to_account_id, date, category_id, memo, created_at_utc, updated_at_utc, deleted_at_utc)
VALUES

-- ── 4월 카드 총 지출 정산 ──
  (gen_random_uuid()::text, 'expense', 2150691, 'acc_woori', NULL, '2026-04-23', 'cat_card', '삼성카드 4월 총 지출',  '2026-04-23T00:00:00Z', '2026-04-23T00:00:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   32161, 'acc_woori', NULL, '2026-04-23', 'cat_card', '우리카드 4월 지출',     '2026-04-23T00:01:00Z', '2026-04-23T00:01:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   16300, 'acc_woori', NULL, '2026-04-23', 'cat_card', '현대카드 4월 지출',     '2026-04-23T00:02:00Z', '2026-04-23T00:02:00Z', NULL),

-- ── 4월 24일 ──
  (gen_random_uuid()::text, 'income',  2914899, 'acc_woori', NULL, '2026-04-24', NULL,           '4월 월급',              '2026-04-24T00:00:00Z', '2026-04-24T00:00:00Z', NULL),
  (gen_random_uuid()::text, 'expense',  500000, 'acc_woori', NULL, '2026-04-24', 'cat_life',    '5월 공용 생활비 입금',   '2026-04-24T00:01:00Z', '2026-04-24T00:01:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   12995, 'acc_life',  NULL, '2026-04-24', 'cat_gift',    '기현이 형 죽 선물',      '2026-04-24T00:02:00Z', '2026-04-24T00:02:00Z', NULL),

-- ── 4월 25일 ──
  (gen_random_uuid()::text, 'expense',   26000, 'acc_woori', NULL, '2026-04-25', 'cat_drink',   '히어로 페스티벌 맥주',   '2026-04-25T00:00:00Z', '2026-04-25T00:00:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   25000, 'acc_life',  NULL, '2026-04-25', 'cat_drink',   '히어로페스티벌 하이볼',  '2026-04-25T00:01:00Z', '2026-04-25T00:01:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   29000, 'acc_life',  NULL, '2026-04-25', 'cat_drink',   '히어로페스티벌 뒷풀이',  '2026-04-25T00:02:00Z', '2026-04-25T00:02:00Z', NULL),

-- ── 4월 26일 ──
  (gen_random_uuid()::text, 'expense',    4600, 'acc_life',  NULL, '2026-04-26', 'cat_drink',   '편의점(숙취해소제)',      '2026-04-26T00:00:00Z', '2026-04-26T00:00:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   10700, 'acc_life',  NULL, '2026-04-26', 'cat_food',    '롯데리아',               '2026-04-26T00:01:00Z', '2026-04-26T00:01:00Z', NULL),

-- ── 4월 27일 ──
  (gen_random_uuid()::text, 'expense',   50000, 'acc_woori', NULL, '2026-04-27', 'cat_finance', '가족회비',               '2026-04-27T00:00:00Z', '2026-04-27T00:00:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   31068, 'acc_woori', NULL, '2026-04-27', 'cat_finance', '한화생명',               '2026-04-27T00:01:00Z', '2026-04-27T00:01:00Z', NULL),
  (gen_random_uuid()::text, 'expense',  111600, 'acc_life',  NULL, '2026-04-27', 'cat_music',   '알라딘(LP)',              '2026-04-27T00:02:00Z', '2026-04-27T00:02:00Z', NULL),

-- ── 4월 29일 ──
  (gen_random_uuid()::text, 'expense',   44480, 'acc_life',  NULL, '2026-04-29', 'cat_music',   '당근페이(콜드플레이 LP)', '2026-04-29T00:00:00Z', '2026-04-29T00:00:00Z', NULL),

-- ── 5월 1일 ──
  (gen_random_uuid()::text, 'expense',   39900, 'acc_life',  NULL, '2026-05-01', 'cat_life',    '마리오아울렛(유니클로) 가방', '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z', NULL),

-- ── 5월 2일 ──
  (gen_random_uuid()::text, 'expense',    4000, 'acc_life',  NULL, '2026-05-02', 'cat_shop',    '다이소(실, 코바늘)',      '2026-05-02T00:00:00Z', '2026-05-02T00:00:00Z', NULL),

-- ── 5월 3일 ──
  (gen_random_uuid()::text, 'expense',  607000, 'acc_life',  NULL, '2026-05-03', 'cat_shop',    '현대아울렛 커스텀멜로우 어버이날+내옷 3개월할부', '2026-05-03T00:00:00Z', '2026-05-03T00:00:00Z', NULL),
  (gen_random_uuid()::text, 'expense',  252900, 'acc_life',  NULL, '2026-05-03', 'cat_gift',    '현대아울렛 떨스데이클럽 어버이날선물 3개월할부',  '2026-05-03T00:01:00Z', '2026-05-03T00:01:00Z', NULL),
  (gen_random_uuid()::text, 'expense',  280000, 'acc_life',  NULL, '2026-05-03', 'cat_finance', '카카오 적금(옐로우나이프)', '2026-05-03T00:02:00Z', '2026-05-03T00:02:00Z', NULL),

-- ── 5월 6일 ──
  (gen_random_uuid()::text, 'expense', 1000000, 'acc_life',  NULL, '2026-05-06', 'cat_finance', '한화생명(종신)',           '2026-05-06T00:00:00Z', '2026-05-06T00:00:00Z', NULL),

-- ── 5월 7일 ──
  (gen_random_uuid()::text, 'expense',   16000, 'acc_life',  NULL, '2026-05-07', 'cat_daily',   '다이소 정리함,토마토&오이', '2026-05-07T00:00:00Z', '2026-05-07T00:00:00Z', NULL),

-- ── 5월 8일 ──
  (gen_random_uuid()::text, 'expense',    2300, 'acc_life',  NULL, '2026-05-08', 'cat_food',    'GS25 삼각김밥',           '2026-05-08T00:00:00Z', '2026-05-08T00:00:00Z', NULL),
  (gen_random_uuid()::text, 'expense',    4000, 'acc_life',  NULL, '2026-05-08', 'cat_event',   '티켓예매 취소 수수료',    '2026-05-08T00:01:00Z', '2026-05-08T00:01:00Z', NULL),

-- ── 5월 9일 ──
  (gen_random_uuid()::text, 'expense',    1000, 'acc_life',  NULL, '2026-05-09', 'cat_shop',    '다이소 분무기',           '2026-05-09T00:00:00Z', '2026-05-09T00:00:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   12070, 'acc_life',  NULL, '2026-05-09', 'cat_drink',   '세븐일레븐',              '2026-05-09T00:01:00Z', '2026-05-09T00:01:00Z', NULL),

-- ── 5월 10일 ──
  (gen_random_uuid()::text, 'expense',    3200, 'acc_life',  NULL, '2026-05-10', 'cat_food',    'GS25 물',                '2026-05-10T00:00:00Z', '2026-05-10T00:00:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   22000, 'acc_life',  NULL, '2026-05-10', 'cat_food',    '한국통닭서래나루 닭강정', '2026-05-10T00:01:00Z', '2026-05-10T00:01:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   11000, 'acc_life',  NULL, '2026-05-10', 'cat_drink',   '세븐일레븐 맥주&음료',    '2026-05-10T00:02:00Z', '2026-05-10T00:02:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   10000, 'acc_life',  NULL, '2026-05-10', 'cat_market',  '딸기',                   '2026-05-10T00:03:00Z', '2026-05-10T00:03:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   20000, 'acc_life',  NULL, '2026-05-10', 'cat_market',  '오미자청',               '2026-05-10T00:04:00Z', '2026-05-10T00:04:00Z', NULL),

-- ── 5월 11일 ──
  (gen_random_uuid()::text, 'expense',    1000, 'acc_life',  NULL, '2026-05-11', 'cat_life',    '다이소 바질 씨앗',        '2026-05-11T00:00:00Z', '2026-05-11T00:00:00Z', NULL),

-- ── 5월 14일 ──
  (gen_random_uuid()::text, 'expense',    3000, 'acc_life',  NULL, '2026-05-14', 'cat_life',    '다이소 가위,집게',        '2026-05-14T00:00:00Z', '2026-05-14T00:00:00Z', NULL),

-- ── 5월 15일 ──
  (gen_random_uuid()::text, 'expense',   47300, 'acc_life',  NULL, '2026-05-15', 'cat_comm',    'LG인터넷',               '2026-05-15T00:00:00Z', '2026-05-15T00:00:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   18480, 'acc_life',  NULL, '2026-05-15', 'cat_comm',    '인터넷',                 '2026-05-15T00:01:00Z', '2026-05-15T00:01:00Z', NULL),

-- ── 5월 16일 ──
  (gen_random_uuid()::text, 'income',      63,  'acc_woori', NULL, '2026-05-16', NULL,           '예금결산이자',            '2026-05-16T00:00:00Z', '2026-05-16T00:00:00Z', NULL),
  (gen_random_uuid()::text, 'expense',    8000, 'acc_life',  NULL, '2026-05-16', 'cat_drink',   '하이볼 이승윤콘서트',     '2026-05-16T00:01:00Z', '2026-05-16T00:01:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   12000, 'acc_life',  NULL, '2026-05-16', 'cat_drink',   '맥주 이승윤콘서트',       '2026-05-16T00:02:00Z', '2026-05-16T00:02:00Z', NULL),

-- ── 5월 17일 ──
  (gen_random_uuid()::text, 'expense',   27400, 'acc_life',  NULL, '2026-05-17', 'cat_drink',   '양꼬치 뒷풀이',           '2026-05-17T00:00:00Z', '2026-05-17T00:00:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   45150, 'acc_life',  NULL, '2026-05-17', 'cat_drink',   '준코 뒷풀이',             '2026-05-17T00:01:00Z', '2026-05-17T00:01:00Z', NULL),
  (gen_random_uuid()::text, 'expense',    7800, 'acc_life',  NULL, '2026-05-17', 'cat_drink',   '세븐일레븐 숙취해소제',   '2026-05-17T00:02:00Z', '2026-05-17T00:02:00Z', NULL),

-- ── 5월 20일 ──
  (gen_random_uuid()::text, 'income',    40000, 'acc_life',  NULL, '2026-05-20', NULL,           '5월 통신비 지원',         '2026-05-20T00:00:00Z', '2026-05-20T00:00:00Z', NULL),

-- ── 5월 21일 ──
  (gen_random_uuid()::text, 'income',    49200, 'acc_life',  NULL, '2026-05-21', NULL,           '교통비 캐시백',           '2026-05-21T00:00:00Z', '2026-05-21T00:00:00Z', NULL),

-- ── 5월 22일 ──
  (gen_random_uuid()::text, 'expense',   54000, 'acc_life',  NULL, '2026-05-22', 'cat_drink',   'DMZ팝업 MD구매 슬로건,티셔츠', '2026-05-22T00:00:00Z', '2026-05-22T00:00:00Z', NULL),
  (gen_random_uuid()::text, 'expense',    8500, 'acc_life',  NULL, '2026-05-22', 'cat_hobby',   '다이소 원예용품',         '2026-05-22T00:01:00Z', '2026-05-22T00:01:00Z', NULL),
  (gen_random_uuid()::text, 'income',  3379581, 'acc_woori', NULL, '2026-05-22', NULL,           '5월 월급',               '2026-05-22T00:02:00Z', '2026-05-22T00:02:00Z', NULL),
  (gen_random_uuid()::text, 'transfer', 300000, 'acc_woori', 'acc_emergency', '2026-05-22', NULL, '비상금 이체',            '2026-05-22T00:03:00Z', '2026-05-22T00:03:00Z', NULL),

-- ── 5월 23일 (카드 선결제) ──
  (gen_random_uuid()::text, 'expense',   47549, 'acc_woori', NULL, '2026-05-23', 'cat_card',    '삼성카드 선결제',         '2026-05-23T00:00:00Z', '2026-05-23T00:00:00Z', NULL),
  (gen_random_uuid()::text, 'expense',    7861, 'acc_woori', NULL, '2026-05-23', 'cat_card',    '우리카드 선결제',         '2026-05-23T00:01:00Z', '2026-05-23T00:01:00Z', NULL),
  (gen_random_uuid()::text, 'expense',   54850, 'acc_woori', NULL, '2026-05-23', 'cat_card',    '우리카드 선결제(2)',      '2026-05-23T00:02:00Z', '2026-05-23T00:02:00Z', NULL);
