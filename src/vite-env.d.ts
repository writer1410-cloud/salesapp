/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** バックエンド(Supabase Edge Function)のベースURL。例: https://xxxx.functions.supabase.co */
  readonly VITE_API_BASE_URL?: string
  /** Supabase の anon/publishable キー。Edge Function 呼び出しの認証ヘッダーに使う。 */
  readonly VITE_SUPABASE_ANON_KEY?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
