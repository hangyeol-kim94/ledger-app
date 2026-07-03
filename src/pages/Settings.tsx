import { useState, useRef, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Category, Budget, Account } from '../types'
import { toAmount } from '../types'
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getAccounts, getAllTransactions, getActiveTransactions, getMeta, updateMeta,
  getTransactionCountByCategoryId,
  getBudgets, getBudgetsByMonth, createBudget, updateBudget, deleteBudget,
} from '../db'
import { importWithMigration } from '../db/migrations'
import { ulid } from '../utils/ulid'
import { formatKRW, currentMonth, formatMonthKorean, navigateMonth } from '../utils/format'
import { useAppStore } from '../stores/useAppStore'
import { CategoryIcon } from '../utils/categoryIcons'

const COLOR_PRESETS = ['#2563EB', '#7C3AED', '#D97706', '#059669', '#DC2626', '#0891B2']
const APP_VERSION = '1.0.0'
const SCHEMA_VERSION = 1

type BudgetLinkType = 'none' | 'category' | 'account'

interface BudgetFormState {
  id: string | null
  name: string
  linkType: BudgetLinkType
  category_id: string
  account_id: string
  limit_amount: string
}

const emptyBudgetForm: BudgetFormState = { id: null, name: '', linkType: 'none', category_id: '', account_id: '', limit_amount: '' }

