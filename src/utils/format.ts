// Format integer KRW amount to Korean currency string
export function formatKRW(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원'
}

// Format with sign (+ for income, - for expense)
export function formatKRWSigned(amount: number, type: 'income' | 'expense' | 'transfer'): string {
  const formatted = amount.toLocaleString('ko-KR') + '원'
  if (amount === 0) return formatted
  if (type === 'income') return '+' + formatted
  if (type === 'expense') return '−' + formatted
  return formatted
}

// Parse Korean number string back to integer
export function parseKRW(str: string): number {
  const num = parseInt(str.replace(/[^0-9]/g, ''), 10)
  if (isNaN(num)) throw new Error(`Cannot parse amount: ${str}`)
  return num
}

// Format date string 'YYYY-MM-DD' to '5월 23일 (목)'
export function formatDateKorean(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

// Format month 'YYYY-MM' to '2026년 5월'
export function formatMonthKorean(month: string): string {
  const [year, m] = month.split('-')
  return `${year}년 ${parseInt(m)}월`
}

// Get current month as 'YYYY-MM'
export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Get today as 'YYYY-MM-DD'
export function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Navigate month: direction = +1 or -1
export function navigateMonth(month: string, direction: number): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(year, m - 1 + direction, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Number of days in a given 'YYYY-MM' month
export function daysInMonth(month: string): number {
  const [year, m] = month.split('-').map(Number)
  return new Date(year, m, 0).getDate()
}
