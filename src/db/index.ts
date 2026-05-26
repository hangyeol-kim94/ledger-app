import { supabase } from '../lib/supabase'
import type { Account, Transaction, Category, AppMeta } from '../types'

// ─── Accounts ───

export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as Account[]
}

export async function createAccount(account: Account): Promise<void> {
  const { error } = await supabase.from('accounts').insert(account)
  if (error) throw error
}

export async function updateAccount(id: string, updates: Partial<Account>): Promise<void> {
  const { error } = await supabase.from('accounts').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('accounts').delete().eq('id', id)
  if (error) throw error
}

// ─── Categories ───

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('created_at_utc')
  if (error) throw error
  return (data ?? []) as Category[]
}

export async function createCategory(category: Category): Promise<void> {
  const { error } = await supabase.from('categories').insert(category)
  if (error) throw error
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  const { error } = await supabase.from('categories').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

// ─── Transactions ───

export async function getTransactionsByMonth(month: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .gte('date', `${month}-01`)
    .lte('date', `${month}-31`)
    .is('deleted_at_utc', null)
    .order('date')
  if (error) throw error
  return (data ?? []) as Transaction[]
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date')
  if (error) throw error
  return (data ?? []) as Transaction[]
}

export async function getActiveTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .is('deleted_at_utc', null)
    .order('date')
  if (error) throw error
  return (data ?? []) as Transaction[]
}

export async function createTransaction(transaction: Transaction): Promise<void> {
  const { error } = await supabase.from('transactions').insert(transaction)
  if (error) throw error
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
  const { error } = await supabase.from('transactions').update(updates).eq('id', id)
  if (error) throw error
}

export async function getTransactionCountByAccountId(accountId: string): Promise<number> {
  const [res1, res2] = await Promise.all([
    supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId),
    supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('to_account_id', accountId),
  ])
  return (res1.count ?? 0) + (res2.count ?? 0)
}

export async function getTransactionCountByCategoryId(categoryId: string): Promise<number> {
  const { count, error } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)
  if (error) throw error
  return count ?? 0
}

// ─── Balances ───

export async function computeAllBalances(): Promise<Record<string, number>> {
  const [accountsRes, txnsRes] = await Promise.all([
    supabase.from('accounts').select('*').eq('archived', false).order('sort_order'),
    supabase.from('transactions').select('*').is('deleted_at_utc', null),
  ])
  if (accountsRes.error) throw accountsRes.error
  if (txnsRes.error) throw txnsRes.error

  const accounts = (accountsRes.data ?? []) as Account[]
  const txns = (txnsRes.data ?? []) as Transaction[]

  const balances: Record<string, number> = {}
  for (const a of accounts) {
    balances[a.id] = a.initial_balance
  }
  for (const t of txns) {
    if (t.type === 'income') {
      if (balances[t.account_id] !== undefined) balances[t.account_id] += t.amount
    } else if (t.type === 'expense') {
      if (balances[t.account_id] !== undefined) balances[t.account_id] -= t.amount
    } else if (t.type === 'transfer') {
      if (balances[t.account_id] !== undefined) balances[t.account_id] -= t.amount
      if (t.to_account_id && balances[t.to_account_id] !== undefined)
        balances[t.to_account_id] += t.amount
    }
  }
  return balances
}

export async function computeAccountBalance(accountId: string): Promise<number> {
  const balances = await computeAllBalances()
  return balances[accountId] ?? 0
}

// ─── Meta ───

export async function getMeta(): Promise<AppMeta | null> {
  const { data, error } = await supabase.from('meta').select('*').eq('id', 1).single()
  if (error && error.code !== 'PGRST116') throw error
  return data as AppMeta | null
}

export async function updateMeta(updates: Partial<AppMeta>): Promise<void> {
  const { error } = await supabase.from('meta').update(updates).eq('id', 1)
  if (error) throw error
}

// ─── 초기 카테고리 시드 ───

export async function initializeDB(): Promise<void> {
  const { count, error } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  if ((count ?? 0) > 0) return

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
  const { error: insertError } = await supabase.from('categories').insert(
    defaultCategories.map((c) => ({
      id: ulid(),
      name: c.name,
      color: c.color,
      archived: false,
      created_at_utc: now,
    }))
  )
  if (insertError) throw insertError
}
