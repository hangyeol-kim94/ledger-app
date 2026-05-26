import { create } from 'zustand'
import { currentMonth } from '../utils/format'

interface AppState {
  // Navigation
  currentPage: 'home' | 'transactions' | 'accounts' | 'settings'
  setCurrentPage: (page: AppState['currentPage']) => void

  // Selected month for dashboard
  selectedMonth: string // 'YYYY-MM'
  setSelectedMonth: (month: string) => void

  // Modal state
  isAddTransactionOpen: boolean
  openAddTransaction: () => void
  closeAddTransaction: () => void

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

  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } })
    setTimeout(() => set({ toast: null }), 3000)
  },
  clearToast: () => set({ toast: null }),
}))
