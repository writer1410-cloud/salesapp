import { useState } from 'react'
import { useStore } from './store'
import { GeneratePage } from './pages/GeneratePage'
import { CustomersPage } from './pages/CustomersPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'

type Tab = 'generate' | 'customers' | 'history' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'generate', label: '雑談', icon: '💬' },
  { id: 'customers', label: '顧客', icon: '👥' },
  { id: 'history', label: '履歴', icon: '📒' },
  { id: 'settings', label: '設定', icon: '⚙️' },
]

const TITLES: Record<Tab, string> = {
  generate: '雑談を作る',
  customers: '顧客リスト',
  history: 'ストック履歴',
  settings: '設定',
}

export default function App() {
  const [tab, setTab] = useState<Tab>('generate')
  const { settings, toast } = useStore()

  return (
    <>
      <header className="app-header">
        <h1>
          <span>🗣️</span> {TITLES[tab]}
        </h1>
        <span className={`plan-badge ${settings.plan === 'premium' ? 'premium' : ''}`}>
          {settings.plan === 'premium' ? '✨ PREMIUM' : 'FREE'}
        </span>
      </header>

      {tab === 'generate' && <GeneratePage />}
      {tab === 'customers' && <CustomersPage />}
      {tab === 'history' && <HistoryPage />}
      {tab === 'settings' && <SettingsPage />}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <span className="ic">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
