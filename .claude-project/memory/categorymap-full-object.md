---
name: categorymap-full-object
description: categoryMap을 Map<string,Category> 전체 객체로 저장해 name·color를 단일 조회로 접근하는 패턴
type: project
created: 2026-05-28
---

`categoryMap`은 `Map<string, Category>` 타입으로 카테고리 전체 객체를 저장한다. 이름만 저장하는 `Map<string, string>` 패턴은 사용하지 않는다.

```ts
const categoryMap = useMemo(() => {
  const m = new Map<string, Category>()
  categories.forEach((c) => m.set(c.id, c))
  return m
}, [categories])

// 사용 시
const cat = t.category_id ? categoryMap.get(t.category_id) : null
const iconColor = cat?.color ?? TYPE_COLOR[t.type]
```

**Why:** 이름만 저장하면 color가 필요할 때 두 번째 맵이나 별도 조회가 필요해진다. 전체 객체를 저장하면 `cat.name`, `cat.color`, `cat.parent_id` 등을 단일 조회로 접근 가능.
**How to apply:** 카테고리 목록에서 맵을 만들 때는 항상 `Map<string, Category>`로 선언할 것. [[lucide-icon-pattern]]
