import { useRef, useState } from 'react'
import { useStore } from '../store'
import { AGE_GROUPS, ROLES, industryEmoji } from '../data/options'
import type { Customer, DiaryEntry, SavedTalk } from '../types'
import { Chips } from '../components/ui'
import { IndustryPicker } from '../components/IndustryPicker'
import { VoiceField } from '../components/VoiceField'
import { TalkCard } from '../components/TalkCard'
import { summarizeNotes } from '../lib/ai'
import { formatYMD, todayYMD, uid } from '../lib/util'

const TABS = ['プロフィール', '雑談メモ', 'ストック'] as const

/** 顧客詳細：横スワイプで プロフィール / 雑談メモ(日記) / ストック を切り替え */
export function CustomerDetail({
  customer,
  isNew,
  onClose,
}: {
  customer: Customer
  isNew: boolean
  onClose: () => void
}) {
  const { customers } = useStore()
  const [tab, setTab] = useState(0)
  const pagerRef = useRef<HTMLDivElement>(null)

  const saved = customers.some((c) => c.id === customer.id)
  const current = customers.find((c) => c.id === customer.id) ?? customer

  const goTab = (i: number) => {
    setTab(i)
    const pager = pagerRef.current
    if (pager) pager.scrollTo({ left: pager.clientWidth * i, behavior: 'smooth' })
  }
  const onScroll = () => {
    const pager = pagerRef.current
    if (!pager) return
    const i = Math.round(pager.scrollLeft / pager.clientWidth)
    if (i !== tab) setTab(i)
  }

  return (
    <div className="detail-screen">
      <div className="detail-head">
        <button className="back" onClick={onClose} aria-label="戻る">
          ‹
        </button>
        <div className="ti">
          <div className="nm">
            {industryEmoji(current.industry)} {current.name || '新しい顧客'}
          </div>
          <div className="sub">
            {current.company || '会社未設定'}
            {current.group ? ` ・ ${current.group}` : ''}
          </div>
        </div>
      </div>

      <div className="detail-tabs">
        {TABS.map((t, i) => (
          <button key={t} className={tab === i ? 'active' : ''} onClick={() => goTab(i)}>
            {t}
          </button>
        ))}
      </div>
      <div className="swipe-hint">← 左右にスワイプして切り替え →</div>

      <div className="detail-pager" ref={pagerRef} onScroll={onScroll}>
        <div className="detail-panel">
          <ProfilePanel customer={customer} isNew={isNew} onClose={onClose} />
        </div>
        <div className="detail-panel">
          {saved ? (
            <DiaryPanel customerId={current.id} />
          ) : (
            <NeedSave message="プロフィールを保存すると、雑談メモ(日記)を残せます。" />
          )}
        </div>
        <div className="detail-panel">
          {saved ? (
            <StockPanel customerId={current.id} />
          ) : (
            <NeedSave message="プロフィールを保存すると、この顧客にストックした雑談が並びます。" />
          )}
        </div>
      </div>
    </div>
  )
}

function NeedSave({ message }: { message: string }) {
  return (
    <div className="empty">
      <div className="big">📝</div>
      <p>{message}</p>
    </div>
  )
}

// ---- プロフィール編集 ----
function ProfilePanel({
  customer,
  isNew,
  onClose,
}: {
  customer: Customer
  isNew: boolean
  onClose: () => void
}) {
  const { customers, saveCustomer, removeCustomer, settings, showToast } = useStore()
  const [draft, setDraft] = useState<Customer>(customer)
  const [rawNotes, setRawNotes] = useState('')
  const [summarizing, setSummarizing] = useState(false)

  const groups = Array.from(new Set(customers.map((c) => c.group).filter(Boolean)))
  const set = <K extends keyof Customer>(key: K, value: Customer[K]) =>
    setDraft({ ...draft, [key]: value })

  const runSummarize = async () => {
    if (!rawNotes.trim()) {
      showToast('箇条書き・メモを入力してください')
      return
    }
    setSummarizing(true)
    try {
      const { result, source } = await summarizeNotes(rawNotes, {
        apiBaseUrl: settings.apiBaseUrl || undefined,
        geminiApiKey: settings.geminiApiKey || undefined,
      })
      setDraft((d) => ({ ...d, ...stripEmpty(result), updatedAt: Date.now() }))
      showToast(source === 'ai' ? 'AIが整理して反映しました' : 'メモを整理して反映しました')
    } finally {
      setSummarizing(false)
    }
  }

  const save = () => {
    if (!draft.name.trim() && !draft.company.trim()) {
      showToast('名前または会社名を入力してください')
      return
    }
    saveCustomer({ ...draft, updatedAt: Date.now() })
    showToast('保存しました')
  }
  const del = () => {
    if (confirm('この顧客を削除しますか？')) {
      removeCustomer(draft.id)
      showToast('削除しました')
      onClose()
    }
  }

  return (
    <>
      <div className="banner">
        <span>🪄</span>
        <span>
          箇条書き・話し言葉・<b>音声入力</b>でメモすると、AIが各項目に振り分けます。
        </span>
      </div>
      <div className="field">
        <label>かんたん入力（箇条書き・音声）</label>
        <VoiceField
          value={rawNotes}
          onChange={setRawNotes}
          placeholder={'例：田中部長、自動車部品メーカー、福岡出身、ゴルフ好き、誕生日6月8日'}
          rows={3}
          onError={showToast}
        />
        <button className="btn accent sm" style={{ marginTop: 6 }} onClick={runSummarize} disabled={summarizing}>
          {summarizing ? '整理中…' : '🪄 AIで整理して反映'}
        </button>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0 16px' }} />

      <div className="row-2">
        <div className="field">
          <label>名前</label>
          <input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="田中 太郎" />
        </div>
        <div className="field">
          <label>会社名</label>
          <input value={draft.company} onChange={(e) => set('company', e.target.value)} placeholder="◯◯製作所" />
        </div>
      </div>

      <div className="field">
        <label>グループ</label>
        <input
          value={draft.group}
          onChange={(e) => set('group', e.target.value)}
          placeholder="例：Aルート / 重要顧客"
          list="group-list"
        />
        <datalist id="group-list">
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </div>

      <div className="field">
        <label>業界</label>
        <IndustryPicker value={draft.industry} onChange={(v) => set('industry', v)} />
      </div>
      <div className="field">
        <label>年代</label>
        <Chips options={AGE_GROUPS} value={draft.ageGroup} onChange={(v) => set('ageGroup', v)} />
      </div>
      <div className="field">
        <label>立場・役職</label>
        <Chips options={ROLES} value={draft.role} onChange={(v) => set('role', v)} />
      </div>

      <div className="row-2">
        <div className="field">
          <label>出身地</label>
          <input value={draft.hometown} onChange={(e) => set('hometown', e.target.value)} placeholder="福岡県" />
        </div>
        <div className="field">
          <label>誕生日</label>
          <input value={draft.birthday} onChange={(e) => set('birthday', e.target.value)} placeholder="6月8日" />
        </div>
      </div>
      <div className="field">
        <label>家族構成</label>
        <input value={draft.family} onChange={(e) => set('family', e.target.value)} placeholder="奥さま・お子さま2人" />
      </div>
      <div className="field">
        <label>趣味・関心</label>
        <input value={draft.hobbies} onChange={(e) => set('hobbies', e.target.value)} placeholder="ゴルフ、釣り" />
      </div>
      <div className="field">
        <label>その他メモ</label>
        <VoiceField value={draft.notes} onChange={(v) => set('notes', v)} placeholder="商談の経緯、注意点など" rows={3} onError={showToast} />
      </div>

      <button className="btn primary block" onClick={save}>
        {isNew ? 'この顧客を保存' : '保存する'}
      </button>
      {!isNew && (
        <button className="btn block" style={{ marginTop: 8, color: 'var(--danger)' }} onClick={del}>
          削除する
        </button>
      )}
    </>
  )
}

