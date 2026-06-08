export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  )
}

export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** 今日の日付 YYYY-MM-DD（ローカル） */
export function todayYMD(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/** YYYY-MM-DD を「2026年6月8日(月)」形式に */
export function formatYMD(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  const date = new Date(y, m - 1, d)
  const w = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
  return `${y}年${m}月${d}日(${w})`
}

/** 誕生日が近いか判定（自由記述から月日を緩く抽出） */
export function birthdaySoon(birthday: string, withinDays = 14): boolean {
  if (!birthday) return false
  const m = birthday.match(/(\d{1,2})\s*[月\/\-.]\s*(\d{1,2})/)
  if (!m) return false
  const month = Number(m[1])
  const day = Number(m[2])
  if (!month || !day) return false
  const now = new Date()
  const year = now.getFullYear()
  let next = new Date(year, month - 1, day)
  if (next.getTime() < now.setHours(0, 0, 0, 0)) {
    next = new Date(year + 1, month - 1, day)
  }
  const diff = (next.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000
  return diff >= 0 && diff <= withinDays
}
