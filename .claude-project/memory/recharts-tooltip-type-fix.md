---
name: recharts-tooltip-type-fix
description: Recharts Tooltip formatter 파라미터 타입 오류 수정 패턴
type: reference
created: 2026-05-28
---

Recharts `<Tooltip formatter={...} />` 에 콜백을 전달할 때 TypeScript가 파라미터 타입을 좁혀 인식하지 못해 빌드 오류가 발생한다.

## 올바른 타입 시그니처

```ts
const tooltipFormatter = (
  value: number | string | readonly (number | string)[] | undefined
) => (typeof value === 'number' ? formatKRW(value) : '')
```

`number`만 받는 단순 함수로 작성하면 Recharts 내부 타입(`ValueType`)과 불일치해 오류가 난다.

**Why:** Recharts `FormatterFunc` 의 첫 번째 인자 타입이 `ValueType = number | string | Array<number | string>` 이고 undefined 포함 유니온으로 정의되어 있어, 좁은 타입을 넘기면 타입 불일치 오류가 발생한다.

**How to apply:** BarChart/LineChart 등에서 `<Tooltip formatter={fn} />` 을 쓸 때마다 위 시그니처를 그대로 사용하고, 함수 내부에서 `typeof value === 'number'` 가드로 실제 값을 처리한다.
