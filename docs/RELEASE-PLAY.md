# Google Play リリース手順（PWA → TWA）

本アプリは PWA です。Google Play へは **TWA（Trusted Web Activity）** でラップして AAB を作り公開します。
ビルドは [PWABuilder](https://www.pwabuilder.com/) を使う前提です（この実行環境には Android SDK が無いため）。

---

## 全体の流れ

1. PWA をルート直下で HTTPS 公開する（Cloudflare Pages 推奨）
2. PWABuilder で URL を入力し Android パッケージ（AAB）と署名鍵を生成
3. 署名鍵の SHA-256 で `assetlinks.json` を確定 → 再デプロイ
4. Play Console にアプリ作成 → 内部テスト → 製品版で公開

---

## 1. PWA をルート直下で公開（Cloudflare Pages）

> TWA は `https://ドメイン/.well-known/assetlinks.json` を**ドメイン直下**に置く必要があります。
> 本リポジトリは `base: '/'`（ルート配信）に設定済みです。

1. Cloudflare（無料）にログイン → **Workers & Pages → Create → Pages → Connect to Git**
2. リポジトリ `writer1410-cloud/salesapp` を選択
3. ビルド設定：
   - Framework preset: `None`（または Vite）
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. デプロイ後の URL を控える（例 `https://salesapp.pages.dev`）。これが**本番URL**です。
5. 動作確認：
   - `https://<本番URL>/` … アプリが開く
   - `https://<本番URL>/privacy.html` … プライバシーポリシーが開く
   - `https://<本番URL>/.well-known/assetlinks.json` … JSON が開く（まだ仮の値でOK）

> 独自ドメインにする場合：Cloudflare Pages の **Custom domains** で割り当て、以後はそのドメインを本番URLとして使う。

---

## 2. PWABuilder で Android パッケージを生成

1. <https://www.pwabuilder.com/> を開く
2. 本番URL（例 `https://salesapp.pages.dev`）を入力 → **Start**
3. スコア確認後、**Package For Stores → Android** を選択
4. パッケージ設定（重要・控えておく）：
   - **Package ID（applicationId）**: 例 `app.pages.salesapp.twa`（後から変えられないので慎重に）
   - **App name**: ひとネタ｜営業の雑談ネタ
   - **Launcher name**: ひとネタ
   - **Signing key**: 「Create new」を選び、生成される **`signing.keystore` とパスワード控え** を**必ず保管**（紛失すると以後アップデート不可）
5. **Generate** → ZIP をダウンロード。中に以下が入っています：
   - `app-release-bundle.aab` … Play にアップロードする本体
   - `signing.keystore` / `signing-key-info.txt` … 署名鍵情報（**厳重保管**）
   - `assetlinks.json` … PWABuilder が SHA-256 を埋めた完成版

---

## 3. assetlinks.json を確定して再デプロイ

PWABuilder が出力した `assetlinks.json`（`package_name` と `sha256_cert_fingerprints` が埋まったもの）で、
本リポジトリの **`public/.well-known/assetlinks.json`** を上書きします。

```bash
# 例：ダウンロードした assetlinks.json の中身で置き換える
#   public/.well-known/assetlinks.json
```

- `package_name` … 手順2で決めた Package ID
- `sha256_cert_fingerprints` … 署名鍵の SHA-256（`AA:BB:...` 形式）

> 補足：Play の「Play アプリ署名」を使う場合、**Play Console 側の署名鍵 SHA-256 も追加**で必要になることがあります。
> その値は Play Console → 該当アプリ → **テストとリリース → アプリの完全性 → アプリ署名** で確認し、
> fingerprint 配列に**両方**入れておくのが安全です。

上書きしたらコミット → 再デプロイ。
`https://<本番URL>/.well-known/assetlinks.json` が完成版になっていることを確認します。
（反映後、アプリ起動時に URL バーが出なければ検証成功です）

---

## 4. Play Console で公開

1. [Google Play Console](https://play.google.com/console)（開発者登録 $25・一回）にログイン
2. **アプリを作成** → アプリ名「ひとネタ｜営業の雑談ネタ」、言語「日本語」、無料
3. 左メニューに沿って入力（`docs/store-listing-ja.md` の文面を使用）：
   - **ストアの設定 → ストアの掲載情報**：アプリ名 / 簡単な説明 / 詳しい説明 / アイコン(512) / 機能グラフィック(1024×500) / スクリーンショット(最低2枚)
   - **プライバシーポリシー**：`https://<本番URL>/privacy.html`
   - **アプリのコンテンツ**：
     - データ セーフティ → `docs/store-listing-ja.md` の回答例を入力
     - コンテンツのレーティング → アンケート回答
     - 対象年齢、広告の有無（広告なし）
4. **製品版（または内部テスト）→ 新しいリリースを作成** → `app-release-bundle.aab` をアップロード
5. 審査提出 → 承認後に公開

> はじめは **内部テスト** トラックで自分の端末にインストールして実機確認 → 問題なければ製品版に昇格、が安全です。

---

## アイコン・素材の所在

| 用途 | ファイル |
| --- | --- |
| アプリアイコン(any) | `public/pwa-512x512.png` |
| マスカブル（Android必須） | `public/pwa-maskable-512x512.png` |
| ストアアイコン(512) | `public/pwa-512x512.png` を流用可 |
| 機能グラフィック / スクショ | 別途作成（`docs/store-listing-ja.md` 参照） |

`npm run build` 前にアイコンを作り直す場合：

```bash
node scripts/generate-icons.mjs
```

---

## チェックリスト

- [ ] 本番URLがルート直下で HTTPS 公開されている
- [ ] `/privacy.html` が開ける
- [ ] `/.well-known/assetlinks.json` が**完成版**（package_name と SHA-256 入り）
- [ ] `signing.keystore` とパスワードを安全に保管した
- [ ] AAB を Play にアップロードした
- [ ] データセーフティ / コンテンツレーティングを回答した
- [ ] 内部テストで実機の URL バー非表示を確認した
