import { supabase } from '../../lib/supabase'
import type { Account, Transaction, Category, Budget } from '../../types'

export async function runMigrations(): Promise<void> {
  // 현재 v1 스키마만 지원 — 향후 마이그레이션 여기에 추가
}

export async function importWithMigration(data: {
  schema_version: number
  accounts: unknown[]
  transactions: unknown[]
  categories: unknown[]
  budgets?: unknown[]
}): Promise<void> {
  if (data.schema_version > 1) {
    throw new Error('Unsupported schema version: ' + data.schema_version)
  }

  // 순서 중요: FK 제약으로 transactions 먼저 삭제
  const deleteSteps = [
    supabase.from('transactions').delete().neq('id', '__none__'),
    supabase.from('budgets').delete().neq('id', '__none__'),
  ]
  const [txErr, budgetErr] = await Promise.all(deleteSteps.map((p) => p.then((r) => r.error)))
  if (txErr) throw txErr
  if (budgetErr) throw budgetErr

  const { error: accDelErr } = await supabase.from('accounts').delete().neq('id', '__none__')
  if (accDelErr) throw accDelErr

  const { error: catDelErr } = await supabase.from('categories').delete().neq('id', '__none__')
  if (catDelErr) throw catDelErr

  // 새 데이터 삽입
  const accounts = data.accounts as Account[]
  const transactions = data.transactions as Transaction[]
  const categories = data.categories as Category[]
  const budgets = (data.budgets ?? []) as Budget[]

  if (accounts.length > 0) {
    const { error } = await supabase.from('accounts').insert(accounts)
    if (error) throw error
  }
  if (categories.length > 0) {
    const { error } = await supabase.from('categories').insert(categories)
    if (error) throw error
  }
  if (transactions.length > 0) {
    const { error } = await supabase.from('transactions').insert(transactions)
    if (error) throw error
  }
  if (budgets.length > 0) {
    const { error } = await supabase.from('budgets').insert(budgets)
    if (error) throw error
  }

  await supabase.from('meta').update({ schema_version: 1 }).eq('id', 1)
}
