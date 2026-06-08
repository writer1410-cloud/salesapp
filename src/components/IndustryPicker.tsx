import { INDUSTRIES } from '../data/options'
import type { IndustryId } from '../types'

interface Props {
  value: IndustryId
  onChange: (v: IndustryId) => void
}

const GROUPS: ('製造' | '非製造')[] = ['製造', '非製造']

/** 業界を「製造／非製造」の見出し付きで選択するピッカー */
export function IndustryPicker({ value, onChange }: Props) {
  return (
    <div>
      {GROUPS.map((g) => (
        <div key={g}>
          <div className="industry-group-label">{g}業</div>
          <div className="chips">
            {INDUSTRIES.filter((i) => i.group === g).map((i) => (
              <button
                key={i.id}
                type="button"
                className={`chip ${value === i.id ? 'active' : ''}`}
                onClick={() => onChange(i.id)}
              >
                {i.emoji} {i.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
