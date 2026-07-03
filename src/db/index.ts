import { supabase } from '../lib/supabase'
import type { Account, Transaction, Category, AppMeta, Budget } from '../types'

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

// ─── Budgets ───

export async function getBudgets(): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .order('month', { ascending: false })
    .order('created_at_utc')
  if (error) throw error
  return (data ?? []) as Budget[]
}

export async function getBudgetsByMonth(month: string): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('month', month)
    .order('created_at_utc')
  if (error) throw error
  return (data ?? []) as Budget[]
}

export async function createBudget(budget: Budget): Promise<void> {
  const { error } = await supabase.from('budgets').insert(budget)
  if (error) throw error
}

export async function updateBudget(id: string, updates: Partial<Budget>): Promise<void> {
  const { error } = await supabase.from('budgets').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from('budgets').delete().eq('id', id)
  if (error) throw error
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

  // Level 1 parents
  const level1Defs = [
    { name: '식생활',   color: '#F97316' },
    { name: '주거',     color: '#3B82F6' },
    { name: '교통',     color: '#10B981' },
    { name: '건강',     color: '#EF4444' },
    { name: '쇼핑',     color: '#0EA5E9' },
    { name: '여가/문화',color: '#EC4899' },
    { name: '교육',     color: '#F59E0B' },
    { name: '통신',     color: '#8B5CF6' },
    { name: '금융',     color: '#1D4ED8' },
    { name: '사교',     color: '#84CC16' },
  ]
  const level1Rows = level1Defs.map((c) => ({
    id: ulid(), name: c.name, color: c.color, parent_id: null, archived: false, created_at_utc: now,
  }))
  const { error: e1 } = await supabase.from('categories').insert(level1Rows)
  if (e1) throw e1

  // Build name → id map for parents
  const parentIdMap = new Map<string, string>(level1Rows.map((r) => [r.name, r.id]))

  // Level 2 subcategories
  const level2Defs: Array<{ name: string; parent: string }> = [
    // 식생활
    { name: '마트/식재료', parent: '식생활' }, { name: '외식',     parent: '식생활' },
    { name: '배달',        parent: '식생활' }, { name: '카페/음료', parent: '식생활' },
    // 주거
    { name: '월세/관리비', parent: '주거' },   { name: '공과금',   parent: '주거' },
    { name: '생활용품',    parent: '주거' },   { name: '가구/인테리어', parent: '주거' },
    // 교통
    { name: '대중교통',    parent: '교통' },   { name: '택시/호출', parent: '교통' },
    { name: '자동차',      parent: '교통' },   { name: '여행교통',  parent: '교통' },
    // 건강
    { name: '병원/의원',   parent: '건강' },   { name: '약국',      parent: '건강' },
    { name: '피트니스',    parent: '건강' },   { name: '미용/위생', parent: '건강' },
    // 쇼핑
    { name: '의류/패션',   parent: '쇼핑' },   { name: '전자기기',  parent: '쇼핑' },
    { name: '기타쇼핑',    parent: '쇼핑' },
    // 여가/문화
    { name: '엔터테인먼트',parent: '여가/문화' }, { name: '취미',    parent: '여가/문화' },
    { name: '여행/숙박',   parent: '여가/문화' }, { name: '구독서비스', parent: '여가/문화' },
    // 교육
    { name: '학원/강좌',   parent: '교육' },   { name: '도서/자료', parent: '교육' },
    { name: '자격증/시험', parent: '교육' },
    // 통신
    { name: '휴대폰/인터넷', parent: '통신' }, { name: '앱/소프트웨어', parent: '통신' },
    // 금융
    { name: '보험료',      parent: '금융' },   { name: '수수료/이자', parent: '금융' },
    // 사교
    { name: '경조사',      parent: '사교' },   { name: '선물',      parent: '사교' },
    { name: '회식/모임',   parent: '사교' },
  ]
  const level2Rows = level2Defs.map((c) => {
    const parentRow = level1Rows.find((p) => p.name === c.parent)!
    return {
      id: ulid(), name: c.name, color: parentRow.color,
      parent_id: parentIdMap.get(c.parent) ?? null,
      archived: false, created_at_utc: now,
    }
  })
  const { error: e2 } = await supabase.from('categories').insert(level2Rows)
  if (e2) throw e2
}
