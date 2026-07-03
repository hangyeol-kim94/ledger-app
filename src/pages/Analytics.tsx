import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { getActiveTransactions, getCategories, getAccounts, getBudgetsByMonth } from '../db'
import type { Category, Account } from '../types'
import { formatKRW, formatMonthKorean, navigateMonth, currentMonth } from '../utils/format'
import DonutChart, { type DonutSlice } from '../components/DonutChart'

function compactKRW(n: number): string {
  if (n >= 100_000_000) return `${Math.round(n / 100_000_000)}억`
  if (n >= 10_000) return `${Math.round(n / 10_000)}만`
  return n.toLocaleString('ko-KR')
}

function last6Months(): string[] {
  const months: string[] = []
  for (let i = 5; i >= 0; i--) months.push(navigateMonth(currentMonth(), -i))
  return months
}

const MONTH_LIST = last6Months()

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export default function AnalyticsPage() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth())

  const { data: allTransactions } = useQuery({
    queryKey: ['transactions-all'],
    queryFn: getActiveTransactions,
  })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: getAccounts })
  const { data: budgets } = useQuery({
    queryKey: ['budgets', selectedMonth],
    queryFn: () => getBudgetsByMonth(selectedMonth),
  })

  const catById = useMemo<Map<string, Category>>(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories]
  )

  const accountById = useMemo<Map<string, Account>>(
    () => new Map((accounts ?? []).map((a) => [a.id, a])),
    [accounts]
  )

  // ── 최근 6개월 수입/지출 ──
  const monthlyTrend = useMemo(() => {
    if (!allTransactions) return []
    return MONTH_LIST.map((month) => {
      const txns = allTransactions.filter((t) => t.date.startsWith(month))
      const income = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      const [, m] = month.split('-')
      return { label: `${parseInt(m)}월`, income, expense, month }
    })
  }, [allTransactions])

  // ── 선택 월 수입/지출 합계 ──
  const selectedTotals = useMemo(() => {
    if (!allTransactions) return { income: 0, expense: 0 }
    const txns = allTransactions.filter((t) => t.date.startsWith(selectedMonth))
    return {
      income: txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    }
  }, [allTransactions, selectedMonth])

  // ── 선택 월 카테고리별 지출 ──
  const categoryBreakdown = useMemo<DonutSlice[]>(() => {
    if (!allTransactions) return []
    const expenseTxns = allTransactions.filter(
      (t) => t.date.startsWith(selectedMonth) && t.type === 'expense'
    )
    if (expenseTxns.length === 0) return []
    const byCat = new Map<string, number>()
    for (const t of expenseTxns) {
      const key = t.category_id ?? '__none__'
      byCat.set(key, (byCat.get(key) ?? 0) + t.amount)
    }
    const total = selectedTotals.expense
    if (total === 0) return []
    const entries = Array.from(byCat.entries())
      .map(([catId, amount]) => {
        const cat = catId === '__none__' ? null : catById.get(catId) ?? null
        return { name: cat?.name ?? '미분류', color: cat?.color ?? '#6B7280', amount }
      })
      .sort((a, b) => b.amount - a.amount)
    const top = entries.slice(0, 6)
    const rest = entries.slice(6)
    if (rest.length > 0) {
      top.push({ name: '기타', color: '#CBD5E1', amount: rest.reduce((s, e) => s + e.amount, 0) })
    }
    return top.map((e) => ({
      color: e.color,
      label: e.name,
      amount: e.amount,
      percentage: (e.amount / total) * 100,
    }))
  }, [allTransactions, selectedMonth, selectedTotals.expense, catById])

  // ── 카테고리별 지출 (예산 진행률용) ──
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>()
    if (!allTransactions) return map
    for (const t of allTransactions) {
      if (t.date.startsWith(selectedMonth) && t.type === 'expense' && t.category_id && !t.exclude_from_budget) {
        map.set(t.category_id, (map.get(t.category_id) ?? 0) + t.amount)
      }
    }
    return map
  }, [allTransactions, selectedMonth])

  // ── 계좌별 지출 (예산 진행률용) ──
  const expenseByAccount = useMemo(() => {
    const map = new Map<string, number>()
    if (!allTransactions) return map
    for (const t of allTransactions) {
      if (t.date.startsWith(selectedMonth) && t.type === 'expense' && !t.exclude_from_budget) {
        map.set(t.account_id, (map.get(t.account_id) ?? 0) + t.amount)
      }
    }
    return map
  }, [allTransactions, selectedMonth])

  // ── 요일별 지출 ──
  const dowData = useMemo(() => {
    const sums = [0, 0, 0, 0, 0, 0, 0]
    if (allTransactions) {
      for (const t of allTransactions) {
        if (t.date.startsWith(selectedMonth) && t.type === 'expense') {
          const dow = new Date(t.date + 'T00:00:00').getDay()
          sums[dow] += t.amount
        }
      }
    }
    const max = Math.max(...sums, 1)
    return DOW_LABELS.map((day, i) => ({ day, amount: sums[i], max }))
  }, [allTransactions, selectedMonth])

  const loading = !allTransactions || !categories || !accounts || !budgets

  const tooltipFormatter = (value: number | string | readonly (number | string)[] | undefined) =>
    typeof value === 'number' ? formatKRW(value) : ''

  return (
    <div style={{ paddingBottom: 100, background: 'var(--bg)', minHeight: '100vh' }}>
      <header style={headerStyle}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#2563EB' }}>📊 분석</div>
      </header>

      {/* 월 선택 */}
      <div style={monthNavContainerStyle}>
        <button
          onClick={() => setSelectedMonth(navigateMonth(selectedMonth, -1))}
          style={monthNavBtnStyle}
        >‹</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
          {formatMonthKorean(selectedMonth)}
        </span>
        <button
          onClick={() => setSelectedMonth(navigateMonth(selectedMonth, 1))}
          style={monthNavBtnStyle}
        >›</button>
      </div>

      {/* 이달 수입/지출 요약 */}
      <section style={cardStyle}>
        <div style={{ display: 'flex', gap: 0 }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>수입</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981' }}>
              {loading ? '—' : `+${formatKRW(selectedTotals.income)}`}
            </div>
          </div>
          <div style={{ flex: 1, paddingLeft: 16, borderLeft: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>지출</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#EF4444' }}>
              {loading ? '—' : `−${formatKRW(selectedTotals.expense)}`}
            </div>
          </div>
          <div style={{ flex: 1, paddingLeft: 16, borderLeft: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>잔여</div>
            <div
              style={{
                fontSize: 18, fontWeight: 800,
                color: selectedTotals.income - selectedTotals.expense >= 0 ? '#2563EB' : '#EF4444',
              }}
            >
              {loading
                ? '—'
                : formatKRW(Math.abs(selectedTotals.income - selectedTotals.expense))}
            </div>
          </div>
        </div>
      </section>

      {/* 최근 6개월 추이 */}
      <section style={{ padding: '0 20px', marginTop: 20 }}>
        <div style={sectionTitleStyle}>최근 6개월 추이</div>
        <div style={{ ...cardStyle, padding: '16px 12px 8px' }}>
          {loading ? (
            <div style={emptyStyle}>불러오는 중…</div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end', marginBottom: 10, paddingRight: 4 }}>
                <LegendDot color="#10B981" label="수입" />
                <LegendDot color="#EF4444" label="지출" />
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyTrend} barCategoryGap="28%" barGap={3}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={compactKRW}
                    width={38}
                  />
                  <Tooltip
                    formatter={tooltipFormatter}
                    labelStyle={{ fontSize: 12, fontWeight: 700 }}
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #E2E8F0' }}
                  />
                  <Bar dataKey="income" name="수입" radius={[4, 4, 0, 0]}>
                    {monthlyTrend.map((entry) => (
                      <Cell
                        key={entry.month}
                        fill={entry.month === selectedMonth ? '#059669' : '#A7F3D0'}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="expense" name="지출" radius={[4, 4, 0, 0]}>
                    {monthlyTrend.map((entry) => (
                      <Cell
                        key={entry.month}
                        fill={entry.month === selectedMonth ? '#DC2626' : '#FECACA'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      </section>

      {/* 카테고리별 지출 */}
      <section style={{ padding: '0 20px', marginTop: 20 }}>
        <div style={sectionTitleStyle}>카테고리별 지출</div>
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 18 }}>
          {loading ? (
            <div style={emptyStyle}>불러오는 중…</div>
          ) : categoryBreakdown.length === 0 ? (
            <div style={emptyStyle}>지출 내역이 없습니다</div>
          ) : (
            <>
              <DonutChart
                slices={categoryBreakdown}
                centerLabel="지출"
                centerAmount={
                  selectedTotals.expense > 0 ? compactKRW(selectedTotals.expense) + '원' : '0원'
                }
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categoryBreakdown.map((s) => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.label}
                    </span>
                    <span style={{ color: 'var(--muted)', fontWeight: 500, flexShrink: 0 }}>{s.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 이번 달 예산 */}
      <section style={{ padding: '0 20px', marginTop: 20 }}>
        <div style={sectionTitleStyle}>{formatMonthKorean(selectedMonth)} 예산</div>
        <div style={cardStyle}>
          {loading ? (
            <div style={emptyStyle}>불러오는 중…</div>
          ) : !budgets || budgets.length === 0 ? (
            <div style={emptyStyle}>설정된 예산이 없습니다</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {budgets.map((b) => {
                const cat = b.category_id ? catById.get(b.category_id) ?? null : null
                const acc = b.account_id ? accountById.get(b.account_id) ?? null : null
                const spent = b.category_id
                  ? expenseByCategory.get(b.category_id) ?? 0
                  : b.account_id
                  ? expenseByAccount.get(b.account_id) ?? 0
                  : null
                const ratio = spent !== null && b.limit_amount > 0 ? spent / b.limit_amount : 0
                const barColor = ratio >= 1 ? '#EF4444' : ratio >= 0.8 ? '#D97706' : '#059669'
                return (
                  <div key={b.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{b.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {spent !== null ? `${formatKRW(spent)} / ${formatKRW(b.limit_amount)}` : `${formatKRW(b.limit_amount)} · 자유 항목`}
                      </span>
                    </div>
                    {spent !== null && (
                      <div style={{ height: 6, borderRadius: 3, background: '#E2E8F0', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(ratio, 1) * 100}%`, background: barColor, borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                    )}
                    {(cat || acc) && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{cat ? cat.name : acc!.name}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* 요일별 지출 */}
      <section style={{ padding: '0 20px', marginTop: 20 }}>
        <div style={sectionTitleStyle}>요일별 지출 패턴</div>
        <div style={cardStyle}>
          {loading ? (
            <div style={emptyStyle}>불러오는 중…</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110 }}>
              {dowData.map(({ day, amount, max }) => {
                const ratio = amount / max
                const barH = Math.max(ratio * 80, amount > 0 ? 4 : 0)
                const isSun = day === '일'
                const isSat = day === '토'
                const barColor = isSun
                  ? '#EF4444'
                  : isSat
                  ? '#6366F1'
                  : '#2563EB'
                return (
                  <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, height: 16 }}>
                      {amount > 0 ? compactKRW(amount) : ''}
                    </div>
                    <div
                      style={{
                        width: '100%', maxWidth: 32, borderRadius: 4,
                        height: barH, background: barColor, opacity: amount > 0 ? 1 : 0.15,
                        transition: 'height 0.3s',
                      }}
                    />
                    <div style={{ fontSize: 12, color: isSun ? '#EF4444' : isSat ? '#6366F1' : 'var(--muted)', fontWeight: 600 }}>
                      {day}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
      {label}
    </div>
  )
}

const headerStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 10,
  background: '#fff', borderBottom: '1px solid var(--border)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 20px',
}

const monthNavContainerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 18, padding: '14px 0 6px', background: '#fff',
}

const monthNavBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#94A3B8',
  fontSize: 20, cursor: 'pointer', padding: '2px 6px', lineHeight: 1,
}

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 16, padding: 18,
  boxShadow: 'var(--shadow)',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10,
}

const emptyStyle: React.CSSProperties = {
  width: '100%', textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '24px 0',
}
