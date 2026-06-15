// ============================================================
// Supabase Edge Function: summarize-notes（1ファイル完結版）
// ダッシュボードの Edge Functions エディタにそのまま貼り付けてデプロイできます。
// 必要な環境変数（Edge Functions の Secrets に設定）:
//   GEMINI_API_KEY=...      （Gemini を使う場合）
//   AI_PROVIDER=gemini      （任意。未設定でもキーから自動判定）
//   ANTHROPIC_API_KEY=...   （Claude を使う場合）
// ============================================================

// ---- CORS ----
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ---- LLM（Claude / Gemini 両対応）----
type Provider = 'claude' | 'gemini'
function resolveProvider(): Provider {
  const explicit = (Deno.env.get('AI_PROVIDER') || '').toLowerCase()
  if (explicit === 'gemini' || explicit === 'claude') return explicit
  if (Deno.env.get('GEMINI_API_KEY')) return 'gemini'
  return 'claude'
}
interface JsonSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean'
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  required?: string[]
  description?: string
}
async function callStructured(system: string, user: string, schema: JsonSchema, maxTokens = 4000): Promise<unknown> {
  return resolveProvider() === 'gemini'
    ? callGemini(system, user, schema, maxTokens)
    : callClaude(system, user, schema, maxTokens)
}
async function callClaude(system: string, user: string, schema: JsonSchema, maxTokens: number): Promise<unknown> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: maxTokens,
      thinking: { type: 'adaptive' },
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: { type: 'json_schema', schema: withNoAdditional(schema) } },
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = (data.content ?? []).find((b: { type: string }) => b.type === 'text')?.text
  if (!text) throw new Error('no text in Claude response')
  return JSON.parse(text)
}
function withNoAdditional(s: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { type: s.type }
  if (s.description) out.description = s.description
  if (s.type === 'object' && s.properties) {
    out.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, withNoAdditional(v)]))
    out.required = s.required ?? Object.keys(s.properties)
    out.additionalProperties = false
  }
  if (s.type === 'array' && s.items) out.items = withNoAdditional(s.items)
  return out
}
async function callGemini(system: string, user: string, schema: JsonSchema, maxTokens: number): Promise<unknown> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
        responseSchema: toGeminiSchema(schema),
      },
    }),
  })
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('no text in Gemini response')
  return JSON.parse(text)
}
function toGeminiSchema(s: JsonSchema): Record<string, unknown> {
  const typeMap: Record<string, string> = {
    object: 'OBJECT', array: 'ARRAY', string: 'STRING', number: 'NUMBER', integer: 'INTEGER', boolean: 'BOOLEAN',
  }
  const out: Record<string, unknown> = { type: typeMap[s.type] }
  if (s.description) out.description = s.description
  if (s.type === 'object' && s.properties) {
    out.properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, toGeminiSchema(v)]))
    if (s.required) out.required = s.required
  }
  if (s.type === 'array' && s.items) out.items = toGeminiSchema(s.items)
  return out
}

// ---- 本体 ----
const SYSTEM = `あなたは営業担当者のアシスタントです。
取引先について走り書きした箇条書き・話し言葉・音声入力のテキストを読み取り、
顧客カードの各項目に振り分けて整理します。
- 推測で埋めず、テキストから読み取れる情報だけを入れる
- 該当がない項目は空文字にする
- 簡潔に、要点だけまとめる`

const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: '担当者の名前' },
    company: { type: 'string', description: '会社名' },
    hometown: { type: 'string', description: '出身地' },
    family: { type: 'string', description: '家族構成' },
    birthday: { type: 'string', description: '誕生日' },
    hobbies: { type: 'string', description: '趣味・関心' },
    notes: { type: 'string', description: 'その他の特記事項' },
  },
  required: ['name', 'company', 'hometown', 'family', 'birthday', 'hobbies', 'notes'],
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  let text = ''
  try {
    text = (await req.json()).text ?? ''
  } catch {
    return json({ error: 'invalid JSON' }, 400)
  }
  if (!text.trim()) return json({ result: {} })

  try {
    const result = (await callStructured(SYSTEM, `次のメモを整理してください:\n\n${text}`, schema, 1500)) as Record<
      string,
      unknown
    >
    const cleaned: Record<string, string> = {}
    for (const [k, v] of Object.entries(result)) {
      if (typeof v === 'string' && v.trim()) cleaned[k] = v
    }
    return json({ result: cleaned })
  } catch (e) {
    return json({ error: String(e) }, 502)
  }
})
