import webpush from "web-push";

// このスクリプトはGitHub Actions内でのみ実行します。秘密鍵・購読情報はログに出しません。
const input = process.env.PUSH_CONFIG;
if (!input) throw new Error("GitHub Repository secret『PUSH_CONFIG』を設定してください。");
let config;
try { config = JSON.parse(input); }
catch { throw new Error("PUSH_CONFIGがJSONではありません。PWAの『登録情報をコピー』から登録し直してください。"); }
const { publicKey, privateKey, subscription } = config;
if (typeof publicKey !== "string" || typeof privateKey !== "string" || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
  throw new Error("PUSH_CONFIGの形式が不正です。端末で登録を作り直してください。");
}
webpush.setVapidDetails("https://github.com", publicKey, privateKey);
try {
  await webpush.sendNotification(subscription, JSON.stringify({ title: "膝コゾ" }), {
    TTL: 3600,
    urgency: "normal",
  });
  console.log("プッシュサービスへの送信が成功しました（端末での表示を保証するものではありません）。");
} catch (error) {
  if (error.statusCode === 404 || error.statusCode === 410) {
    throw new Error("通知登録が失効しました。スマホのPWAで通知を解除して再登録し、PUSH_CONFIGを更新してください。");
  }
  throw new Error(`プッシュ通知の送信に失敗しました（HTTP ${error.statusCode || "unknown"}）。通知権限とPUSH_CONFIGを確認してください。`);
}
