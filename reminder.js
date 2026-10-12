(() => {
  "use strict";
  const STORAGE_KEY = "dual-stopwatch-knee-push-config-v1";
  const $ = (id) => document.getElementById(id);
  const enable = $("enable"), copy = $("copy"), test = $("test"), disable = $("disable"), status = $("status"), fallback = $("fallback");

  function setStatus(message) { status.textContent = message; }
  function fromBase64url(value) {
    const str = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(str + "=".repeat((4 - str.length % 4) % 4));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  function toBase64url(data) {
    const bytes = new Uint8Array(data);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function savedConfig() {
    try {
      const obj = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return obj && typeof obj.publicKey === "string" && typeof obj.privateKey === "string" && obj.subscription?.endpoint ? obj : null;
    } catch { return null; }
  }
  function updateButtons() {
    const existing = savedConfig();
    copy.disabled = !existing;
    test.disabled = Notification.permission !== "granted";
    if (existing) {
      setStatus("端末の通知登録は作成済みです。GitHubのSecretを設定し、Actionsからテスト送信してください。");
    } else if (Notification.permission === "denied") {
      setStatus("通知がブロックされています。Android/Chromeのサイト通知設定で許可してください。");
    } else {
      setStatus("未設定です。通知を有効にしてください。");
    }
  }
  function supported() {
    return window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!crypto?.subtle;
  }
  if (!supported()) {
    enable.disabled = true; copy.disabled = true; test.disabled = true;
    setStatus("このブラウザではWeb Pushを利用できません。AndroidのChromeでインストール済みPWAから開いてください。");
    return;
  }
  updateButtons();
  enable.addEventListener("click", async () => {
    enable.disabled = true;
    setStatus("準備しています…");
    try {
      // 通知許可はユーザーの直接操作から要求する。
      const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (permission !== "granted") throw new Error("通知の許可が必要です。Androidの通知設定も確認してください。");
      const registration = await navigator.serviceWorker.ready;
      const previous = await registration.pushManager.getSubscription();
      const config = savedConfig();
      if (previous && config && previous.endpoint === config.subscription.endpoint) {
        setStatus("既にこの端末を登録しています。下のボタンから登録情報をコピーできます。");
        updateButtons();
        return;
      }
      if (previous) await previous.unsubscribe();
      const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
      const publicKey = toBase64url(await crypto.subtle.exportKey("raw", pair.publicKey));
      const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
      const privateKey = privateJwk.d;
      if (!privateKey || fromBase64url(publicKey).length !== 65 || fromBase64url(privateKey).length !== 32) throw new Error("通知用の鍵を生成できませんでした。");
      const subscription = await registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: fromBase64url(publicKey)});
      const newConfig = { publicKey, privateKey, subscription: subscription.toJSON() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      setStatus("登録情報が作成されました。次にGitHubへSecretを登録してください。");
      updateButtons();
    } catch (error) {
      setStatus(`失敗しました：${error?.message || String(error)}`);
    } finally { enable.disabled = false; }
  });
  copy.addEventListener("click", async () => {
    const config = savedConfig();
    if (!config) return;
    const content = JSON.stringify(config);
    try {
      await navigator.clipboard.writeText(content);
      setStatus("コピーしました。GitHubのRepository secret『PUSH_CONFIG』の値に貼り付けてください。");
    } catch {
      fallback.hidden = false; fallback.value = content; fallback.focus(); fallback.select();
      setStatus("自動コピーできませんでした。表示された文字列をすべて選択してコピーしてください。");
    }
  });
  test.addEventListener("click", async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification("膝コゾ", { body: "通知表示のテストです", tag: "knee-kozo-test", icon: new URL("./icons/icon-192.png", location.href).href });
      setStatus("テスト通知を表示しました。実際に届くかはGitHub Actionsからの手動送信でも確認してください。");
    } catch (error) { setStatus(`テスト失敗：${error?.message || String(error)}`); }
  });
  disable.addEventListener("click", async () => {
    if (!confirm("この端末の通知登録を解除しますか？ GitHubのSecretも削除または変更する必要があります。")) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      localStorage.removeItem(STORAGE_KEY);
      updateButtons();
      setStatus("端末の登録を解除しました。GitHub側のPUSH_CONFIGも削除してください。");
    } catch (error) { setStatus(`解除できませんでした：${error?.message || String(error)}`); }
  });
})();
