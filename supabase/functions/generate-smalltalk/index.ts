// 雑談を生成する Edge Function（Claude API）
// 3ステップ公式（ニュース→主観・共感→質問）＋豆知識をJSONで返す。
import { corsHeaders, json } from '../_shared/cors.ts'

interface CustomerSummary {
  name?: string
  company?: string
  hometown?: string
  family?: string
  birthday?: string
  hobbies?: string
  notes?: string
}

interface Body {
  industryLabel: string
  ageLabel: string
  roleLabel: string
  count?: number
  customer?: CustomerSummary | null
}

const MODEL = 'claude-opus-4-8'

const SYSTEM = `あなたは日本のルート営業担当者の「雑談ブレーン」です。
取引先との商談前に使える、自然な雑談ネタを提案します。

必ず次の「3ステップ公式」で構成してください:
1. ニュース・話題のふり（最近の時事/業界トレンドを軽く話題にする。断定しすぎない）
2. 主観・共感（自分の感想や相手への共感をひと言。押し付けない）
3. 質問（相手が答えやすい、会話が広がるオープンな質問）

さらに、その話題から派生する「豆知識（trivia）」を1つ添えます。
雑学・語源・意外な数字など、相手が「へぇ」と思う軽い内容にしてください。

口調・配慮:
- 相手の年代・役職に合わせて敬語のトーンを調整する
- 政治・宗教・センシティブな話題は避ける
- 事実が不確かな最新ニュースの固有名詞は断定しない（「〜という話題」「ニュースで見かけた」程度に留める）
- 1文は短く、話し言葉で。実際に口に出せる長さにする`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY is not set' }, 500)

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
- 名前: ${c.name || '不明'}
- 会社: ${c.company || '不明'}
- 出身地: ${c.hometown || '不明'}
- 家族構成: ${c.family || '不明'}
- 誕生日: ${c.birthday || '不明'}
- 趣味・関心: ${c.hobbies || '不明'}
- メモ: ${c.notes || 'なし'}
個別情報がある場合、${count}件のうち1件はそれを自然に絡めてください。`
    : ''

  const userPrompt = `次の相手に向けた雑談を${count}件、バリエーション豊かに作ってください。
- 業界: ${body.industryLabel}
- 年代: ${body.ageLabel}
- 立場・役職: ${body.roleLabel}${customerBlock}`

  const schema = {
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
          },
          required: ['topic', 'news', 'empathy', 'question', 'trivia'],
          additionalProperties: false,
        },
      },
    },
    required: ['talks'],
    additionalProperties: false,
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        thinking: { type: 'adaptive' },
        system: SYSTEM,
        messages: [{ role: 'user', content: userPrompt }],
        output_config: {
          format: { type: 'json_schema', schema },
        },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return json({ error: `Anthropic API error ${res.status}`, detail: text }, 502)
    }

    const data = await res.json()
    const textBlock = (data.content ?? []).find(
      (b: { type: string }) => b.type === 'text',
    )
    if (!textBlock) return json({ error: 'no text in response' }, 502)
    const parsed = JSON.parse(textBlock.text)
    return json({ talks: parsed.talks ?? [] })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
