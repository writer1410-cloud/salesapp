import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Customer, DiaryEntry, SavedTalk, Settings, Usage } from './types'
import {
  DEFAULT_SETTINGS,
  addDiary,
  addSaved,
  deleteCustomer,
  deleteDiary,
  deleteSaved,
  loadCustomers,
  loadDiary,
  loadSaved,
  loadSettings,
  loadUsage,
  saveSettings,
  saveUsage,
  updateDiary,
  updateSaved,
  upsertCustomer,
} from './lib/storage'
import { consume, quota, type QuotaState } from './lib/billing'

interface Store {
  customers: Customer[]
  saved: SavedTalk[]
  diary: DiaryEntry[]
  usage: Usage
  settings: Settings
  quota: QuotaState
  toast: string
  showToast: (msg: string) => void
  saveCustomer: (c: Customer) => void
  removeCustomer: (id: string) => void
  addSavedTalk: (t: SavedTalk) => void
  updateSavedTalk: (t: SavedTalk) => void
  removeSavedTalk: (id: string) => void
  addDiaryEntry: (e: DiaryEntry) => void
  updateDiaryEntry: (e: DiaryEntry) => void
  removeDiaryEntry: (id: string) => void
  consumeGeneration: () => void
  updateSettings: (patch: Partial<Settings>) => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [customers, setCustomers] = useState<Customer[]>(() => loadCustomers())
  const [saved, setSaved] = useState<SavedTalk[]>(() => loadSaved())
  const [diary, setDiary] = useState<DiaryEntry[]>(() => loadDiary())
  const [usage, setUsage] = useState<Usage>(() => loadUsage(loadSettings().plan))
  const [toast, setToast] = useState('')

  // プラン変更を利用状況にも反映
  useEffect(() => {
    setUsage((u) => {
      const next = { ...u, plan: settings.plan }
      saveUsage(next)
      return next
    })
  }, [settings.plan])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2200)
  }, [])

  const saveCustomer = useCallback((c: Customer) => {
    setCustomers((list) => upsertCustomer(list, c))
  }, [])
  const removeCustomer = useCallback((id: string) => {
    setCustomers((list) => deleteCustomer(list, id))
  }, [])

  const addSavedTalk = useCallback((t: SavedTalk) => {
    setSaved((list) => addSaved(list, t))
  }, [])
  const updateSavedTalk = useCallback((t: SavedTalk) => {
    setSaved((list) => updateSaved(list, t))
  }, [])
  const removeSavedTalk = useCallback((id: string) => {
    setSaved((list) => deleteSaved(list, id))
  }, [])

  const addDiaryEntry = useCallback((e: DiaryEntry) => {
    setDiary((list) => addDiary(list, e))
  }, [])
  const updateDiaryEntry = useCallback((e: DiaryEntry) => {
    setDiary((list) => updateDiary(list, e))
  }, [])
  const removeDiaryEntry = useCallback((id: string) => {
    setDiary((list) => deleteDiary(list, id))
  }, [])

  const consumeGeneration = useCallback(() => {
    setUsage((u) => {
      const next = consume(u)
      saveUsage(next)
      return next
    })
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...DEFAULT_SETTINGS, ...s, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const value = useMemo<Store>(
    () => ({
      customers,
      saved,
      diary,
      usage,
      settings,
      quota: quota(usage),
      toast,
      showToast,
      saveCustomer,
      removeCustomer,
      addSavedTalk,
      updateSavedTalk,
      removeSavedTalk,
      addDiaryEntry,
      updateDiaryEntry,
      removeDiaryEntry,
      consumeGeneration,
      updateSettings,
    }),
    [
      customers,
      saved,
      diary,
      usage,
      settings,
      toast,
      showToast,
      saveCustomer,
      removeCustomer,
      addSavedTalk,
      updateSavedTalk,
      removeSavedTalk,
      addDiaryEntry,
      updateDiaryEntry,
      removeDiaryEntry,
      consumeGeneration,
      updateSettings,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
