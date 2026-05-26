import Dexie, { type Table } from 'dexie'
import type { Account, Transaction, Category, Budget, AppMeta } from '../types'
import { runMigrations } from './migrations'

export class LedgerDB extends Dexie {
  accounts!: Table<Account>
  transactions!: Table<Transaction>
  categories!: Table<Category>
  budgets!: Table<Budget>
  meta!: Table<AppMeta & { id: number }> // id=1 always (single row)

  constructor() {
    super('LedgerDB')
    this.version(1).stores({
      accounts: 'id, sort_order, archived',
      transactions: 'id, type, account_id, to_account_id, date, category_id, deleted_at_utc, created_at_utc',
      categories: 'id, archived',
      budgets: 'id, month, category_id, account_id',
      meta: 'id',
    })
  }
}

export const db = new LedgerDB()

// Seed initial data (first run)
export async function initializeDB(): Promise<void> {
  const metaCount = await db.meta.count()
  if (metaCount === 0) {
    await db.meta.add({
      id: 1,
      schema_version: 1,
      app_version: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
      last_export_at_utc: null,
    })
    // Seed default categories
    const { ulid } = await import('../utils/ulid')
    const now = new Date().toISOString()
    const defaultCategories = [
      { name: '식비', color: '#F97316' },
      { name: '교통', color: '#10B981' },
      { name: '여가', color: '#EC4899' },
      { name: '주거', color: '#3B82F6' },
      { name: '통신', color: '#8B5CF6' },
      { name: '의료', color: '#EF4444' },
      { name: '교육', color: '#F59E0B' },
      { name: '기타', color: '#6B7280' },
    ]
    await db.categories.bulkAdd(
      defaultCategories.map((c) => ({
        id: ulid(),
        name: c.name,
        color: c.color,
        archived: false,
        created_at_utc: now,
      }))
    )
  }

  // Run migrations if needed
  const meta = await db.meta.get(1)
  if (meta && meta.schema_version < 1) {
    await runMigrations(meta.schema_version)
  }
}

// Compute account balance from transactions
export async function computeAccountBalance(accountId: string): Promise<number> {
  const account = await db.accounts.get(accountId)
  if (!account) return 0

  const txns = await db.transactions
    .where('account_id').equals(accountId)
    .or('to_account_id').equals(accountId)
    .toArray()

  const active = txns.filter(t => t.deleted_at_utc === null)

  let balance: number = account.initial_balance
  for (const t of active) {
    if (t.type === 'income' && t.account_id === accountId) {
      balance += t.amount
    } else if (t.type === 'expense' && t.account_id === accountId) {
      balance -= t.amount
    } else if (t.type === 'transfer') {
      if (t.account_id === accountId) balance -= t.amount
      if (t.to_account_id === accountId) balance += t.amount
    }
  }
  return balance
}

// Get monthly summary (excluding transfers from income/expense totals)
export async function getMonthlySummary(month: string): Promise<{ income: number; expense: number }> {
  const txns = await db.transactions
    .where('date').between(`${month}-01`, `${month}-31`, true, true)
    .toArray()

  const active = txns.filter(t => t.deleted_at_utc === null && t.type !== 'transfer')
  const income = active.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = active.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return { income, expense }
}
