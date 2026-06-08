import type { Customer, SmallTalk } from '../types'
import { ageLabel, industryLabel, roleLabel } from '../data/options'
import { generateFallback, summarizeFallback, type GenerateParams } from './fallbackGenerator'
import { uid } from './util'

export interface GenerateResult {
  talks: SmallTalk[]
  source: 'ai' | 'template'
}

/**
 * 雑談を生成する。
 * apiBaseUrl が設定されていれば Claude バックエンド（Edge Function）を呼び出し、
 * 失敗時・未設定時はテンプレート生成にフォールバックする。
 */
export async function generateSmallTalks(
  params: GenerateParams & { apiBaseUrl?: string },
): Promise<GenerateResult> {
  const { apiBaseUrl, ...gen } = params
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
      console.warn('AI生成に失敗したためテンプレート生成にフォールバックします:', e)
    }
  }
  return { talks: generateFallback(gen), source: 'template' }
}

/**
 * 箇条書き・メモ・音声入力テキストを要約して顧客フィールドに変換。
 */
export async function summarizeNotes(
  text: string,
  apiBaseUrl?: string,
): Promise<{ result: Partial<Customer>; source: 'ai' | 'template' }> {
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
      console.warn('AI要約に失敗したためテンプレート要約にフォールバックします:', e)
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
