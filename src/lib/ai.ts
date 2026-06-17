import type { Customer, SmallTalk } from '../types'
import { ageLabel, industryLabel, roleLabel } from '../data/options'
import { generateFallback, summarizeFallback, type GenerateParams } from './fallbackGenerator'
import { uid } from './util'
import { SUPABASE_ANON_KEY } from './config'

/**
 * Edge Function 呼び出し用ヘッダー。
 * 関数は verify_jwt=true のため、anon/publishable キーを
 * Authorization と apikey の両方で送る（キー未設定なら付けない）。
 */
function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (SUPABASE_ANON_KEY) {
    headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`
    headers.apikey = SUPABASE_ANON_KEY
  }
  return headers
}

export interface GenerateResult {
  talks: SmallTalk[]
  source: 'ai' | 'template'
  live?: boolean // Web検索連動(最新)で生成できたか
}

/** AI接続の選択肢。キーはサーバー(Edge Function)側で保持し、アプリには含めない。 */
export interface AiOptions {
  apiBaseUrl?: string // Edge Function 経由（サーバーでキー保持）
}

/**
 * 雑談を生成する。
 * 優先順位: ① Edge Function(apiBaseUrl) → ② 内蔵テンプレート。
 * 失敗時はテンプレートにフォールバックする。
 */
export async function generateSmallTalks(
  params: GenerateParams & AiOptions,
): Promise<GenerateResult> {
  const { apiBaseUrl, ...gen } = params

  // ① Edge Function 経由（サーバーがAIキーを保持）
  if (apiBaseUrl) {
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/generate-smalltalk`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          industry: gen.industry,
          industryLabel: industryLabel(gen.industry),
          ageGroup: gen.ageGroup,
          ageLabel: ageLabel(gen.ageGroup),
          role: gen.role,
          roleLabel: roleLabel(gen.role),
          count: gen.count ?? 3,
          customer: customerSummary(gen.customer),
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { talks?: RawTalk[] }
      const talks = (data.talks ?? []).map((t) => normalize(t, gen))
      if (talks.length) {
        // 実記事URLが付いていれば Web検索連動(最新)で生成できている
        const live = talks.some((t) => !!t.sourceUrl)
        return { talks, source: 'ai', live }
      }
      throw new Error('empty')
    } catch (e) {
      console.warn('Edge Function生成に失敗。テンプレート生成にフォールバックします:', e)
    }
  }

  return { talks: generateFallback(gen), source: 'template' }
}

/**
 * 箇条書き・メモ・音声入力テキストを要約して顧客フィールドに変換。
 */
export async function summarizeNotes(
  text: string,
  opts: AiOptions = {},
): Promise<{ result: Partial<Customer>; source: 'ai' | 'template' }> {
  const { apiBaseUrl } = opts

  if (apiBaseUrl && text.trim()) {
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/summarize-notes`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { result?: Partial<Customer> }
      if (data.result) return { result: data.result, source: 'ai' }
      throw new Error('empty')
    } catch (e) {
      console.warn('Edge Function要約に失敗。テンプレート要約にフォールバックします:', e)
    }
  }

  return { result: summarizeFallback(text), source: 'template' }
}

interface RawTalk {
  topic?: string
  news?: string
  empathy?: string
  question?: string
  trivia?: string
  sourceQuery?: string
  sourceUrl?: string
  sourceTitle?: string
}

function normalize(t: RawTalk, gen: GenerateParams): SmallTalk {
  return {
    id: uid(),
    topic: t.topic ?? '話題',
    news: t.news ?? '',
    empathy: t.empathy ?? '',
    question: t.question ?? '',
    trivia: t.trivia ?? '',
    sourceQuery: t.sourceQuery ?? t.topic ?? '',
    sourceUrl: t.sourceUrl,
    sourceTitle: t.sourceTitle,
    industry: gen.industry,
    ageGroup: gen.ageGroup,
    role: gen.role,
    source: 'ai',
    createdAt: Date.now(),
  }
}

function customerSummary(customer?: Customer | null) {
  if (!customer) return null
  return {
    name: customer.name,
    company: customer.company,
    hometown: customer.hometown,
    family: customer.family,
    birthday: customer.birthday,
    hobbies: customer.hobbies,
    notes: customer.notes,
  }
}
