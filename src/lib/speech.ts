// ブラウザ標準の Web Speech API ラッパー（音声読み上げ + 音声入力）

// ---- 読み上げ (SpeechSynthesis) ----
export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function getJapaneseVoices(): SpeechSynthesisVoice[] {
  if (!ttsSupported()) return []
  const all = window.speechSynthesis.getVoices()
  const ja = all.filter((v) => v.lang?.toLowerCase().startsWith('ja'))
  return ja.length ? ja : all
}

/** 音声リストは非同期で読み込まれるため、ロード完了を待つ */
export function onVoicesReady(cb: () => void): void {
  if (!ttsSupported()) return
  if (window.speechSynthesis.getVoices().length) {
    cb()
    return
  }
  window.speechSynthesis.addEventListener('voiceschanged', cb, { once: true })
}

export interface SpeakOptions {
  rate?: number
  voiceURI?: string
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!ttsSupported() || !text.trim()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.rate = opts.rate ?? 1
  if (opts.voiceURI) {
    const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === opts.voiceURI)
    if (voice) u.voice = voice
  } else {
    const ja = getJapaneseVoices()[0]
    if (ja) u.voice = ja
  }
  window.speechSynthesis.speak(u)
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel()
}

// ---- 音声入力 (SpeechRecognition) ----
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function sttSupported(): boolean {
  return getRecognitionCtor() !== null
}

export interface Dictation {
  stop: () => void
}

/**
 * 音声入力を開始。確定テキストを onText に渡す。
 * 端末・ブラウザにより未対応の場合は null を返す。
 */
export function startDictation(
  onText: (text: string) => void,
  onEnd?: () => void,
  onError?: (err: string) => void,
): Dictation | null {
  const Ctor = getRecognitionCtor()
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = 'ja-JP'
  rec.continuous = true
  rec.interimResults = false
  rec.onresult = (e) => {
    let text = ''
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript
    }
    onText(text)
  }
  rec.onerror = (e) => onError?.(e.error)
  rec.onend = () => onEnd?.()
  rec.start()
  return { stop: () => rec.stop() }
}
