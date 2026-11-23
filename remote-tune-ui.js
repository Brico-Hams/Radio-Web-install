"use strict";
// Tune view-model of the remote shack console (remote.html). Pure functions: no DOM, no timers, no storage.
// state.tune = { kind, seconds, maxSeconds } while the tuner runs; state.tuneResult = { id, at, outcome, reason, swr, swrRaw, txOff, ... }
// is the agent's final record (remote-agent.cjs endTune). Texts are Spanish sources translated by ui-translations.js.
(function (root) {
  const OUTCOME_LABEL = Object.freeze({
    success: "Sintonía correcta", fail: "Sintonía fallida", timeout: "Sintonía cortada por tiempo"
  });
  const REASON_LABEL = Object.freeze({
    "time-cap": "Tiempo máximo de ajuste alcanzado",
    "swr-trip": "ROE alta: transmisión cortada",
    "hi-swr": "La radio avisó de ROE alta",
    "swr-high": "ROE final alta",
    heartbeat: "Sin latido del operador: PTT off",
    "tx-limit": "Límite de TX alcanzado",
    "not-started": "La radio no entró en modo de ajuste",
    unconfirmed: "La radio no confirmó la sintonía",
    "tx-stuck": "La radio seguía en TX: parada reintentada",
    closing: "Cierre del agente",
    operator: "Parada por el operador",
    other: "Motivo no indicado"
  });

  const finite = value => typeof value === "number" && Number.isFinite(value);

  // Live status while state.tune is set; null otherwise.
  function tuneStatus(tune) {
    if (!tune || typeof tune !== "object") return null;
    const max = finite(tune.maxSeconds) && tune.maxSeconds > 0 ? Math.round(tune.maxSeconds) : null;
    const elapsed = finite(tune.seconds) ? Math.max(0, Math.floor(tune.seconds)) : 0;
    const seconds = max === null ? elapsed : Math.min(elapsed, max);
    const target = tune.kind === "atas" ? "ATAS" : "el acoplador";
    const text = max === null
      ? `Ajustando ${target}... ${seconds} s`
      : `Ajustando ${target}... ${seconds} s / ${max} s máx.`;
    return { kind: tune.kind || "", seconds, max, text, note: "Modo temporal de ajuste: la radio lo restaura sola al terminar." };
  }

  // Raw-CAT readings (swrRaw present) go through the uncalibrated FTX-1 curve, so the ratio is only approximate.
  function swrText(result) {
    if (!finite(result.swr)) return "Lectura final de ROE: sin lectura";
    const value = result.swr >= 99 ? "∞" : result.swr.toFixed(1);
    return finite(result.swrRaw) ? `Lectura final de ROE ${value}:1 (aproximada)` : `Lectura final de ROE ${value}:1`;
  }

  function tuneResultView(result) {
    if (!result || typeof result !== "object") return null;
    const outcome = OUTCOME_LABEL[result.outcome] ? result.outcome : "fail";
    const reason = result.reason ? REASON_LABEL[result.reason] || REASON_LABEL.other : "";
    return {
      id: `${result.id ?? ""}:${result.at ?? ""}`,
      outcome,
      label: OUTCOME_LABEL[outcome],
      reason,
      swr: swrText(result),
      approximate: finite(result.swr) && finite(result.swrRaw),
      txOff: result.txOff === true,
      txText: result.txOff === true ? "TX apagado verificado" : "TX sin verificar: la radio puede seguir transmitiendo"
    };
  }

  // The first state is only the baseline (an old result is not announced again after a reload); a result that
  // changes afterwards becomes the card, which stays until the operator closes it or the next tune starts.
  function createTuneTracker() {
    let seen;
    let card = null;
    return {
      update(state) {
        const status = tuneStatus(state?.tune);
        const view = tuneResultView(state?.tuneResult);
        const id = view ? view.id : null;
        if (seen === undefined) seen = id;
        else if (id !== seen) { seen = id; card = view; }
        if (status) card = null;
        return { status, card };
      },
      dismiss() { card = null; }
    };
  }

  const api = { tuneStatus, tuneResultView, createTuneTracker, REASON_LABEL, OUTCOME_LABEL };
  root.RemoteTuneUI = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis === "object" ? globalThis : this);
