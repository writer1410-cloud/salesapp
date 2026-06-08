import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { AGE_GROUPS, ROLES } from '../data/options'
import type { AgeGroupId, Customer, IndustryId, RoleId, SmallTalk } from '../types'
import { Chips } from '../components/ui'
import { IndustryPicker } from '../components/IndustryPicker'
import { TalkCard, talkToSpeech } from '../components/TalkCard'
import { BottomSheet } from '../components/BottomSheet'
import { VoiceField } from '../components/VoiceField'
import { Paywall } from '../components/Paywall'
import { generateSmallTalks } from '../lib/ai'
import { isFeatureUnlocked } from '../lib/billing'
import { speak } from '../lib/speech'
import { birthdaySoon, uid } from '../lib/util'

export function GeneratePage() {
  const store = useStore()
  const { customers, settings, quota, showToast } = store
  const profile = settings.profile

  // 自分の業界を「相手の業界」の初期値に採用（その場で変更可能）
  const [industry, setIndustry] = useState<IndustryId>(profile?.industry ?? 'manufacturing')
  const [ageGroup, setAgeGroup] = useState<AgeGroupId>('50s')
  const [role, setRole] = useState<RoleId>('owner')
  const [customerId, setCustomerId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SmallTalk[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const [paywall, setPaywall] = useState<{ open: boolean; reason?: string }>({ open: false })
  const [saveTarget, setSaveTarget] = useState<SmallTalk | null>(null)

  const customer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  )
  const ttsLocked = !isFeatureUnlocked(settings.plan, 'tts')

  const selectCustomer = (c: Customer | null) => {
    if (c) {
      setCustomerId(c.id)
      setIndustry(c.industry)
      setAgeGroup(c.ageGroup)
      setRole(c.role)
    } else {
      setCustomerId('')
    }
  }

  const onGenerate = async () => {
    if (!quota.canGenerate) {
      setPaywall({
        open: true,
        reason: `無料プランの今月の生成回数（${quota.limit}回）を使い切りました。`,
      })
      return
    }
    setLoading(true)
    try {
      const { talks, source } = await generateSmallTalks({
        industry,
        ageGroup,
        role,
        customer,
        count: 3,
        apiBaseUrl: settings.apiBaseUrl || undefined,
      })
      setResults(talks)
      setSavedIds(new Set())
      if (store.usage.plan === 'free') store.consumeGeneration()
      if (source === 'template' && settings.apiBaseUrl) {
        showToast('AI接続に失敗。テンプレートで生成しました')
      }
    } catch {
      showToast('生成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const onSpeak = (talk: SmallTalk) => {
    if (ttsLocked) {
      setPaywall({ open: true, reason: '音声読み上げはプレミアム限定機能です。' })
      return
    }
    speak(talkToSpeech(talk), { rate: settings.ttsRate, voiceURI: settings.ttsVoiceURI })
  }

  return (
    <div className="page">
      <QuotaBanner />

      {customer && birthdaySoon(customer.birthday) && (
        <div className="banner warn">
          <span>🎂</span>
          <span>
            <b>{customer.name}さん</b>の誕生日が近づいています（{customer.birthday}
            ）。お祝いの一言を添えると好印象です。
          </span>
        </div>
      )}

      <div className="card">
        <div className="section-label" style={{ marginTop: 0 }}>
          相手の業界{profile && industry === profile.industry ? '（あなたと同じ業界）' : ''}
        </div>
        <IndustryPicker value={industry} onChange={setIndustry} />

        <div className="section-label">年代</div>
        <Chips options={AGE_GROUPS} value={ageGroup} onChange={setAgeGroup} />

        <div className="section-label">立場・役職</div>
        <Chips options={ROLES} value={role} onChange={setRole} />

        {customers.length > 0 && (
          <>
            <div className="section-label">顧客から選ぶ（任意）</div>
            <select value={customerId} onChange={(e) => selectCustomer(customers.find((c) => c.id === e.target.value) ?? null)}>
              <option value="">指定なし（業界・年代のみで生成）</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（{c.company}）
                </option>
              ))}
            </select>
            {customer && (
              <p className="mini-note" style={{ marginTop: 6 }}>
                {customer.hometown && `出身: ${customer.hometown} / `}
                {customer.hobbies && `趣味: ${customer.hobbies} / `}
                個人情報を反映して生成します。
              </p>
            )}
          </>
        )}

        <button
          className="btn primary block"
          style={{ marginTop: 16 }}
          onClick={onGenerate}
          disabled={loading}
        >
          {loading ? '生成中…' : '✨ 雑談を3つ生成する'}
        </button>
      </div>

      {results.length > 0 && (
        <>
          <div className="section-label">提案された雑談（3ステップ公式）</div>
          {results.map((talk) => (
            <TalkCard
              key={talk.id}
              talk={talk}
              ttsLocked={ttsLocked}
              saved={savedIds.has(talk.id)}
              onSpeak={() => onSpeak(talk)}
              onSave={() => setSaveTarget(talk)}
            />
          ))}
        </>
      )}

      {results.length === 0 && !loading && (
        <div className="empty">
          <div className="big">🗣️</div>
          <p>
            業界・年代・立場を選んで
            <br />
            「雑談を生成する」を押してください。
          </p>
        </div>
      )}

      <SaveSheet
        talk={saveTarget}
        onClose={() => setSaveTarget(null)}
        onSaved={(id) => setSavedIds((s) => new Set(s).add(id))}
        defaultCustomerId={customerId}
      />
      <Paywall open={paywall.open} reason={paywall.reason} onClose={() => setPaywall({ open: false })} />
    </div>
  )
}

