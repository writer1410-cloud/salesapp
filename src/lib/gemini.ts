// ブラウザから Gemini API を直接呼ぶ簡易クライアント。
// 設定画面でユーザーが入力した APIキー（端末内保存）を使う。
// ※キーは端末内に保存され、リクエストはブラウザから直接送信されます。
//   手軽な反面、キーが端末・通信に露出するため、無料枠の個人利用向けです。
//   本格運用は Supabase Edge Function 経由（サーバーでキー保持）を推奨します。

import { DEFAULT_GEMINI_MODEL, type Customer } from '../types'

const ENDPOINT = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    key,
  )}`

interface GeminiSchema {
  type: string
  description?: string
  properties?: Record<string, GeminiSchema>
  items?: GeminiSchema
  required?: string[]
}

async function geminiJSON(
  system: string,
  user: string,
  schema: GeminiSchema,
  key: string,
  model: string,
  maxTokens = 4000,
): Promise<unknown> {
  const res = await fetch(ENDPOINT(model || DEFAULT_GEMINI_MODEL, key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    if (res.status === 429) {
      throw new Error('429 無料枠の上限/レート制限です。少し待つか、別モデルをお試しください。')
    }
    throw new Error(`Gemini API error ${res.status}: ${detail.slice(0, 160)}`)
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Geminiの応答が空でした')
  return JSON.parse(text)
}

export interface RawTalk {
  topic?: string
  news?: string
  empathy?: string
  question?: string
  trivia?: string
  sourceQuery?: string
}

const TALK_SYSTEM = `あなたは日本のルート営業担当者の「雑談ブレーン」です。
取引先との商談前に使える自然な雑談ネタを、次の「3ステップ公式」で構成します:
1. ニュース・話題のふり（最近の時事/業界トレンドを軽く。断定しすぎない）
2. 主観・共感（自分の感想や相手への共感をひと言）
3. 質問（相手が答えやすいオープンな質問）
さらに trivia（派生する豆知識）と sourceQuery（元ネタを探す日本語検索キーワード2〜4語）を付けます。
政治・宗教は避け、年代・役職に合わせた敬語で、口に出せる短い話し言葉にしてください。`

const TALK_SCHEMA: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    talks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          topic: { type: 'STRING' },
          news: { type: 'STRING' },
          empathy: { type: 'STRING' },
          question: { type: 'STRING' },
          trivia: { type: 'STRING' },
          sourceQuery: { type: 'STRING' },
        },
        required: ['topic', 'news', 'empathy', 'question', 'trivia', 'sourceQuery'],
      },
    },
  },
  required: ['talks'],
}

export async function geminiGenerateTalks(args: {
  industryLabel: string
  ageLabel: string
  roleLabel: string
  count: number
  customer?: Partial<Customer> | null
  key: string
  model?: string
}): Promise<RawTalk[]> {
  const c = args.customer
  const customerBlock = c
    ? `\n【相手の個別情報（さりげなく1件だけ反映可）】出身地:${c.hometown || '不明'} / 家族:${
        c.family || '不明'
      } / 誕生日:${c.birthday || '不明'} / 趣味:${c.hobbies || '不明'} / メモ:${c.notes || 'なし'}`
    : ''
  const user = `次の相手に向けた雑談を${args.count}件作ってください。
業界:${args.industryLabel} / 年代:${args.ageLabel} / 立場:${args.roleLabel}${customerBlock}`
  const result = (await geminiJSON(TALK_SYSTEM, user, TALK_SCHEMA, args.key, args.model ?? '')) as {
    talks?: RawTalk[]
  }
  return result.talks ?? []
}

const SUMMARY_SYSTEM = `営業担当者のアシスタントとして、取引先について走り書きしたメモ（箇条書き・話し言葉・音声入力）を読み取り、
顧客カードの各項目に振り分けます。推測で埋めず、読み取れる情報だけを入れ、該当がなければ空文字にします。`

const SUMMARY_SCHEMA: GeminiSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    company: { type: 'STRING' },
    hometown: { type: 'STRING' },
    family: { type: 'STRING' },
    birthday: { type: 'STRING' },
    hobbies: { type: 'STRING' },
    notes: { type: 'STRING' },
  },
  required: ['name', 'company', 'hometown', 'family', 'birthday', 'hobbies', 'notes'],
}

export async function geminiSummarize(
  text: string,
  key: string,
  model = '',
): Promise<Partial<Customer>> {
  const result = (await geminiJSON(
    SUMMARY_SYSTEM,
    `次のメモを整理してください:\n\n${text}`,
    SUMMARY_SCHEMA,
    key,
    model,
    1500,
  )) as Record<string, unknown>
  const cleaned: Partial<Customer> = {}
  for (const [k, v] of Object.entries(result)) {
    if (typeof v === 'string' && v.trim()) (cleaned as Record<string, unknown>)[k] = v
  }
  return cleaned
}
