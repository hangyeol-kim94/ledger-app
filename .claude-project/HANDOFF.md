---
created: 2026-07-03T14:35:00+09:00
project: ledger-app
summary: 월별 카테고리/계좌 예산 기능 구현 + 계좌 편집 모달 z-index 버그 수정
---

## Session Digest

저장소를 처음 클론하고, 모든 계좌 잔액을 0으로 초기화하는 일회성 SQL 스크립트를 작성했다.
이어서 사용자가 요청한 "월별 예산, 여러 항목으로 분리" 기능을 구현했다: 처음엔 카테고리
연결/자유 항목만 지원했으나, 사용자가 예시로 든 "생활비"/"비상금"이 실제 계좌명과 같다는
점을 짚으면서 계좌 연결 옵션도 추가했다 (category_id/account_id 상호 배타). Settings
페이지에 CRUD 섹션, Analytics 페이지에 진행률 바(80%/100% 색상 경고)를 추가했다.
budgets 테이블이 일부 환경에서 애초에 생성되지 않았던 것을 발견해 마이그레이션 스크립트를
`CREATE TABLE IF NOT EXISTS`부터 시작하도록 재작성했다. 실제 Supabase 프로젝트에 로컬
dev 서버로 연결해 browse 스킬로 전체 플로우(계좌/카테고리 연결 예산 생성, 거래 추가,
진행률 바 색상 변화)를 종단 검증했고, 테스트 데이터는 정리했다. 검증 중 계좌 편집 모달의
저장 버튼이 하단 네비게이션에 가려 클릭이 가로채이는 실사용 버그를 발견해 함께 수정했다.
lint/type/build 모두 통과 후 3개 커밋으로 나눠 푸시 완료 (feat 예산, fix z-index, chore
잔액초기화 스크립트+gitignore).

## Progress

- ✅ 저장소 클론 및 계좌 잔액 초기화 SQL 스크립트 (supabase/reset_balances.sql)
- ✅ Budget 타입에 name/account_id/created_at_utc 추가, category_id와 상호배타
- ✅ Settings 페이지 예산 관리 섹션 (월 이동, 추가/편집/삭제, 연결대상 3버튼 토글)
- ✅ Analytics 페이지 예산 진행률 섹션 (카테고리/계좌 지출 집계, 색상 임계치)
- ✅ budgets 테이블 마이그레이션 (테이블 부재 + 구스키마 둘 다 대응)
- ✅ JSON 내보내기/가져오기에 budgets 포함
- ✅ 실 Supabase로 종단 테스트 (계좌/카테고리 예산, 거래 반영, 진행률 색상) 및 테스트 데이터 정리
- ✅ 계좌 편집 모달 zIndex 100→200 버그 수정 (하단 네비게이션 겹침)
- ✅ lint/type/build 통과, 3개 커밋 푸시 완료
- ⬜ schema_version AppMeta 1→2 갱신 (전 세션부터 미해결)
- ⬜ AccountsPage 진입 경로 없음 — bottom nav에 '계좌' 탭이 없음 (전 세션부터 미해결)
- ⬜ Analytics 카테고리 도넛 드릴다운, 수입 카테고리 breakdown (전 세션부터 미해결)

## Next Steps

1. AccountsPage로 이동할 수 있는 UI 경로 추가 검토 (현재 nav에 계좌 탭 없음 — 전 세션부터 지적됨)
2. schema_version AppMeta 1→2 갱신 및 importWithMigration 버전 체크 업데이트
3. (선택) 예산 대비 지출 알림/경고 UI 강화 — 현재는 Analytics 방문 시에만 시각적으로 확인 가능
4. (선택) "지난달 예산 복사" 편의 기능 — 매달 동일 항목 재입력 번거로움 완화
5. Analytics 카테고리 도넛 드릴다운 확장, 수입 카테고리 breakdown 섹션 추가 (전 세션부터 이월)

## Blockers

없음 — 이번 세션 작업은 모두 완료·검증·푸시됨.

## Watch Out

- budgets 테이블이 프로젝트마다 실제 생성 여부가 다를 수 있음이 확인됨 — schema.sql만 보고
  "이미 있겠지" 가정하지 말 것. 마이그레이션은 항상 `CREATE TABLE IF NOT EXISTS`로 시작.
- 예산 지출 집계는 `type === 'expense'`만 카운트, transfer는 제외됨 ([[budget-feature-architecture]])
- 새 fixed-overlay 모달은 zIndex 200 이상 사용 ([[modal-zindex-bottom-nav]]) — 100은 `.bottom-nav`와 충돌
- 이 앱은 RLS가 `anon_all`(anon key로 전체 CRUD 허용)인 단일 사용자 구조 — anon/publishable key만으로도
  전체 데이터 접근 가능하므로 앱 배포/공유 시 주의
- import_data.sql이 커밋되어 있고 과거 실제 계좌 잔액이 하드코딩되어 있음 — 민감 데이터 재확인 필요 (전 세션부터 미해결)
- PIN 기본값 '1234'는 VITE_APP_PIN 미설정 시 사용됨 — 프로덕션 배포 전 반드시 설정 (전 세션부터 미해결)
- AccountsPage(src/pages/Accounts.tsx)는 App.tsx에 import되어 있으나 nav에 진입 버튼이 없음 (전 세션부터 미해결)

## Files Touched

- src/types/index.ts — Budget 타입 재정의
- src/db/index.ts — Budget CRUD 함수 추가
- src/db/migrations/index.ts — importWithMigration에 budgets 포함
- src/pages/Settings.tsx — 예산 관리 섹션 + BudgetForm
- src/pages/Analytics.tsx — 예산 진행률 섹션
- src/pages/Accounts.tsx — 모달 zIndex 버그 수정
- supabase/schema.sql — budgets 테이블 최종 스키마
- supabase/migrate_add_budget_fields.sql — budgets 마이그레이션 (신규)
- supabase/reset_balances.sql — 계좌 잔액 초기화 스크립트 (신규)
- .gitignore — .gstack/ 추가
