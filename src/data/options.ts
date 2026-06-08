import type { AgeGroupId, IndustryId, RoleId, RoleOption } from '../types'

export interface IndustryOption {
  id: IndustryId
  label: string
  emoji: string
  group: '製造' | '非製造'
}

export const INDUSTRIES: IndustryOption[] = [
  // 製造系
  { id: 'automotive', label: '自動車・部品', emoji: '🚗', group: '製造' },
  { id: 'electronics', label: '電機・電子・半導体', emoji: '🔌', group: '製造' },
  { id: 'machinery', label: '機械・産業機器', emoji: '⚙️', group: '製造' },
  { id: 'chemical', label: '化学・素材', emoji: '🧪', group: '製造' },
  { id: 'foodmaker', label: '食品メーカー', emoji: '🥫', group: '製造' },
  { id: 'apparel', label: 'アパレル・繊維', emoji: '🧵', group: '製造' },
  { id: 'manufacturing', label: 'その他製造業', emoji: '🏭', group: '製造' },
  // 非製造系
  { id: 'it', label: 'IT・情報通信', emoji: '💻', group: '非製造' },
  { id: 'retail', label: '小売・流通', emoji: '🛍️', group: '非製造' },
  { id: 'wholesale', label: '卸・商社', emoji: '📦', group: '非製造' },
  { id: 'construction', label: '建設・工事', emoji: '🏗️', group: '非製造' },
  { id: 'realestate', label: '不動産', emoji: '🏠', group: '非製造' },
  { id: 'medical', label: '医療・介護', emoji: '🏥', group: '非製造' },
  { id: 'pharma', label: '製薬・医薬品', emoji: '💊', group: '非製造' },
  { id: 'logistics', label: '物流・運輸', emoji: '🚚', group: '非製造' },
  { id: 'finance', label: '金融・保険', emoji: '🏦', group: '非製造' },
  { id: 'food', label: '飲食・外食', emoji: '🍴', group: '非製造' },
  { id: 'beauty', label: '美容・理容', emoji: '💇', group: '非製造' },
  { id: 'education', label: '教育・学習塾', emoji: '✏️', group: '非製造' },
  { id: 'hospitality', label: '宿泊・観光', emoji: '🏨', group: '非製造' },
  { id: 'agriculture', label: '農業・一次産業', emoji: '🌾', group: '非製造' },
  { id: 'energy', label: '電力・エネルギー', emoji: '⚡', group: '非製造' },
  { id: 'publicsector', label: '官公庁・自治体', emoji: '🏛️', group: '非製造' },
  { id: 'other', label: 'その他', emoji: '🏢', group: '非製造' },
]

export const AGE_GROUPS: { id: AgeGroupId; label: string }[] = [
  { id: '20s', label: '20代' },
  { id: '30s', label: '30代' },
  { id: '40s', label: '40代' },
  { id: '50s', label: '50代' },
  { id: '60s', label: '60代以上' },
]

export const ROLES: RoleOption[] = [
  { id: 'owner', label: '経営者・社長' },
  { id: 'executive', label: '役員・幹部' },
  { id: 'manager', label: '管理職・責任者' },
  { id: 'staff', label: '担当者・現場' },
]

export const industryLabel = (id: IndustryId) =>
  INDUSTRIES.find((i) => i.id === id)?.label ?? 'その他'
export const industryEmoji = (id: IndustryId) =>
  INDUSTRIES.find((i) => i.id === id)?.emoji ?? '🏢'
export const ageLabel = (id: AgeGroupId) => AGE_GROUPS.find((a) => a.id === id)?.label ?? id
export const roleLabel = (id: RoleId) => ROLES.find((r) => r.id === id)?.label ?? id
