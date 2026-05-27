// Amount brand type — integer KRW only, never float
export type Amount = number & { __brand: 'KRW' }

export function toAmount(n: number): Amount {
  if (!Number.isInteger(n) || n < 0) throw new Error(`Invalid KRW amount: ${n}`)
  return n as Amount
}

export type AccountId = string
export type TransactionId = string
export type CategoryId = string

export interface Account {
  id: AccountId          // ULID
  name: string
  color: string          // hex e.g. '#2563EB'
  initial_balance: Amount
  memo: string
  sort_order: number
  created_at_utc: string // ISO 8601 UTC
  archived: boolean
}

export type TransactionType = 'income' | 'expense' | 'transfer'

export interface Transaction {
  id: TransactionId       // ULID
  type: TransactionType
  amount: Amount          // integer KRW, positive
  account_id: AccountId   // debit account (or source for transfer)
  to_account_id: AccountId | null  // transfer destination, null otherwise
  date: string            // 'YYYY-MM-DD' local TZ (user-selected)
  category_id: CategoryId | null   // null for transfers
  memo: string
  created_at_utc: string  // ISO 8601 UTC
  updated_at_utc: string
  deleted_at_utc: string | null    // soft delete
}

export interface Category {
  id: CategoryId          // ULID
  name: string
  color: string           // hex
  parent_id: CategoryId | null
  archived: boolean
  created_at_utc: string
}

export interface Budget {  // P1 — scaffold only
  id: string
  category_id: CategoryId | null
  account_id: AccountId | null
  month: string           // 'YYYY-MM'
  limit_amount: Amount
}

export interface AppMeta {
  schema_version: number  // current: 1
  app_version: string
  last_export_at_utc: string | null
}

// Dashboard derived types
export interface AccountBalance {
  account: Account
  balance: Amount         // initial_balance + income - expense ± transfers
}

export interface MonthlySummary {
  month: string           // 'YYYY-MM'
  total_income: Amount
  total_expense: Amount   // transfers excluded
  by_category: Array<{ category: Category | null; amount: Amount; percentage: number }>
}
