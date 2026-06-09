import { BottomSheet } from './BottomSheet'
import { useStore } from '../store'
import { FREE_MONTHLY_LIMIT } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  reason?: string
}

/**
 * プレミアム購入導線（デモ用）。
 * 実運用では App Store / Google Play の課金 or Stripe をここに接続し、
 * 購入レシートはサーバー側で検証してプランを更新します。
 */
export function Paywall({ open, onClose, reason }: Props) {
  const { updateSettings, showToast } = useStore()

  const upgrade = () => {
    updateSettings({ plan: 'premium' })
    showToast('プレミアムにアップグレードしました')
    onClose()
  }

  return (
    <BottomSheet open={open} title="PREMIUM" onClose={onClose}>
      {reason && (
        <div className="banner gold">
          <span>{reason}</span>
        </div>
      )}
      <div className="card premium-card">
        <div className="premium-tag">PREMIUM</div>
        <h3 style={{ margin: '8px 0 10px' }}>プレミアムでできること</h3>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 2 }}>
          <li>
            雑談生成が<b>無制限</b>
            （無料は月{FREE_MONTHLY_LIMIT}回まで）
          </li>
          <li>
            <b>音声読み上げ</b>機能の解放
          </li>
          <li>商談前の準備がもっとスムーズに</li>
        </ul>
        <p className="mini-note" style={{ marginTop: 12 }}>
          月額プラン（デモ）。下のボタンで購入フローをシミュレートします。
        </p>
        <button className="btn gold block" style={{ marginTop: 8 }} onClick={upgrade}>
          プレミアムにアップグレード
        </button>
      </div>
      <button className="btn block" onClick={onClose}>
        あとで
      </button>
    </BottomSheet>
  )
}
