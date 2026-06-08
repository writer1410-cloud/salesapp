import type { Customer, DiaryEntry, SavedTalk, Settings, Usage } from '../types'
import { currentMonth } from './util'

const KEYS = {
  customers: 'eza.customers',
  saved: 'eza.savedTalks',
  diary: 'eza.diary',
  usage: 'eza.usage',
  settings: 'eza.settings',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ---- 顧客 ----
export function loadCustomers(): Customer[] {
  return read<Customer[]>(KEYS.customers, []).sort((a, b) => b.updatedAt - a.updatedAt)
}
export function saveCustomers(list: Customer[]): void {
  write(KEYS.customers, list)
}
export function upsertCustomer(list: Customer[], c: Customer): Customer[] {
  const idx = list.findIndex((x) => x.id === c.id)
  const next = [...list]
  if (idx >= 0) next[idx] = c
  else next.push(c)
  saveCustomers(next)
  return next
}
export function deleteCustomer(list: Customer[], id: string): Customer[] {
  const next = list.filter((c) => c.id !== id)
  saveCustomers(next)
  return next
}

// ---- ストックした雑談 ----
export function loadSaved(): SavedTalk[] {
  return read<SavedTalk[]>(KEYS.saved, []).sort((a, b) => b.savedAt - a.savedAt)
}
export function saveSavedTalks(list: SavedTalk[]): void {
  write(KEYS.saved, list)
}
export function addSaved(list: SavedTalk[], item: SavedTalk): SavedTalk[] {
  const next = [item, ...list]
  saveSavedTalks(next)
  return next
}
export function updateSaved(list: SavedTalk[], item: SavedTalk): SavedTalk[] {
  const next = list.map((x) => (x.id === item.id ? item : x))
  saveSavedTalks(next)
  return next
}
export function deleteSaved(list: SavedTalk[], id: string): SavedTalk[] {
  const next = list.filter((x) => x.id !== id)
  saveSavedTalks(next)
  return next
}

// ---- 雑談メモ（日記） ----
export function loadDiary(): DiaryEntry[] {
  return read<DiaryEntry[]>(KEYS.diary, [])
}
export function saveDiary(list: DiaryEntry[]): void {
  write(KEYS.diary, list)
}
export function addDiary(list: DiaryEntry[], item: DiaryEntry): DiaryEntry[] {
  const next = [item, ...list]
  saveDiary(next)
  return next
}
export function updateDiary(list: DiaryEntry[], item: DiaryEntry): DiaryEntry[] {
  const next = list.map((x) => (x.id === item.id ? item : x))
  saveDiary(next)
  return next
}
export function deleteDiary(list: DiaryEntry[], id: string): DiaryEntry[] {
  const next = list.filter((x) => x.id !== id)
  saveDiary(next)
  return next
}

// ---- 利用状況（課金・回数） ----
export function loadUsage(plan: 'free' | 'premium'): Usage {
  const u = read<Usage>(KEYS.usage, { plan, month: currentMonth(), generatedCount: 0 })
  // 月が変わったらリセット
  if (u.month !== currentMonth()) {
    const reset: Usage = { plan, month: currentMonth(), generatedCount: 0 }
    write(KEYS.usage, reset)
    return reset
  }
  u.plan = plan
  return u
}
export function saveUsage(u: Usage): void {
  write(KEYS.usage, u)
}

// ---- 設定 ----
export const DEFAULT_SETTINGS: Settings = {
  plan: 'free',
  onboarded: false,
  profile: null,
  ttsEnabled: true,
  ttsRate: 1,
  ttsVoiceURI: '',
  apiBaseUrl: '',
}
export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEYS.settings, {}) }
}
export function saveSettings(s: Settings): void {
  write(KEYS.settings, s)
}
