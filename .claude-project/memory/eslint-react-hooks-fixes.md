---
name: eslint-react-hooks-fixes
description: react-hooks 관련 ESLint 오류 패턴과 수정 방법
type: feedback
created: 2026-05-27
---

이 프로젝트에서 발견된 ESLint react-hooks 오류 2가지:

1. **react-hooks/immutability**: 컴포넌트 렌더 중 let 변수 뮤테이션 금지. 
   - 수정: `slices.map((s, i) => { const cum = slices.slice(0,i).reduce(...) })`로 인덱스 기반 불변 계산

2. **react-hooks/set-state-in-effect**: useEffect 내 동기 setState 금지.
   - 수정: derived value 패턴 - `const effectiveFromId = fromAccountId || defaultFromId`로 상태 없이 파생

**Why:** 이 프로젝트는 eslint-plugin-react-hooks v7, typescript-eslint v8을 사용하며 두 규칙이 엄격하게 적용된다.
**How to apply:** 계좌/카테고리 기본값 설정 시 useEffect + setState 대신 항상 derived value 패턴 사용.
