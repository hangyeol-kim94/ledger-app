import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAccounts, getCategories, getTransactionsByMonth, computeAllBalances, getBudgetsByMonth } from '../db'
import type { Account, Category, Transaction } from '../types'
import { formatKRW, formatMonthKorean, navigateMonth, today } from '../utils/format'
import { useAppStore } from '../stores/useAppStore'
import DonutChart, { type DonutSlice } from '../components/DonutChart'
import { CategoryIcon, TrendingUp, TrendingDown, ArrowLeftRight } from '../utils/categoryIcons'

const GRADIENTS = [
  'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
  'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
  'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
  'linear-gradient(135deg, #059669 0%, #047857 100%)',
  'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
]

function formatTxnDate(dateStr: string): string {
  const t = today()
  if (dateStr === t) return '오늘'
  const [y, m, d] = t.split('-').map(Number)
  const yesterday = new Date(y, m - 1, d - 1)
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  if (dateStr === yStr) return '어제'
  const dt = new Date(dateStr + 'T00:00:00')
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일`
}

function formatCompactKRW(amount: number): string {
  if (amount >= 10000) {
    const man = Math.round(amount / 10000)
    return `${man.toLocaleString('ko-KR')}만원`
  }
  return formatKRW(amount)
}

export default function HomePage() {
  const selectedMonth = useAppStore((s) => s.selectedMonth)
  const setSelectedMonth = useAppStore((s) => s.setSelectedMonth)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  const { data: allAccounts } = useQuery({ queryKey: ['accounts'], queryFn: getAccounts })
  const { data: transactions } = useQuery({
    queryKey: ['transactions', selectedMonth],
    queryFn: () => getTransactionsByMonth(selectedMonth),
  })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const { data: balances } = useQuery({ queryKey: ['balances'], queryFn: computeAllBalances })
  const { data: budgets } = useQuery({
    queryKey: ['budgets', selectedMonth],
    queryFn: () => getBudgetsByMonth(selectedMonth),
  })

  const accounts = useMemo(
    () => (allAccounts ?? []).filter((a) => !a.archived).sort((a, b) => a.sort_order - b.sort_order),
    [allAccounts]
  )

  const loading = !allAccounts || !transactions || !categories

  const totals = useMemo(() => {
    if (!transactions) return { income: 0, expense: 0 }
    let income = 0
    let expense = 0
    for (const t of transactions) {
      if (t.type === 'income') income += t.amount
      else if (t.type === 'expense') expense += t.amount
    }
    return { income, expense }
  }, [transactions])

  const totalBalance = useMemo(() => {
    if (!balances) return 0
    return Object.values(balances).reduce((s, v) => s + v, 0)
  }, [balances])

  const categoryBreakdown = useMemo<DonutSlice[]>(() => {
    if (!transactions || !categories) return []
    const expenseTxns = transactions.filter((t) => t.type === 'expense')
    if (expenseTxns.length === 0) return []
    const catMap = new Map<string, Category>(categories.map((c) => [c.id, c]))
    const byCat = new Map<string, number>()
    for (const t of expenseTxns) {
      const key = t.category_id ?? '__none__'
      byCat.set(key, (byCat.get(key) ?? 0) + t.amount)
    }
    const total = totals.expense
    if (total === 0) return []
    const entries = Array.from(byCat.entries()).map(([catId, amount]) => {
      const cat = catId === '__none__' ? null : catMap.get(catId) ?? null
      return { name: cat?.name ?? '기타', color: cat?.color ?? '#6B7280', amount }
    })
    entries.sort((a, b) => b.amount - a.amount)
    const top = entries.slice(0, 5)
    const rest = entries.slice(5)
    if (rest.length > 0) {
      const restAmount = rest.reduce((s, e) => s + e.amount, 0)
      top.push({ name: '기타', color: '#6B7280', amount: restAmount })
    }
    return top.map((e) => ({
      color: e.color,
      label: e.name,
      amount: e.amount,
      percentage: (e.amount / total) * 100,
    }))
  }, [transactions, categories, totals.expense])

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>()
    if (!transactions) return map
    for (const t of transactions) {
      if (t.type === 'expense' && t.category_id && !t.exclude_from_budget) {
        map.set(t.category_id, (map.get(t.category_id) ?? 0) + t.amount)
      }
    }
    return map
  }, [transactions])

  const expenseByAccount = useMemo(() => {
    const map = new Map<string, number>()
    if (!transactions) return map
    for (const t of transactions) {
      if (t.type === 'expense' && !t.exclude_from_budget) {
        map.set(t.account_id, (map.get(t.account_id) ?? 0) + t.amount)
      }
    }
    return map
  }, [transactions])

  const budgetSummary = useMemo(() => {
    if (!budgets || budgets.length === 0) return null
    let totalLimit = 0
    let totalSpent = 0
    for (const b of budgets) {
      const spent = b.category_id
        ? expenseByCategory.get(b.category_id) ?? 0
        : b.account_id
        ? expenseByAccount.get(b.account_id) ?? 0
        : 0
      totalLimit += b.limit_amount
      totalSpent += spent
    }
    return { totalLimit, totalSpent, totalRemaining: totalLimit - totalSpent }
  }, [budgets, expenseByCategory, expenseByAccount])

  const recentTransactions = useMemo<Transaction[]>(() => {
    if (!transactions) return []
    return [...transactions]
      .sort((a, b) => (a.created_at_utc < b.created_at_utc ? 1 : -1))
      .slice(0, 5)
  }, [transactions])

  const categoriesById = useMemo<Map<string, Category>>(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories]
  )

  const accountsById = useMemo<Map<string, Account>>(
    () => new Map((allAccounts ?? []).map((a) => [a.id, a])),
    [allAccounts]
  )

  const monthLabel = formatMonthKorean(selectedMonth)
  const monthNumber = parseInt(selectedMonth.split('-')[1], 10)

  return (
    <div style={{ paddingBottom: 100, background: 'var(--bg)', minHeight: '100vh' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#fff',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800, color: '#2563EB' }}>💳 가계부</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button aria-label="알림" style={iconButtonStyle} onClick={() => {}}>🔔</button>
          <button aria-label="설정" style={iconButtonStyle} onClick={() => setCurrentPage('settings')}>⚙️</button>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: '14px 0 6px',
          background: '#fff',
        }}
      >
        <button aria-label="이전 달" onClick={() => setSelectedMonth(navigateMonth(selectedMonth, -1))} style={monthNavBtnStyle}>‹</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{monthLabel}</span>
        <button aria-label="다음 달" onClick={() => setSelectedMonth(navigateMonth(selectedMonth, 1))} style={monthNavBtnStyle}>›</button>
      </div>

      {/* 총 잔액 카드 */}
      <section style={{ margin: '8px 20px', background: '#fff', borderRadius: 16, padding: '22px 24px', boxShadow: 'var(--shadow)' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>총 잔액</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', marginBottom: 18 }}>
          {loading ? '—' : formatKRW(totalBalance)}
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>이번달 수입</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#10B981' }}>+{formatKRW(totals.income)}</div>
          </div>
          <div style={{ flex: 1, paddingLeft: 16, borderLeft: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>이번달 지출</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#EF4444' }}>−{formatKRW(totals.expense)}</div>
          </div>
        </div>
      </section>

      {/* 이번 달 예산 */}
      <section style={{ margin: '18px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{monthNumber}월 예산</div>
          <button onClick={() => setCurrentPage('settings')} style={linkBtnStyle}>관리</button>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow)' }}>
          {loading ? (
            <div style={{ padding: '8px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>불러오는 중…</div>
          ) : !budgetSummary ? (
            <div style={{ padding: '8px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>설정된 예산이 없습니다</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>잔여 예산</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: budgetSummary.totalRemaining < 0 ? '#EF4444' : 'var(--text)' }}>
                  {formatKRW(budgetSummary.totalRemaining)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {budgets!.map((b) => {
                  const spent = b.category_id
                    ? expenseByCategory.get(b.category_id) ?? 0
                    : b.account_id
                    ? expenseByAccount.get(b.account_id) ?? 0
                    : 0
                  const ratio = b.limit_amount > 0 ? spent / b.limit_amount : 0
                  const remaining = b.limit_amount - spent
                  const barColor = ratio >= 1 ? '#EF4444' : ratio >= 0.8 ? '#D97706' : '#059669'
                  return (
                    <div key={b.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{b.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{formatKRW(spent)} / {formatKRW(b.limit_amount)}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: '#E2E8F0', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(ratio, 1) * 100}%`, background: barColor, borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: remaining < 0 ? '#EF4444' : 'var(--muted)' }}>
                          {remaining < 0 ? `${formatKRW(-remaining)} 초과` : `${formatKRW(remaining)} 남음`}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: barColor }}>{Math.round(ratio * 100)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 계좌 카드 */}
      <section style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 10px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>내 계좌</div>
          <button onClick={() => setCurrentPage('accounts')} style={linkBtnStyle}>전체 보기</button>
        </div>
        <div className="scroll-x" style={{ display: 'flex', gap: 12, padding: '0 20px 4px', scrollSnapType: 'x mandatory' }}>
          {accounts.length === 0 ? (
            <div style={{ width: '100%', padding: '24px', background: '#fff', borderRadius: 16, color: 'var(--muted)', fontSize: 13, textAlign: 'center', boxShadow: 'var(--shadow)' }}>
              {loading ? '불러오는 중…' : '계좌가 없습니다'}
            </div>
          ) : (
            accounts.map((a, idx) => {
              const balance = balances?.[a.id] ?? a.initial_balance
              const gradient = GRADIENTS[idx % GRADIENTS.length]
              return (
                <div
                  key={a.id}
                  style={{
                    width: 160, flexShrink: 0, background: gradient, borderRadius: 14,
                    padding: '14px 16px', color: '#fff', position: 'relative', overflow: 'hidden',
                    scrollSnapAlign: 'start', minHeight: 100, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  }}
                >
                  <div style={{ position: 'absolute', width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', top: -30, right: -30, pointerEvents: 'none' }} />
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 2 }}>{a.memo || '계좌'}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{a.name}</div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: 17, fontWeight: 800 }}>{formatKRW(balance)}</div>
                    <div style={{ fontSize: 10, opacity: 0.75, marginTop: 2 }}>잔액</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* 월별 지출 분석 */}
      <section style={{ marginTop: 20, padding: '0 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{monthNumber}월 지출 분석</div>
        <div style={{ background: '#fff', borderRadius: 16, padding: 18, boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 18 }}>
          <DonutChart
            slices={categoryBreakdown}
            centerLabel="지출"
            centerAmount={totals.expense > 0 ? formatCompactKRW(totals.expense) : '0원'}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categoryBreakdown.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>지출 내역이 없습니다</div>
            ) : (
              categoryBreakdown.map((s) => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: 'var(--text)', fontWeight: 500 }}>{s.label}</span>
                  <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{s.percentage.toFixed(0)}%</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{formatKRW(s.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 최근 거래 */}
      <section style={{ marginTop: 20, padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>최근 거래</div>
          <button onClick={() => setCurrentPage('transactions')} style={linkBtnStyle}>전체 보기</button>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          {recentTransactions.length === 0 ? (
            <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              {loading ? '불러오는 중…' : '거래 내역이 없습니다'}
            </div>
          ) : (
            recentTransactions.map((t, i) => {
              const cat = t.category_id ? categoriesById.get(t.category_id) ?? null : null
              const acc = accountsById.get(t.account_id)
              const isLast = i === recentTransactions.length - 1
              const iconBg = t.type === 'income' ? '#ECFDF5' : t.type === 'expense' ? '#FEF2F2' : '#EEF2FF'
              const amountColor = t.type === 'income' ? '#10B981' : t.type === 'expense' ? '#EF4444' : '#6366F1'
              const sign = t.type === 'income' ? '+' : t.type === 'expense' ? '−' : ''
              const name = t.memo || cat?.name || (t.type === 'income' ? '수입' : t.type === 'expense' ? '지출' : '이체')
              const metaParts: string[] = []
              if (cat?.name) metaParts.push(cat.name)
              metaParts.push(formatTxnDate(t.date))

              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {cat ? (
                      <CategoryIcon name={cat.name} size={18} color={amountColor} />
                    ) : t.type === 'income' ? (
                      <TrendingUp size={18} color="#10B981" strokeWidth={1.8} />
                    ) : t.type === 'expense' ? (
                      <TrendingDown size={18} color="#EF4444" strokeWidth={1.8} />
                    ) : (
                      <ArrowLeftRight size={18} color="#6366F1" strokeWidth={1.8} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{metaParts.join(' · ')}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: amountColor }}>{sign}{formatKRW(t.amount)}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{acc?.name ?? ''}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}

const iconButtonStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%', background: '#F1F5F9',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 16, border: 'none', cursor: 'pointer',
}

const monthNavBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#94A3B8',
  fontSize: 20, cursor: 'pointer', padding: '2px 6px', lineHeight: 1,
}

const linkBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'var(--primary)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0,
}
