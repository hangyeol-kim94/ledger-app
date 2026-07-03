---
name: modal-zindex-bottom-nav
description: 하단 시트 모달은 zIndex 200 이상이어야 함 — 100은 bottom-nav와 충돌
type: feedback
created: 2026-07-03
---

`.bottom-nav`(index.css)의 z-index가 100으로 고정되어 있고 App.tsx에서 페이지 콘텐츠보다
나중에 렌더링된다. `AddTransactionModal.tsx`는 zIndex:200을 써서 문제가 없었지만,
`Accounts.tsx`의 AccountForm과 새로 만든 Settings.tsx의 BudgetForm은 zIndex:100으로
작성되어 있어 같은 값일 때 DOM 순서상 nav가 위로 떠서 모달 하단(저장/취소 버튼 영역)의
클릭을 가로챘다. 실제 사용자가 저장을 누르면 하단 네비게이션으로 잘못 이동할 수 있는
실사용 버그였음 (headless 브라우저로 elementFromPoint 좌표 검사해서 발견).

**Why:** 시각적으로는 문제없이 렌더링되어 코드 리뷰만으로는 발견하기 어렵고, 실제 클릭
좌표 테스트(browse 스킬의 `js document.elementFromPoint(x,y)`)로만 드러났다.
**How to apply:** 화면 하단에 붙는 `position:'fixed', inset:0` 오버레이 모달을 새로 만들 때는
항상 `zIndex: 200` 이상을 사용한다. 새 모달 추가 후에는 저장 버튼처럼 화면 하단부에 위치하는
인터랙티브 요소가 실제로 클릭 가능한지 좌표 기반으로 검증할 것.
