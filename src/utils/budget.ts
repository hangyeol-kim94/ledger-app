import type { Budget, Transaction } from '../types'

// 예산 기간(start_date~end_date) 내 실제 지출 합계. 카테고리/계좌 미연결(자유 항목)이면 null.
export function computeBudgetSpent(b: Budget, transactions: Transaction[]): number | null {
  if (!b.category_id && !b.account_id) return null
  let sum = 0
  for (const t of transactions) {
    if (t.type !== 'expense' || t.exclude_from_budget) continue
    if (t.date < b.start_date || t.date > b.end_date) continue
    if (b.category_id && t.category_id !== b.category_id) continue
    if (b.account_id && t.account_id !== b.account_id) continue
    sum += t.amount
  }
  return sum
}

export function budgetProgressColor(ratio: number): string {
  return ratio >= 1 ? '#EF4444' : ratio >= 0.8 ? '#D97706' : '#059669'
}

function daysBetweenInclusive(startStr: string, endStr: string): number {
  const start = new Date(startStr + 'T00:00:00')
  const end = new Date(endStr + 'T00:00:00')
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1
}

// 예산 기간 기준 데일리 페이스: 오늘까지 쓸 수 있었던 금액 - 실제 지출 (양수면 여유, 음수면 초과)
export function computeBudgetPace(b: Budget, spent: number, todayStr: string): number {
  const totalDays = daysBetweenInclusive(b.start_date, b.end_date)
  let elapsedDays: number
  if (todayStr < b.start_date) elapsedDays = 0
  else if (todayStr > b.end_date) elapsedDays = totalDays
  else elapsedDays = daysBetweenInclusive(b.start_date, todayStr)
  const dailyBudget = totalDays > 0 ? b.limit_amount / totalDays : 0
  return Math.round(dailyBudget * elapsedDays - spent)
}