export default function SettingsPage() {
  const showToast = useAppStore((s) => s.showToast)
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const { data: accountsForBudget = [] } = useQuery({ queryKey: ['accounts'], queryFn: getAccounts })
  const { data: meta } = useQuery({ queryKey: ['meta'], queryFn: getMeta })

  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(COLOR_PRESETS[0])
  const [newCatParentId, setNewCatParentId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingColor, setEditingColor] = useState('')
  const [showArchivedCats, setShowArchivedCats] = useState(false)

  const [budgetMonth, setBudgetMonth] = useState(currentMonth())
  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets', budgetMonth],
    queryFn: () => getBudgetsByMonth(budgetMonth),
  })
  const [budgetForm, setBudgetForm] = useState<BudgetFormState>(emptyBudgetForm)
  const [budgetFormOpen, setBudgetFormOpen] = useState(false)
  const activeCatsForBudget = useMemo(() => categories.filter((c) => !c.archived), [categories])
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const activeAccountsForBudget = useMemo(() => accountsForBudget.filter((a) => !a.archived), [accountsForBudget])
  const accountsById = useMemo(() => new Map(accountsForBudget.map((a) => [a.id, a])), [accountsForBudget])

  const activeCats = useMemo(() => categories.filter((c) => !c.archived), [categories])
  const archivedCats = useMemo(() => categories.filter((c) => c.archived), [categories])

  const parentCats = useMemo(() => activeCats.filter((c) => c.parent_id === null), [activeCats])
  const childCatsMap = useMemo(() => {
    const map = new Map<string, Category[]>()
    for (const cat of activeCats) {
      if (cat.parent_id) {
        const arr = map.get(cat.parent_id) ?? []
        arr.push(cat)
        map.set(cat.parent_id, arr)
      }
    }
    return map
  }, [activeCats])

  async function exportJSON() {
    try {
      const [accounts, transactions, cats, budgets, m] = await Promise.all([
        getAccounts(),
        getAllTransactions(),
        getCategories(),
        getBudgets(),
        getMeta(),
      ])
      const data = {
        schema_version: m?.schema_version ?? SCHEMA_VERSION,
        app_version: m?.app_version ?? APP_VERSION,
        exported_at: new Date().toISOString(),
        accounts, transactions, categories: cats, budgets,
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `가계부-백업-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      await updateMeta({ last_export_at_utc: new Date().toISOString() })
      queryClient.invalidateQueries({ queryKey: ['meta'] })
      showToast('JSON 내보내기 완료')
    } catch (e) {
      showToast(`내보내기 실패: ${(e as Error).message}`, 'error')
    }
  }

  async function exportCSV() {
    try {
      const [transactions, accounts, cats] = await Promise.all([
        getActiveTransactions(),
        getAccounts(),
        getCategories(),
      ])
      const accMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]))
      const catMap = Object.fromEntries(cats.map((c) => [c.id, c.name]))
      const header = '날짜,계좌,카테고리,금액(원),메모,유형'
      const rows = transactions.map((t) =>
        [
          t.date,
          accMap[t.account_id] ?? '',
          t.category_id ? (catMap[t.category_id] ?? '') : '',
          t.amount.toString(),
          `"${(t.memo ?? '').replace(/"/g, '""')}"`,
          t.type === 'income' ? '수입' : t.type === 'expense' ? '지출' : '이체',
        ].join(',')
      )
      const csv = [header, ...rows].join('\r\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `가계부-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast('CSV 내보내기 완료')
    } catch (e) {
      showToast(`내보내기 실패: ${(e as Error).message}`, 'error')
    }
  }

  function triggerImport() {
    fileInputRef.current?.click()
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.schema_version || !Array.isArray(data.accounts) || !Array.isArray(data.transactions)) {
        showToast('올바르지 않은 파일 형식입니다', 'error'); return
      }
      if (data.schema_version > SCHEMA_VERSION) {
        showToast(`지원하지 않는 스키마 버전: v${data.schema_version}`, 'error'); return
      }
      const confirmed = window.confirm(
        `데이터를 가져오면 현재 데이터가 모두 교체됩니다.\n거래 ${data.transactions.length}건, 계좌 ${data.accounts.length}개를 가져옵니다.\n계속하시겠습니까?`
      )
      if (!confirmed) return
      await importWithMigration(data)
      queryClient.invalidateQueries()
      showToast(`데이터 가져오기 완료 (거래 ${data.transactions.length}건)`)
    } catch (e) {
      showToast(`가져오기 실패: ${(e as Error).message}`, 'error')
    }
  }

  async function addCategory() {
    const name = newCatName.trim()
    if (!name) { showToast('카테고리 이름을 입력해주세요', 'error'); return }
    await createCategory({
      id: ulid(), name, color: newCatColor,
      parent_id: newCatParentId || null,
      archived: false, created_at_utc: new Date().toISOString(),
    })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    setNewCatName('')
    setNewCatColor(COLOR_PRESETS[0])
    setNewCatParentId('')
    showToast('카테고리가 추가되었습니다')
  }

  function startEditCat(cat: Category) { setEditingId(cat.id); setEditingName(cat.name); setEditingColor(cat.color) }
  function cancelEditCat() { setEditingId(null); setEditingName(''); setEditingColor('') }

  async function saveEditCat() {
    if (!editingId) return
    const name = editingName.trim()
    if (!name) { showToast('카테고리 이름을 입력해주세요', 'error'); return }
    await updateCategory(editingId, { name, color: editingColor })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    cancelEditCat()
    showToast('카테고리가 수정되었습니다')
  }

  async function deleteOrArchiveCat(cat: Category) {
    const count = await getTransactionCountByCategoryId(cat.id)
    if (count > 0) {
      const ok = window.confirm(`${count}개 거래가 있습니다. 카테고리를 보관하시겠습니까?`)
      if (!ok) return
      await updateCategory(cat.id, { archived: true })
      showToast('카테고리가 보관되었습니다')
    } else {
      const ok = window.confirm(`'${cat.name}' 카테고리를 삭제하시겠습니까?`)
      if (!ok) return
      await deleteCategory(cat.id)
      showToast('카테고리가 삭제되었습니다')
    }
    queryClient.invalidateQueries({ queryKey: ['categories'] })
  }

  async function unarchiveCat(cat: Category) {
    await updateCategory(cat.id, { archived: false })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    showToast('카테고리가 복원되었습니다')
  }

  function openAddBudgetForm() {
    setBudgetForm(emptyBudgetForm)
    setBudgetFormOpen(true)
  }

  function openEditBudgetForm(b: Budget) {
    const linkType: BudgetLinkType = b.category_id ? 'category' : b.account_id ? 'account' : 'none'
    setBudgetForm({
      id: b.id, name: b.name, linkType,
      category_id: b.category_id ?? '', account_id: b.account_id ?? '',
      limit_amount: String(b.limit_amount),
    })
    setBudgetFormOpen(true)
  }

  function closeBudgetForm() {
    setBudgetFormOpen(false)
    setBudgetForm(emptyBudgetForm)
  }

  function onBudgetLinkTypeChange(linkType: BudgetLinkType) {
    setBudgetForm({ ...budgetForm, linkType, category_id: '', account_id: '' })
  }

  function onBudgetCategoryChange(categoryId: string) {
    const cat = categoryId ? categoriesById.get(categoryId) : undefined
    setBudgetForm({
      ...budgetForm,
      category_id: categoryId,
      name: budgetForm.name.trim() === '' && cat ? cat.name : budgetForm.name,
    })
  }

  function onBudgetAccountChange(accountId: string) {
    const acc = accountId ? accountsById.get(accountId) : undefined
    setBudgetForm({
      ...budgetForm,
      account_id: accountId,
      name: budgetForm.name.trim() === '' && acc ? acc.name : budgetForm.name,
    })
  }

  async function saveBudget() {
    const name = budgetForm.name.trim()
    if (!name) { showToast('예산 이름을 입력해주세요', 'error'); return }
    const limitNum = parseInt(budgetForm.limit_amount, 10)
    if (isNaN(limitNum) || limitNum < 0) { showToast('한도는 0 이상의 정수여야 합니다', 'error'); return }

    const category_id = budgetForm.linkType === 'category' ? (budgetForm.category_id || null) : null
    const account_id = budgetForm.linkType === 'account' ? (budgetForm.account_id || null) : null

    try {
      if (budgetForm.id) {
        await updateBudget(budgetForm.id, { name, category_id, account_id, limit_amount: toAmount(limitNum) })
        showToast('예산이 수정되었습니다')
      } else {
        await createBudget({
          id: ulid(), name, category_id, account_id,
          month: budgetMonth, limit_amount: toAmount(limitNum), created_at_utc: new Date().toISOString(),
        })
        showToast('예산이 추가되었습니다')
      }
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      closeBudgetForm()
    } catch (e) {
      showToast(`저장 실패: ${(e as Error).message}`, 'error')
    }
  }

  async function removeBudget(b: Budget) {
    const ok = window.confirm(`'${b.name}' 예산을 삭제하시겠습니까?`)
    if (!ok) return
    await deleteBudget(b.id)
    queryClient.invalidateQueries({ queryKey: ['budgets'] })
    showToast('예산이 삭제되었습니다')
  }

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <div className="page-header" style={{ padding: '20px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>설정</h1>
      </div>

      <SectionTitle>데이터 관리</SectionTitle>
      <Section>
        <SettingRow onClick={exportJSON} label="데이터 내보내기 (JSON)" />
        <SettingRow onClick={exportCSV} label="데이터 내보내기 (CSV)" />
        <SettingRow onClick={triggerImport} label="데이터 가져오기" isLast />
        <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleImportFile} style={{ display: 'none' }} />
      </Section>

      <SectionTitle>카테고리 관리</SectionTitle>
      <Section>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="새 카테고리 이름" style={{ flex: 1, padding: '8px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)' }} />
            <button onClick={addCategory} style={{ padding: '8px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>추가</button>
          </div>
          <select
            value={newCatParentId}
            onChange={(e) => setNewCatParentId(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', marginBottom: 10 }}
          >
            <option value="">최상위 카테고리 (없음)</option>
            {parentCats.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLOR_PRESETS.map((c) => (
              <button key={c} type="button" onClick={() => setNewCatColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: newCatColor === c ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer' }} aria-label={c} />
            ))}
          </div>
        </div>

        {activeCats.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>카테고리가 없습니다</div>
        ) : (
          parentCats.map((parent, parentIdx) => {
            const children = childCatsMap.get(parent.id) ?? []
            const isLastParent = parentIdx === parentCats.length - 1 && archivedCats.length === 0
            if (children.length === 0) {
              return (
                <CategoryRow
                  key={parent.id} cat={parent}
                  isLast={isLastParent}
                  isEditing={editingId === parent.id}
                  editingName={editingName} editingColor={editingColor}
                  setEditingName={setEditingName} setEditingColor={setEditingColor}
                  onStartEdit={() => startEditCat(parent)} onCancelEdit={cancelEditCat} onSaveEdit={saveEditCat}
                  onDelete={() => deleteOrArchiveCat(parent)}
                />
              )
            }
            return (
              <div key={parent.id}>
                <div style={{ padding: '10px 20px 4px', display: 'flex', alignItems: 'center', gap: 8, borderTop: parentIdx === 0 ? 'none' : '1px solid var(--border)', background: 'var(--bg)' }}>
                  <CategoryIcon name={parent.name} size={14} color={parent.color} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{parent.name}</span>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => startEditCat(parent)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: 'var(--text)', cursor: 'pointer' }}>편집</button>
                  <button onClick={() => deleteOrArchiveCat(parent)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: 'var(--expense)', cursor: 'pointer' }}>삭제</button>
                </div>
                {editingId === parent.id && (
                  <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} style={{ flex: 1, padding: '6px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)' }} />
                      <button onClick={saveEditCat} style={{ padding: '6px 10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>저장</button>
                      <button onClick={cancelEditCat} style={{ padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>취소</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {COLOR_PRESETS.map((c) => (
                        <button key={c} type="button" onClick={() => setEditingColor(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: editingColor === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} aria-label={c} />
                      ))}
                    </div>
                  </div>
                )}
                {children.map((child, childIdx) => (
                  <CategoryRow
                    key={child.id} cat={child}
                    isLast={isLastParent && childIdx === children.length - 1}
                    isEditing={editingId === child.id}
                    editingName={editingName} editingColor={editingColor}
                    setEditingName={setEditingName} setEditingColor={setEditingColor}
                    onStartEdit={() => startEditCat(child)} onCancelEdit={cancelEditCat} onSaveEdit={saveEditCat}
                    onDelete={() => deleteOrArchiveCat(child)}
                    indent
                  />
                ))}
              </div>
            )
          })
        )}

        {archivedCats.length > 0 && (
          <>
            <button onClick={() => setShowArchivedCats(!showArchivedCats)} style={{ width: '100%', padding: '12px 20px', background: 'none', border: 'none', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--muted)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>보관된 카테고리 ({archivedCats.length})</span>
              <span>{showArchivedCats ? '▾' : '▸'}</span>
            </button>
            {showArchivedCats && archivedCats.map((cat) => (
              <div key={cat.id} style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', opacity: 0.7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CategoryIcon name={cat.name} size={14} color={cat.color} />
                  <span style={{ fontSize: 14, color: 'var(--text)' }}>{cat.name}</span>
                </div>
                <button onClick={() => unarchiveCat(cat)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>복원</button>
              </div>
            ))}
          </>
        )}
      </Section>

      <SectionTitle>예산 관리</SectionTitle>
      <Section>
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setBudgetMonth(navigateMonth(budgetMonth, -1))} style={monthNavBtnStyle}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{formatMonthKorean(budgetMonth)}</span>
          <button onClick={() => setBudgetMonth(navigateMonth(budgetMonth, 1))} style={monthNavBtnStyle}>›</button>
        </div>

        {budgets.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>설정된 예산이 없습니다</div>
        ) : (
          budgets.map((b, idx) => {
            const cat = b.category_id ? categoriesById.get(b.category_id) ?? null : null
            const acc = b.account_id ? accountsById.get(b.account_id) ?? null : null
            const linkLabel = cat ? cat.name : acc ? acc.name : '자유 항목'
            return (
              <div key={b.id} style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx === budgets.length - 1 ? 'none' : '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {cat && <CategoryIcon name={cat.name} size={14} color={cat.color} />}
                  {acc && <span style={{ width: 10, height: 10, borderRadius: '50%', background: acc.color, flexShrink: 0 }} />}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{formatKRW(b.limit_amount)} · {linkLabel}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEditBudgetForm(b)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>편집</button>
                  <button onClick={() => removeBudget(b)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--expense)', cursor: 'pointer' }}>삭제</button>
                </div>
              </div>
            )
          })
        )}

        <button onClick={openAddBudgetForm} style={{ width: '100%', padding: '14px 20px', background: 'none', border: 'none', borderTop: budgets.length > 0 ? '1px solid var(--border)' : 'none', fontSize: 13, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', textAlign: 'left' }}>
          + 예산 추가
        </button>
      </Section>

      <SectionTitle>앱 정보</SectionTitle>
      <Section>
        <InfoRow label="버전" value={meta?.app_version ?? APP_VERSION} />
        <InfoRow label="스키마 버전" value={String(meta?.schema_version ?? SCHEMA_VERSION)} />
        <InfoRow label="마지막 백업" value={meta?.last_export_at_utc ? new Date(meta.last_export_at_utc).toLocaleString('ko-KR') : '없음'} isLast />
      </Section>

      {budgetFormOpen && (
        <BudgetForm
          form={budgetForm}
          setForm={setBudgetForm}
          categories={activeCatsForBudget}
          accounts={activeAccountsForBudget}
          onLinkTypeChange={onBudgetLinkTypeChange}
          onCategoryChange={onBudgetCategoryChange}
          onAccountChange={onBudgetAccountChange}
          onCancel={closeBudgetForm}
          onSave={saveBudget}
          isEdit={budgetForm.id !== null}
        />
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', padding: '8px 20px 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</div>
}

function Section({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', margin: '0 20px 16px', overflow: 'hidden' }}>{children}</div>
}

function SettingRow({ label, onClick, isLast = false }: { label: string; onClick: () => void; isLast?: boolean }) {
  return (
    <button onClick={onClick} style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', borderBottom: isLast ? 'none' : '1px solid var(--border)', fontSize: 14, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
      <span>{label}</span>
      <span style={{ color: 'var(--muted)' }}>›</span>
    </button>
  )
}

function InfoRow({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: isLast ? 'none' : '1px solid var(--border)', fontSize: 14 }}>
      <span style={{ color: 'var(--text)' }}>{label}</span>
      <span style={{ color: 'var(--muted)' }}>{value}</span>
    </div>
  )
}

const monthNavBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#94A3B8',
  fontSize: 18, cursor: 'pointer', padding: '2px 8px', lineHeight: 1,
}

interface BudgetFormProps {
  form: BudgetFormState; setForm: (f: BudgetFormState) => void
  categories: Category[]; accounts: Account[]
  onLinkTypeChange: (linkType: BudgetLinkType) => void
  onCategoryChange: (categoryId: string) => void
  onAccountChange: (accountId: string) => void
  onCancel: () => void; onSave: () => void; isEdit: boolean
}

const LINK_TYPE_OPTIONS: Array<{ value: BudgetLinkType; label: string }> = [
  { value: 'none', label: '자유 항목' },
  { value: 'category', label: '카테고리' },
  { value: 'account', label: '계좌' },
]

function BudgetForm({ form, setForm, categories, accounts, onLinkTypeChange, onCategoryChange, onAccountChange, onCancel, onSave, isEdit }: BudgetFormProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: 24, maxHeight: '85vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 20, color: 'var(--text)' }}>{isEdit ? '예산 편집' : '예산 추가'}</h2>
        <label style={budgetLabelStyle}>연결 대상</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {LINK_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onLinkTypeChange(opt.value)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                border: form.linkType === opt.value ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: form.linkType === opt.value ? 'var(--primary)' : 'var(--bg)',
                color: form.linkType === opt.value ? '#fff' : 'var(--text)', fontWeight: 600,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {form.linkType === 'category' && (
          <>
            <label style={budgetLabelStyle}>카테고리 선택</label>
            <select value={form.category_id} onChange={(e) => onCategoryChange(e.target.value)} style={budgetInputStyle}>
              <option value="">카테고리 선택</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </>
        )}
        {form.linkType === 'account' && (
          <>
            <label style={budgetLabelStyle}>계좌 선택</label>
            <select value={form.account_id} onChange={(e) => onAccountChange(e.target.value)} style={budgetInputStyle}>
              <option value="">계좌 선택</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </>
        )}
        <label style={budgetLabelStyle}>예산 이름 *</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 비상금" style={budgetInputStyle} />
        <label style={budgetLabelStyle}>한도 (원)</label>
        <input type="number" inputMode="numeric" step="1" min="0" value={form.limit_amount} onChange={(e) => setForm({ ...form, limit_amount: e.target.value })} style={budgetInputStyle} />
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 14, color: 'var(--text)', cursor: 'pointer' }}>취소</button>
          <button onClick={onSave} style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>저장</button>
        </div>
      </div>
    </div>
  )
}

const budgetLabelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 6, marginTop: 4 }
const budgetInputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--text)', marginBottom: 14, boxSizing: 'border-box' }

interface CategoryRowProps {
  cat: Category; isLast: boolean; isEditing: boolean
  editingName: string; editingColor: string
  setEditingName: (v: string) => void; setEditingColor: (v: string) => void
  onStartEdit: () => void; onCancelEdit: () => void; onSaveEdit: () => void; onDelete: () => void
  indent?: boolean
}

function CategoryRow({ cat, isLast, isEditing, editingName, editingColor, setEditingName, setEditingColor, onStartEdit, onCancelEdit, onSaveEdit, onDelete, indent = false }: CategoryRowProps) {
  const paddingLeft = indent ? 36 : 20
  if (isEditing) {
    return (
      <div style={{ padding: `12px ${paddingLeft}px 12px 20px`, borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, paddingLeft: indent ? 16 : 0 }}>
          <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} style={{ flex: 1, padding: '8px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)' }} />
          <button onClick={onSaveEdit} style={{ padding: '8px 12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>저장</button>
          <button onClick={onCancelEdit} style={{ padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>취소</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: indent ? 16 : 0 }}>
          {COLOR_PRESETS.map((c) => (
            <button key={c} type="button" onClick={() => setEditingColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: editingColor === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer' }} aria-label={c} />
          ))}
          <input type="text" value={editingColor} onChange={(e) => setEditingColor(e.target.value)} placeholder="#HEX" maxLength={7} style={{ width: 80, padding: '4px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)' }} />
        </div>
      </div>
    )
  }
  return (
    <div style={{ padding: `12px 20px 12px ${paddingLeft}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {indent && <span style={{ color: 'var(--muted)', fontSize: 12, marginRight: 2 }}>└</span>}
        <CategoryIcon name={cat.name} size={indent ? 14 : 16} color={cat.color} />
        <span style={{ fontSize: indent ? 13 : 14, color: 'var(--text)' }}>{cat.name}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onStartEdit} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>편집</button>
        <button onClick={onDelete} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: 'var(--expense)', cursor: 'pointer' }}>삭제</button>
      </div>
    </div>
  )
}
