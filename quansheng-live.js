(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  class QuanshengLiveDecoder {
    constructor() {
      this.buffer = [];
      this.screen = new Uint8Array(1024);
      this.rows = new Map();
      this.rfStatus = null;
    }
    feed(bytes) {
      R.bytes(bytes);
      R.assert(this.buffer.length + bytes.length <= 65536, "Desbordamiento del visor Quansheng.");
      this.buffer.push(...bytes);
      const events = [];
      while (this.buffer.length >= 6) {
        let start = 0;
        const marker = this.buffer[0] === 255 || (this.buffer[0] & 240) === 240;
        if (marker) start = 1;
        if (this.buffer[start] !== 170 || this.buffer[start + 1] !== 85) {
          this.buffer.shift();
          continue;
        }
        const type = this.buffer[start + 2];
        const size = (this.buffer[start + 3] << 8) | this.buffer[start + 4];
        R.assert(size <= 8192, "Trama del visor fuera de limites.");
        const length = start + size + 6;
        if (this.buffer.length < length) break;
        R.assert(this.buffer[length - 1] === 10, "Terminador del visor incorrecto.");
        const payload = Uint8Array.from(this.buffer.slice(start + 5, length - 1));
        const flags = marker && this.buffer[0] !== 255 ? this.buffer[0] & 15 : 0;
        this.buffer.splice(0, length);
        if (type === 1 || type === 2) {
          if (type === 1) {
            R.assert(size === 1024, "Captura LCD de tamano incorrecto.");
            this.screen.set(payload);
          } else {
            R.assert(size % 9 === 0, "Diferencial LCD incompleto.");
            for (let i = 0; i < size; i += 9) {
              R.assert(payload[i] < 128, "Indice LCD fuera de limites.");
              this.screen.set(payload.subarray(i + 1, i + 9), payload[i] * 8);
            }
          }
          events.push({ type: "screen", screen: this.screen.slice(), flags });
        } else if (type === 5 || type === 6) {
          const rows = this.parseRF(type, payload);
          for (const row of rows) this.rows.set(row.sequence, row);
          const latest = [...this.rows.values()].sort((a, b) => b.sequence - a.sequence).slice(0, 512);
          this.rows = new Map(latest.map(row => [row.sequence, row]));
          events.push({ type: "rf", rows: latest, status: this.rfStatus });
        }
      }
      return events;
    }
    parseRF(type, payload) {
      const main = type === 5;
      R.assert(main ? payload.length === 4 || payload.length === 1629 : payload.length === 1600,
        "Registro RF: tamano no compatible.");
      const view = R.view(payload);
      if (main) {
        R.assert(payload[0] === 2, `Registro RF: version ${payload[0]} no compatible.`);
        R.assert(payload[2] <= 64, "Registro RF: demasiadas filas.");
        this.rfStatus = payload[1];
        if (this.rfStatus & 4) this.rows.clear();
        if (payload.length === 4) return [];
      }
      const count = main ? payload[2] : 64;
      const rows = [];
      for (let i = 0, offset = main ? 29 : 0; i < count; i++, offset += 25) {
        const frequency10Hz = view.getUint32(offset, true);
        const flags = payload[offset + 12];
        if (!frequency10Hz && !(flags & 8)) continue;
        rows.push({
          frequency10Hz, sequence: view.getUint32(offset + 4, true),
          durationSeconds: view.getUint16(offset + 8, true),
          channel: view.getUint16(offset + 10, true), flags,
          meter: payload[offset + 13], battery: payload[offset + 14],
          name: R.text(payload.subarray(offset + 15, offset + 25))
        });
      }
      return rows;
    }
  }
  function rfLogCSV(rows) {
    const cell = value => {
      let text = String(value);
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    return "\uFEFF" + [
      ["sequence", "event", "frequency_MHz", "duration_s", "channel", "name", "meter_raw", "battery_V"],
      ...rows.map(row => [row.sequence, row.flags & 8 ? "SESSION" : row.flags & 1 ? "TX" : "RX",
        row.frequency10Hz ? (row.frequency10Hz / 100000).toFixed(5) : "",
        row.durationSeconds, row.channel === 65535 ? "" : row.channel + 1, row.name,
        row.meter === 255 ? "" : row.meter, row.battery === 255 ? "" : ((600 + row.battery) / 100).toFixed(2)])
    ].map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
  }
  class QuanshengLiveSession {
    constructor(connector, onEvent) {
      this.connector = connector;
      this.decoder = new QuanshengLiveDecoder();
      this.onEvent = onEvent;
      this.stopping = false;
    }
    start() {
      R.assert(!this.done, "El visor ya esta iniciado.");
      this.done = this.connector.run("Visor Quansheng", async () => {
        const transport = this.connector.transport;
        let nextPing = 0;
        let restart = true;
        let lastFrame = Date.now();
        let drainingUntil = 0;
        while (!this.stopping || Date.now() < drainingUntil) {
          if (transport.error) throw transport.error;
          if (!this.stopping && Date.now() >= nextPing) {
            await transport.write(Uint8Array.of(85, 170, 0, 0));
            await transport.write(Uint8Array.of(85, 170, 5, restart ? 131 : 3));
            restart = false;
            nextPing = Date.now() + 200;
          }
          if (transport.buffer.length) {
            const data = await transport.readExact(transport.buffer.length);
            for (const event of this.decoder.feed(data)) {
              lastFrame = Date.now();
              this.onEvent(event);
            }
          }
          if (!this.stopping && Date.now() - lastFrame > 10000) {
            this.onEvent({ type: "unavailable", message: "Sin tramas en 10 s. Comprueba K5Viewer en el firmware y el bloqueo del teclado." });
            this.stopping = true;
          }
          if (this.stopping && !drainingUntil) drainingUntil = Date.now() + 1200;
          await pause(20);
        }
        R.assert(!this.decoder.buffer.length, "El visor termino con una trama incompleta. Reconecta antes de continuar.");
      });
      return this.done;
    }
    async sendKey(code, longPress, permit) {
      R.assert(this.done && !this.stopping && !this.keyPending &&
        this.connector.connected && !this.connector.transport.error, "Teclado no disponible: inicia el visor o espera la tecla anterior.");
      R.assert(Number.isInteger(code) && (code >= 0 && code <= 15 || code === 17 || code === 18) &&
        typeof longPress === "boolean", "Tecla o tipo de pulsacion no valido; PTT no permitido.");
      R.assertBackup(this.connector, permit);
      this.keyPending = (async () => {
        await R.verifyBackup(this.connector, permit);
        R.assert(!this.stopping && this.connector.connected && !this.connector.transport.error,
          "Visor detenido o conexion perdida antes de enviar la tecla.");
        await this.connector.transport.write(Uint8Array.of(170, 85, longPress ? 4 : 3, code));
      })();
      try { await this.keyPending; }
      finally { this.keyPending = null; }
    }
    async stop() {
      this.stopping = true;
      const results = await Promise.allSettled([this.done, this.keyPending]);
      const failures = results.filter(result => result.status === "rejected").map(result => result.reason);
      if (failures.length) throw new AggregateError(failures, "Error al detener visor/teclado.");
    }
  }
  function filterRFLog(rows, query = "", event = "all") {
    R.assert(Array.isArray(rows) && rows.length <= 512 && typeof query === "string" &&
      query.length <= 80 && ["all", "rx", "tx", "session"].includes(event), "Filtro RF no valido.");
    const term = query.trim().toLocaleLowerCase();
    return rows.filter(row => {
      const kind = row.flags & 8 ? "session" : row.flags & 1 ? "tx" : "rx";
      return (event === "all" || event === kind) &&
        (!term || row.name.toLocaleLowerCase().includes(term) ||
          (row.frequency10Hz / 100000).toFixed(5).includes(term));
    });
  }
  Object.assign(R, { QuanshengLiveDecoder, QuanshengLiveSession, rfLogCSV, filterRFLog });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
