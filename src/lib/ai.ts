import type { Customer, SmallTalk } from '../types'
import { ageLabel, industryLabel, roleLabel } from '../data/options'
import { generateFallback, summarizeFallback, type GenerateParams } from './fallbackGenerator'
import { geminiGenerateTalks, geminiSummarize } from './gemini'
import { uid } from './util'

export interface GenerateResult {
  talks: SmallTalk[]
  source: 'ai' | 'template'
}

/** AI接続の選択肢 */
export interface AiOptions {
  apiBaseUrl?: string // Edge Function 経由（推奨・サーバーでキー保持）
  geminiApiKey?: string // 簡易: ブラウザから直接Gemini
  geminiModel?: string // 使用するGeminiモデル
}

/**
 * 雑談を生成する。
 * 優先順位: ① Edge Function(apiBaseUrl) → ② Geminiキー直結 → ③ 内蔵テンプレート。
 * いずれも失敗時はテンプレートにフォールバックする。
 */
export async function generateSmallTalks(
  params: GenerateParams & AiOptions,
): Promise<GenerateResult> {
  const { apiBaseUrl, geminiApiKey, geminiModel, ...gen } = params

  // ① Edge Function 経由
  if (apiBaseUrl) {
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/generate-smalltalk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      if (talks.length) return { talks, source: 'ai' }
      throw new Error('empty')
    } catch (e) {
      console.warn('Edge Function生成に失敗。次の手段にフォールバックします:', e)
    }
  }

  // ② Geminiキー直結（ブラウザから直接）
  if (geminiApiKey) {
    try {
      const raw = await geminiGenerateTalks({
        industryLabel: industryLabel(gen.industry),
        ageLabel: ageLabel(gen.ageGroup),
        roleLabel: roleLabel(gen.role),
        count: gen.count ?? 3,
        customer: customerSummary(gen.customer),
        key: geminiApiKey,
        model: geminiModel,
      })
      const talks = raw.map((t) => normalize(t, gen))
      if (talks.length) return { talks, source: 'ai' }
      throw new Error('empty')
    } catch (e) {
      console.warn('Gemini生成に失敗したためテンプレート生成にフォールバックします:', e)
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
  const { apiBaseUrl, geminiApiKey, geminiModel } = opts

  if (apiBaseUrl && text.trim()) {
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/summarize-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { result?: Partial<Customer> }
      if (data.result) return { result: data.result, source: 'ai' }
      throw new Error('empty')
    } catch (e) {
      console.warn('Edge Function要約に失敗。次の手段にフォールバックします:', e)
    }
  }

  if (geminiApiKey && text.trim()) {
    try {
      const result = await geminiSummarize(text, geminiApiKey, geminiModel)
      if (Object.keys(result).length) return { result, source: 'ai' }
    } catch (e) {
      console.warn('Gemini要約に失敗したためテンプレート要約にフォールバックします:', e)
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
