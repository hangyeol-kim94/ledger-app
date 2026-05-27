---
name: lucide-icon-pattern
description: lucide-react 아이콘을 카테고리 이름 문자열로 조회하는 ICON_MAP 패턴
type: project
created: 2026-05-27
---

src/utils/categoryIcons.tsx에 ICON_MAP: Record<string, LucideIcon>으로 한국어 카테고리명 → LucideIcon 매핑. CategoryIcon 컴포넌트가 ICON_MAP[name] ?? MoreHorizontal 폴백 처리. strokeWidth={1.8} 통일로 앱 전반 아이콘 스타일 일관성 유지.

**Why:** react-icons 대비 named import + TypeScript LucideIcon 타입 + 트리쉐이킹이 우수. 레거시 한국어 이름(식비, 의료 등)도 별도 키로 유지해 구형 데이터 아이콘이 깨지지 않음.
**How to apply:** 새 카테고리 추가 시 categoryIcons.tsx의 ICON_MAP에 한국어 이름 키 추가. 아이콘 없으면 MoreHorizontal로 자동 폴백.
