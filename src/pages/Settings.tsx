import { useState, useRef, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Category } from '../types'
import { db } from '../db'
import { importWithMigration } from '../db/migrations'
import { ulid } from '../utils/ulid'
import { useAppStore } from '../stores/useAppStore'

const COLOR_PRESETS = [
  '#2563EB', // blue
  '#7C3AED', // purple
  '#D97706', // amber
  '#059669', // green
  '#DC2626', // red
  '#0891B2', // teal
]

const APP_VERSION = '1.0.0'
const SCHEMA_VERSION = 1

export default function SettingsPage() {
  const showToast = useAppStore((s) => s.showToast)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Category state
  const categories = useLiveQuery(
    () => db.categories.toArray(),
    [],
    [] as Category[]
  )

  const meta = useLiveQuery(() => db.meta.get(1), [])

  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(COLOR_PRESETS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingColor, setEditingColor] = useState('')
  const [showArchivedCats, setShowArchivedCats] = useState(false)

  const activeCats = useMemo(() => categories.filter((c) => !c.archived), [categories])
  const archivedCats = useMemo(() => categories.filter((c) => c.archived), [categories])

  // ─── Export JSON ───
  async function exportJSON() {
    try {
      const accounts = await db.accounts.toArray()
      const transactions = await db.transactions.toArray()
      const cats = await db.categories.toArray()
      const m = await db.meta.get(1)

      const data = {
        schema_version: m?.schema_version ?? SCHEMA_VERSION,
        app_version: m?.app_version ?? APP_VERSION,
        exported_at: new Date().toISOString(),
        accounts,
        transactions,
        categories: cats,
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `가계부-백업-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)

      await db.meta.update(1, { last_export_at_utc: new Date().toISOString() })
      showToast('JSON 내보내기 완료')
    } catch (e) {
      showToast(`내보내기 실패: ${(e as Error).message}`, 'error')
    }
  }

  // ─── Export CSV ───
  async function exportCSV() {
    try {
      const transactions = await db.transactions
        .filter((t) => t.deleted_at_utc === null)
        .toArray()
      const accounts = await db.accounts.toArray()
      const cats = await db.categories.toArray()

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

  // ─── Import JSON ───
  function triggerImport() {
    fileInputRef.current?.click()
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    // Reset input so the same file can be re-selected later
    event.target.value = ''

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!data.schema_version || !Array.isArray(data.accounts) || !Array.isArray(data.transactions)) {
        showToast('올바르지 않은 파일 형식입니다', 'error')
        return
      }
      if (data.schema_version > SCHEMA_VERSION) {
        showToast(`지원하지 않는 스키마 버전: v${data.schema_version}`, 'error')
        return
      }

      const confirmed = window.confirm(
        `데이터를 가져오면 현재 데이터가 모두 교체됩니다.\n` +
          `거래 ${data.transactions.length}건, 계좌 ${data.accounts.length}개를 가져옵니다.\n` +
          `계속하시겠습니까?`
      )
      if (!confirmed) return

      await importWithMigration(data)
      showToast(`데이터 가져오기 완료 (거래 ${data.transactions.length}건)`)
    } catch (e) {
      showToast(`가져오기 실패: ${(e as Error).message}`, 'error')
    }
  }

  // ─── Category management ───
  async function addCategory() {
    const name = newCatName.trim()
    if (!name) {
      showToast('카테고리 이름을 입력해주세요', 'error')
      return
    }
    await db.categories.add({
      id: ulid(),
      name,
      color: newCatColor,
      archived: false,
      created_at_utc: new Date().toISOString(),
    })
    setNewCatName('')
    setNewCatColor(COLOR_PRESETS[0])
    showToast('카테고리가 추가되었습니다')
  }

  function startEditCat(cat: Category) {
    setEditingId(cat.id)
    setEditingName(cat.name)
    setEditingColor(cat.color)
  }

  function cancelEditCat() {
    setEditingId(null)
    setEditingName('')
    setEditingColor('')
  }

  async function saveEditCat() {
    if (!editingId) return
    const name = editingName.trim()
    if (!name) {
      showToast('카테고리 이름을 입력해주세요', 'error')
      return
    }
    await db.categories.update(editingId, { name, color: editingColor })
    cancelEditCat()
    showToast('카테고리가 수정되었습니다')
  }

  async function deleteOrArchiveCat(cat: Category) {
    const count = await db.transactions.where('category_id').equals(cat.id).count()
    if (count > 0) {
      const ok = window.confirm(
        `${count}개 거래가 있습니다. 카테고리를 보관하시겠습니까?`
      )
      if (!ok) return
      await db.categories.update(cat.id, { archived: true })
      showToast('카테고리가 보관되었습니다')
    } else {
      const ok = window.confirm(`'${cat.name}' 카테고리를 삭제하시겠습니까?`)
      if (!ok) return
      await db.categories.delete(cat.id)
      showToast('카테고리가 삭제되었습니다')
    }
  }

  async function unarchiveCat(cat: Category) {
    await db.categories.update(cat.id, { archived: false })
    showToast('카테고리가 복원되었습니다')
  }

  return (
    <div className="page" style={{ paddingBottom: 100 }}>
      <div className="page-header" style={{ padding: '20px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>설정</h1>
      </div>

      {/* Data management section */}
      <SectionTitle>데이터 관리</SectionTitle>
      <Section>
        <SettingRow onClick={exportJSON} label="데이터 내보내기 (JSON)" />
        <SettingRow onClick={exportCSV} label="데이터 내보내기 (CSV)" />
        <SettingRow onClick={triggerImport} label="데이터 가져오기" isLast />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
      </Section>

      {/* Category management */}
      <SectionTitle>카테고리 관리</SectionTitle>
      <Section>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="새 카테고리 이름"
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: 13,
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg)',
                color: 'var(--text)',
              }}
            />
            <button
              onClick={addCategory}
              style={{
                padding: '8px 14px',
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              추가
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewCatColor(c)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: c,
                  border: newCatColor === c ? '3px solid var(--text)' : '3px solid transparent',
                  cursor: 'pointer',
                }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        {activeCats.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            카테고리가 없습니다
          </div>
        ) : (
          activeCats.map((cat, idx) => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              isLast={idx === activeCats.length - 1 && archivedCats.length === 0}
              isEditing={editingId === cat.id}
              editingName={editingName}
              editingColor={editingColor}
              setEditingName={setEditingName}
              setEditingColor={setEditingColor}
              onStartEdit={() => startEditCat(cat)}
              onCancelEdit={cancelEditCat}
              onSaveEdit={saveEditCat}
              onDelete={() => deleteOrArchiveCat(cat)}
            />
          ))
        )}

        {archivedCats.length > 0 && (
          <>
            <button
              onClick={() => setShowArchivedCats(!showArchivedCats)}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderTop: '1px solid var(--border)',
                fontSize: 13,
                color: 'var(--muted)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>보관된 카테고리 ({archivedCats.length})</span>
              <span>{showArchivedCats ? '▾' : '▸'}</span>
            </button>
            {showArchivedCats &&
              archivedCats.map((cat) => (
                <div
                  key={cat.id}
                  style={{
                    padding: '12px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--border)',
                    opacity: 0.7,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: cat.color,
                      }}
                    />
                    <span style={{ fontSize: 14, color: 'var(--text)' }}>{cat.name}</span>
                  </div>
                  <button
                    onClick={() => unarchiveCat(cat)}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontSize: 12,
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    복원
                  </button>
                </div>
              ))}
          </>
        )}
      </Section>

      {/* App info */}
      <SectionTitle>앱 정보</SectionTitle>
      <Section>
        <InfoRow label="버전" value={meta?.app_version ?? APP_VERSION} />
        <InfoRow label="스키마 버전" value={String(meta?.schema_version ?? SCHEMA_VERSION)} />
        <InfoRow
          label="마지막 백업"
          value={
            meta?.last_export_at_utc
              ? new Date(meta.last_export_at_utc).toLocaleString('ko-KR')
              : '없음'
          }
          isLast
        />
      </Section>
    </div>
  )
}

// ─── Subcomponents ───

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--muted)',
        padding: '8px 20px 6px',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {children}
    </div>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        margin: '0 20px 16px',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  )
}

function SettingRow({
  label,
  onClick,
  isLast = false,
}: {
  label: string
  onClick: () => void
  isLast?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'none',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        fontSize: 14,
        color: 'var(--text)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span>{label}</span>
      <span style={{ color: 'var(--muted)' }}>›</span>
    </button>
  )
}

function InfoRow({
  label,
  value,
  isLast = false,
}: {
  label: string
  value: string
  isLast?: boolean
}) {
  return (
    <div
      style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        fontSize: 14,
      }}
    >
      <span style={{ color: 'var(--text)' }}>{label}</span>
      <span style={{ color: 'var(--muted)' }}>{value}</span>
    </div>
  )
}

interface CategoryRowProps {
  cat: Category
  isLast: boolean
  isEditing: boolean
  editingName: string
  editingColor: string
  setEditingName: (v: string) => void
  setEditingColor: (v: string) => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onDelete: () => void
}

function CategoryRow({
  cat,
  isLast,
  isEditing,
  editingName,
  editingColor,
  setEditingName,
  setEditingColor,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: CategoryRowProps) {
  if (isEditing) {
    return (
      <div
        style={{
          padding: '12px 20px',
          borderBottom: isLast ? 'none' : '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: 13,
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          />
          <button
            onClick={onSaveEdit}
            style={{
              padding: '8px 12px',
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            저장
          </button>
          <button
            onClick={onCancelEdit}
            style={{
              padding: '8px 12px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--text)',
              cursor: 'pointer',
            }}
          >
            취소
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setEditingColor(c)}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: c,
                border:
                  editingColor === c ? '2px solid var(--text)' : '2px solid transparent',
                cursor: 'pointer',
              }}
              aria-label={c}
            />
          ))}
          <input
            type="text"
            value={editingColor}
            onChange={(e) => setEditingColor(e.target.value)}
            placeholder="#HEX"
            maxLength={7}
            style={{
              width: 80,
              padding: '4px 8px',
              fontSize: 12,
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: cat.color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 14, color: 'var(--text)' }}>{cat.name}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onStartEdit}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          편집
        </button>
        <button
          onClick={onDelete}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            color: 'var(--expense)',
            cursor: 'pointer',
          }}
        >
          삭제
        </button>
      </div>
    </div>
  )
}
