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
    async readExact(length, timeout = 4000, fatalTimeout = true) {
      R.assert(Number.isInteger(length) && length > 0 && length <= 1048576, "Longitud de lectura invalida.");
      R.assert(!this.pending, "Lecturas simultaneas no permitidas.");
      if (this.error) throw this.error;
      if (this.buffer.length < length) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            this.pending = null;
            const error = new Error(`Tiempo agotado: recibidos ${this.buffer.length}/${length} bytes.`);
            error.code = "READ_TIMEOUT";
            if (fatalTimeout) this.fail(error);
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
    async open(baudRate, filters = [], options = {}) {
      R.assert(this.api, "Web Serial no disponible. Usa Chrome/Edge en localhost o HTTPS.");
      R.assert(!this.port, "El puerto ya esta abierto.");
      if (options.port) this.port = options.port;
      else {
        const permitted = typeof this.api.getPorts === "function" ? await this.api.getPorts() : [];
        const matching = permitted.filter(port => {
          if (!filters.length) return true;
          const info = port.getInfo();
          return filters.some(filter => Object.entries(filter).every(([key, value]) => info[key] === value));
        });
        this.port = matching.length === 1 ? matching[0] : await this.api.requestPort({ filters });
      }
      try {
        await this.port.open({ baudRate, dataBits: 8, stopBits: 1, parity: "none", flowControl: "none" });
        if (this.quanshengUSBPadding && typeof this.port.setSignals === "function") {
          await this.port.setSignals({ dataTerminalReady: true });
        } else if (options.lowControlLines && typeof this.port.setSignals === "function") {
          // Rigs such as the truSDX (CH340) and QMX reset or error when DTR/RTS toggle: force both low once, never again.
          try { await this.port.setSignals({ dataTerminalReady: false, requestToSend: false }); }
          catch (signalError) { this.signalError = signalError; }
        }
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
      // F4HWN USB CDC can hold an exact 64-byte packet until the next byte.
      if (this.quanshengUSBPadding && data.length % 64 === 0) await this.writer.write(Uint8Array.of(0));
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
  // ---- Text CAT rigs (Yaesu FTX-1, QRP Labs QMX/QMX+, truSDX) over Web Serial ----
  const BAUDS = [4800, 9600, 19200, 38400, 57600, 115200];
  const RIG_PROFILES = {
    // Bench-measured: the CP2105 Enhanced port answers at 38400 8N1; FA is 9 digits (FA439300000;).
    ftx1: { id: "ftx1", label: "Yaesu FTX-1", defaultBaud: 38400, bauds: [4800, 9600, 19200, 38400, 115200],
      digits: 9, strictVfo: true, filters: [{ usbVendorId: 0x10c4 }], probe: "ID;", probePrefix: "ID", probeReply: "ID0840;" },
    // Bench-measured: USB 0483:A34C (STMicroelectronics VID is shared, so VID+PID are matched), CDC at 38400 with DTR/RTS low;
    // ID; -> ID020; and FA; -> 11 digits. The DTR-high retry is only a harmless fallback.
    qmx: { id: "qmx", label: "QRP Labs QMX / QMX+", defaultBaud: 38400, bauds: BAUDS, digits: 11, strictVfo: false,
      filters: [{ usbVendorId: 0x0483, usbProductId: 0xa34c }], probe: "FA;", probePrefix: "F", dtrRetry: true },
    // CH340, bench-measured: 115200 8N1 works (38400 returns garbage), "ID;" is answered "?;" so FA; identifies it,
    // and the radio needs ~1.5 s after open before the first command. 38400 is only a fallback probe.
    trusdx: { id: "trusdx", label: "(tr)uSDX", defaultBaud: 115200, fallbackBauds: [38400], bauds: BAUDS, digits: 11,
      strictVfo: false, filters: [], probe: "FA;", probePrefix: "F", openDelayMs: 1500 }
  };
  // 26AA:0030 is the "YAESU HRI USB I/F" (FTX-1 family accessory); it does not speak Kenwood CAT and is never probed.
  const RIG_USB_NON_CAT = [{ usbVendorId: 0x26aa, usbProductId: 0x0030, label: "YAESU HRI USB I/F" }];
  function rigUsbNonCat(info) {
    return RIG_USB_NON_CAT.find(entry => info && entry.usbVendorId === info.usbVendorId && entry.usbProductId === info.usbProductId) || null;
  }
  function rigProfile(id) {
    const profile = RIG_PROFILES[id];
    R.assert(profile, "Radio CAT no admitida.");
    return profile;
  }
  function rigFrequencyCommand(profile, vfo, hz) {
    R.assert(vfo === "A" || vfo === "B", "VFO CAT no valido.");
    R.assert(Number.isSafeInteger(hz) && hz > 0 && hz < 10 ** profile.digits, "Frecuencia CAT fuera de rango.");
    return `F${vfo}${String(hz).padStart(profile.digits, "0")};`;
  }
  function parseRigFrequency(profile, reply, vfo = "A") {
    const prefix = profile.strictVfo ? `F${vfo}` : "F[AB]";
    const match = new RegExp(`^${prefix}(\\d{${profile.digits}});$`).exec(String(reply).trim());
    R.assert(match, `Respuesta de frecuencia invalida (${profile.label}: ${profile.digits} digitos).`);
    return Number(match[1]);
  }
  function rigError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }
  class RigCatSession {
    constructor(transport, profile, { timeoutMs = 1000, retries = 2, writeTimeoutMs = 1000, settleMs = 50,
      sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
      this.transport = transport;
      this.profile = typeof profile === "string" ? rigProfile(profile) : profile;
      this.timeoutMs = timeoutMs;
      this.retries = retries;
      this.writeTimeoutMs = writeTimeoutMs;
      this.settleMs = settleMs;
      this.sleep = sleep;
      this.queue = Promise.resolve();
    }
    // One command at a time: writes never overlap and replies cannot be attributed to the wrong request.
    command(text, { answer = false, prefix = "", retries = answer ? this.retries : 0 } = {}) {
      const run = () => this.execute(text, answer, prefix, retries);
      const result = this.queue.then(run);
      this.queue = result.catch(() => {});
      return result;
    }
    async execute(text, answer, prefix, retries) {
      R.assert(/^[\x20-\x7e]+;$/.test(text), "Comando CAT no valido: debe terminar en ';'.");
      for (let attempt = 0; attempt <= retries; attempt++) {
        // Flush stale or unsolicited bytes before every attempt (also resynchronizes after garbage).
        if (!this.transport.pending) this.transport.clear();
        await this.write(text);
        if (!answer) return "";
        const reply = await this.readReply(prefix);
        if (reply !== null) return reply;
      }
      throw rigError("RIG_TIMEOUT", "La radio no responde al CAT.");
    }
    async write(text) {
      let timer;
      try {
        await Promise.race([this.transport.write(new TextEncoder().encode(text)),
          new Promise((_, reject) => { timer = setTimeout(() => reject(rigError("RIG_WRITE_TIMEOUT", "Escritura serie bloqueada.")), this.writeTimeoutMs); })]);
      } finally { clearTimeout(timer); }
    }
    // Returns the first ';' terminated frame that starts with prefix, "?;" as a rejection, or null on timeout.
    async readReply(prefix) {
      const deadline = Date.now() + this.timeoutMs;
      let text = "";
      while (Date.now() < deadline) {
        let byte;
        try { [byte] = await this.transport.readExact(1, Math.max(1, deadline - Date.now()), false); }
        catch (error) {
          if (error.code === "READ_TIMEOUT") return null;
          throw error;
        }
        text += String.fromCharCode(byte);
        if (byte !== 0x3b) {
          if (text.length > 64) text = "";
          continue;
        }
        const frame = text.slice(text.lastIndexOf(";", text.length - 2) + 1);
        text = "";
        if (frame === "?;") throw rigError("RIG_REJECTED", "La radio rechazo el comando CAT (?;).");
        if (frame.startsWith(prefix)) return frame;
      }
      return null;
    }
    async getFrequency(vfo = "A") {
      const reply = await this.command(`F${vfo};`, { answer: true, prefix: this.profile.strictVfo ? `F${vfo}` : "F" });
      return parseRigFrequency(this.profile, reply, vfo);
    }
    // SET is idempotent for the same value, so it may be repeated; success means the echoed frequency matches.
    async setFrequency(vfo, hz) {
      const command = rigFrequencyCommand(this.profile, vfo, hz);
      for (let attempt = 0; attempt <= this.retries; attempt++) {
        await this.command(command);
        await this.sleep(this.settleMs);
        try { if (await this.getFrequency(vfo) === hz) return hz; }
        catch (error) { if (error.code !== "RIG_TIMEOUT") throw error; }
      }
      throw rigError("RIG_UNCONFIRMED", "La radio no confirma la frecuencia solicitada.");
    }
    async identify() {
      const probe = this.profile;
      const reply = await this.command(probe.probe, { answer: true, prefix: probe.probePrefix });
      if (probe.probeReply) R.assert(reply === probe.probeReply, `No es un ${probe.label}: respuesta inesperada (${reply}).`);
      else parseRigFrequency(probe, reply);
      return reply;
    }
  }
  // Keeps a rig connected: opens with DTR/RTS low, and re-opens by itself when the cable comes back.
  class RigCatLink {
    constructor(profileId, { baud, api = root.navigator && root.navigator.serial, onState = () => {}, reconnectDelayMs = 1500,
      maxReconnectAttempts = 30, createTransport = serial => new SerialTransport(serial), sessionOptions = {}, openDelayMs } = {}) {
      this.profile = rigProfile(profileId);
      this.explicitBaud = baud !== undefined;
      this.baud = baud ?? this.profile.defaultBaud;
      this.openDelayMs = openDelayMs ?? this.profile.openDelayMs ?? 0;
      R.assert(Number.isInteger(this.baud) && this.baud > 0, "Velocidad serie no valida.");
      this.api = api;
      this.onState = onState;
      this.reconnectDelayMs = reconnectDelayMs;
      this.maxReconnectAttempts = maxReconnectAttempts;
      this.createTransport = createTransport;
      this.sessionOptions = sessionOptions;
      this.state = "closed";
      this.session = null;
      this.transport = null;
      this.timer = null;
      this.attempts = 0;
      this.portInfo = null;
      this.plugged = () => { if (this.state === "lost") this.scheduleReconnect(0); };
    }
    setState(state, detail) {
      this.state = state;
      this.onState({ state, detail });
    }
    async connect(port) {
      R.assert(this.state === "closed", "El enlace CAT ya esta abierto.");
      await this.openWith(port);
      this.api?.addEventListener?.("connect", this.plugged);
    }
    async openWith(port) {
      // A user-chosen baud is never overridden; fallback bauds are only probed when the default stays silent.
      const bauds = [this.baud, ...(this.explicitBaud ? [] : (this.profile.fallbackBauds || []))];
      let lastError;
      for (const baud of bauds) {
        try { await this.openAt(baud, port); return; }
        catch (error) {
          lastError = error;
          if (error.code !== "RIG_TIMEOUT" && !/respuesta inesperada|frecuencia invalida/i.test(error.message)) throw error;
        }
      }
      throw lastError;
    }
    async openAt(baud, port) {
      const transport = this.createTransport(this.api);
      try {
        await transport.open(baud, this.profile.filters, { lowControlLines: true, port });
        const nonCat = rigUsbNonCat(transport.port?.getInfo?.());
        if (nonCat) throw rigError("RIG_NOT_CAT", `${nonCat.label} no es una radio CAT Kenwood; no se sondea.`);
        if (this.openDelayMs) await new Promise(resolve => setTimeout(resolve, this.openDelayMs));
        const session = new RigCatSession(transport, this.profile, this.sessionOptions);
        try { await session.identify(); }
        catch (error) {
          const raw = transport.port;
          if (!this.profile.dtrRetry || error.code !== "RIG_TIMEOUT" || typeof raw?.setSignals !== "function") throw error;
          // Some CDC devices only transmit while DTR is asserted.
          await raw.setSignals({ dataTerminalReady: true, requestToSend: false });
          await session.identify();
        }
        const info = transport.port?.getInfo?.();
        if (info) this.portInfo = info;
        transport.onDisconnect = error => this.lost(transport, error);
        this.transport = transport;
        this.session = session;
        this.baud = baud;
        this.attempts = 0;
        this.setState("open");
      } catch (error) {
        try { await transport.close(); } catch { /* the open error is the useful one */ }
        throw error;
      }
    }
    lost(transport, error) {
      if (transport !== this.transport || this.state === "closed") return;
      this.session = null;
      this.transport = null;
      transport.close().catch(() => {});
      this.setState("lost", error);
      this.scheduleReconnect(this.reconnectDelayMs);
    }
    scheduleReconnect(delay) {
      clearTimeout(this.timer);
      if (this.state !== "lost" && this.state !== "reconnecting") return;
      this.timer = setTimeout(() => this.reconnect(), delay);
    }
    async reconnect() {
      if (this.state === "closed" || this.state === "open") return;
      this.setState("reconnecting");
      this.attempts++;
      try {
        const ports = await this.api.getPorts();
        const wanted = this.portInfo || {};
        const port = ports.find(candidate => {
          const info = candidate.getInfo?.() || {};
          return info.usbVendorId === wanted.usbVendorId && info.usbProductId === wanted.usbProductId;
        });
        if (!port) throw rigError("RIG_ABSENT", "Puerto no presente.");
        await this.openWith(port);
      } catch (error) {
        if (this.state === "closed") return;
        this.state = "lost";
        if (this.attempts < this.maxReconnectAttempts) this.scheduleReconnect(this.reconnectDelayMs);
        else this.setState("failed", error);
      }
    }
    // Commands during an outage fail fast with a clear code instead of hanging.
    use() {
      if (!this.session) throw rigError("RIG_OFFLINE", "Radio desconectada; se reconectara sola al volver el cable.");
      return this.session;
    }
    async getFrequency(vfo = "A") { return this.use().getFrequency(vfo); }
    async setFrequency(vfo, hz) { return this.use().setFrequency(vfo, hz); }
    async close() {
      clearTimeout(this.timer);
      this.api?.removeEventListener?.("connect", this.plugged);
      const transport = this.transport;
      this.session = null;
      this.transport = null;
      this.state = "closed";
      if (transport) await transport.close();
    }
  }
  Object.assign(R, { BufferedTransport, SerialTransport, USBTransport, RIG_PROFILES, rigUsbNonCat, rigFrequencyCommand, parseRigFrequency,
    RigCatSession, RigCatLink });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
