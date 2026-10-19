(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  class BufferedTransport {
    constructor() {
      this.buffer = new Uint8Array();
      this.error = null;
      this.pending = null;
      this.opened = false;
      this.onDisconnect = () => {};
    }
    push(data) {
      if (!this.opened) return;
      const joined = new Uint8Array(this.buffer.length + data.length);
      joined.set(this.buffer);
      joined.set(data, this.buffer.length);
      if (joined.length > 1048576) {
        this.fail(new Error("Desbordamiento del buffer de recepcion."));
        return;
      }
      this.buffer = joined;
      this.notify();
    }
    fail(error) {
      this.error = error;
      this.notify();
      this.onDisconnect(error);
    }
    notify() {
      if (this.pending) this.pending();
    }
    async readExact(length, timeout = 4000) {
      R.assert(Number.isInteger(length) && length > 0 && length <= 1048576, "Longitud de lectura invalida.");
      R.assert(!this.pending, "Lecturas simultaneas no permitidas.");
      if (this.error) throw this.error;
      if (this.buffer.length < length) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            this.pending = null;
            const error = new Error(`Tiempo agotado: recibidos ${this.buffer.length}/${length} bytes.`);
            this.fail(error);
            reject(error);
          }, timeout);
          this.pending = () => {
            if (this.error || this.buffer.length >= length) {
              clearTimeout(timer);
              this.pending = null;
              if (this.error) reject(this.error);
              else resolve();
            }
          };
          this.notify();
        });
      }
      const result = this.buffer.slice(0, length);
      this.buffer = this.buffer.slice(length);
      return result;
    }
    clear() {
      R.assert(!this.pending, "No se puede vaciar una lectura pendiente.");
      this.buffer = new Uint8Array();
    }
  }
  class SerialTransport extends BufferedTransport {
    constructor(api = root.navigator && root.navigator.serial) {
      super();
      this.api = api;
      this.port = null;
      this.removed = event => {
        if (event.target === this.port || event.port === this.port) this.fail(new Error("Cable serie desconectado."));
      };
    }
    async open(baudRate, filters = []) {
      R.assert(this.api, "Web Serial no disponible. Usa Chrome/Edge en localhost o HTTPS.");
      R.assert(!this.port, "El puerto ya esta abierto.");
      this.port = await this.api.requestPort({ filters });
      try {
        await this.port.open({ baudRate, dataBits: 8, stopBits: 1, parity: "none", flowControl: "none" });
        this.reader = this.port.readable.getReader();
        this.writer = this.port.writable.getWriter();
        this.opened = true;
        this.error = null;
        this.api.addEventListener("disconnect", this.removed);
        this.loop = this.pump();
      } catch (error) {
        try { await this.close(); } catch (cleanup) {
          throw new AggregateError([error, cleanup], "No se pudo abrir ni liberar el puerto.");
        }
        throw error;
      }
    }
    async pump() {
      try {
        while (this.opened) {
          const { value, done } = await this.reader.read();
          if (done) {
            if (this.opened) this.fail(new Error("La radio cerro el puerto."));
            break;
          }
          this.push(value);
        }
      } catch (error) {
        if (this.opened) this.fail(error);
      }
    }
    async write(data) {
      R.assert(this.opened && !this.error, "Puerto serie no disponible.");
      await this.writer.write(R.bytes(data));
    }
    async close() {
      this.opened = false;
      this.error = new Error("Puerto cerrado.");
      this.notify();
      this.api?.removeEventListener("disconnect", this.removed);
      const failures = [];
      if (this.reader) {
        try { await this.reader.cancel(); await this.loop; } catch (e) { failures.push(e); }
        this.reader.releaseLock();
        this.reader = null;
      }
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      if (this.port) {
        try { await this.port.close(); } catch (e) { failures.push(e); }
        this.port = null;
      }
      this.buffer = new Uint8Array();
      if (failures.length) throw new AggregateError(failures, "Error al cerrar el puerto serie.");
    }
  }
  class USBTransport extends BufferedTransport {
    constructor(api = root.navigator && root.navigator.usb) {
      super();
      this.api = api;
      this.claimed = [];
      this.removed = event => {
        if (event.device === this.device) this.fail(new Error("Cable USB desconectado."));
      };
    }
    async open() {
      R.assert(this.api, "WebUSB no disponible. Usa Chrome/Edge en localhost o HTTPS.");
      this.device = await this.api.requestDevice({ filters: [{ vendorId: 0x1fc9, productId: 0x0094 }] });
      try {
        await this.device.open();
        if (!this.device.configuration) await this.device.selectConfiguration(1);
        const interfaces = this.device.configuration.interfaces;
        const control = interfaces.find(item => item.alternates.some(alt => alt.interfaceClass === 2));
        let selected;
        for (const item of interfaces) {
          for (const alt of item.alternates) {
            const input = alt.endpoints.find(ep => ep.type === "bulk" && ep.direction === "in");
            const output = alt.endpoints.find(ep => ep.type === "bulk" && ep.direction === "out");
            if (input && output && alt.interfaceClass === 10) selected = { item, alt, input, output };
          }
        }
        R.assert(control && selected, "No se encontro una interfaz CDC OpenGD77 normal. No uses DFU/bootloader.");
        for (const number of new Set([control.interfaceNumber, selected.item.interfaceNumber])) {
          await this.device.claimInterface(number);
          this.claimed.push(number);
        }
        await this.device.selectAlternateInterface(selected.item.interfaceNumber, selected.alt.alternateSetting);
        const coding = new Uint8Array(7);
        R.view(coding).setUint32(0, 115200, true);
        coding[6] = 8;
        for (const [request, value, data] of [[0x20, 0, coding], [0x22, 3, new Uint8Array()]]) {
          const result = await this.device.controlTransferOut({
            requestType: "class", recipient: "interface", request, value, index: control.interfaceNumber
          }, data);
          R.assert(result.status === "ok", "Error al configurar CDC. Comprueba el controlador USB.");
        }
        this.input = selected.input.endpointNumber;
        this.output = selected.output.endpointNumber;
        this.opened = true;
        this.error = null;
        this.api.addEventListener("disconnect", this.removed);
        this.loop = this.pump();
      } catch (error) {
        try { await this.close(); } catch (cleanup) {
          throw new AggregateError([error, cleanup], "No se pudo abrir ni liberar el dispositivo USB.");
        }
        throw error;
      }
    }
    async pump() {
      try {
        while (this.opened) {
          const result = await this.device.transferIn(this.input, 64);
          R.assert(result.status === "ok" && result.data, "Error de recepcion USB.");
          this.push(new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength));
        }
      } catch (error) {
        if (this.opened) this.fail(error);
      }
    }
    async write(data) {
      R.assert(this.opened && !this.error, "USB no disponible.");
      const result = await this.device.transferOut(this.output, R.bytes(data));
      R.assert(result.status === "ok" && result.bytesWritten === data.length, "Escritura USB incompleta.");
    }
    async close() {
      this.opened = false;
      this.error = new Error("USB cerrado.");
      this.notify();
      this.api?.removeEventListener("disconnect", this.removed);
      const failures = [];
      if (this.device?.opened) {
        for (const number of this.claimed.reverse()) {
          try { await this.device.releaseInterface(number); } catch (e) { failures.push(e); }
        }
        try { await this.device.close(); } catch (e) { failures.push(e); }
      }
      this.claimed = [];
      this.device = null;
      this.buffer = new Uint8Array();
      if (failures.length) throw new AggregateError(failures, "Error al liberar USB.");
    }
  }
  Object.assign(R, { BufferedTransport, SerialTransport, USBTransport });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
