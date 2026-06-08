import { useState } from 'react'
import { useStore } from '../store'
import { AGE_GROUPS, INDUSTRIES, ROLES, ageLabel, industryEmoji, industryLabel } from '../data/options'
import type { Customer } from '../types'
import { Chips } from '../components/ui'
import { BottomSheet } from '../components/BottomSheet'
import { VoiceField } from '../components/VoiceField'
import { summarizeNotes } from '../lib/ai'
import { uid } from '../lib/util'

const emptyCustomer = (): Customer => ({
  id: uid(),
  name: '',
  company: '',
  ageGroup: '50s',
  industry: 'manufacturing',
  role: 'owner',
  hometown: '',
  family: '',
  birthday: '',
  hobbies: '',
  notes: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

export function CustomersPage() {
  const { customers } = useStore()
  const [editing, setEditing] = useState<Customer | null>(null)

  return (
    <div className="page">
      <div className="btn-row" style={{ marginBottom: 14 }}>
        <button className="btn primary block" onClick={() => setEditing(emptyCustomer())}>
          ＋ 顧客を追加
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="empty">
          <div className="big">👥</div>
          <p>
            顧客を登録すると、出身地・家族構成・誕生日などを
            <br />
            反映した雑談を生成できます。
          </p>
        </div>
      ) : (
        customers.map((c) => (
          <button key={c.id} className="list-item" onClick={() => setEditing(c)} style={{ width: '100%', textAlign: 'left' }}>
            <div className="avatar">{industryEmoji(c.industry)}</div>
            <div className="meta">
              <div className="nm">
                {c.name || '（名称未設定）'}
                <span className="mini-note"> ／ {c.company}</span>
              </div>
              <div className="sub">
                {industryLabel(c.industry)}・{ageLabel(c.ageGroup)}
                {c.hometown && `・${c.hometown}出身`}
                {c.hobbies && `・${c.hobbies}`}
              </div>
            </div>
            <span style={{ color: 'var(--text-sub)' }}>›</span>
          </button>
        ))
      )}

      {editing && <CustomerForm key={editing.id} customer={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function CustomerForm({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { customers, saveCustomer, removeCustomer, settings, showToast } = useStore()
  const [draft, setDraft] = useState<Customer>(customer)
  const [rawNotes, setRawNotes] = useState('')
  const [summarizing, setSummarizing] = useState(false)

  const set = <K extends keyof Customer>(key: K, value: Customer[K]) =>
    setDraft({ ...draft, [key]: value })

  const isNew = !customers.some((c) => c.id === customer.id)

  const runSummarize = async () => {
    if (!rawNotes.trim()) {
      showToast('箇条書き・メモを入力してください')
      return
    }
    setSummarizing(true)
    try {
      const { result, source } = await summarizeNotes(rawNotes, settings.apiBaseUrl || undefined)
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
    onClose()
  }

  const del = () => {
    if (confirm('この顧客を削除しますか？')) {
      removeCustomer(draft.id)
      showToast('削除しました')
      onClose()
    }
  }

  return (
    <BottomSheet open title={isNew ? '顧客を追加' : '顧客を編集'} onClose={onClose}>
      <div className="banner">
        <span>🪄</span>
        <span>
          下の欄に箇条書き・話し言葉・<b>音声入力</b>でメモすると、AIが各項目に振り分けます。
        </span>
      </div>
      <div className="field">
        <label>かんたん入力（箇条書き・音声）</label>
        <VoiceField
          value={rawNotes}
          onChange={setRawNotes}
          placeholder={'例：田中部長、福岡出身、奥さんと娘2人、ゴルフ好き、誕生日は6月8日'}
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
        <label>業界</label>
        <Chips options={INDUSTRIES} value={draft.industry} onChange={(v) => set('industry', v)} />
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
        保存する
      </button>
      {!isNew && (
        <button className="btn block" style={{ marginTop: 8, color: 'var(--danger)' }} onClick={del}>
          削除する
        </button>
      )}
    </BottomSheet>
  )
}

function stripEmpty(obj: Partial<Customer>): Partial<Customer> {
  const out: Partial<Customer> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.trim()) (out as Record<string, unknown>)[k] = v
  }
  return out
}
