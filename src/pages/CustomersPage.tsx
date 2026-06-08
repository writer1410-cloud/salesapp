import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { ageLabel, industryEmoji, industryLabel } from '../data/options'
import type { Customer } from '../types'
import { CustomerDetail } from './CustomerDetail'
import { uid } from '../lib/util'

const UNGROUPED = '未分類'

const emptyCustomer = (profileIndustry: Customer['industry']): Customer => ({
  id: uid(),
  name: '',
  company: '',
  group: '',
  ageGroup: '50s',
  industry: profileIndustry,
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
  const { customers, settings } = useStore()
  const [detail, setDetail] = useState<{ customer: Customer; isNew: boolean } | null>(null)
  const [filter, setFilter] = useState<string>('すべて')

  // グループ一覧
  const groups = useMemo(() => {
    const set = new Set<string>()
    customers.forEach((c) => set.add(c.group.trim() || UNGROUPED))
    return Array.from(set)
  }, [customers])

  // フィルタ後＆グループごとに分類
  const grouped = useMemo(() => {
    const map = new Map<string, Customer[]>()
    for (const c of customers) {
      const g = c.group.trim() || UNGROUPED
      if (filter !== 'すべて' && g !== filter) continue
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(c)
    }
    return Array.from(map.entries())
  }, [customers, filter])

  return (
    <div className="page">
      <button
        className="btn primary block"
        style={{ marginBottom: 14 }}
        onClick={() => setDetail({ customer: emptyCustomer(settings.profile?.industry ?? 'manufacturing'), isNew: true })}
      >
        ＋ 顧客を追加
      </button>

      {customers.length === 0 ? (
        <div className="empty">
          <div className="big">👥</div>
          <p>
            顧客を登録すると、出身地・誕生日などを反映した
            <br />
            雑談生成や、商談ごとの雑談メモ(日記)が使えます。
          </p>
        </div>
      ) : (
        <>
          {groups.length > 1 && (
            <div className="group-filter">
              {['すべて', ...groups].map((g) => (
                <button
                  key={g}
                  className={`chip ${filter === g ? 'active' : ''}`}
                  onClick={() => setFilter(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          {grouped.map(([group, list]) => (
            <div key={group}>
              <div className="group-header">📁 {group}（{list.length}）</div>
              {list.map((c) => (
                <button
                  key={c.id}
                  className="list-item"
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => setDetail({ customer: c, isNew: false })}
                >
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
              ))}
            </div>
          ))}
        </>
      )}

      {detail && (
        <CustomerDetail
          key={detail.customer.id}
          customer={detail.customer}
          isNew={detail.isNew}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}
