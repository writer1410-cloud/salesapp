// アプリ全体で使う型定義

export type IndustryId =
  | 'manufacturing'
  | 'it'
  | 'retail'
  | 'construction'
  | 'medical'
  | 'logistics'
  | 'finance'
  | 'food'
  | 'agriculture'
  | 'realestate'
  | 'other'

export type AgeGroupId = '20s' | '30s' | '40s' | '50s' | '60s'

export type RoleId = 'owner' | 'executive' | 'manager' | 'staff'

/** 相手の役職・立場 */
export interface RoleOption {
  id: RoleId
  label: string
}

/** 顧客（取引先担当者）情報 */
export interface Customer {
  id: string
  name: string
  company: string
  ageGroup: AgeGroupId
  industry: IndustryId
  role: RoleId
  hometown: string // 出身地
  family: string // 家族構成
  birthday: string // 誕生日(自由記述: 例 "6月8日" / "1985-06-08")
  hobbies: string // 趣味・関心
  notes: string // その他メモ
  createdAt: number
  updatedAt: number
}

/** 雑談1件（3ステップ公式 + 豆知識） */
export interface SmallTalk {
  id: string
  topic: string // 話題の見出し
  news: string // ステップ1: ニュース・話題のふり
  empathy: string // ステップ2: 主観・共感
  question: string // ステップ3: 質問
  trivia: string // 派生する豆知識
  industry: IndustryId
  ageGroup: AgeGroupId
  role: RoleId
  source: 'ai' | 'template' // 生成元
  createdAt: number
}

/** ストックした雑談メモ（顧客に紐づけ可能） */
export interface SavedTalk {
  id: string
  talk: SmallTalk
  customerId?: string
  customerName?: string
  memo: string // 商談後の振り返りメモ
  used: boolean // 実際に使ったか
  reaction: '' | 'good' | 'normal' | 'bad' // 相手の反応
  savedAt: number
}

export type Plan = 'free' | 'premium'

/** 利用状況（課金・回数制限） */
export interface Usage {
  plan: Plan
  month: string // "YYYY-MM"
  generatedCount: number // 当月の生成回数
}

export interface Settings {
  plan: Plan
  ttsEnabled: boolean
  ttsRate: number // 読み上げ速度
  ttsVoiceURI: string // 選択した音声
  apiBaseUrl: string // バックエンド(Edge Function)のURL。空ならテンプレート生成。
}

export const FREE_MONTHLY_LIMIT = 10
