import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { Paywall } from '../components/Paywall'
import { Toggle } from '../components/ui'
import { getJapaneseVoices, onVoicesReady, speak, ttsSupported } from '../lib/speech'
import { isFeatureUnlocked } from '../lib/billing'
import { FREE_MONTHLY_LIMIT } from '../types'

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
      {/* プラン */}
      <div className="section-label" style={{ marginTop: 0 }}>
        プラン
      </div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            {settings.plan === 'premium' ? '✨ プレミアム' : '🆓 無料プラン'}
          </span>
          <span className={`plan-badge ${settings.plan === 'premium' ? 'premium' : ''}`} style={{ color: settings.plan === 'premium' ? '#3a2a00' : 'var(--primary)', background: settings.plan === 'premium' ? 'var(--accent)' : 'var(--primary-soft)' }}>
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
          <button className="btn accent block" style={{ marginTop: 8 }} onClick={() => setPaywall(true)}>
            ✨ プレミアムにアップグレード
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
            <small>{ttsUnlocked ? '雑談カードから読み上げできます' : '🔒 プレミアム限定機能'}</small>
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
              🔊 テスト再生
            </button>
          </>
        )}
      </div>

      {/* AI接続 */}
      <div className="section-label">AI生成（上級者向け）</div>
      <div className="card">
        <div className="field">
          <label>バックエンドURL（Supabase Edge Functions など）</label>
          <input
            value={settings.apiBaseUrl}
            onChange={(e) => updateSettings({ apiBaseUrl: e.target.value.trim() })}
            placeholder="https://xxxx.functions.supabase.co"
          />
          <p className="hint">
            未設定の場合は、内蔵テンプレートで雑談を生成します（オフラインでも動作）。
            設定するとClaude APIによる、よりパーソナルな生成になります。
          </p>
        </div>
      </div>

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
        営業雑談アシスタント v1.0 ・ ニュース×3ステップ公式
      </p>

      <Paywall open={paywall} onClose={() => setPaywall(false)} />
    </div>
  )
}
