"use strict";
(() => {
  const TOKEN_KEY = "radicodex.remote.token";
  const CLIENT_KEY = "radicodex.remote.client";
  const LOCK_KEY = "bricohams.remote.lock";
  const BAND_KEY = "bricohams.remote.band.";
  const FREQ_MIN = 30_000;
  const FREQ_MAX = 3_000_000_000;
  const DIGITS = 10;
  const PX_PER_STEP = 12;
  const LOG_MAX = 50;
  // IARU Region 1 SSB/CW calling areas used until a band has a remembered frequency.
  const BANDS = Object.freeze({
    160: { lo: 1_810_000, hi: 2_000_000, freq: 1_843_000, mode: "LSB" },
    80: { lo: 3_500_000, hi: 3_800_000, freq: 3_700_000, mode: "LSB" },
    60: { lo: 5_250_000, hi: 5_450_000, freq: 5_355_000, mode: "USB" },
    40: { lo: 7_000_000, hi: 7_200_000, freq: 7_100_000, mode: "LSB" },
    30: { lo: 10_100_000, hi: 10_150_000, freq: 10_106_000, mode: "CW" },
    20: { lo: 14_000_000, hi: 14_350_000, freq: 14_200_000, mode: "USB" },
    17: { lo: 18_068_000, hi: 18_168_000, freq: 18_130_000, mode: "USB" },
    15: { lo: 21_000_000, hi: 21_450_000, freq: 21_300_000, mode: "USB" },
    12: { lo: 24_890_000, hi: 24_990_000, freq: 24_950_000, mode: "USB" },
    10: { lo: 28_000_000, hi: 29_700_000, freq: 28_500_000, mode: "USB" },
    6: { lo: 50_000_000, hi: 52_000_000, freq: 50_150_000, mode: "USB" },
    2: { lo: 144_000_000, hi: 146_000_000, freq: 144_300_000, mode: "USB" },
    70: { lo: 430_000_000, hi: 440_000_000, freq: 432_200_000, mode: "USB" }
  });
  // Passband (Hz) behind FIL1/FIL2/FIL3 for each mode family.
  const FILTERS = Object.freeze({
    ssb: [3000, 2400, 1800], cw: [1200, 500, 250], am: [9000, 6000, 3000],
    fm: [15000, 12000, 9000], data: [3000, 2400, 500], rtty: [2400, 500, 250]
  });
  const FILTER_GROUP = Object.freeze({
    LSB: "ssb", USB: "ssb", CW: "cw", CWR: "cw", AM: "am", FM: "fm", WFM: "fm", PKTFM: "fm",
    PKTUSB: "data", PKTLSB: "data", RTTY: "rtty"
  });
  const MODE_BUTTON = Object.freeze({
    LSB: "LSB", USB: "USB", CW: "CW", CWR: "CWR", AM: "AM", FM: "FM", WFM: "FM", RTTY: "RTTY",
    PKTUSB: "DATA", PKTLSB: "DATA", PKTFM: "DATA"
  });
  const MODE_LABEL = Object.freeze({ CWR: "CW-R", PKTUSB: "DATA", PKTLSB: "DATA", PKTFM: "DATA", WFM: "WFM" });
  // Hamlib AGC enum values for the OFF/FAST/MID/SLOW cycle, and names for the ones it does not cycle through.
  const AGC_CYCLE = Object.freeze([
    { value: 0, text: "OFF", label: "AGC apagado" }, { value: 2, text: "FAST", label: "AGC rapido" },
    { value: 5, text: "MID", label: "AGC medio" }, { value: 3, text: "SLOW", label: "AGC lento" }
  ]);
  const AGC_NAMES = Object.freeze({ 1: "SUPER", 4: "USER", 6: "AUTO" });
  const LEVEL_KEYS = Object.freeze({ AF: "af", RF: "rf", RFPOWER: "rfpower" });
  const TABS = Object.freeze(["band", "levels", "log"]);
  const $ = id => document.getElementById(id);

  const params = new URLSearchParams(location.hash.slice(1));
  if (params.get("token")) sessionStorage.setItem(TOKEN_KEY, params.get("token"));
  // "fp" (certificate fingerprint) is only for the Android app; the browser just drops it.
  if (params.has("token") || params.has("fp")) history.replaceState(null, "", location.pathname + location.search);
  const token = sessionStorage.getItem(TOKEN_KEY) || "";
  let clientId = sessionStorage.getItem(CLIENT_KEY);
  if (!clientId) {
    clientId = [...crypto.getRandomValues(new Uint8Array(12))].map(byte => byte.toString(16).padStart(2, "0")).join("");
    sessionStorage.setItem(CLIENT_KEY, clientId);
  }

  const view = {
    state: null, linkUp: false, ptt: false, wantPtt: false, heartbeat: null, freqLockUntil: 0, freqTarget: null, freqTimer: null,
    locked: false, editing: false, tuneBusy: false,
    log: [], last: { freq: null, mode: null, ptt: false, txSeconds: 0 }, freqLogTimer: null, bandPending: "", bandTimer: null,
    sliderHold: {}, sliderTimers: {}
  };

  const read = (storage, key) => { try { return storage.getItem(key); } catch { return null; } };
  const write = (storage, key, value) => {
    try { if (value === null) storage.removeItem(key); else storage.setItem(key, value); } catch { /* storage may be denied */ }
  };

  // Text and label writes are cached so the 4 Hz render does not churn the DOM (and the locale observer).
  const written = new WeakMap();
  function cached(node, key, value, apply) {
    let entry = written.get(node);
    if (!entry) { entry = {}; written.set(node, entry); }
    if (entry[key] === value) return;
    entry[key] = value;
    apply();
  }
  const setText = (node, text) => cached(node, "text", text, () => { node.textContent = text; });
  const setAttr = (node, name, value) => cached(node, name, value, () => node.setAttribute(name, value));
  const setPressed = (node, on) => {
    if (node.getAttribute("aria-pressed") !== String(on)) node.setAttribute("aria-pressed", String(on));
  };
  const formatHz = hz => String(hz).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const modeLabel = mode => MODE_LABEL[mode] || mode;
  const stepSize = () => Number($("step").value);

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

  const command = body => api("api/cmd", { method: "POST", body: JSON.stringify(body) });

  async function run(body) {
    try {
      const result = await command(body);
      if (result?.state) render(result.state);
      notify("");
      return true;
    } catch (error) {
      notify(error.status === 409 ? "Otro operador tiene el control." : error.message);
      return false;
    }
  }

  // Frequency display: one focusable digit per decade. Tap/Enter edits the value, wheel and arrows nudge that digit.
  function buildFrequency() {
    const container = $("freq");
    for (let position = DIGITS - 1; position >= 0; position -= 1) {
      const digit = document.createElement("span");
      digit.className = "digit";
      digit.tabIndex = 0;
      digit.setAttribute("role", "button");
      digit.dataset.power = String(10 ** position);
      digit.dataset.index = String(DIGITS - 1 - position);
      digit.setAttribute("aria-label", `Digito de ${(10 ** position).toLocaleString("es")} Hz`);
      digit.textContent = "0";
      container.append(digit);
      if (position > 0 && position % 3 === 0) {
        const sep = document.createElement("span");
        sep.className = "sep";
        sep.dataset.index = digit.dataset.index;
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = ".";
        container.append(sep);
      }
    }
    const nudge = (digit, direction) => changeFreq(direction * Number(digit.dataset.power));
    container.addEventListener("click", event => {
      if (event.target.closest(".digit")) startEdit();
    });
    container.addEventListener("wheel", event => {
      const digit = event.target.closest(".digit");
      if (!digit) return;
      event.preventDefault();
      nudge(digit, event.deltaY < 0 ? 1 : -1);
    }, { passive: false });
    container.addEventListener("keydown", event => {
      const digit = event.target.closest(".digit");
      if (!digit) return;
      if (event.key === "Enter") { event.preventDefault(); startEdit(); return; }
      if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      nudge(digit, event.key === "ArrowUp" ? 1 : -1);
    });
  }

  function showFrequency(freq) {
    const known = Number.isSafeInteger(freq);
    const text = known ? String(freq).padStart(DIGITS, "0") : "".padStart(DIGITS, "-");
    const first = known ? text.search(/[1-9]/) : 0;
    const lead = first < 0 ? DIGITS - 1 : first;
    for (const node of $("freq").children) {
      const index = Number(node.dataset.index);
      node.hidden = index < lead;
      if (node.classList.contains("digit")) node.textContent = text[index];
    }
  }

  // "14.074", "14074", "7100k", "144,3m" ... -> Hz. Bare integers: up to 999 are MHz, larger ones kHz.
  function parseFrequency(text) {
    const match = /^(\d+(?:[.,]\d+)?)\s*(hz|khz|k|mhz|m)?$/i.exec(String(text).trim());
    if (!match) return null;
    const number = Number(match[1].replace(",", "."));
    const unit = (match[2] || "").toLowerCase();
    let hz;
    if (unit === "hz") hz = number;
    else if (unit === "khz" || unit === "k") hz = number * 1e3;
    else if (unit === "mhz" || unit === "m") hz = number * 1e6;
    else if (/[.,]/.test(match[1]) || number < 1000) hz = number * 1e6;
    else hz = number * 1e3;
    hz = Math.round(hz);
    return Number.isSafeInteger(hz) && hz >= FREQ_MIN && hz <= FREQ_MAX ? hz : null;
  }

  function startEdit() {
    const freq = view.state?.freq;
    if (view.editing || view.locked || view.ptt || view.state?.ptt || !Number.isSafeInteger(freq)) return;
    view.editing = true;
    const display = $("freq");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "freq-edit";
    input.inputMode = "decimal";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Frecuencia en MHz (o con k, m, Hz)");
    input.value = (freq / 1e6).toFixed(6);
    display.hidden = true;
    display.after(input);
    input.focus();
    input.select();
    const finish = commit => {
      if (!view.editing) return;
      view.editing = false;
      const text = input.value;
      input.remove();
      display.hidden = false;
      if (commit) {
        const hz = parseFrequency(text);
        if (hz === null) notify("Frecuencia no valida.");
        else setFrequency(hz);
      }
      if (view.state) showFrequency(view.freqTarget ?? view.state.freq);
    };
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); finish(true); }
      else if (event.key === "Escape") { event.preventDefault(); finish(false); }
    });
    input.addEventListener("blur", () => finish(false));
  }

  function setFrequency(hz) {
    if (view.locked || view.ptt) return;
    const next = Math.min(FREQ_MAX, Math.max(FREQ_MIN, hz));
    view.freqTarget = next;
    view.freqLockUntil = Date.now() + 800;
    showFrequency(next);
    clearTimeout(view.freqTimer);
    // Coalesce bursts (wheel, drag, held buttons) to stay under the agent's command rate limit.
    view.freqTimer = setTimeout(() => {
      const target = view.freqTarget;
      view.freqTarget = null;
      run({ cmd: "freq", value: target });
    }, 80);
  }

  function changeFreq(delta) {
    const base = view.freqTarget ?? view.state?.freq;
    if (!Number.isSafeInteger(base)) return;
    setFrequency(base + delta);
  }

  // Drag strip: every PX_PER_STEP pixels of horizontal drag moves one step; arrows work for keyboard users.
  function bindTuner() {
    const tuner = $("tuner");
    let drag = null;
    let offset = 0;
    tuner.addEventListener("pointerdown", event => {
      if (view.locked || event.button > 0) return;
      tuner.setPointerCapture?.(event.pointerId);
      drag = { x: event.clientX };
      tuner.classList.add("dragging");
      tuner.focus();
    });
    tuner.addEventListener("pointermove", event => {
      if (!drag) return;
      const steps = Math.trunc((event.clientX - drag.x) / PX_PER_STEP);
      if (!steps) return;
      drag.x += steps * PX_PER_STEP;
      offset = (offset + steps * PX_PER_STEP) % PX_PER_STEP;
      tuner.style.backgroundPosition = `${offset}px 0`;
      changeFreq(steps * stepSize());
    });
    const end = () => { drag = null; tuner.classList.remove("dragging"); };
    for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) tuner.addEventListener(name, end);
    tuner.addEventListener("keydown", event => {
      const direction = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
      const page = { PageUp: 1, PageDown: -1 }[event.key];
      if (!direction && !page) return;
      event.preventDefault();
      changeFreq(direction ? direction * stepSize() : page * stepSize() * 10);
    });
  }

  function bandOf(freq) {
    return Object.keys(BANDS).find(key => freq >= BANDS[key].lo && freq <= BANDS[key].hi) || null;
  }

  function loadBand(key) {
    try {
      const saved = JSON.parse(read(localStorage, BAND_KEY + key));
      if (Number.isSafeInteger(saved?.freq) && saved.freq >= BANDS[key].lo && saved.freq <= BANDS[key].hi && typeof saved.mode === "string") return saved;
    } catch { /* fall back to the calling area */ }
    return { freq: BANDS[key].freq, mode: BANDS[key].mode };
  }

  // Remembers where the operator settled in each band (stable for 1.5 s) for the next jump.
  function rememberBand(state) {
    const key = Number.isSafeInteger(state.freq) ? bandOf(state.freq) : null;
    if (!key || !state.mode || state.ptt) return;
    const pending = `${key}|${state.freq}|${state.mode}`;
    if (pending === view.bandPending) return;
    view.bandPending = pending;
    clearTimeout(view.bandTimer);
    view.bandTimer = setTimeout(() => write(localStorage, BAND_KEY + key, JSON.stringify({ freq: state.freq, mode: state.mode })), 1500);
  }

  async function jumpToBand(key) {
    if (!Object.hasOwn(BANDS, key) || view.locked) return;
    const target = loadBand(key);
    clearTimeout(view.freqTimer);
    view.freqTarget = null;
    if (view.state?.mode !== target.mode && !(await run({ cmd: "mode", value: target.mode, passband: 0 }))) return;
    await run({ cmd: "freq", value: target.freq });
  }

  function pickMode(button) {
    if (view.locked) return;
    let mode = button.dataset.mode;
    if (mode === "DATA") mode = ["LSB", "PKTLSB"].includes(view.state?.mode) ? "PKTLSB" : "PKTUSB";
    run({ cmd: "mode", value: mode, passband: 0 });
  }

  function pickFilter(button) {
    const widths = FILTERS[FILTER_GROUP[view.state?.mode]];
    if (view.locked || !widths) return;
    run({ cmd: "mode", value: view.state.mode, passband: widths[Number(button.dataset.filter)] });
  }

  const smeterPercent = db => Math.max(0, Math.min(100, Math.round(((db + 54) / 114) * 100)));
  function smeterText(db) {
    if (db === null || db === undefined) return "--";
    if (db >= 0) return db < 1 ? "S9" : `S9+${Math.round(db)}`;
    return `S${Math.max(0, Math.round(9 + db / 6))}`;
  }

  function buildSmeterScale() {
    const scale = $("smeter-scale");
    for (const [text, db] of [["S1", -48], ["3", -36], ["5", -24], ["7", -12], ["9", 0], ["+20", 20], ["+40", 40], ["+60", 60]]) {
      const label = document.createElement("span");
      label.textContent = text;
      label.style.left = `${smeterPercent(db)}%`;
      if (db >= 60) label.style.transform = "translateX(-100%)";
      scale.append(label);
    }
  }

  function latencyLevel(ms) {
    if (ms === null) return { cls: "", text: "Latencia: --" };
    if (ms < 150) return { cls: "lat-low", text: `Latencia: Baja (${ms} ms)` };
    if (ms < 400) return { cls: "lat-mid", text: `Latencia: Media (${ms} ms)` };
    return { cls: "lat-high", text: `Latencia: Alta (${ms} ms)` };
  }

  // Round trip of the heartbeat endpoint; any HTTP answer counts, only a network failure shows "--".
  async function measureLatency() {
    if (!token || document.hidden) return;
    const started = performance.now();
    let ms = null;
    try {
      await fetch("api/heartbeat", {
        method: "POST", cache: "no-store", body: "{}",
        headers: { Authorization: `Bearer ${token}`, "X-Client-Id": clientId, "Content-Type": "application/json" }
      });
      ms = Math.max(1, Math.round(performance.now() - started));
    } catch { /* link down: SSE shows it */ }
    const level = latencyLevel(ms);
    const pill = $("latency");
    for (const name of ["lat-low", "lat-mid", "lat-high"]) pill.classList.toggle(name, name === level.cls);
    setText(pill, level.text);
  }

  function filterText(passband) {
    if (!Number.isFinite(passband) || passband <= 0) return "--";
    return passband >= 1000 ? `${Number((passband / 1000).toFixed(2))} kHz` : `${passband} Hz`;
  }

  const formatClock = date => [date.getHours(), date.getMinutes(), date.getSeconds()].map(part => String(part).padStart(2, "0")).join(":");

  function renderLog() {
    const list = $("log");
    list.textContent = "";
    if (!view.log.length) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "Sin eventos todavia.";
      list.append(empty);
      return;
    }
    for (const entry of view.log) {
      const item = document.createElement("li");
      const time = document.createElement("time");
      time.textContent = formatClock(entry.time);
      time.dateTime = entry.time.toISOString();
      time.setAttribute("translate", "no");
      const text = document.createElement("span");
      text.textContent = entry.text;
      item.append(time, text);
      list.append(item);
    }
  }

  function addLog(text) {
    view.log.unshift({ time: new Date(), text });
    view.log.length = Math.min(view.log.length, LOG_MAX);
    renderLog();
  }

  // Session log fed by the SSE state: the first state is only the baseline.
  function trackLog(state) {
    const last = view.last;
    if (state.mode) {
      if (last.mode !== null && state.mode !== last.mode) addLog(`Modo cambiado a ${modeLabel(state.mode)}`);
      last.mode = state.mode;
    }
    if (Number.isSafeInteger(state.freq)) {
      if (last.freq !== null && state.freq !== last.freq) {
        const freq = state.freq;
        clearTimeout(view.freqLogTimer);
        view.freqLogTimer = setTimeout(() => addLog(`Sintonizada ${formatHz(freq)} Hz`), 1000);
      }
      last.freq = state.freq;
    }
    if (state.ptt && !last.ptt) addLog("TX iniciado");
    if (!state.ptt && last.ptt) addLog(`TX terminado (${last.txSeconds} s)`);
    last.ptt = state.ptt;
    last.txSeconds = state.txSeconds;
  }

  const formatTimer = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  function renderSlider(name, state, enabled) {
    const key = LEVEL_KEYS[name];
    const input = $(`lvl-${key}`);
    const value = state.levels?.[key];
    const usable = enabled && value !== null && value !== undefined && Boolean(state.caps?.level?.[name]?.set);
    input.disabled = !usable;
    if (value === null || value === undefined) { setText($(`out-${key}`), "--"); return; }
    if (Date.now() >= (view.sliderHold[name] || 0) && document.activeElement !== input) {
      input.value = String(Math.round(value * 100));
      setText($(`out-${key}`), `${Math.round(value * 100)} %`);
    }
  }

  // Which controls are usable right now: link, other operator, TX and the lock all matter.
  function refreshControls() {
    const state = view.state;
    const online = view.linkUp && Boolean(state?.connected);
    const other = state?.operator === "other";
    const free = online && !other;
    const tuning = free && !view.locked && !view.ptt && !state.ptt;
    $("ptt").disabled = !free || view.locked;
    $("freq").classList.toggle("locked", view.locked);
    $("tuner").classList.toggle("locked", view.locked || !tuning);
    for (const button of document.querySelectorAll("#bands button, #modes button, #step-up, #step-down")) button.disabled = !tuning;
    const widths = FILTERS[FILTER_GROUP[state?.mode]];
    for (const button of document.querySelectorAll("#filters button")) button.disabled = !tuning || !widths;
    const levels = state?.levels || {};
    const caps = state?.caps || { level: {}, func: {} };
    for (const name of Object.keys(LEVEL_KEYS)) renderSlider(name, state || {}, free);
    const settable = (kind, name) => Boolean(caps[kind]?.[name]?.set);
    const stepsReady = (name, key) => free && settable("level", name) && levels[key] !== null && levels[key] !== undefined &&
      (levels[key] > 0 || Boolean(caps.level[name]?.values?.length));
    $("btn-preamp").disabled = !stepsReady("PREAMP", "preamp");
    $("btn-att").disabled = !stepsReady("ATT", "att");
    $("btn-agc").disabled = !(free && settable("level", "AGC") && levels.agc !== null && levels.agc !== undefined);
    const funcReady = (name, key) => free && settable("func", name) && state.funcs?.[key] !== null && state.funcs?.[key] !== undefined;
    $("btn-nb").disabled = !funcReady("NB", "nb");
    $("btn-nr").disabled = !funcReady("NR", "nr");
    $("btn-atu").disabled = !funcReady("TUNER", "tuner");
    $("btn-tune").disabled = !(tuning && caps.tune) || view.tuneBusy;
  }

  function renderRelay(relay) {
    const pill = $("relay");
    const configured = Boolean(relay?.configured);
    setText(pill, !configured ? "Rel\u00e9: no configurado" : relay.connected ? "Rel\u00e9: conectado" : "Rel\u00e9: desconectado");
    pill.classList.toggle("on", configured && Boolean(relay.connected));
  }

  function render(state) {
    view.state = state;
    view.linkUp = true;
    const status = $("status");
    setText(status, state.connected ? "Radio conectada" : "Radio sin conexion");
    status.classList.toggle("on", state.connected);
    renderRelay(state.relay);
    if (Date.now() >= view.freqLockUntil && !view.editing) showFrequency(state.freq);
    const known = Number.isSafeInteger(state.freq);
    $("tuner").setAttribute("aria-valuenow", String(known ? state.freq : FREQ_MIN));
    $("tuner").setAttribute("aria-valuetext", known ? `${formatHz(state.freq)} Hz` : "--");

    setText($("rig-model"), state.caps?.model || "Radio");
    setText($("rig-mode"), state.mode ? `${modeLabel(state.mode)} \u00b7 ${filterText(state.passband)}` : "-- \u00b7 --");
    setText($("rig-trx"), state.ptt ? "TX" : "RX");
    $("rig-trx").classList.toggle("tx", Boolean(state.ptt));
    setText($("operator"), state.operator === "me" ? "Tienes el control" : state.operator === "other" ? "Otro operador tiene el control" : "Sin operador");

    const modeButton = MODE_BUTTON[state.mode];
    for (const button of document.querySelectorAll("#modes button")) setPressed(button, button.dataset.mode === modeButton);
    const widths = FILTERS[FILTER_GROUP[state.mode]];
    document.querySelectorAll("#filters button").forEach((button, index) => {
      setPressed(button, Boolean(widths) && widths[index] === state.passband);
      button.title = widths ? `${widths[index]} Hz` : "";
    });
    const band = known ? bandOf(state.freq) : null;
    for (const button of document.querySelectorAll("#bands button")) setPressed(button, button.dataset.band === band);

    const meter = $("smeter");
    const hasSignal = state.smeter !== null && state.smeter !== undefined;
    $("smeter-fill").style.width = `${hasSignal ? 100 - smeterPercent(state.smeter) : 100}%`;
    meter.setAttribute("aria-valuenow", String(hasSignal ? Math.max(0, Math.min(114, Math.round(state.smeter + 54))) : 0));
    meter.setAttribute("aria-valuetext", smeterText(state.smeter));
    setText($("smeter-text"), smeterText(state.smeter));

    const agc = state.levels?.agc;
    const agcStep = AGC_CYCLE.find(item => item.value === agc);
    setText($("btn-agc"), agcStep ? `AGC ${agcStep.text}` : agc ? `AGC ${AGC_NAMES[agc] || agc}` : "AGC");
    setAttr($("btn-agc"), "aria-label", agcStep ? agcStep.label : agc ? "AGC activo" : "AGC apagado");
    setPressed($("btn-agc"), Boolean(agc));
    setPressed($("btn-preamp"), Boolean(state.levels?.preamp));
    setPressed($("btn-att"), Boolean(state.levels?.att));
    setPressed($("btn-nb"), Boolean(state.funcs?.nb));
    setPressed($("btn-nr"), Boolean(state.funcs?.nr));
    setPressed($("btn-atu"), Boolean(state.funcs?.tuner));

    trackLog(state);
    rememberBand(state);
    if (!state.ptt && view.ptt && !view.wantPtt) view.ptt = false;
    updatePttUi();
    refreshControls();
  }

  function updatePttUi() {
    const button = $("ptt");
    const tx = view.ptt || Boolean(view.state?.ptt);
    setPressed(button, tx);
    button.classList.toggle("tx", tx);
    setText($("ptt-label"), tx ? "Transmitiendo..." : "Mantener para hablar");
    const timer = $("tx-timer");
    timer.hidden = !tx;
    if (tx) setText(timer, formatTimer(view.state?.txSeconds || 0));
  }

  function setPttUi(on) {
    view.ptt = on;
    updatePttUi();
    if (view.state) refreshControls();
  }

  async function pttDown() {
    if (view.wantPtt || $("ptt").disabled || view.locked) return;
    view.wantPtt = true;
    try {
      await command({ cmd: "ptt", value: true });
      if (!view.wantPtt) { pttSendOff(); return; }
      setPttUi(true);
      notify("");
      clearInterval(view.heartbeat);
      view.heartbeat = setInterval(() => {
        api("api/heartbeat", { method: "POST", body: "{}" }).catch(() => {});
      }, 250);
    } catch (error) {
      view.wantPtt = false;
      notify(error.status === 409 ? "Otro operador tiene el control." : error.message);
    }
  }

  function pttSendOff() {
    clearInterval(view.heartbeat);
    view.heartbeat = null;
    fetch("api/cmd", {
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

  // The radio's own spectrum is not rendered yet; the panel only says what to expect for this model.
  const SPECTRUM_TEXT = Object.freeze({
    civ: "Disponible próximamente para este modelo",
    smartsdr: "Disponible próximamente para este modelo",
    sdr: "Disponible próximamente para este modelo",
    audio: "Llegará con el audio remoto (banda de paso)",
    none: "Este modelo no ofrece espectro"
  });

  function showSpectrumPlaceholder(scope) {
    setText($("spectrum-note"), SPECTRUM_TEXT[scope] || SPECTRUM_TEXT.none);
  }

  function setLocked(on) {
    view.locked = on;
    write(sessionStorage, LOCK_KEY, on ? "1" : null);
    const button = $("lock");
    setPressed(button, on);
    setText(button, on ? "Bloqueado" : "Bloquear");
    if (on && (view.wantPtt || view.ptt)) pttUp();
    if (view.state) { updatePttUi(); refreshControls(); }
  }

  function selectTab(name, focus) {
    for (const tab of TABS) {
      const selected = tab === name;
      const button = $(`tab-${tab}`);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      $(`panel-${tab}`).dataset.active = String(selected);
      if (selected && focus) button.focus();
    }
  }

  function bindTabs() {
    for (const tab of TABS) {
      const button = $(`tab-${tab}`);
      button.addEventListener("click", () => selectTab(tab, false));
      button.addEventListener("keydown", event => {
        const move = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (event.key === "Home") selectTab(TABS[0], true);
        else if (event.key === "End") selectTab(TABS[TABS.length - 1], true);
        else if (move) selectTab(TABS[(TABS.indexOf(tab) + move + TABS.length) % TABS.length], true);
        else return;
        event.preventDefault();
      });
    }
  }

  function bindLevels() {
    for (const input of document.querySelectorAll("input[data-level]")) {
      const name = input.dataset.level;
      const key = LEVEL_KEYS[name];
      input.addEventListener("input", () => {
        setText($(`out-${key}`), `${input.value} %`);
        view.sliderHold[name] = Date.now() + 1200;
        clearTimeout(view.sliderTimers[name]);
        view.sliderTimers[name] = setTimeout(() => run({ cmd: "level", name, value: Number(input.value) / 100 }), 120);
      });
    }
    const toggleLevel = (name, key) => () => {
      const state = view.state;
      if (!state) return;
      const on = Boolean(state.levels?.[key]);
      const first = state.caps?.level?.[name]?.values?.[0] ?? 1;
      run({ cmd: "level", name, value: on ? 0 : first });
    };
    $("btn-preamp").addEventListener("click", toggleLevel("PREAMP", "preamp"));
    $("btn-att").addEventListener("click", toggleLevel("ATT", "att"));
    $("btn-agc").addEventListener("click", () => {
      const index = AGC_CYCLE.findIndex(item => item.value === view.state?.levels?.agc);
      run({ cmd: "level", name: "AGC", value: AGC_CYCLE[(index + 1) % AGC_CYCLE.length].value });
    });
    const toggleFunc = (name, key) => () => run({ cmd: "func", name, on: !view.state?.funcs?.[key] });
    $("btn-nb").addEventListener("click", toggleFunc("NB", "nb"));
    $("btn-nr").addEventListener("click", toggleFunc("NR", "nr"));
    $("btn-atu").addEventListener("click", toggleFunc("TUNER", "tuner"));
    $("btn-tune").addEventListener("click", async () => {
      if (view.locked || view.tuneBusy) return;
      view.tuneBusy = true;
      refreshControls();
      await run({ cmd: "tune" });
      setTimeout(() => { view.tuneBusy = false; refreshControls(); }, 2000);
    });
  }

  function connectEvents() {
    const source = new EventSource(`api/events?token=${encodeURIComponent(token)}&cid=${encodeURIComponent(clientId)}`);
    source.onmessage = event => { try { render(JSON.parse(event.data)); } catch { /* ignore bad frame */ } };
    source.onerror = () => {
      view.linkUp = false;
      setText($("status"), "Reconectando...");
      $("status").classList.remove("on");
      if (view.wantPtt || view.ptt) pttUp();
      if (view.state) refreshControls(); else $("ptt").disabled = true;
    };
  }

  async function init() {
    buildFrequency();
    buildSmeterScale();
    showFrequency(null);
    renderLog();
    bindTabs();
    if (!token) {
      notify("Falta el token. Abre la direccion completa que muestra el agente (con #token=...).");
      return;
    }
    $("step-up").addEventListener("click", () => changeFreq(stepSize()));
    $("step-down").addEventListener("click", () => changeFreq(-stepSize()));
    $("bands").addEventListener("click", event => {
      const button = event.target.closest("button[data-band]");
      if (button) jumpToBand(button.dataset.band);
    });
    $("modes").addEventListener("click", event => {
      const button = event.target.closest("button[data-mode]");
      if (button) pickMode(button);
    });
    $("filters").addEventListener("click", event => {
      const button = event.target.closest("button[data-filter]");
      if (button) pickFilter(button);
    });
    $("lock").addEventListener("click", () => setLocked(!view.locked));
    bindPtt();
    bindTuner();
    bindLevels();
    setLocked(read(sessionStorage, LOCK_KEY) === "1");
    try {
      const config = await api("api/config");
      if (config.callsign) setText($("callsign"), config.callsign);
      showSpectrumPlaceholder(config.radioScope);
    } catch (error) {
      notify(error.status === 401 ? "Token no valido." : error.message);
      return;
    }
    connectEvents();
    measureLatency();
    setInterval(measureLatency, 3000);
  }

  init();
})();
