import { useRef, useState } from 'react'
import { startDictation, sttSupported, type Dictation } from '../lib/speech'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  onError?: (msg: string) => void
}

/** 音声入力ボタン付きのテキストエリア。話した内容を末尾に追記する。 */
export function VoiceField({ value, onChange, placeholder, rows = 4, onError }: Props) {
  const [recording, setRecording] = useState(false)
  const dictation = useRef<Dictation | null>(null)
  const baseText = useRef('')
  const supported = sttSupported()

  const toggle = () => {
    if (recording) {
      dictation.current?.stop()
      return
    }
    baseText.current = value ? value + '\n' : ''
    const d = startDictation(
      (text) => onChange(baseText.current + text),
      () => setRecording(false),
      (err) => {
        setRecording(false)
        onError?.(`音声入力エラー: ${err}`)
      },
    )
    if (!d) {
      onError?.('この端末では音声入力に対応していません')
      return
    }
    dictation.current = d
    setRecording(true)
  }

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
      {supported && (
        <button
          type="button"
          className={`btn sm ${recording ? 'recording' : ''}`}
          style={{ marginTop: 6 }}
          onClick={toggle}
        >
          {recording ? '⏹ 録音停止' : '🎤 音声で入力'}
        </button>
      )}
    </div>
  )
}
