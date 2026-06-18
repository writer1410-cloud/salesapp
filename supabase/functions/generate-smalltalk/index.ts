// 雑談を生成する Edge Function（Claude / Gemini 両対応）
// 3ステップ公式（ニュース→主観・共感→質問）＋豆知識＋元ネタ検索語をJSONで返す。
import { corsHeaders, json } from '../_shared/cors.ts'
import { callGroundedJson, callStructured, resolveProvider, type JsonSchema } from '../_shared/llm.ts'

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

const SYSTEM = `あなたは日本のルート営業担当者の「雑談ブレーン」です。
取引先との商談前に使える、自然な雑談ネタを提案します。

まずWeb検索で「相手の業界に関する直近の実在ニュース」と「SNS（X/Instagram/TikTok/YouTube等）で今話題のトレンド・流行」を調べ、それらを元ネタにしてください。
【鮮度の絶対条件】
- ニュースは必ず「今日」または「前日（昨日）」など、ここ24〜48時間以内に報じられたリアルタイムな最新ニュースだけを使うこと。1週間以上前の古い話題は使わない。
- SNSのトレンドは「今まさにバズっている・今日話題になっている」リアルタイムなトピックだけを使うこと。過去に流行したものは使わない。
- 検索する際は日付を意識し、できるだけ最新の記事・投稿を選ぶこと。日付が確認できない古い情報は採用しない。
2件以上作る場合は、そのうち1件は必ずSNSで今まさに話題のリアルタイムなトレンド（今日バズっている話題・流行）を元ネタにしてください。

必ず次の「3ステップ公式」で構成してください:
1. ニュース・話題のふり（Web検索で見つけた直近の実在ニュース、またはSNSのトレンドを軽く話題にする）
2. 主観・共感（自分の感想や相手への共感をひと言。押し付けない）
3. 質問（相手が答えやすい、会話が広がるオープンな質問）

さらに次も付けてください:
- trivia: その話題から派生する豆知識（雑学・語源・意外な数字など、相手が「へぇ」と思う軽い内容）
- sourceQuery: その話題の元ネタニュースを探すための日本語検索キーワード（2〜4語、例「自動車 EV 国内 最新」）

口調・配慮:
- 相手の年代・役職に合わせて敬語のトーンを調整する
- 政治・宗教・センシティブな話題は避ける
- Web検索で確認できた事実だけを使う。裏が取れない固有名詞は「〜という話題」程度に留める
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

  // 「今日／前日」を判定できるよう、現在の日本時間の日付をプロンプトに明示する
  const now = new Date()
  const jstDate = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(now)

  const userPrompt = `次の相手に向けた雑談を${count}件、バリエーション豊かに作ってください。
【現在の日付】今日は ${jstDate}（日本時間）です。ニュース・SNSトレンドはこの日付を基準に「今日」または「前日（昨日）」のリアルタイムな最新の話題だけを使ってください。
- 業界: ${body.industryLabel}
- 年代: ${body.ageLabel}
- 立場・役職: ${body.roleLabel}${customerBlock}`

  // 出力JSON形式（構造化出力が使えないグラウンディング時のために明示）
  const jsonSpec = `\n\n出力は次のJSON形式のみ。前後に文章やマークダウンを付けないこと:
{"talks":[{"topic":"","news":"","empathy":"","question":"","trivia":"","sourceQuery":""}]}
talksは${count}件。各newsはWeb検索で見つけた「今日または前日（昨日）」のリアルタイムな最新実在ニュースに基づけること。古い話題は使わない。${count >= 2 ? '1件は今まさにSNSで話題のリアルタイムなトレンドを元ネタにすること。' : ''}`

  // ① Web検索付き生成（最新の実在ニュース＋記事URL）を試す
  try {
    const { data, sources } = await callGroundedJson(SYSTEM, userPrompt + jsonSpec, 4000)
    const rawTalks = ((data as { talks?: Record<string, unknown>[] }).talks ?? []).map((t, i) => {
      const s = sources[i] // 見つかった記事を順に各雑談へ割り当てる
      return s ? { ...t, sourceUrl: s.url, sourceTitle: s.title } : t
    })
    if (rawTalks.length) {
      return json({ talks: rawTalks, provider: resolveProvider(), live: sources.length > 0 })
    }
  } catch (e) {
    console.warn('Web検索付き生成に失敗。検索なし生成にフォールバックします:', String(e))
  }

  // ② フォールバック: Web検索なしの構造化生成
  try {
    const result = (await callStructured(SYSTEM, userPrompt, schema)) as { talks?: unknown[] }
    return json({ talks: result.talks ?? [], provider: resolveProvider() })
  } catch (e) {
    return json({ error: String(e) }, 502)
  }
})
