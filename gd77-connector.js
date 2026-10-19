(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const MODELS = ["GD-77", "GD-77S", "DM-1801", "RD-5R", "DM-1801A", "MD-9600", "MD-UV380", "MD-380", "DM-1701", "MD-2017", "DM-1701 RGB", "DM-32", "UV008"];
  function segments(family) {
    const flashBased = family !== "MK22";
    return [
      { start: 0x80, end: 0x6000, address: 0x80, mode: flashBased ? 1 : 2, write: 4 },
      { start: 0x7500, end: 0xb000, address: 0x7500, mode: flashBased ? 1 : 2, write: 4 },
      { start: 0xb000, end: 0x1ee60, address: flashBased ? 0x9b000 : 0x7b000, mode: 1, write: 3 },
      { start: 0x1ee60, end: 0x20000, address: flashBased ? 0x20000 : 0, mode: 1, write: 3 }
    ];
  }
  class GD77Connector extends R.Connector {
    constructor(family, transport) {
      R.assert(["MK22", "STM32", "SERIAL"].includes(family), "Familia OpenGD77 invalida.");
      super(transport || (family === "SERIAL" ? new R.SerialTransport() : new R.USBTransport()));
      this.family = family;
      this.blockSize = 32;
    }
    async command(code, option) {
      await this.transport.write(Uint8Array.from(option === undefined ? [0x43, code] : [0x43, code, option]));
      const response = await this.transport.readExact(1);
      R.assert(response[0] === 0x2d, `Comando CPS ${code} no confirmado.`);
    }
    async connect() {
      await this.transport.open(this.family === "SERIAL" ? 115200 : undefined);
      this.connected = true;
      return this.run("Identificar OpenGD77", async () => {
        await this.command(0);
        const raw = await this.readMemory(9, 0, 46);
        const v = R.view(raw);
        const type = v.getUint32(4, true);
        const version = v.getUint32(0, true);
        R.assert(version > 0 && version <= 4 && type < MODELS.length, "Estructura de identificacion desconocida. No se asumira un mapa de memoria.");
        const detected = type <= 4 ? "MK22" : type <= 10 ? "STM32" : "SERIAL";
        R.assert(this.family === detected, `Familia incorrecta: la radio informa ${MODELS[type]} (${detected}).`);
        this.info = {
          family: detected, model: MODELS[type], radioType: type, structVersion: version,
          firmware: R.text(raw.subarray(8, 24)), build: R.text(raw.subarray(24, 40)),
          rawInfo: Array.from(raw)
        };
        await this.command(5);
        await this.command(7);
        return this.info;
      });
    }
    async readMemory(mode, address, length, progress = () => {}) {
      const out = new Uint8Array(length);
      if (mode === 9) R.assert(address === 0 && length === 46, "RadioInfo requiere una unica solicitud de 46 bytes con direccion 0.");
      const blockSize = mode === 9 ? 46 : this.blockSize;
      for (let position = 0; position < length; position += blockSize) {
        const count = Math.min(blockSize, length - position);
        const request = new Uint8Array(8);
        request[0] = 0x52;
        request[1] = mode;
        const v = R.view(request);
        v.setUint32(2, address + position, false);
        v.setUint16(6, count, false);
        await this.transport.write(request);
        const header = await this.transport.readExact(3);
        R.assert(header[0] === 0x52 && R.view(header).getUint16(1, false) === count, `Respuesta de lectura incorrecta en 0x${(address + position).toString(16)}.`);
        out.set(await this.transport.readExact(count), position);
        progress((position + count) / length);
      }
      return out;
    }
    async cps(action, save = false) {
      await this.command(0);
      if (save) await this.command(6, 2);
      const result = await action();
      await this.command(5);
      await this.command(7);
      return result;
    }
    async readCodeplugRaw() {
      const out = new Uint8Array(0x20000);
      const mapping = segments(this.family);
      const total = mapping.reduce((sum, part) => sum + part.end - part.start, 0);
      let done = 0;
      for (const part of mapping) {
        const length = part.end - part.start;
        out.set(await this.readMemory(part.mode, part.address, length, value =>
          this.progress((done + value * length) / total, "Leyendo codeplug")), part.start);
        done += length;
      }
      return out;
    }
    readCodeplug() {
      return this.run("Leer codeplug", () => this.cps(() => this.readCodeplugRaw()));
    }
    readScreen() {
      return this.run("Capturar pantalla", () => this.cps(() => this.readMemory(6, 0, this.family === "MK22" ? 1024 : 160 * 128 / 8)));
    }
    async backup(emit) {
      return this.run("Respaldo automatico", () => this.cps(async () => {
        const address = this.family === "MK22" ? 0x80000 : 0x10000;
        const length = this.family === "MK22" ? 4096 : 512;
        const calibration = await this.readMemory(2, address, length, value => this.progress(value, "Leyendo calibracion"));
        await emit("calibration", calibration, { address, mode: 2, contains: "Calibracion de la unidad, segun mapa CPS" });
        const codeplug = await this.readCodeplugRaw();
        await emit("codeplug", codeplug, { contains: "Codeplug estandar 128 KiB; NO es firmware ni clon completo" });
        return {
          complete: false,
          scope: "Calibracion y codeplug guardados. Escritura bloqueada: no se ha verificado un protocolo de lectura completa del firmware MCU para esta familia. No se sustituye por una imagen descargada."
        };
      }));
    }
    async ackWrite(request, subcommand) {
      await this.transport.write(request);
      const response = await this.transport.readExact(2, 8000);
      R.assert(response[0] === request[0] && response[1] === subcommand, "La radio rechazo la escritura.");
    }
    async writeCodeplug(image, permit) {
      R.assertBackup(this, permit);
      R.bytes(image, 0x20000);
      const copy = image.slice();
      await R.verifyBackup(this, permit);
      return this.run("Escribir codeplug", () => this.cps(async () => {
        const char = this.family === "MK22" ? 0x57 : 0x58;
        let done = 0;
        const mapping = segments(this.family);
        const total = mapping.reduce((sum, part) => sum + part.end - part.start, 0);
        for (const part of mapping) {
          let position = 0;
          let sector = -1;
          while (part.start + position < part.end) {
            const address = part.address + position;
            const nextSector = Math.floor(address / 4096);
            if (part.write === 3 && nextSector !== sector) {
              await this.ackWrite(Uint8Array.of(char, 1, nextSector >>> 16, nextSector >>> 8 & 255, nextSector & 255), 1);
              sector = nextSector;
            }
            const count = Math.min(32, part.end - part.start - position, (part.write === 3 ? 4096 : 128) - address % (part.write === 3 ? 4096 : 128));
            const request = new Uint8Array(count + 8);
            request.set([char, part.write === 3 ? 2 : 4]);
            R.view(request).setUint32(2, address, false);
            R.view(request).setUint16(6, count, false);
            request.set(copy.subarray(part.start + position, part.start + position + count), 8);
            await this.ackWrite(request, request[1]);
            position += count;
            done += count;
            if (part.write === 3 && ((address + count) % 4096 === 0 || part.start + position === part.end)) {
              await this.ackWrite(Uint8Array.of(char, 3), 3);
              sector = -1;
            }
            this.progress(done / total, "Escribiendo codeplug");
          }
          const readback = await this.readMemory(part.mode, part.address, part.end - part.start);
          R.assert(R.equal(readback, copy.subarray(part.start, part.end)), "La verificacion de escritura no coincide.");
        }
      }, true));
    }
  }
  Object.assign(R, { GD77Connector, gd77Segments: segments });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
