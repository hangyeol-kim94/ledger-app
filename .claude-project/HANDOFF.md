---
created: 2026-05-27T00:00:00+09:00
project: ledger-app
summary: 지출 카테고리 2단계 계층화 + Lucide 아이콘 전면 적용 완료
---

## Session Digest

지출 카테고리를 MECE 구조로 재설계해 부모 10개 + 자식 33개의 2단계 계층으로 개편했다. Supabase DB에 parent_id 컬럼을 추가하고 기존 데이터를 새 구조로 마이그레이션했으며 (실제 실행 완료), 모든 이모지를 lucide-react SVG 아이콘으로 교체했다. ESLint react-hooks 관련 기존 오류 3건도 함께 수정됐다.

## Progress

- ✅ Category 타입에 parent_id 추가
- ✅ initializeDB() 2단계 시드 (Level1 10개 + Level2 33개)
- ✅ AddTransactionModal 2단계 선택 UI (부모 클릭 → 자식 서브패널)
- ✅ Home.tsx / Settings.tsx 이모지 → Lucide 아이콘 교체
- ✅ src/utils/categoryIcons.tsx 신설 (ICON_MAP + CategoryIcon 컴포넌트)
- ✅ supabase/migrate_v1_to_v2.sql 작성 + 실제 Supabase DB에 실행 완료
- ✅ 기존 커스텀 카테고리 11개 자동 이관 + 보관처리 완료
- ✅ Lint 오류 0건 (DonutChart mutation, useEffect setState, unused params 수정)
- ❌ Budget 기능 (scaffold만, 미구현)
- ❌ supabase/.temp/ → .gitignore 미추가

## Next Steps

1. supabase/.temp/ 를 .gitignore에 추가
2. schema_version AppMeta 1→2로 갱신 (importWithMigration 버전 체크도 업데이트)
3. Budget 기능 구현 (P1 scaffold 존재)
4. 거래 목록 페이지에서도 카테고리 계층 표시 개선 고려 (현재 소분류명만 표시)
5. 카테고리 분석 화면 — 도넛 차트를 부모/자식 드릴다운으로 확장 고려

## Watch Out

- supabase/.temp/ 파일들이 untracked 상태로 남아 있음 — 커밋 불필요, .gitignore 추가 권장
- import_data.sql이 커밋됨 — 민감 데이터 포함 여부 확인 필요
- 카테고리 기타 항목은 category_id = NULL(미분류)로 처리됨 — UI에서 null 허용 확인
- PIN 기본값 '1234'는 .env.local 미설정 시 사용됨 — 프로덕션 배포 전 VITE_APP_PIN 설정 필수

## Files Touched

- src/types/index.ts
- src/db/index.ts
- src/db/migrations/index.ts
- src/components/AddTransactionModal.tsx
- src/components/DonutChart.tsx
- src/pages/Home.tsx
- src/pages/Settings.tsx
- src/utils/categoryIcons.tsx (신규)
- src/utils/date.ts
- supabase/schema.sql
- supabase/migrate_v1_to_v2.sql (신규)
- package.json / package-lock.json (lucide-react 추가)
