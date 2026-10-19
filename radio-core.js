(function (root) {
  "use strict";
  const R = root.RadioWorkspace = root.RadioWorkspace || {};
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const bytes = (value, length) => {
    assert(value instanceof Uint8Array, "Se requieren bytes Uint8Array.");
    if (length !== undefined) assert(value.length === length, `Tamano incorrecto: ${value.length}; esperado: ${length}.`);
    return value;
  };
  const view = value => new DataView(value.buffer, value.byteOffset, value.byteLength);
  const text = value => {
    let result = "";
    for (const c of value) {
      if (c === 0 || c === 255) break;
      result += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
    }
    return result;
  };
  function crc32(data) {
    let crc = 0xffffffff;
    for (const b of data) {
      crc ^= b;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  async function sha256(data) {
    const hash = await root.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
  }
  function equal(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  function validateCalibration(data) {
    bytes(data);
    assert(data.length >= 512 && !data.every(value => value === 0) && !data.every(value => value === 255),
      "Calibracion vacia o borrada. No se autorizara ninguna escritura.");
  }
  class Connector {
    constructor(transport) {
      this.transport = transport;
      this.busy = false;
      this.connected = false;
      this.session = root.crypto.randomUUID();
      this.onProgress = () => {};
    }
    async run(label, action) {
      assert(!this.busy, "Hay otra operacion en curso.");
      assert(this.connected && !this.transport.error, "Radio no conectada. Vuelve a conectar.");
      this.busy = true;
      try {
        return await action();
      } catch (error) {
        this.connected = false;
        throw new Error(`${label}: ${error.message}. Desconecta y vuelve a conectar antes de continuar.`, { cause: error });
      } finally {
        this.busy = false;
      }
    }
    async disconnect() {
      assert(!this.busy, "No desconectes durante una operacion.");
      this.connected = false;
      this.session = root.crypto.randomUUID();
      await this.transport.close();
    }
    progress(value, message) {
      this.onProgress({ value, message });
    }
  }
  Object.assign(R, { assert, bytes, view, text, crc32, sha256, equal, validateCalibration, Connector });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
