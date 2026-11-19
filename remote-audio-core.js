"use strict";
// DOM-free audio helpers shared by remote-ui.js and the tests.
(function (root) {
  const TYPE_RX = 0x01;
  const TYPE_TX = 0x02;
  const MAX_MESSAGE = 4096;

  function buildFrame(type, seq, packet) {
    const body = packet instanceof Uint8Array ? packet : new Uint8Array(packet);
    const frame = new Uint8Array(5 + body.length);
    frame[0] = type;
    new DataView(frame.buffer).setUint32(1, seq >>> 0, false);
    frame.set(body, 5);
    return frame;
  }

  function parseFrame(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (bytes.length <= 5 || bytes.length > MAX_MESSAGE) return null;
    const type = bytes[0];
    if (type !== TYPE_RX && type !== TYPE_TX) return null;
    const seq = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(1, false);
    return { type, seq, packet: bytes.subarray(5) };
  }

  // Receive passband shown by the audio waterfall: 0-6 kHz for AM/FM, 0-4 kHz otherwise.
  function passbandHz(mode) {
    return /^(AM|FM|WFM|PKTFM)$/i.test(String(mode || "")) ? 6000 : 4000;
  }

  function rmsToPercent(db) {
    if (!Number.isFinite(db)) return 0;
    return Math.max(0, Math.min(100, Math.round(((db + 60) / 60) * 100)));
  }

  function formatKhz(hz) {
    return Number.isFinite(hz) ? `${(hz / 1000).toFixed(3).replace(".", ",")} kHz` : "--";
  }

  const api = { TYPE_RX, TYPE_TX, MAX_MESSAGE, buildFrame, parseFrame, passbandHz, rmsToPercent, formatKhz };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RemoteAudioCore = api;
})(typeof self !== "undefined" ? self : globalThis);
