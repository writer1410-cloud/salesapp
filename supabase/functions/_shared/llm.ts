// Claude / Gemini 両対応の LLM 呼び出しモジュール。
// 環境変数 AI_PROVIDER ("claude" | "gemini") で切り替える。
//   - claude:  ANTHROPIC_API_KEY を使用（モデル: claude-opus-4-8）
//   - gemini:  GEMINI_API_KEY を使用（モデル: gemini-2.0-flash）
// どちらのキーが設定されているかで自動判定もする。

export type Provider = 'claude' | 'gemini'

export function resolveProvider(): Provider {
  const explicit = (Deno.env.get('AI_PROVIDER') || '').toLowerCase()
  if (explicit === 'gemini' || explicit === 'claude') return explicit
  if (Deno.env.get('GEMINI_API_KEY')) return 'gemini'
  return 'claude'
}

/** ざっくりした JSON Schema。両プロバイダ向けに変換して使う。 */
export interface JsonSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean'
  properties?: Record<string, JsonSchema>
  items?: JsonSchema
  required?: string[]
  description?: string
}

/** system + user プロンプトと出力スキーマを渡すと、検証済みJSONを返す。 */
export async function callStructured(
  system: string,
  user: string,
  schema: JsonSchema,
  maxTokens = 4000,
): Promise<unknown> {
  const provider = resolveProvider()
  return provider === 'gemini'
    ? callGemini(system, user, schema, maxTokens)
    : callClaude(system, user, schema, maxTokens)
}

// ---- Claude ----
async function callClaude(system: string, user: string, schema: JsonSchema, maxTokens: number): Promise<unknown> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
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

// JSON Schema に additionalProperties:false を再帰的に付与（Claude の構造化出力要件）
function withNoAdditional(s: JsonSchema): Record<string, unknown> {
  const out: Record<string, unknown> = { type: s.type }
  if (s.description) out.description = s.description
  if (s.type === 'object' && s.properties) {
    out.properties = Object.fromEntries(
      Object.entries(s.properties).map(([k, v]) => [k, withNoAdditional(v)]),
    )
    out.required = s.required ?? Object.keys(s.properties)
    out.additionalProperties = false
  }
  if (s.type === 'array' && s.items) out.items = withNoAdditional(s.items)
  return out
}

// ---- Gemini ----
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

// JSON Schema を Gemini の responseSchema 形式（type を大文字）に変換
function toGeminiSchema(s: JsonSchema): Record<string, unknown> {
  const typeMap: Record<string, string> = {
    object: 'OBJECT',
    array: 'ARRAY',
    string: 'STRING',
    number: 'NUMBER',
    integer: 'INTEGER',
    boolean: 'BOOLEAN',
  }
  const out: Record<string, unknown> = { type: typeMap[s.type] }
  if (s.description) out.description = s.description
  if (s.type === 'object' && s.properties) {
    out.properties = Object.fromEntries(
      Object.entries(s.properties).map(([k, v]) => [k, toGeminiSchema(v)]),
    )
    if (s.required) out.required = s.required
  }
  if (s.type === 'array' && s.items) out.items = toGeminiSchema(s.items)
  return out
}
