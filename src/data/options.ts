import type { AgeGroupId, IndustryId, RoleId, RoleOption } from '../types'

export const INDUSTRIES: { id: IndustryId; label: string; emoji: string }[] = [
  { id: 'manufacturing', label: '製造業', emoji: '🏭' },
  { id: 'it', label: 'IT・情報通信', emoji: '💻' },
  { id: 'retail', label: '小売・流通', emoji: '🛍️' },
  { id: 'construction', label: '建設・不動産工事', emoji: '🏗️' },
  { id: 'medical', label: '医療・介護', emoji: '🏥' },
  { id: 'logistics', label: '物流・運輸', emoji: '🚚' },
  { id: 'finance', label: '金融・保険', emoji: '🏦' },
  { id: 'food', label: '飲食・食品', emoji: '🍴' },
  { id: 'agriculture', label: '農業・一次産業', emoji: '🌾' },
  { id: 'realestate', label: '不動産', emoji: '🏠' },
  { id: 'other', label: 'その他', emoji: '🏢' },
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
