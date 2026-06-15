import { useState } from 'react'
import { useStore } from '../store'
import { AGE_GROUPS, ROLES } from '../data/options'
import { Chips } from '../components/ui'
import { IndustryPicker } from '../components/IndustryPicker'
import type { AgeGroupId, IndustryId, Profile, RoleId } from '../types'

/** 初回起動時：自分のプロフィールを入力する。業界は相手の標準業界に使われる。 */
export function Onboarding() {
  const { updateSettings, showToast } = useStore()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [industry, setIndustry] = useState<IndustryId>('automotive')
  const [ageGroup, setAgeGroup] = useState<AgeGroupId>('30s')
  const [role, setRole] = useState<RoleId>('staff')

  const finish = () => {
    const profile: Profile = { name, company, industry, ageGroup, role }
    updateSettings({ profile, onboarded: true })
    showToast('プロフィールを保存しました')
  }

  return (
    <div className="onboarding">
      <div className="hero">
        <div className="logo">HITONETA</div>
        <h1>ひとネタ</h1>
        <p>まずはあなたのプロフィールを登録しましょう</p>
      </div>

      <div className="steps-dots">
        <span className={step === 0 ? 'on' : ''} />
        <span className={step === 1 ? 'on' : ''} />
      </div>

      {step === 0 && (
        <div className="card">
          <div className="field">
            <label>お名前</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="営業 太郎" />
          </div>
          <div className="field">
            <label>会社名</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="◯◯商事" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>あなたの業界</label>
            <IndustryPicker value={industry} onChange={setIndustry} />
            <p className="hint">
              ここで選んだ業界が、雑談生成時の「相手の業界」の初期値になります（その場で変更も可能です）。
            </p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <div className="field">
            <label>あなたの年代</label>
            <Chips options={AGE_GROUPS} value={ageGroup} onChange={setAgeGroup} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>あなたの立場</label>
            <Chips options={ROLES} value={role} onChange={setRole} />
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div className="btn-row">
        {step > 0 && (
          <button className="btn" style={{ flex: 1 }} onClick={() => setStep(step - 1)}>
            戻る
          </button>
        )}
        {step === 0 ? (
          <button className="btn primary" style={{ flex: 2 }} onClick={() => setStep(1)}>
            次へ
          </button>
        ) : (
          <button className="btn primary" style={{ flex: 2 }} onClick={finish}>
            はじめる
          </button>
        )}
      </div>
    </div>
  )
}
