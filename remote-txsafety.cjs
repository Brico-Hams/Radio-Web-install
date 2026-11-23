"use strict";
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Pure TX safety helpers for the Node agent (no I/O, no timers): OrphanWatch, occupiedSpan and the
// out-of-band TX inhibit. Third-party parts adapted here, original notices retained:
//
// OrphanWatch is adapted from ThetisLink, sdr-remote-server/src/tx_orphan.rs
//   SPDX-License-Identifier: GPL-2.0-or-later (GPL-2.0-or-later code, used here under GPL-3.0-or-later).
//   Changes: Rust to JavaScript, same two-tick rule; the "server keyed it" flag is supplied by the agent.
//
// occupiedSpan is adapted from RemoteRig, common/protocol.cpp
//   SPDX-License-Identifier: MIT
//   Copyright (c) 2026 Yoann (LICENSE) / Copyright (c) 2026 RemoteRig Project (LICENSE.txt)
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
//   associated documentation files (the "Software"), to deal in the Software without restriction,
//   including without limitation the rights to use, copy, modify, merge, publish, distribute,
//   sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
//   furnished to do so, subject to the following conditions: The above copyright notice and this
//   permission notice shall be included in all copies or substantial portions of the Software.
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
//   NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
//   NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
//   DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//   Changes: Qt types to plain numbers, this product's mode names (Hamlib and FTX-1 menu names),
//   wider fallback for FM-like modes, null result when carrier or mode is unknown.
//
// The out-of-band edge handling and the client-silence comparison follow RemoteRig server/servercore.cpp
// (MIT, same notice): judge the emitted span, log only the crossing, cut an ongoing transmission.

// Watches one transmitter and says when to force it back to RX. It waits for the condition to hold on two
// consecutive ticks (a normal release clears owner and flag one after the other) and then fires exactly once.
class OrphanWatch {
  constructor() { this.seen = 0; }

  // agentKeyed: the agent itself keyed the radio (never a front-panel transmission); hasHolder: someone still holds the lease.
  observe(agentKeyed, hasHolder) {
    if (!(agentKeyed && !hasHolder)) { this.seen = 0; return false; }
    this.seen += 1;
    return this.seen === 2;
  }
}

const UPPER_MODES = new Set(["USB", "DIGU", "DATAU", "RTTYU", "RTTYR", "PKTUSB"]);
const LOWER_MODES = new Set(["LSB", "DIGL", "DATAL", "RTTYL", "RTTY", "PKTLSB"]);

// Occupied spectrum {low, high} in Hz for a carrier (the displayed frequency) in a mode.
// passbandHz is the rig's reported width when positive; otherwise a fallback width is used.
// Returns null when the carrier or the mode is unknown.
function occupiedSpan(carrierHz, mode, passbandHz) {
  if (!Number.isFinite(carrierHz) || carrierHz < 0 || typeof mode !== "string" || !mode.trim()) return null;
  const name = mode.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let width = Number(passbandHz);
  if (!(width > 0)) {
    if (name.includes("CW")) width = 200;
    else if (name.startsWith("AM")) width = 6000;
    else if (name.includes("FM")) width = 12000;
    else width = 2700;
  }
  if (UPPER_MODES.has(name) || name.includes("USB")) return { low: carrierHz, high: carrierHz + width };
  if (LOWER_MODES.has(name) || name.includes("LSB")) return { low: Math.max(0, carrierHz - width), high: carrierHz };
  const half = width / 2;
  return { low: Math.max(0, carrierHz - half), high: carrierHz + half };
}

// Allowed TX ranges come only from the station configuration: [{ startHz, endHz }]. Empty or missing = not configured.
// A malformed list throws instead of silently disabling the inhibit.
function parseTxRanges(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 64) throw new Error("txRanges no valido: se espera una lista de rangos {startHz, endHz}.");
  return value.map(range => {
    const start = range?.startHz;
    const end = range?.endHz;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= end) {
      throw new Error("txRanges no valido: cada rango necesita startHz < endHz (enteros, Hz).");
    }
    return { startHz: start, endHz: end };
  });
}

const NOT_CONFIGURED = "not-configured";

// Out-of-band TX inhibit. evaluate() is pure; observe() also keeps the last known verdict so that only a crossing is logged.
function createTxInhibit({ ranges = [], log = () => {} } = {}) {
  const list = parseTxRanges(ranges);
  const configured = list.length > 0;
  let state = configured ? "unknown" : NOT_CONFIGURED;
  let span = null;
  let lastKnown = null;

  function evaluate(freq, mode, passband) {
    if (!configured) return { state: NOT_CONFIGURED, span: null };
    const found = occupiedSpan(freq, mode, passband);
    if (!found) return { state: "unknown", span: null };
    const inside = list.some(range => found.low >= range.startHz && found.high <= range.endHz);
    return { state: inside ? "inside" : "outside", span: found };
  }

  // Updates the reported state; `tuning` skips the evaluation (the radio may report a temporary mode during an ATU tune).
  function observe(freq, mode, passband, { tuning = false } = {}) {
    if (!configured || tuning) return { state, span };
    const verdict = evaluate(freq, mode, passband);
    state = verdict.state;
    span = verdict.span;
    if (state !== "unknown" && state !== lastKnown) {
      if (state === "outside") log(`Fuera de banda en ${mode}: la emisión ocuparía ${span.low} a ${span.high} Hz`);
      else if (lastKnown === "outside") log("De nuevo dentro de un rango de emisión permitido");
      lastKnown = state;
    }
    return { state, span };
  }

  const snapshot = () => ({
    configured,
    state,
    span: span ? { ...span } : null,
    ranges: list.map(range => ({ ...range }))
  });

  return { configured, evaluate, observe, snapshot };
}

module.exports = { OrphanWatch, occupiedSpan, parseTxRanges, createTxInhibit };
