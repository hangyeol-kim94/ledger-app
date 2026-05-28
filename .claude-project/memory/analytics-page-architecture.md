---
name: analytics-page-architecture
description: Analytics 분석 페이지 구조 및 데이터 흐름 패턴
type: project
created: 2026-05-28
---

## 파일 위치

- `src/pages/Analytics.tsx` — 분석 페이지 본체
- 라우팅: `src/App.tsx` (React.lazy + currentPage === 'analytics')
- 스토어: `src/stores/useAppStore.ts` — currentPage 타입에 `'analytics'` 포함

## 데이터 흐름

```
useQuery(['transactions-all'], getActiveTransactions)  ─┐
useQuery(['categories'], getCategories)                 ─┤
                                                         ▼
useMemo: monthlyTrend (최근 6개월, MONTH_LIST 고정)
useMemo: selectedTotals (선택 월 수입/지출)
useMemo: categoryBreakdown → DonutSlice[] (상위 6개 + 기타)
useMemo: dowData (요일별 지출, 0=일~6=토)
```

## 차트 구성

| 섹션 | 컴포넌트 | 비고 |
|------|----------|------|
| 최근 6개월 추이 | Recharts `BarChart` | 선택 월 진한 색 강조 |
| 카테고리별 지출 | 커스텀 `DonutChart` | 상위 6개 + 기타 버킷 |
| 요일별 지출 패턴 | 인라인 CSS 바 차트 | 일=빨강, 토=인디고, 평일=파랑 |

## 하단 네비게이션 탭 순서

홈 · 거래내역 · [+추가 버튼] · **분석** · 설정  
(이전 '계좌' 탭이 '분석' 탭으로 교체됨 — AccountsPage는 라우팅에는 남아있음)

## 금액 포맷 헬퍼

- `formatKRW` — 툴팁/요약 카드용 전체 표기
- `compactKRW` — YAxis·바 위 레이블용 단축 표기 (억/만 단위)

**Why:** Analytics 페이지는 `getActiveTransactions` 전체를 한 번에 fetch해 클라이언트에서 월별/카테고리별/요일별로 파생 집계한다. 별도 집계 쿼리 없이 useMemo 체이닝으로 처리하므로 추가 DB 쿼리 작성 불필요.

**How to apply:** 새로운 집계 뷰(예: 주간·연간)를 추가할 때도 같은 `allTransactions` 쿼리 캐시를 재사용하고 useMemo로 파생 계산만 추가한다. MONTH_LIST처럼 렌더 외부에 상수로 선언해 리렌더 시 재생성을 방지한다.
