(() => {
  "use strict";

  const STORAGE_KEY = "dual-stopwatch-state-v1";
  const timerKeys = ["one", "two"];
  const controls = Object.fromEntries(timerKeys.map((key) => [key, {
    panel: document.getElementById(`timer-${key}`),
    time: document.getElementById(`time-${key}`),
    action: document.getElementById(`action-${key}`),
    status: document.getElementById(`status-${key}`),
  }]));
  const resetButton = document.getElementById("reset-button");
  const dialog = document.getElementById("reset-dialog");
  const cancelButton = document.getElementById("cancel-reset");
  const confirmButton = document.getElementById("confirm-reset");

  function initialTimer() {
    return { elapsedMs: 0, running: false, startedAt: null, hasStarted: false };
  }

  function normalizeTimer(data) {
    if (!data || typeof data !== "object") return initialTimer();
    const elapsedMs = typeof data.elapsedMs === "number" && Number.isFinite(data.elapsedMs)
      ? Math.max(0, Math.floor(data.elapsedMs)) : 0;
    const running = data.running === true;
    const startedAt = running && typeof data.startedAt === "number" && Number.isFinite(data.startedAt)
      ? Math.min(Date.now(), Math.max(0, data.startedAt)) : null;
    return {
      elapsedMs,
      running: running && startedAt !== null,
      startedAt,
      hasStarted: data.hasStarted === true || elapsedMs > 0 || running,
    };
  }

  function readState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (raw?.version !== 1 || !raw.timers) throw new Error("Invalid saved state");
      return {
        one: normalizeTimer(raw.timers.one),
        two: normalizeTimer(raw.timers.two),
      };
    } catch {
      return { one: initialTimer(), two: initialTimer() };
    }
  }

  let timers = readState();
  let animationFrame = null;

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, timers })); }
    catch { /* Storage can be unavailable in private browsing; active use still works. */ }
  }

  function elapsed(timer, now) {
    return timer.elapsedMs + (timer.running ? Math.max(0, now - timer.startedAt) : 0);
  }

  function formatElapsed(ms) {
    const centiseconds = Math.floor(Math.max(0, ms) / 10);
    const cs = String(centiseconds % 100).padStart(2, "0");
    const seconds = String(Math.floor(centiseconds / 100) % 60).padStart(2, "0");
    const minutes = String(Math.floor(centiseconds / 6000) % 60).padStart(2, "0");
    const hours = String(Math.floor(centiseconds / 360000)).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}.${cs}`;
  }

  function render(now = Date.now()) {
    for (const key of timerKeys) {
      const timer = timers[key];
      const ui = controls[key];
      const state = timer.running ? "running" : timer.hasStarted ? "paused" : "ready";
      const timeText = formatElapsed(elapsed(timer, now));
      if (ui.time.textContent !== timeText) ui.time.textContent = timeText;
      if (ui.panel.dataset.state !== state) {
        ui.panel.dataset.state = state;
        ui.panel.setAttribute("aria-pressed", String(timer.running));
        const label = key === "one" ? "1" : "2";
        const verb = timer.running ? "停止" : timer.hasStarted ? "再開" : "開始";
        ui.panel.setAttribute("aria-label", `ストップウォッチ${label}を${verb}。現在 ${timeText}`);
        ui.action.textContent = timer.running ? "タップして停止" : timer.hasStarted ? "タップして再開" : "タップして開始";
        ui.status.textContent = timer.running ? "計測中" : timer.hasStarted ? "一時停止中" : "待機中";
      }
    }
  }

  function tick() {
    animationFrame = null;
    render();
    if (timers.one.running || timers.two.running) animationFrame = requestAnimationFrame(tick);
  }

  function updateAnimation() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    render();
    if (timers.one.running || timers.two.running) animationFrame = requestAnimationFrame(tick);
  }

  function toggle(key) {
    const timer = timers[key];
    const now = Date.now();
    if (timer.running) {
      timer.elapsedMs = elapsed(timer, now);
      timer.running = false;
      timer.startedAt = null;
    } else {
      timer.startedAt = now;
      timer.running = true;
      timer.hasStarted = true;
    }
    saveState();
    updateAnimation();
  }

  function resetBoth() {
    timers = { one: initialTimer(), two: initialTimer() };
    saveState();
    updateAnimation();
  }

  timerKeys.forEach((key) => controls[key].panel.addEventListener("click", () => toggle(key)));
  resetButton.addEventListener("click", () => {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else if (window.confirm("両方の計測時間をリセットしますか？")) resetBoth();
  });
  cancelButton.addEventListener("click", () => dialog.close());
  confirmButton.addEventListener("click", () => {
    resetBoth();
    dialog.close();
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) updateAnimation(); });
  window.addEventListener("pageshow", updateAnimation);
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) { timers = readState(); updateAnimation(); }
  });

  updateAnimation();

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        /* Offline support is unavailable on this origin. Stopwatch still works. */
      });
    });
  }
})();
