import { create } from 'zustand'
import { currentMonth } from '../utils/format'
import type { Transaction } from '../types'

interface AppState {
  // Navigation
  currentPage: 'home' | 'transactions' | 'accounts' | 'settings' | 'analytics'
  setCurrentPage: (page: AppState['currentPage']) => void

  // Selected month for dashboard
  selectedMonth: string // 'YYYY-MM'
  setSelectedMonth: (month: string) => void

  // Modal state — add
  isAddTransactionOpen: boolean
  openAddTransaction: () => void
  closeAddTransaction: () => void

  // Modal state — edit
  editingTransaction: Transaction | null
  openEditTransaction: (t: Transaction) => void
  closeEditTransaction: () => void

  // Toast notifications
  toast: { message: string; type: 'success' | 'error' | 'info' } | null
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
  clearToast: () => void
}

export const useAppStore = create<AppState>()((set) => ({
  currentPage: 'home',
  setCurrentPage: (page) => set({ currentPage: page }),

  selectedMonth: currentMonth(),
  setSelectedMonth: (month) => set({ selectedMonth: month }),

  isAddTransactionOpen: false,
  openAddTransaction: () => set({ isAddTransactionOpen: true }),
  closeAddTransaction: () => set({ isAddTransactionOpen: false }),

  editingTransaction: null,
  openEditTransaction: (t) => set({ editingTransaction: t }),
  closeEditTransaction: () => set({ editingTransaction: null }),

  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } })
    setTimeout(() => set({ toast: null }), 3000)
  },
  clearToast: () => set({ toast: null }),
}))
