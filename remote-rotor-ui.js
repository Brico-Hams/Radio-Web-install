"use strict";
// Rotor panel of the remote shack console (remote.html). It talks to /api/rotor (remote-rotor.cjs):
// one operator holds the lease (3 s deadman, renewed here once a second), stop never needs the lease, and the
// station stops the rotor when this page disconnects. Satellite hand-off: a pass-track file exported by the pass
// planner (satellite-ui.js, "radicodex-pass-track") is replayed as AZ/EL targets by clock time; Doppler is not involved.
(function (root) {
  const TRACK_FORMAT = "radicodex-pass-track";
  const MAX_SAMPLES = 2000;
  const MAX_TRACK_MS = 30 * 60 * 1000;
  const RENEW_MS = 1000;
  const RETARGET_DEG = 0.5;
  const REQUEST_ID = /^[A-Za-z0-9_-]{16,64}$/;

  const wrap = degrees => ((degrees % 360) + 360) % 360;
  const finite = value => typeof value === "number" && Number.isFinite(value);

  // Strict parser for the planner export: {format, version: 1, name, samples: [{t (ms UTC), az, el}]} with increasing t.
  function parsePassTrack(text) {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error("Archivo de pase no valido."); }
    if (!data || data.format !== TRACK_FORMAT || data.version !== 1 || !Array.isArray(data.samples)) throw new Error("Archivo de pase no valido.");
    const samples = data.samples;
    if (samples.length < 2 || samples.length > MAX_SAMPLES) throw new Error("Archivo de pase no valido.");
    let previous = -Infinity;
    for (const sample of samples) {
      if (!sample || !finite(sample.t) || !finite(sample.az) || !finite(sample.el) || sample.t <= previous || sample.el < -90 || sample.el > 90) throw new Error("Archivo de pase no valido.");
      previous = sample.t;
    }
    if (samples[samples.length - 1].t - samples[0].t > MAX_TRACK_MS) throw new Error("El pase dura mas de 30 minutos.");
    return { name: typeof data.name === "string" ? data.name.slice(0, 60) : "", samples: samples.map(({ t, az, el }) => ({ t, az: wrap(az), el })) };
  }

  // Picks the azimuth equivalent (az + k*360) inside the rotor limits that is closest to [near]; null when none fits.
  function fitAzimuth(azimuth, limits, near) {
    let best = null;
    for (let turns = -2; turns <= 2; turns += 1) {
      const candidate = wrap(azimuth) + turns * 360;
      if (candidate < limits.azimuth_min || candidate > limits.azimuth_max) continue;
      if (best === null || Math.abs(candidate - near) < Math.abs(best - near)) best = candidate;
    }
    return best;
  }

  // Target at [nowMs]: "before" / "after" the pass, "below" while the satellite is under the horizon,
  // "limits" when the azimuth cannot be reached, otherwise "active" with the interpolated AZ/EL clamped to the elevation limits.
  function trackTarget(track, nowMs, limits, near = 0) {
    const samples = track.samples;
    if (nowMs < samples[0].t) return { phase: "before" };
    if (nowMs > samples[samples.length - 1].t) return { phase: "after" };
    let index = 1;
    while (index < samples.length - 1 && samples[index].t < nowMs) index += 1;
    const a = samples[index - 1];
    const b = samples[index];
    const ratio = (nowMs - a.t) / (b.t - a.t);
    const turn = ((b.az - a.az + 540) % 360) - 180;
    const azimuth = wrap(a.az + turn * ratio);
    const elevation = a.el + (b.el - a.el) * ratio;
    if (elevation < 0) return { phase: "below" };
    const fitted = fitAzimuth(azimuth, limits, near);
    if (fitted === null) return { phase: "limits" };
    const clamped = Math.min(limits.elevation_max, Math.max(limits.elevation_min, elevation));
    return { phase: "active", azimuth: Math.round(fitted * 10) / 10, elevation: Math.round(clamped * 10) / 10 };
  }

  const ERRORS = Object.freeze({
    rotor_busy: "Otro operador tiene el control del rotor.",
    rotor_motion_disabled: "El movimiento del rotor esta desactivado en la estacion.",
    rotor_lease_expired: "Se perdio el control del rotor.",
    rotor_stop_unconfirmed: "La parada del rotor no esta confirmada: pulsa Parar.",
    rotor_transport_failed: "No se puede hablar con rotctld.",
    rotor_invalid_response: "Respuesta no valida de rotctld.",
    rotor_invalid_position: "Posicion del rotor no valida.",
    rotor_backend_error: "rotctld ha rechazado la orden.",
    rotor_invalid_operation: "Orden de rotor no valida.",
    rotor_park_not_configured: "No hay posicion de aparcado configurada.",
    rotor_request_cancelled_or_repeated: "Orden repetida o cancelada.",
    rotor_closed: "El rotor esta cerrado."
  });
  const errorText = error => ERRORS[error?.message] || "Error del rotor.";

  const requestId = () => {
    const bytes = root.crypto.getRandomValues(new Uint8Array(16));
    return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
  };

  // `api(path, options)` resolves with the parsed JSON or rejects with Error(code) (+ status).
  function mount({ doc, api, token, clientId, notify }) {
    const $ = id => doc.getElementById(id);
    const panel = $("rotor");
    if (!panel) return null;
    const state = { info: null, lease: "", track: null, pass: null, timer: null, busy: false, last: null };
    const setText = (id, text) => { if ($(id).textContent !== text) $(id).textContent = text; };

    const render = () => {
      const info = state.info;
      panel.hidden = !info;
      if (!info) return;
      const holds = Boolean(state.lease);
      const move = info.motion_enabled && !info.stop_failed && !state.busy;
      setText("rotor-label", info.label);
      const position = info.position ? `${info.position.azimuth_deg.toFixed(1)}\u00b0 / ${info.position.elevation_deg.toFixed(1)}\u00b0` : "--";
      setText("rotor-position", position);
      setText("rotor-mode", info.motion_enabled ? (holds ? "Tienes el control del rotor" : "Movimiento activado") : "Solo lectura");
      setText("rotor-limits", `${info.limits.azimuth_min}\u00b0 - ${info.limits.azimuth_max}\u00b0 / ${info.limits.elevation_min}\u00b0 - ${info.limits.elevation_max}\u00b0`);
      setText("rotor-offset", `${info.calibration_offset.azimuth_deg}\u00b0 / ${info.calibration_offset.elevation_deg}\u00b0`);
      $("rotor-go").disabled = !move || state.track !== null;
      $("rotor-park").disabled = !move || !info.park || state.track !== null;
      $("rotor-track").disabled = !move || !state.pass;
      setText("rotor-track", state.track ? "Dejar de seguir" : "Seguir el pase");
      $("rotor-stop-warning").hidden = !info.stop_failed;
    };

    const fail = error => {
      notify(errorText(error));
      if (error?.message === "rotor_lease_expired" || error?.message === "rotor_busy") endSession();
    };

    function endSession() {
      state.lease = "";
      state.track = null;
      state.last = null;
      root.clearInterval(state.timer);
      state.timer = null;
      render();
    }

    async function refresh(position) {
      try {
        state.info = await api(`api/rotor${position ? "?command=position" : ""}`);
        if (!position && state.info.position === undefined) delete state.info.position;
        render();
      } catch (error) {
        if (error?.status === 503 && error.message === "rotor_not_configured") { state.info = null; render(); return; }
        fail(error);
      }
    }

    async function send(body) {
      const result = await api("api/rotor", { method: "POST", body: JSON.stringify(body) });
      state.info = { ...state.info, ...result };
      if (result.lease_id) state.lease = result.lease_id;
      return result;
    }

    async function moveTo(azimuth, elevation) {
      const body = { operation: "move", request_id: requestId(), azimuth_deg: azimuth, elevation_deg: elevation };
      if (state.lease) body.lease_id = state.lease;
      const result = await send(body);
      state.last = { azimuth, elevation };
      if (!state.timer) state.timer = root.setInterval(tick, RENEW_MS);
      return result;
    }

    async function tick() {
      if (state.busy || !state.lease) return;
      state.busy = true;
      try {
        if (state.track) {
          const near = state.last ? state.last.azimuth : 0;
          const target = trackTarget(state.track, Date.now(), state.info.limits, near);
          if (target.phase === "after") { await stop(); notify("Pase terminado."); return; }
          if (target.phase === "active" && (!state.last || Math.abs(target.azimuth - state.last.azimuth) >= RETARGET_DEG || Math.abs(target.elevation - state.last.elevation) >= RETARGET_DEG)) {
            await moveTo(target.azimuth, target.elevation);
            setText("rotor-track-info", `${state.track.name || "Pase"}: ${target.azimuth.toFixed(1)}\u00b0 / ${target.elevation.toFixed(1)}\u00b0`);
          } else {
            await send({ operation: "renew", lease_id: state.lease });
            if (target.phase === "below") setText("rotor-track-info", "Satelite bajo el horizonte: el rotor espera.");
            if (target.phase === "limits") setText("rotor-track-info", "Azimut fuera de los limites del rotor: el rotor espera.");
          }
        } else {
          await send({ operation: "renew", lease_id: state.lease });
        }
        notify("");
      } catch (error) {
        fail(error);
        await stop();
      } finally {
        state.busy = false;
        render();
      }
    }

    async function stop() {
      endSession();
      try {
        state.info = { ...state.info, ...(await api("api/rotor", { method: "POST", body: JSON.stringify({ operation: "stop" }) })) };
      } catch (error) { notify("La parada del rotor no esta confirmada: pulsa Parar."); }
      render();
    }

    async function begin(task) {
      if (state.busy) return;
      state.busy = true;
      render();
      try { await task(); notify(""); } catch (error) { fail(error); } finally { state.busy = false; render(); }
    }

    $("rotor-read").addEventListener("click", () => refresh(true));
    $("rotor-stop").addEventListener("click", () => { state.busy = false; stop(); });
    $("rotor-go").addEventListener("click", () => begin(() => {
      const azimuth = Number($("rotor-az").value);
      const elevation = Number($("rotor-el").value);
      const limits = state.info.limits;
      if ($("rotor-az").value.trim() === "" || $("rotor-el").value.trim() === "" || !finite(azimuth) || !finite(elevation) ||
        azimuth < limits.azimuth_min || azimuth > limits.azimuth_max || elevation < limits.elevation_min || elevation > limits.elevation_max) {
        throw new Error("rotor_invalid_operation");
      }
      return moveTo(azimuth, elevation);
    }));
    $("rotor-park").addEventListener("click", () => begin(async () => {
      const result = await send({ operation: "park", request_id: requestId(), ...(state.lease ? { lease_id: state.lease } : {}) });
      if (!state.timer) state.timer = root.setInterval(tick, RENEW_MS);
      return result;
    }));
    $("rotor-file").addEventListener("change", async event => {
      const file = event.target.files && event.target.files[0];
      state.pass = null;
      try {
        if (file) {
          if (file.size > 512 * 1024) throw new Error("Archivo de pase no valido.");
          state.pass = parsePassTrack(await file.text());
          setText("rotor-track-info", `${state.pass.name || "Pase"}: ${new Date(state.pass.samples[0].t).toLocaleTimeString()} - ${new Date(state.pass.samples[state.pass.samples.length - 1].t).toLocaleTimeString()}`);
        }
      } catch (error) { notify(error.message); }
      render();
    });
    $("rotor-track").addEventListener("click", () => {
      if (state.track) { stop(); return; }
      if (!state.pass) return;
      state.track = state.pass;
      state.last = null;
      begin(async () => {
        // The first target is the pass position now (or its AOS point before the pass), reached only after this explicit click.
        const first = trackTarget(state.track, Math.max(Date.now(), state.track.samples[0].t), state.info.limits, 0);
        if (first.phase !== "active") throw new Error("rotor_invalid_operation");
        await moveTo(first.azimuth, first.elevation);
      }).then(() => { if (!state.lease) state.track = null; render(); });
    });

    const halt = () => {
      if (!state.lease && !state.timer) return;
      // keepalive lets the stop survive the page being closed.
      try { root.fetch("api/rotor", { method: "POST", keepalive: true, headers: { Authorization: `Bearer ${token}`, "X-Client-Id": clientId, "Content-Type": "application/json" }, body: JSON.stringify({ operation: "stop" }) }); } catch { /* the station deadman stops it anyway */ }
      endSession();
    };
    root.addEventListener("pagehide", halt);
    doc.addEventListener("visibilitychange", () => { if (doc.hidden) halt(); });

    refresh(true);
    return { refresh, stop, state };
  }

  const api = { parsePassTrack, trackTarget, fitAzimuth, mount, TRACK_FORMAT, MAX_TRACK_MS, REQUEST_ID, ERRORS };
  root.RemoteRotorUI = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis === "object" ? globalThis : this);
