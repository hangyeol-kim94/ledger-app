---
name: budget-feature-architecture
description: 월별 예산(Budget) 기능의 데이터 모델과 진행률 추적 로직
type: project
created: 2026-07-03
---

Budget은 `category_id` / `account_id` 중 하나만 설정되거나 둘 다 null(자유 항목)인
상호 배타적 구조다. `name` 필드는 카테고리/계좌 선택 시 자동 채워지지만 항상 편집 가능.

- Settings.tsx: CRUD (연결 대상 3버튼 토글 — 자유 항목/카테고리/계좌 — 로 linkType 선택,
  선택된 타입에 따라 category_id 또는 account_id만 저장)
- Analytics.tsx: 진행률 표시 (읽기 전용). category_id 있으면 해당 카테고리 지출 합산,
  account_id 있으면 해당 계좌 지출 합산과 비교. **이체(transfer)는 지출 집계에서 제외** —
  `type === 'expense'`인 거래만 카운트한다.
- 진행률 색상 임계치: 80% 미만 초록(#059669), 80~100% 주황(#D97706), 100% 이상 빨강(#EF4444)
- budgets 테이블은 최초 schema.sql에 존재했지만 실제로 생성되지 않은 프로젝트도 있었음 —
  마이그레이션은 `CREATE TABLE IF NOT EXISTS`부터 시작해야 함 ([[supabase-migration-pattern]] 참고,
  단 이 경우는 컬럼 추가가 아니라 테이블 자체 부재였던 케이스).

**Why:** 사용자가 "월 총예산이 아니라 여러 항목(생활비/취미예산/비상금 등)으로 나눠서" 요청했고,
이후 대화에서 계좌 연결도 필요하다고 확장됨 (계좌명과 항목명이 우연히 같아서 발견).
**How to apply:** 예산 관련 기능을 추가로 확장할 때 category_id/account_id 상호배타 원칙을 유지하고,
지출 집계 로직은 항상 `type === 'expense'` 필터를 기준으로 한다.
