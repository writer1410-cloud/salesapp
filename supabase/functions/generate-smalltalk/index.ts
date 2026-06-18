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

【検索のやり方（必ず守る）】
- 検索キーワードには必ず「今の年月（ユーザーから渡される今日の日付の年月）」と「最新」「本日」「今日」などの語を含めること。例: 「(業界名) 最新ニュース (今年)年(今月)月」。
- 古い情報に引っ張られないよう、年月を入れた検索を最低2回は行うこと。
- SNSトレンドは次のような「今日のトレンド」をまとめたページを名指しで検索すること: 「Yahoo!リアルタイム検索 トレンドランキング」「Googleトレンド 急上昇 (今日)」「X(Twitter) トレンド 今日」「TikTok 急上昇 (今月)」。
- 自分の記憶や訓練データの知識だけで話題を作らない。必ずWeb検索の結果に基づくこと。

【鮮度の絶対条件】
- ニュース・SNSとも、原則「今日」または「前日（昨日）」＝24〜48時間以内の情報だけを使う。どうしても無ければ最大でも1週間以内。それより古いものは絶対に使わない。
- 検索結果の各記事・投稿の「掲載日時」を確認し、古いものは捨てて新しいものだけを採用すること。掲載日が1年前など古いものは選ばない。
- 日付が確認できない情報は採用しない。

2件以上作る場合は、そのうち**少なくとも1件は必ずSNSで今まさに話題のリアルタイムなトレンド**（今日バズっている話題・流行）を元ネタにすること。SNSトレンドが見つからない場合でも、必ずSNSのトレンドページを検索してから判断すること。

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
          kind: { type: 'string', description: '元ネタの種類: "news"（業界ニュース）または "sns"（SNSトレンド）' },
          published: { type: 'string', description: '元ネタの掲載日時（例「2026-06-18」「本日」「昨日」）。24〜48時間以内であること' },
          news: { type: 'string', description: 'ステップ1: ニュース・話題のふり' },
          empathy: { type: 'string', description: 'ステップ2: 主観・共感' },
          question: { type: 'string', description: 'ステップ3: 質問' },
          trivia: { type: 'string', description: '派生する豆知識' },
          sourceQuery: { type: 'string', description: '元ネタニュースの日本語検索キーワード' },
        },
        required: ['topic', 'kind', 'published', 'news', 'empathy', 'question', 'trivia', 'sourceQuery'],
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
【現在の日付】今日は ${jstDate}（日本時間）です。ニュース・SNSトレンドはこの日付を基準に「今日」または「前日（昨日）」のリアルタイムな最新の話題だけを使ってください。Web検索のキーワードには必ずこの「年・月」（例: ${jstDate.replace(/(\d+)年(\d+)月.*/, '$1年$2月')}）と「最新」「本日」などを含め、古い記事を避けてください。
- 業界: ${body.industryLabel}
- 年代: ${body.ageLabel}
- 立場・役職: ${body.roleLabel}${customerBlock}`

  // 出力JSON形式（構造化出力が使えないグラウンディング時のために明示）
  const jsonSpec = `\n\n出力は次のJSON形式のみ。前後に文章やマークダウンを付けないこと:
{"talks":[{"topic":"","kind":"news|sns","published":"","news":"","empathy":"","question":"","trivia":"","sourceQuery":""}]}
talksは${count}件。各newsはWeb検索で見つけた「今日または前日（昨日）」のリアルタイムな最新実在情報に基づけること。
- publishedには元ネタの掲載日時を書き、24〜48時間以内（最大でも1週間以内）のものだけを採用すること。1年前など古い記事は絶対に使わない。
- kindには "news"（業界ニュース）か "sns"（SNSトレンド）を入れること。${count >= 2 ? '\n- そのうち少なくとも1件はkind="sns"（今まさにSNSで話題のリアルタイムなトレンド）にすること。' : ''}`

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
