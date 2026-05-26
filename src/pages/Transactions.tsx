import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { TransactionType, Transaction } from '../types'
import { db } from '../db'
import { formatKRW, formatKRWSigned, formatDateKorean, formatMonthKorean, navigateMonth } from '../utils/format'
import { useAppStore } from '../stores/useAppStore'

const CATEGORY_EMOJI: Record<string, string> = {
  '식비': '🍚',
  '교통': '🚌',
  '주거': '🏠',
  '통신': '📱',
  '여가': '🎮',
  '의료': '💊',
  '급여': '💰',
  '교육': '📚',
  '기타': '📦',
}

const TYPE_LABEL: Record<TransactionType, string> = {
  income: '수입',
  expense: '지출',
  transfer: '이체',
}

const TYPE_COLOR: Record<TransactionType, string> = {
  income: '#10B981',
  expense: '#EF4444',
  transfer: '#6366F1',
}

export default function TransactionsPage() {
  const selectedMonth = useAppStore((s) => s.selectedMonth)
  const setSelectedMonth = useAppStore((s) => s.setSelectedMonth)
  const showToast = useAppStore((s) => s.showToast)

  const [filterAccountId, setFilterAccountId] = useState<string | null>(null)
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<TransactionType | null>(null)

  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? []
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? []

  const accountMap = useMemo(() => {
    const m = new Map<string, string>()
    accounts.forEach((a) => m.set(a.id, a.name))
    return m
  }, [accounts])

  const categoryMap = useMemo(() => {
    const m = new Map<string, string>()
    categories.forEach((c) => m.set(c.id, c.name))
    return m
  }, [categories])

  const transactions = useLiveQuery(
    () =>
      db.transactions
        .where('date')
        .between(`${selectedMonth}-01`, `${selectedMonth}-31`, true, true)
        .filter((t) => {
          if (t.deleted_at_utc !== null) return false
          if (
            filterAccountId &&
            t.account_id !== filterAccountId &&
            t.to_account_id !== filterAccountId
          )
            return false
          if (filterCategoryId && t.category_id !== filterCategoryId) return false
          if (filterType && t.type !== filterType) return false
          return true
        })
        .sortBy('date'),
    [selectedMonth, filterAccountId, filterCategoryId, filterType]
  )

  const list = transactions ?? []

  // Summary
  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of list) {
      if (t.type === 'income') income += t.amount
      else if (t.type === 'expense') expense += t.amount
    }
    return { income, expense, count: list.length }
  }, [list])

  // Group by date, newest first
  const grouped = useMemo(() => {
    const groups = new Map<string, Transaction[]>()
    for (const t of list) {
      const arr = groups.get(t.date) ?? []
      arr.push(t)
      groups.set(t.date, arr)
    }
    const sortedDates = Array.from(groups.keys()).sort((a, b) => (a < b ? 1 : -1))
    return sortedDates.map((date) => ({
      date,
      items: groups.get(date)!.sort((a, b) =>
        a.created_at_utc < b.created_at_utc ? 1 : -1
      ),
    }))
  }, [list])

  async function handleDelete(id: string) {
    try {
      await db.transactions.update(id, {
        deleted_at_utc: new Date().toISOString(),
        updated_at_utc: new Date().toISOString(),
      })
      showToast('거래가 삭제되었습니다')
    } catch (err) {
      console.error(err)
      showToast('삭제에 실패했습니다', 'error')
    }
  }

  function resetFilters() {
    setFilterAccountId(null)
    setFilterCategoryId(null)
    setFilterType(null)
  }

  const hasActiveFilters =
    filterAccountId !== null || filterCategoryId !== null || filterType !== null

  // Styles
  const monthNavStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: '12px 20px',
    background: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
  }

  const arrowBtnStyle: React.CSSProperties = {
    background: 'transparent',
    color: '#1E293B',
    fontSize: 18,
    padding: '4px 10px',
    borderRadius: 8,
  }

  const filterBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    padding: '12px 20px',
    overflowX: 'auto',
    background: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    flexShrink: 0,
    padding: '6px 12px',
    borderRadius: 999,
    background: active ? '#EFF6FF' : '#F1F5F9',
    color: active ? '#2563EB' : '#1E293B',
    border: active ? '1px solid #2563EB' : '1px solid transparent',
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  })

  const summaryStyle: React.CSSProperties = {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    padding: '12px 20px',
    background: '#F8FAFC',
    fontSize: 13,
    color: '#1E293B',
    borderBottom: '1px solid #E2E8F0',
  }

  const dateHeaderStyle: React.CSSProperties = {
    padding: '14px 20px 6px',
    fontSize: 13,
    fontWeight: 600,
    color: '#94A3B8',
    background: '#F8FAFC',
  }

  const itemRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 20px',
    background: '#FFFFFF',
    borderBottom: '1px solid #F1F5F9',
  }

  const iconCircleStyle = (color: string): React.CSSProperties => ({
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: color + '1A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1>거래내역</h1>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            style={{
              background: 'transparent',
              color: '#2563EB',
              fontSize: 13,
              fontWeight: 600,
              padding: '4px 8px',
            }}
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* Month navigation */}
      <div style={monthNavStyle}>
        <button
          style={arrowBtnStyle}
          onClick={() => setSelectedMonth(navigateMonth(selectedMonth, -1))}
          aria-label="이전 달"
        >
          ‹
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', minWidth: 100, textAlign: 'center' }}>
          {formatMonthKorean(selectedMonth)}
        </div>
        <button
          style={arrowBtnStyle}
          onClick={() => setSelectedMonth(navigateMonth(selectedMonth, 1))}
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      {/* Type filter chips */}
      <div style={filterBarStyle} className="scroll-x">
        <button style={chipStyle(filterType === null)} onClick={() => setFilterType(null)}>
          전체
        </button>
        {(['income', 'expense', 'transfer'] as TransactionType[]).map((t) => (
          <button
            key={t}
            style={{
              ...chipStyle(filterType === t),
              color: filterType === t ? TYPE_COLOR[t] : '#1E293B',
              borderColor: filterType === t ? TYPE_COLOR[t] : 'transparent',
              background: filterType === t ? TYPE_COLOR[t] + '14' : '#F1F5F9',
            }}
            onClick={() => setFilterType(t)}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}

        {/* Account filter */}
        <select
          value={filterAccountId ?? ''}
          onChange={(e) => setFilterAccountId(e.target.value || null)}
          style={{
            ...chipStyle(filterAccountId !== null),
            border: filterAccountId !== null ? '1px solid #2563EB' : '1px solid transparent',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">전체 계좌</option>
          {accounts
            .filter((a) => !a.archived)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>

        {/* Category filter */}
        <select
          value={filterCategoryId ?? ''}
          onChange={(e) => setFilterCategoryId(e.target.value || null)}
          style={{
            ...chipStyle(filterCategoryId !== null),
            border: filterCategoryId !== null ? '1px solid #2563EB' : '1px solid transparent',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">전체 카테고리</option>
          {categories
            .filter((c) => !c.archived)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>

      {/* Summary bar */}
      <div style={summaryStyle}>
        <span style={{ fontWeight: 600 }}>{summary.count}건</span>
        <span style={{ color: '#10B981', fontWeight: 600 }}>
          수입 +{formatKRW(summary.income)}
        </span>
        <span style={{ color: '#EF4444', fontWeight: 600 }}>
          지출 -{formatKRW(summary.expense)}
        </span>
      </div>

      {/* Transaction list */}
      {grouped.length === 0 ? (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#94A3B8',
            fontSize: 14,
          }}
        >
          거래내역이 없습니다
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.date}>
            <div style={dateHeaderStyle}>{formatDateKorean(group.date)}</div>
            {group.items.map((t) => {
              const catName = t.category_id ? categoryMap.get(t.category_id) : null
              const emoji =
                t.type === 'transfer'
                  ? '🔁'
                  : catName
                    ? (CATEGORY_EMOJI[catName] ?? '📦')
                    : t.type === 'income'
                      ? '💰'
                      : '📦'
              const color = TYPE_COLOR[t.type]
              const accountName = accountMap.get(t.account_id) ?? '알 수 없음'
              const toAccountName =
                t.to_account_id !== null ? (accountMap.get(t.to_account_id) ?? '알 수 없음') : null

              const title =
                t.type === 'transfer'
                  ? '계좌 이체'
                  : (catName ?? (t.type === 'income' ? '수입' : '지출'))

              const meta =
                t.type === 'transfer'
                  ? `${accountName} → ${toAccountName}`
                  : t.memo || accountName

              return (
                <div key={t.id} style={itemRowStyle}>
                  <div style={iconCircleStyle(color)}>{emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#1E293B',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#94A3B8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: 2,
                      }}
                    >
                      {meta}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatKRWSigned(t.amount, t.type)}
                    </div>
                    {t.type !== 'transfer' && (
                      <div
                        style={{
                          fontSize: 11,
                          color: '#94A3B8',
                          marginTop: 2,
                        }}
                      >
                        {accountName}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('이 거래를 삭제하시겠습니까?')) handleDelete(t.id)
                    }}
                    aria-label="삭제"
                    style={{
                      background: 'transparent',
                      color: '#94A3B8',
                      fontSize: 18,
                      padding: 4,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}
