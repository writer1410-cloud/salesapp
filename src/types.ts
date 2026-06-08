// アプリ全体で使う型定義

export type IndustryId =
  // 製造系（細分化）
  | 'automotive' // 自動車・自動車部品
  | 'electronics' // 電機・電子部品・半導体
  | 'machinery' // 機械・産業機器
  | 'chemical' // 化学・素材
  | 'foodmaker' // 食品メーカー
  | 'apparel' // アパレル・繊維
  | 'manufacturing' // その他製造業
  // 非製造系
  | 'it' // IT・情報通信
  | 'retail' // 小売・流通
  | 'wholesale' // 卸・商社
  | 'construction' // 建設・工事
  | 'realestate' // 不動産
  | 'medical' // 医療・介護
  | 'pharma' // 製薬・医薬品
  | 'logistics' // 物流・運輸
  | 'finance' // 金融・保険
  | 'food' // 飲食・外食
  | 'beauty' // 美容・理容
  | 'education' // 教育・学習塾
  | 'hospitality' // 宿泊・観光
  | 'agriculture' // 農業・一次産業
  | 'energy' // 電力・エネルギー
  | 'publicsector' // 官公庁・自治体
  | 'other' // その他

export type AgeGroupId = '20s' | '30s' | '40s' | '50s' | '60s'

export type RoleId = 'owner' | 'executive' | 'manager' | 'staff'

/** 相手の役職・立場 */
export interface RoleOption {
  id: RoleId
  label: string
}

/** 自分（営業担当者）のプロフィール */
export interface Profile {
  name: string
  company: string
  industry: IndustryId // 自分の業界（標準で相手の業界に採用）
  ageGroup: AgeGroupId
  role: RoleId
}

/** 顧客（取引先担当者）情報 */
export interface Customer {
  id: string
  name: string
  company: string
  group: string // グループ分け（例: Aルート, 重要顧客 など）
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

/** 顧客ごとの雑談メモ（日記） */
export interface DiaryEntry {
  id: string
  customerId: string
  date: string // YYYY-MM-DD
  content: string // その日話した雑談・出来事
  createdAt: number
}

/** 雑談1件（3ステップ公式 + 豆知識） */
export interface SmallTalk {
  id: string
  topic: string // 話題の見出し
  news: string // ステップ1: ニュース・話題のふり
  empathy: string // ステップ2: 主観・共感
  question: string // ステップ3: 質問
  trivia: string // 派生する豆知識
  sourceQuery: string // 元ネタを探すためのニュース検索キーワード
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
  onboarded: boolean // 初回プロフィール入力が済んだか
  profile: Profile | null
  ttsEnabled: boolean
  ttsRate: number // 読み上げ速度
  ttsVoiceURI: string // 選択した音声
  apiBaseUrl: string // バックエンド(Edge Function)のURL。空ならテンプレート生成。
}

export const FREE_MONTHLY_LIMIT = 10

/** ニュース検索リンク（Google ニュース）を生成 */
export function newsSearchUrl(query: string): string {
  return `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=ja&gl=JP&ceid=JP:ja`
}
