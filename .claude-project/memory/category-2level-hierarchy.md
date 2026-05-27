---
name: category-2level-hierarchy
description: 지출 카테고리 2단계 계층(부모 10개+자식 33개) 설계 결정 및 DB 구조
type: project
created: 2026-05-27
---

categories 테이블의 parent_id 자기 참조 컬럼으로 Level1(식생활·주거·교통·건강·쇼핑·여가문화·교육·통신·금융·사교)과 Level2(33개 소분류)를 관리한다. 마이그레이션 시 구형 카테고리는 DELETE 대신 archived=true 처리해 기존 거래 FK 무결성을 유지했다.

**Why:** 평면 목록은 세부 분류가 많아질수록 모바일 선택 UI가 복잡해지므로 부모 선택 → 자식 펼침 방식을 채택.
**How to apply:** AddTransactionModal에서 parentCats/childCats를 parent_id로 filter 분리하고, 부모 클릭 시 hasChildren 여부에 따라 바로 선택 또는 자식 펼침으로 분기한다. 새 소분류 추가 시 DB INSERT + categoryIcons.tsx ICON_MAP에 한국어 이름 키 추가.
