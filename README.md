# デュアルストップウォッチ PWA（毎日21時「膝コゾ」通知対応版）

## できること

- 画面上半分タップ：①開始／停止／再開
- 画面下半分タップ：②開始／停止／再開
- 中央の「両方リセット」：確認後に両方リセット
- 計測状態は端末内に保持。画面を閉じていても、次に開いたとき経過時間を復元
- ストップウォッチはオフライン使用可
- 右上のベルマーク：毎日21時（日本時間）に「膝コゾ」をプッシュ通知するための設定

## 公開済みGitHub Pagesのアプリを更新（Windows 11のブラウザでOK）

1. ZIPを解凍し、このフォルダの中身を確認。
2. GitHubの既存リポジトリ `dual-stopwatch-pwa` を開く。
3. **最上位**の `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `reminder.html`, `reminder.css`, `reminder.js`, `package.json` と `icons` の中身、`scripts/send-reminder.mjs` をアップロードして上書きコミット。
4. GitHub Actionsには `.github/workflows/knee-reminder.yml` も置く。GitHubの画面では **Add file → Create new file** でファイル名を `.github/workflows/knee-reminder.yml` と入力し、ZIP内の内容を貼り付けて保存する方法が確実。`scripts/send-reminder.mjs` も同様にサブフォルダへアップロードする。
5. 公開済みアプリを再度開き、右上にベルマークが見えるか確認。古いキャッシュが残るときはPWAを一旦終了して再起動する。

**重要**：最上位に余分なフォルダを作らず、`index.html` がリポジトリ直下にある状態にしてください。古いファイルを削除する必要はありません。

## Androidスマホから通知を登録

1. AndroidのChromeから追加した**インストール済みPWA**を起動します。
2. 右上のベル →「通知登録を作成」をタップし、通知を許可。
3. 「登録情報をコピー」をタップ（秘密鍵と端末のPush購読情報のJSONがコピーされます）。
4. GitHubの該当リポジトリ → **Settings → Secrets and variables → Actions → New repository secret**。
5. Name に **`PUSH_CONFIG`**、SecretにコピーしたJSONを貼り付け → **Add secret**。
6. GitHubの **Actions → 膝コゾ・21時通知 → Run workflow** から手動送信を試します。
7. スマホに「膝コゾ」と通知されれば配信経路が動いています。Android側でそのPWA / Chromeの通知が許可されている必要があります。

**秘密鍵は公開しないでください。** 「登録情報をコピー」したJSONは、公開リポジトリのコード・README・Issue等には絶対に貼り付けず、GitHubのRepository secretにだけ入れます。

## 通知方式と制限（必読）

- **PWAだけのコードで、アプリが閉じているとき毎日21:00に端末内通知を確実に予約することはできません。** このためGitHub Actionsの定期処理 + Web Push APIで送ります。
- GitHub Actionsの`cron: '0 21 * * *'` + `timezone: Asia/Tokyo` は**日本時間21:00の実行を要求**しますが、**実行遅延・省略があります**。したがって21:00ちょうどの到着を保証できません。
- **Publicリポジトリは60日間活動がないとスケジュールされたGitHub Actionsが自動で無効化されます。** 長期間安定したリマインダーには、別途Cloudflare Workers等の通知サーバーやAndroidネイティブアプリの方が適しています。無効化されたらGitHub Actionsで有効化する必要があります。
- Android側の通知拒否／省電力／ネットワーク切断、Chrome/PWAの削除、購読期限切れ等でも遅延・不達があります。
- この手順は**個人の1台**のスマホ向けです。別のスマホで登録し直す場合はGitHubの`PUSH_CONFIG`も更新してください。
- 解除したい場合はPWAのベルから登録解除し、GitHub Secret `PUSH_CONFIG`も削除してください。
- GitHub PagesがHTML等の静的ファイルを配信し、GitHub Actionsが設定時刻にPushサービスへ送信します。GitHubの外部サービスへの追加アカウントは不要です。
- 私的用途でもGitHub Actionsの利用規約・利用制限は適用されます。

## 構成

- `index.html` / `styles.css` / `app.js`: 既存ストップウォッチ画面とロジック
- `reminder.html` / `reminder.css` / `reminder.js`: 通知設定画面、Push購読と秘密鍵の端末内生成
- `sw.js`: オフライン保存とプッシュ受信時の通知表示
- `.github/workflows/knee-reminder.yml`: 毎日21:00（JST）のGitHub Actions通知ジョブ、手動テスト可能
- `scripts/send-reminder.mjs`: GitHub SecretからPush送信
- `package.json`: `web-push` の依存情報
- `icons/`: ストップウォッチと通知に用いるアイコン

## 補足：ローカル動作確認

PowerShellでフォルダに移動し `py -m http.server 8000`、ブラウザで`http://localhost:8000/`にアクセス。Web Pushの購読はAndroidのインストール済みPWAで設定してください。
