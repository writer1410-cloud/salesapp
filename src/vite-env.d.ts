/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** バックエンド(Supabase Edge Function)のベースURL。例: https://xxxx.functions.supabase.co */
  readonly VITE_API_BASE_URL?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
