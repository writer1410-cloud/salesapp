// ============================================================
// Supabase Edge Function: generate-smalltalk（1ファイル完結版）
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
interface CustomerSummary {
  name?: string; company?: string; hometown?: string; family?: string
  birthday?: string; hobbies?: string; notes?: string
}
interface Body {
  industryLabel: string; ageLabel: string; roleLabel: string
  count?: number; customer?: CustomerSummary | null
}

const SYSTEM = `あなたは日本のルート営業担当者の「雑談ブレーン」です。
取引先との商談前に使える、自然な雑談ネタを提案します。

必ず次の「3ステップ公式」で構成してください:
1. ニュース・話題のふり（最近の時事/業界トレンドを軽く話題にする。断定しすぎない）
2. 主観・共感（自分の感想や相手への共感をひと言。押し付けない）
3. 質問（相手が答えやすい、会話が広がるオープンな質問）

さらに次も付けてください:
- trivia: その話題から派生する豆知識（雑学・語源・意外な数字など、相手が「へぇ」と思う軽い内容）
- sourceQuery: その話題の元ネタニュースを探すための日本語検索キーワード（2〜4語、例「自動車 EV 国内 最新」）

口調・配慮:
- 相手の年代・役職に合わせて敬語のトーンを調整する
- 政治・宗教・センシティブな話題は避ける
- 事実が不確かな最新ニュースの固有名詞は断定しない（「〜という話題」「ニュースで見かけた」程度に留める）
- 1文は短く、話し言葉で。実際に口に出せる長さにする`

const schema: JsonSchema = {
  type: 'object',
  properties: {
    talks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: '話題の短い見出し' },
          news: { type: 'string', description: 'ステップ1: ニュース・話題のふり' },
          empathy: { type: 'string', description: 'ステップ2: 主観・共感' },
          question: { type: 'string', description: 'ステップ3: 質問' },
          trivia: { type: 'string', description: '派生する豆知識' },
          sourceQuery: { type: 'string', description: '元ネタニュースの日本語検索キーワード' },
        },
        required: ['topic', 'news', 'empathy', 'question', 'trivia', 'sourceQuery'],
      },
    },
  },
  required: ['talks'],
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  let body: Body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid JSON' }, 400)
  }

  const count = Math.min(Math.max(body.count ?? 3, 1), 5)
  const c = body.customer
  const customerBlock = c
    ? `\n\n【相手の個別情報（さりげなく1つだけ反映可）】
- 名前: ${c.name || '不明'} / 会社: ${c.company || '不明'}
- 出身地: ${c.hometown || '不明'} / 家族: ${c.family || '不明'}
- 誕生日: ${c.birthday || '不明'} / 趣味: ${c.hobbies || '不明'}
- メモ: ${c.notes || 'なし'}
個別情報がある場合、${count}件のうち1件はそれを自然に絡めてください。`
    : ''

  const userPrompt = `次の相手に向けた雑談を${count}件、バリエーション豊かに作ってください。
- 業界: ${body.industryLabel}
- 年代: ${body.ageLabel}
- 立場・役職: ${body.roleLabel}${customerBlock}`

  try {
    const result = (await callStructured(SYSTEM, userPrompt, schema)) as { talks?: unknown[] }
    return json({ talks: result.talks ?? [], provider: resolveProvider() })
  } catch (e) {
    return json({ error: String(e) }, 502)
  }
})
