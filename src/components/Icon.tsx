import type { ReactNode } from 'react'

interface Props {
  name: IconName
  size?: number
  className?: string
}

export type IconName =
  | 'talk'
  | 'people'
  | 'archive'
  | 'settings'
  | 'mic'
  | 'stop'
  | 'play'
  | 'plus'
  | 'external'
  | 'search'
  | 'check'
  | 'chevron'
  | 'back'
  | 'lock'
  | 'trash'
  | 'edit'
  | 'sparkle'
  | 'calendar'

const PATHS: Record<IconName, { d?: string; el?: ReactNode }> = {
  talk: { d: 'M4 5h16v11H9l-4 3v-3H4z' },
  people: {
    el: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19c0-3 3-5 6-5s6 2 6 5" />
        <path d="M16 6.5a2.5 2.5 0 0 1 0 5M21 19c0-2.4-1.6-4.2-4-4.8" />
      </>
    ),
  },
  archive: {
    el: (
      <>
        <rect x="4" y="4" width="16" height="4" />
        <path d="M5 8v11h14V8M9.5 12h5" />
      </>
    ),
  },
  settings: {
    el: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v3M12 18v3M4.2 7l2.6 1.5M17.2 15.5L19.8 17M19.8 7l-2.6 1.5M6.8 15.5L4.2 17" />
      </>
    ),
  },
  mic: {
    el: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </>
    ),
  },
  stop: { el: <rect x="6" y="6" width="12" height="12" rx="1" /> },
  play: { d: 'M7 5l12 7-12 7z' },
  plus: { d: 'M12 5v14M5 12h14' },
  external: { el: (<><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v6H4V6h6" /></>) },
  search: { el: (<><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></>) },
  check: { d: 'M5 12l5 5L19 7' },
  chevron: { d: 'M9 6l6 6-6 6' },
  back: { d: 'M15 6l-6 6 6 6' },
  lock: { el: (<><rect x="5" y="11" width="14" height="9" rx="1" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>) },
  trash: { el: (<><path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" /></>) },
  edit: { d: 'M5 19h14M14 5l5 5-9 9H5v-5z' },
  sparkle: { d: 'M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z' },
  calendar: {
    el: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="1" />
        <path d="M4 9h16M8 3v4M16 3v4" />
      </>
    ),
  },
}

export function Icon({ name, size = 20, className }: Props) {
  const p = PATHS[name]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {p.el ?? <path d={p.d} />}
    </svg>
  )
}
