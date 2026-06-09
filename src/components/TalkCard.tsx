import type { ReactNode } from 'react'
import type { SmallTalk } from '../types'
import { newsSearchUrl } from '../types'

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
  return (
    <div className="card">
      <div className="talk-topic">
        <span>💬 {talk.topic}</span>
        <span className={`src ${talk.source}`}>{talk.source === 'ai' ? 'AI' : 'テンプレ'}</span>
      </div>

      <Step no="1" kind="ニュース・話題" text={talk.news}>
        {talk.sourceUrl ? (
          <a className="news-link" href={talk.sourceUrl} target="_blank" rel="noopener noreferrer">
            📰 {talk.sourceTitle ? clip(talk.sourceTitle, 34) : '元記事を読む'}
          </a>
        ) : (
          talk.sourceQuery && (
            <a
              className="news-link"
              href={newsSearchUrl(talk.sourceQuery)}
              target="_blank"
              rel="noopener noreferrer"
            >
              🔗 関連ニュースを見る
            </a>
          )
        )}
      </Step>
      <Step no="2" kind="主観・共感" text={talk.empathy} />
      <Step no="3" kind="質問" text={talk.question} />

      {talk.trivia && (
        <div className="trivia">
          <span>💡</span>
          <span>
            <b>豆知識：</b>
            {talk.trivia}
          </span>
        </div>
      )}

      {!compact && (
        <div className="talk-actions">
          {onSpeak && (
            <button className="btn sm" onClick={onSpeak}>
              {ttsLocked ? '🔒 読み上げ' : '🔊 読み上げ'}
            </button>
          )}
          {onSave && (
            <button className="btn sm primary" onClick={onSave} disabled={saved}>
              {saved ? '✓ 保存済み' : '＋ ストック'}
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

/** 雑談全文を読み上げ用の1テキストに連結 */
export function talkToSpeech(talk: SmallTalk): string {
  return [talk.news, talk.empathy, talk.question, talk.trivia ? `豆知識。${talk.trivia}` : '']
    .filter(Boolean)
    .join(' ')
}
