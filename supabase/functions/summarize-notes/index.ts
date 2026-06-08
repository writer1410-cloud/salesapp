// 箇条書き・話し言葉・音声入力テキストを、顧客項目に振り分ける Edge Function（Claude / Gemini 両対応）
import { corsHeaders, json } from '../_shared/cors.ts'
import { callStructured, type JsonSchema } from '../_shared/llm.ts'

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
