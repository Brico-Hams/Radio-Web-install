"use strict";
(() => {
  const TOKEN_KEY = "radicodex.remote.token";
  const CLIENT_KEY = "radicodex.remote.client";
  const SDR_KEY = "radicodex.remote.sdr";
  const FREQ_MIN = 30_000;
  const FREQ_MAX = 3_000_000_000;
  const DIGITS = 10;
  // Rig mode -> OpenWebRX demodulator name.
  const SDR_MODES = Object.freeze({
    USB: "usb", PKTUSB: "usb", RTTY: "usb", LSB: "lsb", PKTLSB: "lsb", CW: "cw", CWR: "cw",
    AM: "am", FM: "nfm", WFM: "nfm", PKTFM: "nfm"
  });
  const $ = id => document.getElementById(id);

  const params = new URLSearchParams(location.hash.slice(1));
  if (params.get("token")) {
    sessionStorage.setItem(TOKEN_KEY, params.get("token"));
    history.replaceState(null, "", location.pathname + location.search);
  }
  const token = sessionStorage.getItem(TOKEN_KEY) || "";
  let clientId = sessionStorage.getItem(CLIENT_KEY);
  if (!clientId) {
    clientId = [...crypto.getRandomValues(new Uint8Array(12))].map(byte => byte.toString(16).padStart(2, "0")).join("");
    sessionStorage.setItem(CLIENT_KEY, clientId);
  }

  const view = { state: null, ptt: false, wantPtt: false, heartbeat: null, freqLockUntil: 0, freqTarget: null, freqTimer: null, sdrKey: "" };

  function notify(message) {
    const node = $("notice");
    node.textContent = message || "";
    node.hidden = !message;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, "X-Client-Id": clientId, ...(options.body ? { "Content-Type": "application/json" } : {}) }
    });
    let body = null;
    try { body = await response.json(); } catch { /* empty body */ }
    if (!response.ok) throw Object.assign(new Error(body?.error || `Error ${response.status}`), { status: response.status });
    return body;
  }

  const command = (cmd, value, extra = {}) =>
    api("/api/cmd", { method: "POST", body: JSON.stringify({ cmd, value }), ...extra });

  async function run(cmd, value) {
    try {
      const result = await command(cmd, value);
      if (result?.state) render(result.state);
      notify("");
    } catch (error) {
      notify(error.status === 409 ? "Otro operador tiene el control." : error.message);
    }
  }

  // Frequency display: one focusable digit per decade so a tap, wheel or arrow key changes that digit.
  function buildFrequency() {
    const container = $("freq");
    for (let position = DIGITS - 1; position >= 0; position -= 1) {
      const digit = document.createElement("span");
      digit.className = "digit";
      digit.tabIndex = 0;
      digit.setAttribute("role", "button");
      digit.dataset.power = String(10 ** position);
      digit.setAttribute("aria-label", `Digito de ${(10 ** position).toLocaleString("es")} Hz`);
      digit.textContent = "0";
      container.append(digit);
      if (position > 0 && position % 3 === 0) {
        const sep = document.createElement("span");
        sep.className = "sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = ".";
        container.append(sep);
      }
    }
    const nudge = (digit, direction) => changeFreq(direction * Number(digit.dataset.power));
    container.addEventListener("click", event => {
      const digit = event.target.closest(".digit");
      if (!digit) return;
      const box = digit.getBoundingClientRect();
      nudge(digit, event.clientY < box.top + box.height / 2 ? 1 : -1);
    });
    container.addEventListener("wheel", event => {
      const digit = event.target.closest(".digit");
      if (!digit) return;
      event.preventDefault();
      nudge(digit, event.deltaY < 0 ? 1 : -1);
    }, { passive: false });
    container.addEventListener("keydown", event => {
      const digit = event.target.closest(".digit");
      if (!digit || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      nudge(digit, event.key === "ArrowUp" ? 1 : -1);
    });
  }

  function showFrequency(freq) {
    const text = Number.isSafeInteger(freq) ? String(freq).padStart(DIGITS, "0") : "".padStart(DIGITS, "-");
    const lead = Number.isSafeInteger(freq) ? text.search(/[1-9]/) : DIGITS;
    [...$("freq").querySelectorAll(".digit")].forEach((digit, index) => {
      digit.textContent = text[index];
      digit.classList.toggle("lead", index < lead);
    });
  }

  function changeFreq(delta) {
    const base = view.freqTarget ?? view.state?.freq;
    if (!Number.isSafeInteger(base) || view.ptt) return;
    const next = Math.min(FREQ_MAX, Math.max(FREQ_MIN, base + delta));
    view.freqTarget = next;
    view.freqLockUntil = Date.now() + 800;
    showFrequency(next);
    clearTimeout(view.freqTimer);
    // Coalesce bursts (wheel, held buttons) to stay under the agent's command rate limit.
    view.freqTimer = setTimeout(() => {
      const target = view.freqTarget;
      view.freqTarget = null;
      run("freq", target);
    }, 80);
  }

  const smeterPercent = db => Math.max(0, Math.min(100, Math.round(((db + 54) / 114) * 100)));
  function smeterText(db) {
    if (db === null || db === undefined) return "--";
    if (db >= 0) return db < 1 ? "S9" : `S9+${Math.round(db)}`;
    return `S${Math.max(0, Math.round(9 + db / 6))}`;
  }

  function render(state) {
    view.state = state;
    const status = $("status");
    status.textContent = state.connected ? "Radio conectada" : "Radio sin conexion";
    status.classList.toggle("on", state.connected);
    if (Date.now() >= view.freqLockUntil) showFrequency(state.freq);
    if (state.mode && document.activeElement !== $("mode")) $("mode").value = state.mode;
    $("vfo-a").setAttribute("aria-pressed", String(state.vfo === "VFOA"));
    $("vfo-b").setAttribute("aria-pressed", String(state.vfo === "VFOB"));
    $("split").setAttribute("aria-pressed", String(Boolean(state.split)));
    $("smeter").value = state.smeter === null ? 0 : smeterPercent(state.smeter);
    $("smeter-text").textContent = smeterText(state.smeter);
    $("tx-timer").textContent = `${state.txSeconds} s`;
    $("operator").textContent = state.operator === "me" ? "Tienes el control" : state.operator === "other" ? "Otro operador tiene el control" : "Sin operador";
    $("ptt").disabled = !state.connected || state.operator === "other";
    if (!state.ptt && view.ptt && !view.wantPtt) setPttUi(false);
    followRig(state);
  }

  function setPttUi(on) {
    view.ptt = on;
    $("ptt").setAttribute("aria-pressed", String(on));
    $("ptt").textContent = on ? "Transmitiendo..." : "Mantener para hablar";
  }

  async function pttDown() {
    if (view.wantPtt || $("ptt").disabled) return;
    view.wantPtt = true;
    try {
      await command("ptt", true);
      if (!view.wantPtt) { pttSendOff(); return; }
      setPttUi(true);
      notify("");
      clearInterval(view.heartbeat);
      view.heartbeat = setInterval(() => {
        api("/api/heartbeat", { method: "POST", body: "{}" }).catch(() => {});
      }, 250);
    } catch (error) {
      view.wantPtt = false;
      notify(error.status === 409 ? "Otro operador tiene el control." : error.message);
    }
  }

  function pttSendOff() {
    clearInterval(view.heartbeat);
    view.heartbeat = null;
    fetch("/api/cmd", {
      method: "POST", keepalive: true,
      headers: { Authorization: `Bearer ${token}`, "X-Client-Id": clientId, "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "ptt", value: false })
    }).catch(() => {});
  }

  function pttUp() {
    if (!view.wantPtt && !view.ptt) return;
    view.wantPtt = false;
    setPttUi(false);
    pttSendOff();
  }

  function bindPtt() {
    const button = $("ptt");
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      pttDown();
    });
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) button.addEventListener(name, pttUp);
    button.addEventListener("contextmenu", event => event.preventDefault());
    button.addEventListener("keydown", event => {
      if (event.code === "Space" && !event.repeat) { event.preventDefault(); pttDown(); }
    });
    button.addEventListener("keyup", event => { if (event.code === "Space") pttUp(); });
    button.addEventListener("blur", pttUp);
    document.addEventListener("visibilitychange", () => { if (document.hidden) pttUp(); });
    addEventListener("pagehide", pttUp);
  }

  // Spectrum: the OpenWebRX page is framed as-is; following the rig only changes its URL fragment.
  function sdrHash(state) {
    const mode = SDR_MODES[state.mode];
    return mode && Number.isSafeInteger(state.freq) ? `#freq=${state.freq},mod=${mode}` : "";
  }

  function setSdrBase(value) {
    let url;
    try { url = new URL(value); } catch { notify("Direccion de OpenWebRX no valida."); return false; }
    if (url.protocol !== "http:" && url.protocol !== "https:") { notify("Direccion de OpenWebRX no valida."); return false; }
    url.hash = "";
    view.sdrBase = url.href;
    view.sdrKey = view.state ? sdrHash(view.state) : "";
    const frame = $("sdr");
    frame.hidden = false;
    frame.src = view.sdrBase + view.sdrKey;
    $("sdr-url").value = view.sdrBase;
    sessionStorage.setItem(SDR_KEY, view.sdrBase);
    notify("");
    return true;
  }

  function followRig(state) {
    if (!view.sdrBase || !$("follow").checked) return;
    const hash = sdrHash(state);
    if (!hash || hash === view.sdrKey) return;
    clearTimeout(view.followTimer);
    view.followTimer = setTimeout(() => {
      view.sdrKey = hash;
      $("sdr").src = view.sdrBase + hash;
    }, 300);
  }

  function connectEvents() {
    const source = new EventSource(`/api/events?token=${encodeURIComponent(token)}&cid=${encodeURIComponent(clientId)}`);
    source.onmessage = event => { try { render(JSON.parse(event.data)); } catch { /* ignore bad frame */ } };
    source.onerror = () => {
      $("status").textContent = "Reconectando...";
      $("status").classList.remove("on");
      $("ptt").disabled = true;
      if (view.wantPtt || view.ptt) pttUp();
    };
  }

  async function init() {
    buildFrequency();
    showFrequency(null);
    if (!token) {
      notify("Falta el token. Abre la direccion completa que muestra el agente (con #token=...).");
      return;
    }
    const step = () => Number($("step").value);
    $("step-up").addEventListener("click", () => changeFreq(step()));
    $("step-down").addEventListener("click", () => changeFreq(-step()));
    $("mode").addEventListener("change", () => run("mode", $("mode").value));
    $("vfo-a").addEventListener("click", () => run("vfo", "A"));
    $("vfo-b").addEventListener("click", () => run("vfo", "B"));
    $("split").addEventListener("click", () => run("split", $("split").getAttribute("aria-pressed") !== "true"));
    $("follow").addEventListener("change", () => { view.sdrKey = ""; if (view.state) followRig(view.state); });
    $("sdr-form").addEventListener("submit", event => { event.preventDefault(); setSdrBase($("sdr-url").value.trim()); });
    bindPtt();
    try {
      const config = await api("/api/config");
      const initial = config.openwebrxUrl || sessionStorage.getItem(SDR_KEY) || "";
      if (initial) setSdrBase(initial);
    } catch (error) {
      notify(error.status === 401 ? "Token no valido." : error.message);
      return;
    }
    connectEvents();
  }

  init();
})();
