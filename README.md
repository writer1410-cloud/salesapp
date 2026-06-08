# 営業雑談アシスタント 🗣️

ルート営業向けの**スマホアプリ（PWA）**。お客様との商談前に、相手の**年代・業界・立場**に合わせた、**ニュースを絡めた自然な雑談**を「3ステップ公式」で提案します。

> 3ステップ公式：**① ニュース・話題のふり → ② 主観・共感 → ③ 質問**
> さらにその話題から派生する **豆知識（trivia）** も一緒に表示します。

## 主な機能

| 機能 | 説明 |
| --- | --- |
| 🗣️ 雑談生成 | 業界・年代・役職を選んで、3ステップ公式の雑談を3つ生成。豆知識つき。 |
| 👥 顧客カード | 出身地・家族構成・誕生日・趣味などを登録。生成時に反映してパーソナルな雑談に。 |
| 🪄 AI入力補助 | 箇条書き・話し言葉・**音声入力**でメモ → AIが各項目に自動で振り分け。 |
| 📒 ストック/履歴 | 生成した雑談をメモ付きで保存。相手の反応・使用有無も記録して振り返り。 |
| 🎂 誕生日リマインド | 顧客の誕生日が近いとカードでお知らせ。 |
| 🔊 音声読み上げ | 雑談を読み上げ（端末標準の音声合成）。**プレミアム限定**。 |
| 💳 課金 | 無料：月10回まで生成 ／ プレミアム：無制限＋音声読み上げ解放。 |

データは**端末内（ブラウザのlocalStorage）にのみ保存**され、サーバーには送信されません。

## 技術構成

- フロントエンド：**React + TypeScript + Vite**、PWA対応（`vite-plugin-pwa`）。ホーム画面に追加してアプリのように使えます。
- 音声：ブラウザ標準の **Web Speech API**（読み上げ／音声入力）。
- AI生成：**Claude API（`claude-opus-4-8`）** を **Supabase Edge Functions** 経由で呼び出し。
  - **APIキー未設定でも動作**します。その場合は内蔵のテンプレート生成（業界別の話題プール）でオフライン動作します。

## セットアップ（フロントエンド）

```bash
npm install
npm run dev      # 開発サーバー
npm run build    # 本番ビルド（dist/）
npm run preview  # ビルド結果のプレビュー
```

スマホの実機確認は、同一Wi-Fiで `npm run dev -- --host` を実行し、表示されたLAN URLにアクセスしてください（音声入力・マイクは https もしくは localhost が必要です）。

## AI生成を有効にする（任意）

内蔵テンプレートだけでも使えますが、よりパーソナルなAI生成を使う場合：

1. [Supabase CLI](https://supabase.com/docs/guides/local-development) でプロジェクトにログイン。
2. Claude APIキーをシークレットとして登録：
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Edge Functions をデプロイ：
   ```bash
   supabase functions deploy generate-smalltalk
   supabase functions deploy summarize-notes
   ```
4. アプリの **設定 → AI生成** に、関数のベースURL（例 `https://<project>.functions.supabase.co`）を入力。

※ Edge Function 側で Claude APIキーを保持するため、キーが端末に露出しません。

## 課金について（実装メモ）

本リポジトリの課金はデモ（フロントのプラン切替シミュレーション）です。実運用では以下を接続してください：

- iOS/Android：App Store / Google Play のアプリ内課金（PWAをネイティブ化する場合）
- Web：Stripe などのサブスク決済
- **購入レシートの検証はサーバー側で行い**、検証結果をもとにプラン（無制限・読み上げ解放）を付与します。

## ディレクトリ

```
src/
  pages/         画面（雑談生成・顧客・履歴・設定）
  components/    UI部品（雑談カード・シート・音声入力 等）
  lib/           ロジック（AI接続・テンプレ生成・課金・音声・保存）
  data/          業界/年代/役職の定義、業界別の話題シード
  store.tsx      アプリ状態（Context）
supabase/functions/
  generate-smalltalk/  雑談生成（Claude API）
  summarize-notes/     メモ要約（Claude API）
```
