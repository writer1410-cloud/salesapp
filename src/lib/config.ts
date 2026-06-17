// アプリ共通の設定（ビルド時に確定）。
// バックエンド(Supabase Edge Function)のベースURL。
// Vercel などの環境変数 VITE_API_BASE_URL で設定する。
// 例: https://<project>.functions.supabase.co
// 未設定の場合は内蔵テンプレート生成にフォールバックする（AIキーはアプリに一切含めない）。
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

// Supabase の anon/publishable キー。Edge Function は verify_jwt=true のため、
// 呼び出し時に Authorization / apikey ヘッダーとして送る必要がある。
// VITE_SUPABASE_ANON_KEY で設定する（このキーは公開前提のキー）。
export const SUPABASE_ANON_KEY: string = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
