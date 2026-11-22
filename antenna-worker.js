"use strict";
// Runs the heavy antenna jobs off the UI thread. Messages: { id, type: "sweep" | "tune" | "pattern", payload }.
importScripts("antenna-core.js");
const core = self.AntennaCore;

self.onmessage = event => {
  const { id, type, payload } = event.data || {};
  try {
    let result;
    if (type === "sweep") {
      result = core.sweep(payload.design, payload.frequencies, {
        z0: payload.z0,
        onProgress: (done, total) => self.postMessage({ id, progress: done / total })
      });
    } else if (type === "tune") {
      result = core.autoTune(payload.design, payload.options);
    } else if (type === "pattern") {
      result = core.computePattern(payload.design, payload.f, payload.options);
    } else {
      throw new Error("Tipo de tarea desconocido.");
    }
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: String(error && error.message || error) });
  }
};
