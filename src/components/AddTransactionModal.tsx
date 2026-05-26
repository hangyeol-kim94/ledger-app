import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { TransactionType, Amount } from '../types'
import { db } from '../db'
import { ulid } from '../utils/ulid'
import { today } from '../utils/format'
import { useAppStore } from '../stores/useAppStore'

const TAB_COLORS: Record<TransactionType, string> = {
  expense: '#EF4444',
  income: '#10B981',
  transfer: '#6366F1',
}

const TAB_LABELS: Record<TransactionType, string> = {
  expense: '지출',
  income: '수입',
  transfer: '이체',
}

const CATEGORIES_WITH_EMOJI: Array<{ name: string; emoji: string }> = [
  { name: '식비', emoji: '🍚' },
  { name: '교통', emoji: '🚌' },
  { name: '주거', emoji: '🏠' },
  { name: '통신', emoji: '📱' },
  { name: '여가', emoji: '🎮' },
  { name: '의료', emoji: '💊' },
  { name: '급여', emoji: '💰' },
  { name: '기타', emoji: '📦' },
]

function getEmoji(name: string): string {
  return CATEGORIES_WITH_EMOJI.find((c) => c.name === name)?.emoji ?? '📦'
}

export default function AddTransactionModal() {
  const closeAddTransaction = useAppStore((s) => s.closeAddTransaction)
  const showToast = useAppStore((s) => s.showToast)

  const allAccounts = useLiveQuery(() => db.accounts.toArray(), [])
  const categories = useLiveQuery(() => db.categories.toArray(), [])

  const activeAccounts = (allAccounts ?? []).filter((a) => !a.archived)

  const [type, setType] = useState<TransactionType>('expense')
  const [amountRaw, setAmountRaw] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [fromAccountId, setFromAccountId] = useState<string>('')
  const [toAccountId, setToAccountId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(today())
  const [memo, setMemo] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Auto-select first account once loaded
  useEffect(() => {
    if (!fromAccountId && activeAccounts.length > 0) {
      setFromAccountId(activeAccounts[0].id)
    }
    if (!toAccountId && activeAccounts.length > 1) {
      setToAccountId(activeAccounts[1].id)
    } else if (!toAccountId && activeAccounts.length > 0) {
      setToAccountId(activeAccounts[0].id)
    }
  }, [activeAccounts, fromAccountId, toAccountId])

  const handleAmountChange = (v: string) => {
    const cleaned = v.replace(/[^0-9]/g, '')
    // Strip leading zeros
    const normalized = cleaned.replace(/^0+/, '') || ''
    setAmountRaw(normalized)
  }

  const amountInt = amountRaw === '' ? 0 : parseInt(amountRaw, 10)
  const amountDisplay = amountRaw === '' ? '' : Number(amountRaw).toLocaleString('ko-KR')

  const handleClose = useCallback(() => {
    closeAddTransaction()
  }, [closeAddTransaction])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleClose])

  async function handleSave() {
    if (saving) return

    if (amountInt <= 0) {
      showToast('금액을 입력하세요', 'error')
      return
    }
    if (!fromAccountId) {
      showToast('계좌를 선택하세요', 'error')
      return
    }
    if (type === 'transfer') {
      if (!toAccountId) {
        showToast('받는 계좌를 선택하세요', 'error')
        return
      }
      if (fromAccountId === toAccountId) {
        showToast('보내는/받는 계좌가 같을 수 없습니다', 'error')
        return
      }
    } else {
      if (!selectedCategoryId) {
        showToast('카테고리를 선택하세요', 'error')
        return
      }
    }

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const id = ulid()

      if (type !== 'transfer') {
        await db.transactions.add({
          id,
          type,
          amount: amountInt as Amount,
          account_id: fromAccountId,
          to_account_id: null,
          date: selectedDate,
          category_id: selectedCategoryId,
          memo,
          created_at_utc: now,
          updated_at_utc: now,
          deleted_at_utc: null,
        })
      } else {
        await db.transactions.add({
          id,
          type: 'transfer',
          amount: amountInt as Amount,
          account_id: fromAccountId,
          to_account_id: toAccountId,
          date: selectedDate,
          category_id: null,
          memo,
          created_at_utc: now,
          updated_at_utc: now,
          deleted_at_utc: null,
        })
      }

      showToast('거래가 저장되었습니다')
      closeAddTransaction()
    } catch (err) {
      console.error(err)
      showToast('저장에 실패했습니다', 'error')
    } finally {
      setSaving(false)
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    animation: 'fadeIn 0.18s ease',
  }

  const panelStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 430,
    background: '#FFFFFF',
    borderRadius: '24px 24px 0 0',
    padding: '12px 20px 32px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
  }

  const dragHandleStyle: React.CSSProperties = {
    width: 36,
    height: 4,
    background: '#E2E8F0',
    borderRadius: 2,
    margin: '4px auto 16px',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  }

  const tabsWrapperStyle: React.CSSProperties = {
    display: 'flex',
    background: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  }

  const tabStyle = (t: TransactionType): React.CSSProperties => ({
    flex: 1,
    padding: '10px 0',
    background: type === t ? '#FFFFFF' : 'transparent',
    color: type === t ? TAB_COLORS[t] : '#94A3B8',
    fontWeight: type === t ? 700 : 500,
    fontSize: 14,
    borderRadius: 8,
    boxShadow: type === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
    transition: 'all 0.15s',
  })

  const amountInputStyle: React.CSSProperties = {
    width: '100%',
    border: 'none',
    outline: 'none',
    textAlign: 'center',
    fontSize: 32,
    fontWeight: 700,
    color: amountInt > 0 ? TAB_COLORS[type] : '#1E293B',
    padding: '20px 0',
    background: 'transparent',
  }

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#94A3B8',
    marginBottom: 8,
    marginTop: 16,
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #E2E8F0',
    borderRadius: 12,
    background: '#FFFFFF',
    color: '#1E293B',
    fontSize: 14,
    outline: 'none',
  }

  const inputStyle: React.CSSProperties = {
    ...selectStyle,
  }

  const categoryGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  }

  const saveButtonStyle: React.CSSProperties = {
    width: '100%',
    background: '#2563EB',
    color: '#FFFFFF',
    padding: '14px 0',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 700,
    marginTop: 24,
    opacity: saving ? 0.6 : 1,
  }

  // Match emoji to actual DB categories
  const categoryItems = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    emoji: getEmoji(c.name),
  }))

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="거래 추가"
    >
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={dragHandleStyle} />

        <div style={headerStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1E293B' }}>거래 추가</h2>
          <button
            onClick={handleClose}
            aria-label="닫기"
            style={{
              background: 'transparent',
              fontSize: 24,
              color: '#94A3B8',
              padding: 4,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={tabsWrapperStyle}>
          {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
            <button
              key={t}
              style={tabStyle(t)}
              onClick={() => {
                setType(t)
                if (t === 'transfer') setSelectedCategoryId(null)
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={amountDisplay}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder="0"
          style={amountInputStyle}
          aria-label="금액"
        />
        <div
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: '#94A3B8',
            marginTop: -8,
            marginBottom: 8,
          }}
        >
          원
        </div>

        {type !== 'transfer' && (
          <>
            <div style={fieldLabelStyle}>카테고리</div>
            <div style={categoryGridStyle}>
              {categoryItems.map((cat) => {
                const active = selectedCategoryId === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '12px 4px',
                      borderRadius: 12,
                      border: active ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                      background: active ? '#EFF6FF' : '#FFFFFF',
                      color: '#1E293B',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 500 }}>{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div style={fieldLabelStyle}>{type === 'transfer' ? '보내는 계좌' : '계좌'}</div>
        <select
          value={fromAccountId}
          onChange={(e) => setFromAccountId(e.target.value)}
          style={selectStyle}
        >
          <option value="">계좌 선택</option>
          {activeAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        {type === 'transfer' && (
          <>
            <div style={fieldLabelStyle}>받는 계좌</div>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              style={selectStyle}
            >
              <option value="">계좌 선택</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </>
        )}

        <div style={fieldLabelStyle}>날짜</div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={inputStyle}
        />

        <div style={fieldLabelStyle}>메모 (선택)</div>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="메모를 입력하세요"
          style={inputStyle}
          maxLength={100}
        />

        <button onClick={handleSave} disabled={saving} style={saveButtonStyle}>
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  )
}
