"use strict";
// FT8 list of the "digital" tab of the remote shack console (remote.html). It reads and toggles /api/ftx (remote-ftx.cjs).
// Receive only: the list has no reply button, no auto-sequence and no way to key the radio.
(function (root) {
  const POLL_MS = 3000;
  // Recent decodes judged for the clock warning, and the least number of them needed to trust the median.
  const RECENT_DECODES = 20;
  const MIN_DECODES = 3;
  const DT_WARN_SECONDS = 1;
  const CLOCK_WARNING = "Aviso: el reloj del PC de la estacion probablemente esta desajustado (la mediana del DT absoluto supera 1 s). Sincronizalo con un servidor de hora; el decodificador no corrige el DT ni el reloj.";

  const clock = utc => String(utc || "").slice(11, 19);

  // Median |DT| (s) of the most recent decodes, or null with too few of them.
  function medianAbsDt(decodes) {
    const values = (Array.isArray(decodes) ? decodes : []).slice(0, RECENT_DECODES)
      .map(item => Math.abs(Number(item && item.dt))).filter(Number.isFinite).sort((a, b) => a - b);
    if (values.length < MIN_DECODES) return null;
    const mid = values.length >> 1;
    return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
  }

  // Warning text when the median |DT| is above 1 s (PC clock probably off); warning only, nothing is corrected.
  function clockWarning(decodes) {
    const median = medianAbsDt(decodes);
    return median !== null && median > DT_WARN_SECONDS ? CLOCK_WARNING : "";
  }

  function statusText(info) {
    if (!info || info.available === false) return "FT8 no disponible: el agente no tiene audio de recepcion.";
    if (!info.enabled) return "FT8 apagado.";
    return info.stats && info.stats.slots > 0 ? "FT8 activo: escuchando." : "FT8 activo: esperando la primera ranura completa de 15 s.";
  }

  function mount({ doc, api, notify }) {
    const toggle = doc.getElementById("ftx-toggle");
    const status = doc.getElementById("ftx-status");
    const list = doc.getElementById("ftx-list");
    if (!toggle || !status || !list) return null;
    const slots = doc.getElementById("ftx-slots");
    const dropped = doc.getElementById("ftx-dropped");
    const warning = doc.getElementById("ftx-clock-warning");
    const state = { info: null, timer: null };

    function cell(text) {
      const td = doc.createElement("td");
      td.textContent = text;
      return td;
    }

    function row(item) {
      const tr = doc.createElement("tr");
      tr.append(cell(clock(item.utc)), cell(String(item.snr)), cell(String(item.dt)), cell(String(item.hz)), cell(item.message));
      return tr;
    }

    function render(info) {
      state.info = info;
      const on = Boolean(info && info.enabled);
      toggle.setAttribute("aria-pressed", String(on));
      toggle.textContent = on ? "Detener FT8" : "Activar FT8";
      toggle.disabled = !info || info.available === false;
      status.textContent = statusText(info);
      if (slots) slots.textContent = String(info?.stats?.slots ?? 0);
      if (dropped) dropped.textContent = String((info?.stats?.dropped ?? 0) + (info?.stats?.skipped ?? 0));
      const decodes = Array.isArray(info?.decodes) ? info.decodes : [];
      if (warning) {
        const text = clockWarning(decodes);
        warning.textContent = text;
        warning.hidden = !text;
      }
      if (decodes.length) list.replaceChildren(...decodes.map(row));
      else {
        const tr = doc.createElement("tr");
        const td = cell("Sin decodificaciones FT8 todavia.");
        td.colSpan = 5;
        tr.append(td);
        list.replaceChildren(tr);
      }
    }

    async function poll() {
      try { render(await api("api/ftx")); } catch { /* keep the last view */ }
    }

    async function flip() {
      try {
        render(await api("api/ftx", { method: "POST", body: JSON.stringify({ enabled: !(state.info && state.info.enabled) }) }));
        notify("");
      } catch (error) { notify(error.message); }
    }

    toggle.addEventListener("click", flip);
    poll();
    state.timer = root.setInterval(poll, POLL_MS);
    return { poll, flip, render, state };
  }

  const exported = { mount, statusText, clock, medianAbsDt, clockWarning, CLOCK_WARNING, POLL_MS };
  root.RemoteFtxUI = exported;
  if (typeof module === "object" && module.exports) module.exports = exported;
})(typeof globalThis !== "undefined" ? globalThis : this);
