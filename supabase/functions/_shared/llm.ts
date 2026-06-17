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

/** Web検索で見つかった元ネタ記事。 */
export interface Source {
  url: string
  title: string
}

/** Web検索（グラウンディング）付きでJSONを生成し、参照したニュース記事も返す。 */
export async function callGroundedJson(
  system: string,
  user: string,
  maxTokens = 4000,
): Promise<{ data: unknown; sources: Source[] }> {
  const provider = resolveProvider()
  return provider === 'gemini'
    ? callGeminiGrounded(system, user, maxTokens)
    : callClaudeGrounded(system, user, maxTokens)
}

// モデルが前後に文章やコードフェンス(```)を付けても、最初の { から最後の } までを
// 取り出してパースする（外側のフェンス等はこれで自然に除去される）。
function parseJsonLoose(text: string): unknown {
  const t = text.trim()
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return JSON.parse(t)
  return JSON.parse(t.slice(start, end + 1))
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

// ---- Web検索付き生成（グラウンディング） ----
// 構造化出力(responseSchema)とGoogle検索ツールは併用できないため、
// JSONはプロンプトで指示してテキストから取り出す。参照元URLはメタデータから取る。

async function callGeminiGrounded(
  system: string,
  user: string,
  maxTokens: number,
): Promise<{ data: unknown; sources: Source[] }> {
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
      tools: [{ google_search: {} }],
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  })
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const cand = data.candidates?.[0]
  const text = (cand?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text || '')
    .join('')
  if (!text) throw new Error('no text in Gemini response')

  const chunks = cand?.groundingMetadata?.groundingChunks ?? []
  const sources: Source[] = chunks
    .map((c: { web?: { uri?: string; title?: string } }) => ({
      url: c.web?.uri || '',
      title: c.web?.title || '',
    }))
    .filter((s: Source) => !!s.url)

  return { data: parseJsonLoose(text), sources }
}

async function callClaudeGrounded(
  system: string,
  user: string,
  maxTokens: number,
): Promise<{ data: unknown; sources: Source[] }> {
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
      system,
      messages: [{ role: 'user', content: user }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const blocks: Array<Record<string, unknown>> = data.content ?? []

  const text = blocks
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text?: string }).text || '')
    .join('')
  if (!text) throw new Error('no text in Claude response')

  const sources: Source[] = []
  for (const b of blocks) {
    if (b.type === 'web_search_tool_result' && Array.isArray((b as { content?: unknown }).content)) {
      for (const r of (b as { content: Array<Record<string, unknown>> }).content) {
        if (r.type === 'web_search_result' && typeof r.url === 'string') {
          sources.push({ url: r.url, title: (r.title as string) || '' })
        }
      }
    }
  }

  return { data: parseJsonLoose(text), sources }
}
