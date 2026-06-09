import { useState } from 'react'
import { useStore } from '../store'
import type { SavedTalk } from '../types'
import { TalkCard, talkToSpeech } from '../components/TalkCard'
import { BottomSheet } from '../components/BottomSheet'
import { VoiceField } from '../components/VoiceField'
import { Paywall } from '../components/Paywall'
import { Icon } from '../components/Icon'
import { isFeatureUnlocked } from '../lib/billing'
import { speak } from '../lib/speech'
import { formatDate } from '../lib/util'

const REACTIONS: { id: SavedTalk['reaction']; label: string }[] = [
  { id: 'good', label: '好反応' },
  { id: 'normal', label: '普通' },
  { id: 'bad', label: 'いまいち' },
]

const reactionMark = (s: SavedTalk) =>
  s.reaction === 'good' ? '◎' : s.reaction === 'normal' ? '○' : s.reaction === 'bad' ? '△' : s.used ? '✓' : '—'

export function HistoryPage() {
  const { saved, settings } = useStore()
  const [open, setOpen] = useState<SavedTalk | null>(null)
  const [paywall, setPaywall] = useState(false)
  const ttsLocked = !isFeatureUnlocked(settings.plan, 'tts')

  return (
    <div className="page">
      {saved.length === 0 ? (
        <div className="empty">
          <p>
            生成した雑談を「ストック」すると
            <br />
            ここに保存され、振り返りメモを残せます。
          </p>
        </div>
      ) : (
        saved.map((s) => (
          <button key={s.id} className="list-item" style={{ width: '100%', textAlign: 'left' }} onClick={() => setOpen(s)}>
            <div className="avatar mono">{reactionMark(s)}</div>
            <div className="meta">
              <div className="nm">{s.talk.topic}</div>
              <div className="sub">
                {s.customerName ? `${s.customerName} ・ ` : ''}
                {formatDate(s.savedAt)}
                {s.memo ? ` ・ ${s.memo}` : ''}
              </div>
            </div>
            <Icon name="chevron" size={18} className="row-arrow" />
          </button>
        ))
      )}

      {open && (
        <DetailSheet
          key={open.id}
          item={open}
          onClose={() => setOpen(null)}
          ttsLocked={ttsLocked}
          onSpeakLocked={() => setPaywall(true)}
          onSpeak={(t) => speak(talkToSpeech(t.talk), { rate: settings.ttsRate, voiceURI: settings.ttsVoiceURI })}
        />
      )}
      <Paywall open={paywall} reason="音声読み上げはプレミアム限定機能です。" onClose={() => setPaywall(false)} />
    </div>
  )
}

function DetailSheet({
  item,
  onClose,
  ttsLocked,
  onSpeak,
  onSpeakLocked,
}: {
  item: SavedTalk
  onClose: () => void
  ttsLocked: boolean
  onSpeak: (t: SavedTalk) => void
  onSpeakLocked: () => void
}) {
  const { updateSavedTalk, removeSavedTalk, showToast } = useStore()
  const [memo, setMemo] = useState(item.memo)
  const [reaction, setReaction] = useState<SavedTalk['reaction']>(item.reaction)
  const [used, setUsed] = useState(item.used)

  const save = () => {
    updateSavedTalk({ ...item, memo, reaction, used })
    showToast('保存しました')
    onClose()
  }
  const del = () => {
    if (confirm('このストックを削除しますか？')) {
      removeSavedTalk(item.id)
      showToast('削除しました')
      onClose()
    }
  }

  return (
    <BottomSheet open title="ストックの詳細" onClose={onClose}>
      <TalkCard talk={item.talk} compact />
      <button
        className="btn sm block"
        style={{ margin: '4px 0 14px' }}
        onClick={() => (ttsLocked ? onSpeakLocked() : onSpeak(item))}
      >
        <Icon name={ttsLocked ? 'lock' : 'play'} size={16} />
        {ttsLocked ? '読み上げ（プレミアム）' : '読み上げる'}
      </button>

      <div className="field">
        <label>相手の反応</label>
        <div className="chips">
          {REACTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`chip ${reaction === r.id ? 'active' : ''}`}
              onClick={() => setReaction(reaction === r.id ? '' : r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="switch" style={{ borderTop: '1px solid var(--border)', borderBottom: 'none' }}>
        <span className="lbl">
          実際に使った
          <small>商談で話題にしたらオン</small>
        </span>
        <button type="button" className={`toggle ${used ? 'on' : ''}`} onClick={() => setUsed(!used)} />
      </div>

      <div className="field">
        <label>振り返りメモ（音声入力可）</label>
        <VoiceField value={memo} onChange={setMemo} placeholder="反応・次回への引き継ぎなど" rows={3} onError={showToast} />
      </div>

      <button className="btn primary block" onClick={save}>
        保存する
      </button>
      <button className="btn block" style={{ marginTop: 8, color: 'var(--danger)' }} onClick={del}>
        削除する
      </button>
    </BottomSheet>
  )
}
