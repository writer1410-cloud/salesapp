import type { AgeGroupId, Customer, IndustryId, RoleId, SmallTalk } from '../types'
import { GENERAL_TOPICS, INDUSTRY_TOPICS, type TopicSeed } from '../data/topics'
import { uid } from './util'

export interface GenerateParams {
  industry: IndustryId
  ageGroup: AgeGroupId
  role: RoleId
  customer?: Customer | null
  count?: number
}

/**
 * APIキーなしでも動くテンプレート生成。
 * 業界・年代・役職・顧客情報をもとに、3ステップ公式＋豆知識の雑談を複数生成する。
 */
export function generateFallback(params: GenerateParams): SmallTalk[] {
  const { industry, ageGroup, role, customer } = params
  const count = params.count ?? 3

  const industrySeeds = INDUSTRY_TOPICS[industry] ?? INDUSTRY_TOPICS.other
  const pool: TopicSeed[] = [...industrySeeds, ...GENERAL_TOPICS]

  // 顧客の趣味・出身地から個別話題を1つ足す
  const personalSeed = buildPersonalSeed(customer)
  if (personalSeed) pool.unshift(personalSeed)

  const chosen = shuffle(pool).slice(0, Math.min(count, pool.length))

  return chosen.map((seed) => {
    const question = personalizeQuestion(seed.question, customer, role)
    return {
      id: uid(),
      topic: seed.topic,
      news: adjustTone(seed.news, ageGroup),
      empathy: seed.empathy,
      question,
      trivia: seed.trivia,
      industry,
      ageGroup,
      role,
      source: 'template',
      createdAt: Date.now(),
    } satisfies SmallTalk
  })
}

function buildPersonalSeed(customer?: Customer | null): TopicSeed | null {
  if (!customer) return null
  if (customer.hobbies?.trim()) {
    const hobby = customer.hobbies.split(/[、,・\s]/)[0]
    return {
      topic: `${hobby}の話題`,
      news: `そういえば、${hobby}が好きとお聞きしていましたが、最近そのあたりの話題も色々ありますね。`,
      empathy: `好きなことの時間って、忙しい中でも大事にしたいですよね。`,
      question: `最近は${hobby}、楽しめていらっしゃいますか？`,
      trivia: `好きなことの話は、相手の表情が一番ゆるむ鉄板の話題と言われます。`,
    }
  }
  if (customer.hometown?.trim()) {
    return {
      topic: `${customer.hometown}の話題`,
      news: `${customer.hometown}のご出身でしたよね。あの辺りもニュースで見かけることがあります。`,
      empathy: `地元の話って、なんだか落ち着きますよね。`,
      question: `${customer.hometown}には、最近お帰りになったりするんですか？`,
      trivia: `出身地の話は距離を一気に縮める「ローカルトーク」として営業の定番です。`,
    }
  }
  return null
}

function personalizeQuestion(question: string, customer: Customer | null | undefined, role: RoleId): string {
  // 経営者には会社全体、担当者には個人に寄せた聞き方に微調整
  if (role === 'owner' || role === 'executive') {
    return question.replace(/御社のみなさん|御社では/, '御社全体として')
  }
  if (customer?.name && Math.random() < 0.4) {
    return question.replace(/御社/, `${customer.name}さんのところ`)
  }
  return question
}

function adjustTone(text: string, ageGroup: AgeGroupId): string {
  // 軽い口調調整（テンプレなので最小限）
  if (ageGroup === '20s') return text.replace(/ですね。$/, 'ですよね。')
  return text
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 箇条書き等のメモを簡易要約して顧客フィールドを推定（フォールバック） */
export function summarizeFallback(text: string): Partial<Customer> {
  const result: Partial<Customer> = {}
  const lines = text.split(/[\n、。,]/).map((l) => l.trim()).filter(Boolean)
  for (const line of lines) {
    if (/出身|地元/.test(line)) {
      result.hometown = line.replace(/.*(出身|地元)[はが:：]?/, '').trim() || line
    } else if (/家族|妻|夫|娘|息子|子供|子ども|奥さん|旦那/.test(line)) {
      result.family = (result.family ? result.family + '、' : '') + line
    } else if (/誕生日|生まれ|バースデー/.test(line)) {
      result.birthday = line.replace(/.*(誕生日|生まれ)[はが:：]?/, '').trim() || line
    } else if (/趣味|好き|ゴルフ|釣り|旅行|野球|サッカー|ゲーム|映画|お酒|ラーメン/.test(line)) {
      result.hobbies = (result.hobbies ? result.hobbies + '、' : '') + line
    } else {
      result.notes = (result.notes ? result.notes + '\n' : '') + line
    }
  }
  return result
}
