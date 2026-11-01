(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const MODELS = ["GD-77", "GD-77S", "DM-1801", "RD-5R", "DM-1801A", "MD-9600", "MD-UV380", "MD-380", "DM-1701", "MD-2017", "DM-1701 RGB", "DM-32", "UV008"];
  // Upstream usb_com.c (open-ham/OpenGD77 MK22 and the MD-UV380 STM32 tree) only has R/W/X memory access and 'C' CPS
  // commands: there is no USB command to tune, change mode/channel or key the transmitter. Doppler runs inside the radio.
  const NO_CAT = "El protocolo USB de OpenGD77 no tiene ordenes de sintonia, modo, canal ni PTT.";
  const CAT_FUNCTIONS = {
    frequency: { label: "Fijar y leer frecuencia RX/TX", reason: NO_CAT },
    doppler: { label: "Doppler satelite desde el PC o el movil", reason: `${NO_CAT} El Doppler lo calcula la propia radio (menu Satelite) con keps y hora.` },
    channel: { label: "Modo y seleccion de canal", reason: NO_CAT },
    ptt: { label: "PTT remoto", reason: `${NO_CAT} No se simula con hotspot MMDVM (solo DMR digital).` },
    identify: { label: "Identificacion y estado (modelo, firmware, Flash)" },
    screen: { label: "Pantalla en vivo" },
    clock: { label: "Sincronizar reloj UTC (predicciones y Doppler internos)" },
    codeplug: { label: "Leer y editar codeplug (archivo local)" },
    keps: { label: "Cargar keps de satelites", reason: "Formato de keps en Flash no publicado; usa el CPS oficial OpenGD77." }
  };
  // Display buffers: UC1701.c (MK22, page-ordered mono) and HX8353E_display.c (STM32, RGB565 byte-swapped).
  const PROFILES = {
    "GD-77": { family: "MK22", screen: { width: 128, height: 64, format: "mono" } },
    "GD-77S": { family: "MK22", screen: null, note: "Sin pantalla ni teclado." },
    "DM-1801": { family: "MK22", screen: { width: 128, height: 64, format: "mono" } },
    "RD-5R": { family: "MK22", screen: { width: 128, height: 48, format: "mono" }, note: "USB no fiable durante TX (sin hotspot)." },
    "DM-1801A": { family: "MK22", screen: { width: 128, height: 64, format: "mono" } },
    "MD-9600": { family: "STM32", screen: { width: 160, height: 128, format: "rgb565" } },
    "MD-UV380": { family: "STM32", screen: { width: 160, height: 128, format: "rgb565" }, note: "Incluye RT3S y UV390." },
    "MD-380": { family: "STM32", screen: { width: 160, height: 128, format: "rgb565" } },
    "DM-1701": { family: "STM32", screen: { width: 160, height: 128, format: "bgr565" }, note: "Incluye RT84." },
    "MD-2017": { family: "STM32", screen: { width: 160, height: 128, format: "rgb565" } },
    "DM-1701 RGB": { family: "STM32", screen: { width: 160, height: 128, format: "rgb565" } },
    "DM-32": { family: "SERIAL", screen: null, note: "Familia SERIAL: pantalla y reloj no verificados en el codigo fuente." },
    "UV008": { family: "SERIAL", screen: null, note: "Familia SERIAL: pantalla y reloj no verificados en el codigo fuente." }
  };
  function capabilities(model) {
    const profile = PROFILES[model];
    R.assert(profile, `Modelo OpenGD77 desconocido: ${model}.`);
    return Object.entries(CAT_FUNCTIONS).map(([key, item]) => {
      let reason = item.reason;
      if (key === "screen" && !profile.screen) reason = profile.note;
      if (key === "clock" && profile.family === "SERIAL") reason = profile.note;
      return { key, label: item.label, supported: !reason, reason: reason || "" };
    });
  }
  function screenBytes(screen) {
    return screen.format === "mono" ? 128 * Math.ceil(screen.height / 8) : screen.width * screen.height * 2;
  }
  function decodeScreen(raw, screen) {
    const { width, height, format } = screen;
    R.bytes(raw, screenBytes(screen));
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      let r, g, b;
      if (format === "mono") {
        r = g = b = (raw[(y >> 3) * 128 + x] >> (y & 7)) & 1 ? 0 : 255;
      } else {
        const pixel = raw[(y * width + x) * 2] << 8 | raw[(y * width + x) * 2 + 1];
        r = (pixel >> 11) * 255 / 31;
        g = (pixel >> 5 & 63) * 255 / 63;
        b = (pixel & 31) * 255 / 31;
        if (format === "bgr565") [r, b] = [b, r];
      }
      rgba.set([r, g, b, 255], (y * width + x) * 4);
    }
    return rgba;
  }
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
    async readMemory(mode, address, length, progress = () => {}, blockSize = mode === 9 ? 46 : this.blockSize) {
      const out = new Uint8Array(length);
      if (mode === 9) R.assert(address === 0 && length === 46, "RadioInfo requiere una unica solicitud de 46 bytes con direccion 0.");
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
    async readCodeplug(permit) {
      await R.verifyBackup(this, permit);
      return this.run("Leer codeplug", () => this.cps(() => this.readCodeplugRaw()));
    }
    capabilities() {
      R.assert(this.info, "Conecta primero la radio OpenGD77.");
      return capabilities(this.info.model);
    }
    // RAM display buffer only; no 'C' 0, so the radio keeps its normal screen (and the satellite menu) instead of CPS mode.
    async readScreen() {
      R.assert(this.info, "Conecta primero la radio OpenGD77.");
      const screen = PROFILES[this.info.model].screen;
      R.assert(screen, `${this.info.model}: pantalla en vivo no soportada. ${PROFILES[this.info.model].note}`);
      return this.run("Capturar pantalla", async () => {
        // usb_com.c clamps a reply to COM_REQUESTBUFFER_SIZE - 3 (1533 B on STM32); MK22 keeps the CPS block size.
        const raw = await this.readMemory(6, 0, screenBytes(screen), () => {}, this.family === "STM32" ? 512 : this.blockSize);
        return { ...screen, raw, rgba: decodeScreen(raw, screen) };
      });
    }
    async ping() {
      R.assert(this.info, "Conecta primero la radio OpenGD77.");
      return this.run("Estado OpenGD77", () => this.command(254));
    }
    // 'C' 6 7: uint32 seconds since 1970 (UTC) copied little-endian into uiDataGlobal.dateTimeSecs; clears predictions.
    async syncClock(date = new Date()) {
      R.assert(this.info && PROFILES[this.info.model].family !== "SERIAL", "Sincronizar reloj no soportado en este modelo.");
      const seconds = Math.floor(date.getTime() / 1000);
      R.assert(Number.isSafeInteger(seconds) && seconds > 0 && seconds < 2 ** 32, "Fecha fuera de rango.");
      const request = new Uint8Array(7);
      request.set([0x43, 6, 7]);
      R.view(request).setUint32(3, seconds, true);
      return this.run("Sincronizar reloj", async () => {
        await this.transport.write(request);
        const response = await this.transport.readExact(1);
        R.assert(response[0] === 0x2d, "Sincronizacion de reloj no confirmada.");
        return seconds;
      });
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
          scope: "RESPALDO PARCIAL: calibracion y codeplug guardados; firmware MCU original NO respaldado. Operaciones de radio bloqueadas: no se ha verificado un protocolo de lectura completa del firmware MCU para esta familia. No se sustituye por una imagen descargada."
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
  Object.assign(R, { GD77Connector, gd77Segments: segments, gd77Models: MODELS, gd77Capabilities: capabilities, gd77DecodeScreen: decodeScreen });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