// ---- 雑談メモ（日記） ----
function DiaryPanel({ customerId }: { customerId: string }) {
  const { diary, addDiaryEntry, removeDiaryEntry, showToast } = useStore()
  const [date, setDate] = useState(todayYMD())
  const [content, setContent] = useState('')

  const entries = diary
    .filter((e) => e.customerId === customerId)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))

  const add = () => {
    if (!content.trim()) {
      showToast('内容を入力してください')
      return
    }
    const entry: DiaryEntry = {
      id: uid(),
      customerId,
      date,
      content: content.trim(),
      createdAt: Date.now(),
    }
    addDiaryEntry(entry)
    setContent('')
    setDate(todayYMD())
    showToast('雑談メモを記録しました')
  }

  return (
    <>
      <div className="card">
        <div className="field">
          <label>日付</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label>今日話した雑談・出来事（音声入力可）</label>
          <VoiceField
            value={content}
            onChange={setContent}
            placeholder="例：ゴルフのスコアが伸びたと嬉しそうだった。次回は新製品の話を切り出す。"
            rows={3}
            onError={showToast}
          />
        </div>
        <button className="btn primary block" onClick={add}>
          ＋ 記録する
        </button>
      </div>

      <div className="section-label" style={{ marginTop: 4 }}>
        これまでの記録（{entries.length}件）
      </div>
      {entries.length === 0 ? (
        <div className="empty">
          <div className="big">📔</div>
          <p>まだ記録がありません。商談後に雑談の内容を残しましょう。</p>
        </div>
      ) : (
        entries.map((e) => (
          <div key={e.id} className="diary-entry">
            <div className="date">🗓 {formatYMD(e.date)}</div>
            <div className="body">{e.content}</div>
            <button
              className="del"
              onClick={() => {
                if (confirm('この記録を削除しますか？')) removeDiaryEntry(e.id)
              }}
            >
              削除
            </button>
          </div>
        ))
      )}
    </>
  )
}

// ---- ストックした雑談（タップで全文） ----
function StockPanel({ customerId }: { customerId: string }) {
  const { saved } = useStore()
  const [openId, setOpenId] = useState('')
  const items = saved.filter((s) => s.customerId === customerId)

  if (items.length === 0) {
    return (
      <div className="empty">
        <div className="big">💬</div>
        <p>
          この顧客にひも付けてストックした雑談が
          <br />
          ここに一覧表示されます。
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="section-label" style={{ marginTop: 0 }}>
        ストックした雑談（{items.length}件）
      </div>
      {items.map((s) => (
        <StockRow key={s.id} item={s} open={openId === s.id} onToggle={() => setOpenId(openId === s.id ? '' : s.id)} />
      ))}
    </>
  )
}

function StockRow({ item, open, onToggle }: { item: SavedTalk; open: boolean; onToggle: () => void }) {
  return (
    <div className={`stock-item ${open ? 'open' : ''}`}>
      <button className="head" onClick={onToggle}>
        <span>💬</span>
        <span className="ttl">{item.talk.topic}</span>
        <span className="arr">›</span>
      </button>
      {open && (
        <div className="full">
          <TalkCard talk={item.talk} compact />
          {item.memo && (
            <p className="mini-note" style={{ marginTop: 6 }}>
              メモ：{item.memo}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function stripEmpty(obj: Partial<Customer>): Partial<Customer> {
  const out: Partial<Customer> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.trim()) (out as Record<string, unknown>)[k] = v
  }
  return out
}
