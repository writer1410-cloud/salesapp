import { FREE_MONTHLY_LIMIT, type Plan, type Usage } from '../types'

export interface QuotaState {
  plan: Plan
  used: number
  limit: number | null // premium は null（無制限）
  remaining: number | null
  canGenerate: boolean
}

export function quota(usage: Usage): QuotaState {
  if (usage.plan === 'premium') {
    return { plan: 'premium', used: usage.generatedCount, limit: null, remaining: null, canGenerate: true }
  }
  const remaining = Math.max(0, FREE_MONTHLY_LIMIT - usage.generatedCount)
  return {
    plan: 'free',
    used: usage.generatedCount,
    limit: FREE_MONTHLY_LIMIT,
    remaining,
    canGenerate: remaining > 0,
  }
}

/** 1回の生成を消費（無料プランのみカウント） */
export function consume(usage: Usage): Usage {
  return { ...usage, generatedCount: usage.generatedCount + 1 }
}

/**
 * プレミアム機能の判定。
 * 音声読み上げはプレミアム限定機能。
 */
export function isFeatureUnlocked(plan: Plan, feature: 'tts'): boolean {
  switch (feature) {
    case 'tts':
      return plan === 'premium'
    default:
      return false
  }
}
