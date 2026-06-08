interface ChipOption<T extends string> {
  id: T
  label: string
  emoji?: string
}

interface ChipsProps<T extends string> {
  options: ChipOption<T>[]
  value: T
  onChange: (v: T) => void
}

export function Chips<T extends string>({ options, value, onChange }: ChipsProps<T>) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`chip ${value === o.id ? 'active' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.emoji ? `${o.emoji} ` : ''}
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <button type="button" className={`toggle ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on} />
}
