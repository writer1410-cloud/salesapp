import { useState } from 'react'
import { useStore } from './store'
import { Onboarding } from './pages/Onboarding'
import { GeneratePage } from './pages/GeneratePage'
import { CustomersPage } from './pages/CustomersPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { Icon, type IconName } from './components/Icon'

type Tab = 'generate' | 'customers' | 'history' | 'settings'

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'generate', label: '雑談', icon: 'talk' },
  { id: 'customers', label: '顧客', icon: 'people' },
  { id: 'history', label: '履歴', icon: 'archive' },
  { id: 'settings', label: '設定', icon: 'settings' },
]

const TITLES: Record<Tab, string> = {
  generate: 'TALK ASSIST',
  customers: '顧客リスト',
  history: 'ストック履歴',
  settings: '設定',
}

export default function App() {
  const [tab, setTab] = useState<Tab>('generate')
  const { settings, toast } = useStore()

  // 初回はプロフィール入力（オンボーディング）を表示
  if (!settings.onboarded) {
    return (
      <>
        <Onboarding />
        {toast && <div className="toast">{toast}</div>}
      </>
    )
  }

  return (
    <>
      <header className="app-header">
        <h1>{TITLES[tab]}</h1>
        <span className={`plan-badge ${settings.plan === 'premium' ? 'premium' : ''}`}>
          {settings.plan === 'premium' ? 'PREMIUM' : 'FREE'}
        </span>
      </header>

      {tab === 'generate' && <GeneratePage />}
      {tab === 'customers' && <CustomersPage />}
      {tab === 'history' && <HistoryPage />}
      {tab === 'settings' && <SettingsPage />}

      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={22} className="ic" />
            {t.label}
          </button>
        ))}
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
