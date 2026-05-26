import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Account } from '../types'
import { toAmount } from '../types'
import {
  getAccounts, createAccount, updateAccount, deleteAccount,
  computeAllBalances, getTransactionCountByAccountId,
} from '../db'
import { ulid } from '../utils/ulid'
import { formatKRW } from '../utils/format'
import { useAppStore } from '../stores/useAppStore'

const COLOR_PRESETS = ['#2563EB', '#7C3AED', '#D97706', '#059669', '#DC2626', '#0891B2']

interface FormState {
  id: string | null
  name: string
  initial_balance: string
  color: string
  memo: string
}

const emptyForm: FormState = { id: null, name: '', initial_balance: '0', color: COLOR_PRESETS[0], memo: '' }

export default function AccountsPage() {
  const showToast = useAppStore((s) => s.showToast)
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [showArchived, setShowArchived] = useState(false)

  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: getAccounts })
  const { data: balances = {} } = useQuery({ queryKey: ['balances'], queryFn: computeAllBalances })

  const activeAccounts = useMemo(() => accounts.filter((a) => !a.archived), [accounts])
  const archivedAccounts = useMemo(() => accounts.filter((a) => a.archived), [accounts])

  function openAddForm() {
    setForm({ ...emptyForm, color: COLOR_PRESETS[0] })
    setFormOpen(true)
  }

  function openEditForm(account: Account) {
    setForm({ id: account.id, name: account.name, initial_balance: String(account.initial_balance), color: account.color, memo: account.memo })
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setForm(emptyForm)
  }

  async function handleSave() {
    const name = form.name.trim()
    if (!name) { showToast('계좌 이름을 입력해주세요', 'error'); return }
    const balanceNum = parseInt(form.initial_balance, 10)
    if (isNaN(balanceNum) || balanceNum < 0) { showToast('초기 잔액은 0 이상의 정수여야 합니다', 'error'); return }

    try {
      if (form.id) {
        await updateAccount(form.id, { name, color: form.color, initial_balance: toAmount(balanceNum), memo: form.memo })
        showToast('계좌가 수정되었습니다')
      } else {
        const maxOrder = activeAccounts.reduce((m, a) => Math.max(m, a.sort_order), -1)
        await createAccount({
          id: ulid(), name, color: form.color, initial_balance: toAmount(balanceNum),
          memo: form.memo, sort_order: maxOrder + 1,
          created_at_utc: new Date().toISOString(), archived: false,
        })
        showToast('계좌가 추가되었습니다')
      }
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['balances'] })
      closeForm()
    } catch (e) {
      showToast(`저장 실패: ${(e as Error).message}`, 'error')
    }
  }

  async function handleDeleteOrArchive(account: Account) {
    const total = await getTransactionCountByAccountId(account.id)
    if (total > 0) {
      const ok = window.confirm(`${total}개 거래가 있습니다. 계좌를 보관하시겠습니까?\n(보관된 계좌는 거래 내역이 유지됩니다)`)
      if (!ok) return
      await updateAccount(account.id, { archived: true })
      showToast('계좌가 보관되었습니다')
    } else {
      const ok = window.confirm(`'${account.name}' 계좌를 삭제하시겠습니까?`)
      if (!ok) return
      await deleteAccount(account.id)
      showToast('계좌가 삭제되었습니다')
    }
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['balances'] })
  }

  async function handleUnarchive(account: Account) {
    await updateAccount(account.id, { archived: false })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    showToast('계좌가 복원되었습니다')
  }

  async function moveAccount(account: Account, direction: -1 | 1) {
    const idx = activeAccounts.findIndex((a) => a.id === account.id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= activeAccounts.length) return
    const other = activeAccounts[swapIdx]
    await Promise.all([
      updateAccount(account.id, { sort_order: other.sort_order }),
      updateAccount(other.id, { sort_order: account.sort_order }),
    ])
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
  }

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>계좌 관리</h1>
        <button onClick={openAddForm} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + 계좌 추가
        </button>
      </div>

      <div style={{ padding: '0 20px' }}>
        {activeAccounts.length === 0 ? (
          <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            계좌가 없습니다. 계좌를 추가해주세요.
          </div>
        ) : (
          activeAccounts.map((account, idx) => (
            <AccountCard
              key={account.id}
              account={account}
              balance={balances[account.id] ?? 0}
              isFirst={idx === 0}
              isLast={idx === activeAccounts.length - 1}
              onEdit={() => openEditForm(account)}
              onDelete={() => handleDeleteOrArchive(account)}
              onMoveUp={() => moveAccount(account, -1)}
              onMoveDown={() => moveAccount(account, 1)}
            />
          ))
        )}
      </div>

      {archivedAccounts.length > 0 && (
        <div style={{ padding: '20px 20px 0' }}>
          <button
            onClick={() => setShowArchived(!showArchived)}
            style={{ width: '100%', padding: '12px 16px', background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', border: 'none', fontSize: 14, color: 'var(--text)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>보관된 계좌 ({archivedAccounts.length})</span>
            <span style={{ color: 'var(--muted)' }}>{showArchived ? '▾' : '▸'}</span>
          </button>
          {showArchived && (
            <div style={{ marginTop: 12 }}>
              {archivedAccounts.map((account) => (
                <div key={account.id} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: account.color }} />
                    <span style={{ fontSize: 14, color: 'var(--text)' }}>{account.name}</span>
                  </div>
                  <button onClick={() => handleUnarchive(account)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>복원</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {formOpen && <AccountForm form={form} setForm={setForm} onCancel={closeForm} onSave={handleSave} isEdit={form.id !== null} />}
    </div>
  )
}

interface AccountCardProps {
  account: Account; balance: number; isFirst: boolean; isLast: boolean
  onEdit: () => void; onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void
}

function AccountCard({ account, balance, isFirst, isLast, onEdit, onDelete, onMoveUp, onMoveDown }: AccountCardProps) {
  const gradient = `linear-gradient(135deg, ${account.color} 0%, ${shadeColor(account.color, -20)} 100%)`
  return (
    <div style={{ background: gradient, borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', padding: 18, marginBottom: 12, color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 6 }}>계좌</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{account.name}</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatKRW(balance)}</div>
          {account.memo && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 8 }}>{account.memo}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={onMoveUp} disabled={isFirst} style={iconBtnStyle(isFirst)} aria-label="위로 이동">▲</button>
          <button onClick={onMoveDown} disabled={isLast} style={iconBtnStyle(isLast)} aria-label="아래로 이동">▼</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={onEdit} style={{ flex: 1, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 10, padding: '8px 0', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>편집</button>
        <button onClick={onDelete} style={{ flex: 1, background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: 10, padding: '8px 0', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>삭제/보관</button>
      </div>
    </div>
  )
}

function iconBtnStyle(disabled: boolean): React.CSSProperties {
  return { width: 28, height: 28, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.3 : 1 }
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, Math.min(255, (num >> 16) + amt))
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt))
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt))
  return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)
}

interface AccountFormProps {
  form: FormState; setForm: (f: FormState) => void
  onCancel: () => void; onSave: () => void; isEdit: boolean
}

function AccountForm({ form, setForm, onCancel, onSave, isEdit }: AccountFormProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>{isEdit ? '계좌 편집' : '계좌 추가'}</h2>
        <label style={labelStyle}>계좌 이름 *</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 신한 주거래" style={inputStyle} />
        <label style={labelStyle}>초기 잔액 (원)</label>
        <input type="number" inputMode="numeric" step="1" min="0" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: e.target.value })} style={inputStyle} />
        <label style={labelStyle}>색상</label>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {COLOR_PRESETS.map((c) => (
            <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{ width: 36, height: 36, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer' }} aria-label={c} />
          ))}
        </div>
        <label style={labelStyle}>메모 (선택)</label>
        <input type="text" value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} placeholder="예: 월급 입금 계좌" style={inputStyle} />
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 14, color: 'var(--text)', cursor: 'pointer' }}>취소</button>
          <button onClick={onSave} style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>저장</button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 6, marginTop: 4 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', marginBottom: 14, boxSizing: 'border-box' }
