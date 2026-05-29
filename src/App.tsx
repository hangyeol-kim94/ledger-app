import React, { useEffect, useState } from 'react'
import { useAppStore } from './stores/useAppStore'
import { initializeDB } from './db'
import PinLock from './components/PinLock'
import { isPinUnlocked } from './lib/pin'

const HomePage = React.lazy(() => import('./pages/Home'))
const TransactionsPage = React.lazy(() => import('./pages/Transactions'))
const AccountsPage = React.lazy(() => import('./pages/Accounts'))
const SettingsPage = React.lazy(() => import('./pages/Settings'))
const AnalyticsPage = React.lazy(() => import('./pages/Analytics'))
const AddTransactionModal = React.lazy(() => import('./components/AddTransactionModal'))

function App() {
  const { currentPage, setCurrentPage, isAddTransactionOpen, openAddTransaction, editingTransaction, toast } = useAppStore()
  const [unlocked, setUnlocked] = useState(isPinUnlocked)

  useEffect(() => {
    if (unlocked) initializeDB().catch(console.error)
  }, [unlocked])

  if (!unlocked) return <PinLock onUnlock={() => setUnlocked(true)} />

  return (
    <React.Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:'20px'}}>⏳</div>}>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'transactions' && <TransactionsPage />}
        {currentPage === 'accounts' && <AccountsPage />}
        {currentPage === 'analytics' && <AnalyticsPage />}
        {currentPage === 'settings' && <SettingsPage />}

        {(isAddTransactionOpen || editingTransaction !== null) && (
          <AddTransactionModal key={editingTransaction?.id ?? 'new'} />
        )}

        {toast && (
          <div className={`toast ${toast.type}`}>{toast.message}</div>
        )}

        <nav className="bottom-nav">
          <button className={`nav-btn ${currentPage === 'home' ? 'active' : ''}`} onClick={() => setCurrentPage('home')}>
            <span>🏠</span>
            <span>홈</span>
          </button>
          <button className={`nav-btn ${currentPage === 'transactions' ? 'active' : ''}`} onClick={() => setCurrentPage('transactions')}>
            <span>📋</span>
            <span>거래내역</span>
          </button>
          <button className="nav-add" onClick={openAddTransaction} aria-label="거래 추가">
            <span>+</span>
          </button>
          <button className={`nav-btn ${currentPage === 'analytics' ? 'active' : ''}`} onClick={() => setCurrentPage('analytics')}>
            <span>📊</span>
            <span>분석</span>
          </button>
          <button className={`nav-btn ${currentPage === 'settings' ? 'active' : ''}`} onClick={() => setCurrentPage('settings')}>
            <span>⚙️</span>
            <span>설정</span>
          </button>
        </nav>
      </div>
    </React.Suspense>
  )
}

export default App
