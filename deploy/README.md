# 手動デプロイ手順（Supabase ダッシュボード）

CLIやMCPが使えない環境でも、ブラウザだけで Edge Function をデプロイできます。

## 0. 用意するもの
- Supabase プロジェクト（無料プランでOK）
- Gemini APIキー（Google AI Studio で無料取得）または Anthropic APIキー

---

## 1. Edge Function を2つ作る

Supabase ダッシュボード → 左メニュー **Edge Functions** → **Deploy a new function** → **Via Editor**（ブラウザで編集）

### ① generate-smalltalk
1. 関数名に `generate-smalltalk` と入力
2. エディタの中身を全部消して、`deploy/generate-smalltalk.ts` の内容を丸ごと貼り付け
3. **Deploy** を押す

### ② summarize-notes
1. もう一度 **Deploy a new function** → **Via Editor**
2. 関数名 `summarize-notes`
3. `deploy/summarize-notes.ts` の内容を丸ごと貼り付け
4. **Deploy**

---

## 2. シークレット（APIキー）を設定

Edge Functions → **Secrets**（または Settings → Edge Functions）で以下を追加:

| Name | Value |
|------|-------|
| `GEMINI_API_KEY` | （Geminiのキー） |
| `AI_PROVIDER` | `gemini` |

※ Claudeを使う場合は代わりに `ANTHROPIC_API_KEY` を設定（`AI_PROVIDER` は `claude` か未設定でOK）。

---

## 3. JWT認証をオフにする（重要）

各関数の設定で **「Verify JWT」/「Enforce JWT」を OFF** にする。
（フロントから匿名で呼ぶため。ONのままだと 401 になる）

- 関数を開く → 設定（歯車）→ **Verify JWT with legacy secret** を OFF
- または `supabase/config.toml` の `verify_jwt = false`（CLIデプロイ時）

---

## 4. 関数のURLを控える

関数のURLは次の形式:

```
https://<プロジェクトRef>.supabase.co/functions/v1
```

`<プロジェクトRef>` は Settings → General の **Reference ID**。

---

## 5. フロント（Vercel）に環境変数を設定

Vercel → プロジェクト → Settings → Environment Variables:

| Name | Value |
|------|-------|
| `VITE_API_BASE_URL` | `https://<プロジェクトRef>.supabase.co/functions/v1` |

設定後、**Redeploy** する。

---

## 6. 動作確認

ブラウザのコンソールやcurlで:

```bash
curl -X POST "https://<Ref>.supabase.co/functions/v1/generate-smalltalk" \
  -H "Content-Type: application/json" \
  -d '{"industryLabel":"自動車","ageLabel":"40代","roleLabel":"課長","count":2}'
```

`{"talks":[...],"provider":"gemini"}` が返ればデプロイ成功です。
