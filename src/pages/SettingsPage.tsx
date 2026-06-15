import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { Paywall } from '../components/Paywall'
import { Chips, Toggle } from '../components/ui'
import { IndustryPicker } from '../components/IndustryPicker'
import { AGE_GROUPS, ROLES, industryLabel } from '../data/options'
import { getJapaneseVoices, onVoicesReady, speak, ttsSupported } from '../lib/speech'
import { isFeatureUnlocked } from '../lib/billing'
import { DEFAULT_GEMINI_MODEL, FREE_MONTHLY_LIMIT, GEMINI_MODELS, type Profile } from '../types'

export function SettingsPage() {
  const { settings, updateSettings, quota, showToast } = useStore()
  const [paywall, setPaywall] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const ttsUnlocked = isFeatureUnlocked(settings.plan, 'tts')

  useEffect(() => {
    if (!ttsSupported()) return
    onVoicesReady(() => setVoices(getJapaneseVoices()))
    setVoices(getJapaneseVoices())
  }, [])

  const downgrade = () => {
    if (confirm('無料プランに戻しますか？')) {
      updateSettings({ plan: 'free' })
      showToast('無料プランに変更しました')
    }
  }

  const resetData = () => {
    if (confirm('顧客・履歴・設定をすべて削除します。よろしいですか？')) {
      localStorage.clear()
      location.reload()
    }
  }

  return (
    <div className="page">
      {/* 自分のプロフィール */}
      <ProfileSection />

      {/* プラン */}
      <div className="section-label">プラン</div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>
            {settings.plan === 'premium' ? 'PREMIUM' : '無料プラン'}
          </span>
          <span className={`plan-badge ${settings.plan === 'premium' ? 'premium' : ''}`}>
            {settings.plan === 'premium' ? '無制限' : `月${FREE_MONTHLY_LIMIT}回`}
          </span>
        </div>
        <p className="mini-note" style={{ marginTop: 8 }}>
          {settings.plan === 'premium'
            ? '雑談生成は無制限、音声読み上げも使えます。'
            : `今月の利用：${quota.used} / ${quota.limit} 回。音声読み上げはプレミアム限定です。`}
        </p>
        {settings.plan === 'premium' ? (
          <button className="btn block" style={{ marginTop: 8 }} onClick={downgrade}>
            無料プランに戻す
          </button>
        ) : (
          <button className="btn gold block" style={{ marginTop: 8 }} onClick={() => setPaywall(true)}>
            プレミアムにアップグレード
          </button>
        )}
      </div>

      {/* 音声読み上げ */}
      <div className="section-label">音声読み上げ</div>
      <div className="card">
        {!ttsSupported() && (
          <p className="mini-note">この端末・ブラウザは音声読み上げに対応していません。</p>
        )}
        <div className="switch">
          <span className="lbl">
            読み上げを有効にする
            <small>{ttsUnlocked ? '雑談カードから読み上げできます' : 'プレミアム限定機能'}</small>
          </span>
          <Toggle
            on={settings.ttsEnabled && ttsUnlocked}
            onClick={() => (ttsUnlocked ? updateSettings({ ttsEnabled: !settings.ttsEnabled }) : setPaywall(true))}
          />
        </div>

        {ttsUnlocked && (
          <>
            <div className="field" style={{ marginTop: 14 }}>
              <label>読み上げ速度：{settings.ttsRate.toFixed(1)}x</label>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.1}
                value={settings.ttsRate}
                onChange={(e) => updateSettings({ ttsRate: Number(e.target.value) })}
              />
            </div>
            {voices.length > 0 && (
              <div className="field">
                <label>音声</label>
                <select
                  value={settings.ttsVoiceURI}
                  onChange={(e) => updateSettings({ ttsVoiceURI: e.target.value })}
                >
                  <option value="">自動（日本語）</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              className="btn sm"
              onClick={() =>
                speak('これはテスト読み上げです。御社の最近の調子はいかがですか。', {
                  rate: settings.ttsRate,
                  voiceURI: settings.ttsVoiceURI,
                })
              }
            >
              テスト再生
            </button>
          </>
        )}
      </div>

      {/* AI接続 */}
      <div className="section-label">AI生成</div>
      <AiSection />

      {/* データ管理 */}
      <div className="section-label">データ管理</div>
      <div className="card">
        <p className="mini-note">
          データはこの端末内（ブラウザ）にのみ保存されます。サーバーには送信されません。
        </p>
        <button className="btn block" style={{ marginTop: 10, color: 'var(--danger)' }} onClick={resetData}>
          すべてのデータを削除
        </button>
      </div>

      <p className="mini-note" style={{ textAlign: 'center', marginTop: 18 }}>
        <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-d)' }}>
          プライバシーポリシー
        </a>
      </p>
      <p className="mini-note" style={{ textAlign: 'center', marginTop: 4 }}>
        ひとネタ v1.0 ・ ニュース×3ステップ公式
      </p>

      <Paywall open={paywall} onClose={() => setPaywall(false)} />
    </div>
  )
}

