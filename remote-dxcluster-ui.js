"use strict";
// DX cluster panel of the remote shack console (remote.html). It reads /api/dxcluster (remote-dxcluster.cjs, read-only).
// Click-to-tune calls the console's existing freq command through `tune`; this panel has no way to key the radio.
(function (root) {
  const POLL_MS = 5000;
  const MIN_HZ = 30_000;
  const MAX_HZ = 3_000_000_000;

  // Only a safe integer inside the agent's freq command range is ever offered for tuning.
  function tuneTarget(spot) {
    const hz = spot && spot.freqHz;
    return Number.isSafeInteger(hz) && hz >= MIN_HZ && hz <= MAX_HZ ? hz : null;
  }

  const formatKHz = hz => (hz / 1000).toFixed(1);

  // Needed spots not seen before the previous poll; the first poll (seen === null) only sets the baseline.
  function newNeeded(spots, seen) {
    if (seen === null) return [];
    return spots.filter(spot => spot.needed === true && spot.id > seen);
  }

  const maxId = (spots, previous) => spots.reduce((top, spot) => Math.max(top, spot.id), previous === null ? 0 : previous);

  const STATUS = Object.freeze({ new: "Nuevo", worked: "Trabajado", unknown: "Sin registro" });

  function statusText(info) {
    if (!info || !info.enabled) return "Cluster DX desactivado en el agente.";
    if (!info.connected) return "Cluster DX sin conexion. Reintentando.";
    return info.logbook ? "Cluster DX conectado." : "Cluster DX conectado. Sin registro en el agente: no se marca nuevo ni trabajado.";
  }

  function mount({ doc, api, notify, tune }) {
    const list = doc.getElementById("dx-list");
    const status = doc.getElementById("dx-status");
    const alertBox = doc.getElementById("dx-alert");
    if (!list || !status || !alertBox) return null;
    const state = { seen: null, timer: null };

    function row(spot) {
      const item = doc.createElement("li");
      const button = doc.createElement("button");
      button.type = "button";
      button.className = "dx-spot";
      button.dataset.status = STATUS[spot.status] ? spot.status : "unknown";
      const target = tuneTarget(spot);
      if (target === null) button.disabled = true;
      else button.addEventListener("click", () => { tune(target); });
      for (const [className, text] of [["dx-freq", formatKHz(spot.freqHz)], ["dx-call", spot.call], ["dx-note", STATUS[button.dataset.status]],
        ["dx-note", `${spot.band || ""} ${spot.time || ""}`.trim()], ["dx-note", spot.comment || ""]]) {
        if (!text) continue;
        const span = doc.createElement("span");
        span.className = className;
        span.textContent = text;
        button.append(span);
      }
      item.append(button);
      return item;
    }

    function render(info) {
      status.textContent = statusText(info);
      const spots = Array.isArray(info?.spots) ? info.spots : [];
      list.replaceChildren(...(spots.length ? spots.map(row) : [Object.assign(doc.createElement("li"), { className: "empty", textContent: "Sin spots todavia." })]));
    }

    async function poll() {
      let info;
      try { info = await api("api/dxcluster"); } catch { return; }
      render(info);
      if (!info.enabled) { root.clearInterval(state.timer); state.timer = null; return; }
      if (alertBox.checked && newNeeded(info.spots, state.seen).length) notify("Spot necesario en el cluster DX.");
      state.seen = maxId(info.spots, state.seen);
    }

    poll();
    state.timer = root.setInterval(poll, POLL_MS);
    return { poll, state };
  }

  const exported = { mount, tuneTarget, newNeeded, formatKHz, statusText, STATUS, POLL_MS };
  root.RemoteDxUI = exported;
  if (typeof module === "object" && module.exports) module.exports = exported;
})(typeof globalThis !== "undefined" ? globalThis : this);