function QuotaBanner() {
  const { quota } = useStore()
  if (quota.plan === 'premium') {
    return (
      <div className="banner">
        <span>✨</span>
        <span>プレミアムプラン：雑談生成は無制限です。</span>
      </div>
    )
  }
  const ratio = quota.limit ? quota.used / quota.limit : 0
  return (
    <div className="banner">
      <span>📊</span>
      <span style={{ flex: 1 }}>
        今月の生成：{quota.used} / {quota.limit} 回（残り{quota.remaining}回）
        <div className={`quota-bar ${quota.remaining! <= 3 ? 'low' : ''}`}>
          <span style={{ width: `${Math.min(100, ratio * 100)}%` }} />
        </div>
      </span>
    </div>
  )
}

function SaveSheet({
  talk,
  onClose,
  onSaved,
  defaultCustomerId,
}: {
  talk: SmallTalk | null
  onClose: () => void
  onSaved: (talkId: string) => void
  defaultCustomerId: string
}) {
  const { customers, addSavedTalk, showToast } = useStore()
  const [memo, setMemo] = useState('')
  const [cid, setCid] = useState(defaultCustomerId)

  const open = !!talk
  const confirm = () => {
    if (!talk) return
    const customer = customers.find((c) => c.id === cid)
    addSavedTalk({
      id: uid(),
      talk,
      customerId: customer?.id,
      customerName: customer?.name,
      memo,
      used: false,
      reaction: '',
      savedAt: Date.now(),
    })
    onSaved(talk.id)
    showToast('雑談をストックしました')
    setMemo('')
    onClose()
  }

  return (
    <BottomSheet open={open} title="雑談をストック" onClose={onClose}>
      {talk && <TalkCard talk={talk} compact />}
      <div className="field">
        <label>紐づける顧客（任意）</label>
        <select value={cid} onChange={(e) => setCid(e.target.value)}>
          <option value="">なし</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}（{c.company}）
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>メモ（任意・音声入力可）</label>
        <VoiceField value={memo} onChange={setMemo} placeholder="例：次回訪問時に使う。社長の反応を見る。" rows={3} />
      </div>
      <button className="btn primary block" onClick={confirm}>
        ストックに保存
      </button>
    </BottomSheet>
  )
}