function AiSection() {
  const { settings, updateSettings, showToast } = useStore()
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)

  const test = async () => {
    if (!settings.geminiApiKey.trim()) {
      showToast('Geminiキーを入力してください')
      return
    }
    setTesting(true)
    try {
      const { geminiGenerateTalks } = await import('../lib/gemini')
      const r = await geminiGenerateTalks({
        industryLabel: 'IT・情報通信',
        ageLabel: '40代',
        roleLabel: '担当者',
        count: 1,
        key: settings.geminiApiKey.trim(),
        model: settings.geminiModel || undefined,
      })
      showToast(r.length ? 'Gemini接続OK！生成できました' : 'Geminiから結果が空でした')
    } catch (e) {
      showToast('Gemini接続に失敗：' + String(e).slice(0, 60))
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="card">
      <div className="field">
        <label>かんたんモード：Gemini APIキー</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={settings.geminiApiKey}
            onChange={(e) => updateSettings({ geminiApiKey: e.target.value.trim() })}
            placeholder="AIza... または AQ.... から始まるキー"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button className="btn sm" onClick={() => setShowKey(!showKey)} style={{ flexShrink: 0 }}>
            {showKey ? '隠す' : '表示'}
          </button>
        </div>
        <p className="hint">
          Google AI Studio（aistudio.google.com）で無料取得したキーを貼り付けると、AIによる雑談生成が使えます。
          キーは<b>この端末内にのみ保存</b>され、Geminiへ直接送信されます（手軽な反面、端末・通信にキーが露出します。
          無料枠の個人利用向けです）。
        </p>
      </div>

      <div className="field">
        <label>モデル</label>
        <select
          value={settings.geminiModel || DEFAULT_GEMINI_MODEL}
          onChange={(e) => updateSettings({ geminiModel: e.target.value })}
        >
          {GEMINI_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <p className="hint">
          429（上限超過）が出る場合は「flash-lite」など別モデルに切り替えると回避できることがあります。
        </p>
        <div className="btn-row" style={{ marginTop: 8 }}>
          <button className="btn sm dark" onClick={test} disabled={testing}>
            {testing ? '接続中…' : '接続テスト'}
          </button>
          {settings.geminiApiKey && (
            <button
              className="btn sm"
              style={{ color: 'var(--danger)' }}
              onClick={() => updateSettings({ geminiApiKey: '' })}
            >
              キーを削除
            </button>
          )}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '6px 0 14px' }} />

      <div className="field" style={{ marginBottom: 0 }}>
        <label>本格運用：バックエンドURL（任意）</label>
        <input
          value={settings.apiBaseUrl}
          onChange={(e) => updateSettings({ apiBaseUrl: e.target.value.trim() })}
          placeholder="https://xxxx.functions.supabase.co"
        />
        <p className="hint">
          Supabase Edge Function 経由でClaude/Geminiを呼ぶ場合のURL。サーバー側でキーを保持でき安全です。
          未設定でも、上のGeminiキーか内蔵テンプレートで動作します。
        </p>
      </div>
    </div>
  )
}

function ProfileSection() {
  const { settings, updateSettings, showToast } = useStore()
  const base: Profile = settings.profile ?? {
    name: '',
    company: '',
    industry: 'manufacturing',
    ageGroup: '30s',
    role: 'staff',
  }
  const [open, setOpen] = useState(false)
  const [p, setP] = useState<Profile>(base)

  const save = () => {
    updateSettings({ profile: p })
    showToast('プロフィールを更新しました')
    setOpen(false)
  }

  return (
    <>
      <div className="section-label" style={{ marginTop: 0 }}>
        あなたのプロフィール
      </div>
      <div className="card">
        {!open ? (
          <>
            <div style={{ fontWeight: 700 }}>
              {base.name || '名前未設定'}
              <span className="mini-note"> ／ {base.company || '会社未設定'}</span>
            </div>
            <p className="mini-note" style={{ marginTop: 6 }}>
              業界：{industryLabel(base.industry)}（雑談生成の「相手の業界」の初期値になります）
            </p>
            <button className="btn sm" style={{ marginTop: 8 }} onClick={() => setOpen(true)}>
              編集
            </button>
          </>
        ) : (
          <>
            <div className="row-2">
              <div className="field">
                <label>お名前</label>
                <input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
              </div>
              <div className="field">
                <label>会社名</label>
                <input value={p.company} onChange={(e) => setP({ ...p, company: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>あなたの業界</label>
              <IndustryPicker value={p.industry} onChange={(v) => setP({ ...p, industry: v })} />
            </div>
            <div className="field">
              <label>年代</label>
              <Chips options={AGE_GROUPS} value={p.ageGroup} onChange={(v) => setP({ ...p, ageGroup: v })} />
            </div>
            <div className="field">
              <label>立場</label>
              <Chips options={ROLES} value={p.role} onChange={(v) => setP({ ...p, role: v })} />
            </div>
            <button className="btn primary block" onClick={save}>
              保存する
            </button>
          </>
        )}
      </div>
    </>
  )
}
