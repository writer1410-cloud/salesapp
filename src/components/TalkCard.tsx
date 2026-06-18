import type { ReactNode } from 'react'
import type { SmallTalk } from '../types'
import { newsSearchUrl } from '../types'
import { Icon } from './Icon'

interface Props {
  talk: SmallTalk
  onSave?: () => void
  onSpeak?: () => void
  ttsLocked?: boolean
  saved?: boolean
  compact?: boolean
}

/** 3ステップ公式（ニュース→主観・共感→質問）＋豆知識を表示するカード */
export function TalkCard({ talk, onSave, onSpeak, ttsLocked, saved, compact }: Props) {
  const { tag, title } = splitTopic(talk.topic)
  // SNSかどうかは AI が返す kind を優先し、無ければ見出しタグから判定
  const isSns = talk.kind === 'sns' || (!!tag && tag.includes('SNS'))
  const badge = isSns ? 'SNSトレンド' : tag
  return (
    <div className={`card talk-card${isSns ? ' is-sns' : ''}`}>
      <div className="talk-topic">
        <span className="topic-text">
          {badge && <span className={`topic-tag${isSns ? ' sns' : ''}`}>{badge}</span>}
          {title}
        </span>
        <span className={`src ${talk.source}`}>{talk.source === 'ai' ? 'AI' : 'TEMPLATE'}</span>
      </div>

      <Step no="01" kind="ニュース・話題" text={talk.news}>
        {talk.published && <span className="published">🕒 {talk.published}</span>}
        {talk.sourceUrl ? (
          <a className="news-link src-live" href={talk.sourceUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={14} />
            {talk.sourceTitle ? clip(talk.sourceTitle, 34) : '元記事を読む'}
          </a>
        ) : (
          talk.sourceQuery && (
            <a
              className="news-link"
              href={newsSearchUrl(talk.sourceQuery)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="search" size={14} />
              関連ニュースを見る
            </a>
          )
        )}
      </Step>
      <Step no="02" kind="主観・共感" text={talk.empathy} />
      <Step no="03" kind="質問" text={talk.question} />

      {talk.trivia && (
        <div className="trivia">
          <span className="trivia-label">豆知識</span>
          <span>{talk.trivia}</span>
        </div>
      )}

      {!compact && (
        <div className="talk-actions">
          {onSpeak && (
            <button className="btn sm" onClick={onSpeak}>
              <Icon name={ttsLocked ? 'lock' : 'play'} size={16} />
              読み上げ
            </button>
          )}
          {onSave && (
            <button className="btn sm primary" onClick={onSave} disabled={saved}>
              <Icon name={saved ? 'check' : 'plus'} size={16} />
              {saved ? '保存済み' : 'ストック'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Step({
  no,
  kind,
  text,
  children,
}: {
  no: string
  kind: string
  text: string
  children?: ReactNode
}) {
  if (!text) return null
  return (
    <div className="step">
      <div className="step-no">{no}</div>
      <div className="step-body">
        <span className="step-kind">{kind}</span>
        <p>{text}</p>
        {children}
      </div>
    </div>
  )
}

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

/** 先頭の【...】タグを本文から分離する（例: 「【SNSで話題】新作スイーツ」） */
function splitTopic(topic: string): { tag?: string; title: string } {
  const m = topic.match(/^\s*[【\[]([^】\]]+)[】\]]\s*(.*)$/)
  if (m) return { tag: m[1].trim(), title: m[2].trim() || topic }
  return { title: topic }
}

/** 雑談全文を読み上げ用の1テキストに連結 */
export function talkToSpeech(talk: SmallTalk): string {
  return [talk.news, talk.empathy, talk.question, talk.trivia ? `豆知識。${talk.trivia}` : '']
    .filter(Boolean)
    .join(' ')
}
