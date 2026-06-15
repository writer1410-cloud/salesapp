// アプリ共通の設定（ビルド時に確定）。
// バックエンド(Supabase Edge Function)のベースURL。
// Vercel などの環境変数 VITE_API_BASE_URL で設定する。
// 例: https://<project>.functions.supabase.co
// 未設定の場合は内蔵テンプレート生成にフォールバックする（AIキーはアプリに一切含めない）。
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
