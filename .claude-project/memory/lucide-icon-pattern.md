---
name: lucide-icon-pattern
description: lucide-react 아이콘을 카테고리 이름 문자열로 조회하는 ICON_MAP 패턴
type: project
created: 2026-05-27
updated: 2026-07-03
---

src/utils/categoryIcons.tsx에 ICON_MAP: Record<string, LucideIcon>으로 한국어 카테고리명 → LucideIcon 매핑. CategoryIcon 컴포넌트가 ICON_MAP[name] ?? MoreHorizontal 폴백 처리. strokeWidth={1.8} 통일로 앱 전반 아이콘 스타일 일관성 유지.

**거래 목록 아이콘 우선순위 (Transactions.tsx 기준):**
1. transfer → `ArrowLeftRight`
2. 카테고리 있음 → `CategoryIcon name={cat.name}` (cat.color 사용)
3. income fallback → `TrendingUp`
4. expense fallback → `TrendingDown`

아이콘 원형 배경색은 `cat?.color ?? TYPE_COLOR[t.type]` — 카테고리 색상 우선.

**Why:** react-icons 대비 named import + TypeScript LucideIcon 타입 + 트리쉐이킹이 우수. 레거시 한국어 이름(식비, 의료 등)도 별도 키로 유지해 구형 데이터 아이콘이 깨지지 않음.
**How to apply:** 새 카테고리 추가 시 categoryIcons.tsx의 ICON_MAP에 한국어 이름 키 추가. 아이콘 없으면 MoreHorizontal로 자동 폴백. 거래 행 렌더링 시 동일 우선순위 적용.

**2026-07-03: 반복적으로 놓치는 지점 — 카테고리 이름은 세 곳(시드 데이터, 마이그레이션 SQL,
ICON_MAP) 중 하나에서 추가되고 나머지에는 반영이 안 되는 경우가 잦다.** '월급' 단일 항목이
`src/db/index.ts`의 initializeDB 기본 시드와 SQL 마이그레이션 양쪽에서 모두 누락돼 있었던
사례처럼, 새 카테고리는 여러 곳에 흩어져 정의되므로 한 곳만 고치고 끝내기 쉽다. ICON_MAP에
누락되면 에러 없이 MoreHorizontal로 조용히 폴백되기 때문에('기타'와 시각적으로 구분 안 됨)
알아채기도 어렵다.
**How to apply:** 새 카테고리 이름을 추가/변경할 때는 항상 3곳을 동시에 점검한다: ①
`src/db/index.ts`의 기본 시드 데이터 ② `supabase/*.sql` 마이그레이션·시드 스크립트 ③
`src/utils/categoryIcons.tsx`의 ICON_MAP. 셋 중 하나만 고치고 끝내지 않는다. [[category-2level-hierarchy]]
