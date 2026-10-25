(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const KEY = Uint8Array.of(0x16, 0x6c, 0x14, 0xe6, 0x2e, 0x91, 0x0d, 0x40, 0x21, 0x35, 0xd5, 0x40, 0x13, 0x03, 0xe9, 0x80);
  function crc16(data) {
    let crc = 0;
    for (const b of data) {
      crc ^= b << 8;
      for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff;
    }
    return crc;
  }
  function packet(type, data) {
    const size = (data.length + 5) & ~1;
    const out = new Uint8Array(size + 8);
    const v = R.view(out);
    v.setUint16(0, 0xcdab, true);
    v.setUint16(2, size, true);
    v.setUint16(4, type, true);
    v.setUint16(6, data.length, true);
    out.set(data, 8);
    v.setUint16(4 + size, crc16(out.subarray(4, 4 + size)), true);
    for (let i = 0; i < size + 2; i++) out[4 + i] ^= KEY[i % 16];
    v.setUint16(6 + size, 0xbadc, true);
    return out;
  }
  function decodePacket(frame) {
    R.assert(frame.length >= 12, "Trama UART demasiado corta.");
    const size = R.view(frame).getUint16(2, true);
    R.assert(frame.length === size + 8 && frame[0] === 0xab && frame[1] === 0xcd &&
      frame.at(-2) === 0xdc && frame.at(-1) === 0xba, "Trama UART corrupta.");
    const body = frame.slice(4, -2);
    for (let i = 0; i < body.length; i++) body[i] ^= KEY[i % 16];
    const length = R.view(body).getUint16(2, true);
    R.assert(length <= size - 4, "Longitud UART invalida.");
    // Host replies use 0xffff instead of a calculated CRC in this firmware.
    const crc = R.view(body).getUint16(size, true);
    R.assert(crc === 0xffff || crc === crc16(body.subarray(0, size)), "CRC UART incorrecto.");
    return { type: R.view(body).getUint16(0, true), data: body.slice(4, 4 + length) };
  }
  function slotHeader(data) {
    R.bytes(data, 64);
    const v = R.view(data);
    return {
      magic: v.getUint32(0, true), version: v.getUint16(4, true), flags: v.getUint16(6, true),
      size: v.getUint32(8, true), crc: v.getUint32(12, true),
      name: R.text(data.subarray(16, 32)), firmware: R.text(data.subarray(32, 48))
    };
  }
  function baseFromFlash(flash) {
    R.bytes(flash, 0x200000);
    const header = slotHeader(flash.slice(0x20000, 0x20040));
    R.assert(header.magic === 0x31424d46 && header.version === 1 && (header.flags & 1), "Main no inicializado o cabecera no compatible. No hay copia de firmware base valida.");
    R.assert(header.size > 0 && header.size <= 0x1d800, "Tamano de Main invalido.");
    const image = flash.slice(0x21000, 0x21000 + header.size);
    R.assert(R.crc32(image) === header.crc, "El CRC del firmware base Main no coincide.");
    return { header, image };
  }
  function inspectSlotImage(image, fileName = "") {
    R.bytes(image);
    R.assert(image.length >= 256 && image.length <= 0x1d800, "Imagen fuera del limite de 118 KiB.");
    R.assert(!fileName || (/\.bin$/i.test(fileName) && !/packed|sa818|beta|development|rolling/i.test(fileName)),
      "Variante local no admitida para slots: packed, SA818, beta o desarrollo.");
    const v = R.view(image);
    const stack = v.getUint32(0, true);
    const reset = v.getUint32(4, true);
    R.assert(stack >= 0x20000000 && stack <= 0x20004000 && (stack & 3) === 0 &&
      (reset & 1) === 1 && reset >= 0x08002801 && reset < 0x08002800 + image.length,
    "Vectores de aplicacion PY32 no validos. No uses firmware UV-K5 V1 en V3/UV-K1.");
    const content = new TextDecoder("ascii").decode(image);
    const version = content.match(/F4HWN[^\x00\r\n]{0,12}?v(6\.\d+\.\d+)(?![-\w.])/i);
    R.assert(version && !/dev|rolling/i.test(version[0]),
      "Solo se admiten imagenes F4HWN estables v6.x reconocibles. No Karina V1, stock, v5 ni desarrollo.");
    return { version: version[1], size: image.length };
  }
  // F4HWN Labs overlay apps (App/apps/app_overlay.h): a .app file is the 64-byte FAP1 header,
  // the code (written at slot+0x1000) and optional read-only assets (written at slot+0x100).
  const APP = Object.freeze({ magic: 0x31504146, base: 0x102000, stride: 0x2000, codeOffset: 0x1000, assetOffset: 0x100, codeMax: 0x1000, assetMax: 0xf00 });
  const APP_STATUS = ["Valida", "Hueco fuera de rango", "Vacio", "ABI/API incompatible con este firmware", "Incompleta",
    "Tamano invalido", "CRC invalido", "VMA incorrecta", "Autorizacion rechazada", "Falta una capacidad del firmware"];
  function inspectSpectrumPresets(input) {
    const bytes = R.bytes(input, 208);
    const view = R.view(bytes);
    R.assert(R.text(bytes.subarray(0, 4)) === "BHSP" && bytes[4] === 1 &&
      view.getUint32(204, true) === R.crc32(bytes.subarray(0, 204)), "Archivo BHSP v1 invalido o CRC incorrecto.");
    R.assert(bytes[5] >= 1 && bytes[5] <= 8 && bytes[6] < bytes[5] &&
      bytes.subarray(7, 12).every(value => value === 0), "Cabecera BHSP no compatible.");
    const entries = [];
    for (let index = 0; index < 8; index++) {
      const offset = 12 + index * 24;
      const record = bytes.subarray(offset, offset + 24);
      if (index >= bytes[5]) {
        R.assert(record.every(value => value === 0), "Registros BHSP no usados deben estar vacios.");
        continue;
      }
      const nameBytes = record.subarray(0, 8);
      const end = nameBytes.indexOf(0);
      const name = end < 0 ? nameBytes : nameBytes.subarray(0, end);
      R.assert(name.length > 0 && name.every(value => value >= 32 && value <= 126) &&
        (end < 0 || nameBytes.subarray(end).every(value => value === 0)) &&
        record.subarray(21).every(value => value === 0), "Nombre/reservados BHSP invalidos.");
      const first10Hz = view.getUint32(offset + 8, true);
      const step10Hz = view.getUint32(offset + 12, true);
      const last10Hz = first10Hz + 127 * step10Hz;
      R.assert(view.getUint16(offset + 16, true) === 128 && view.getUint16(offset + 18, true) === 20 &&
        [125, 250, 625, 1250].includes(step10Hz) && [1, 2, 4, 8].includes(record[20]) &&
        ((first10Hz >= 13600000 && last10Hz <= 17400000) ||
        (first10Hz >= 40000000 && last10Hz <= 47000000)), "Preset BHSP no admitido por Espectro (banda, paso, 128 puntos, 20 ms o promedio).");
      entries.push({ name: R.text(name), first10Hz, step10Hz, samples: record[20] });
    }
    return { selected: bytes[6], entries };
  }
  function appHeader(data) {
    R.bytes(data, 64);
    const v = R.view(data);
    return {
      magic: v.getUint32(0, true), version: v.getUint16(4, true), abi: data[6], apiMin: data[7],
      codeSize: v.getUint32(8, true), codeCRC: v.getUint32(12, true), flags: v.getUint16(18, true),
      name: R.text(data.subarray(20, 36)), appVersion: R.text(data.subarray(36, 52)),
      linkVMA: v.getUint32(52, true), assetSize: v.getUint16(60, true), assetCRC: v.getUint16(62, true)
    };
  }
  function parseApp(bytes) {
    bytes = R.bytes(bytes);
    R.assert(bytes.length > 64, "Archivo .app demasiado corto.");
    const header = appHeader(bytes.subarray(0, 64));
    R.assert(header.magic === APP.magic && header.version === 1, "No es una app F4HWN (cabecera FAP1).");
    R.assert(header.flags & 1, "La app no esta marcada como completa.");
    R.assert(header.codeSize > 0 && header.codeSize <= APP.codeMax, "Codigo de la app fuera del limite de 4 KiB.");
    R.assert(header.assetSize <= APP.assetMax && bytes.length === 64 + header.codeSize + header.assetSize,
      "El tamano del archivo no coincide con la cabecera de la app.");
    const code = bytes.slice(64, 64 + header.codeSize);
    const assets = bytes.slice(64 + header.codeSize);
    R.assert(R.crc32(code) === header.codeCRC, "CRC del codigo de la app incorrecto: archivo danado.");
    R.assert(!assets.length || (R.crc32(assets) & 0xffff) === header.assetCRC, "CRC de los assets de la app incorrecto: archivo danado.");
    R.assert(/^[\x20-\x7e]+$/.test(header.name), "Nombre de app no valido.");
    return { header, headerBytes: bytes.slice(0, 64), code, assets };
  }
  class QuanshengConnector extends R.Connector {
    constructor(transport = new R.SerialTransport()) {
      super(transport);
      this.family = "quansheng";
      this.catSequence = 0;
    }
    async connect(model) {
      R.assert(["UV-K1", "UV-K5-V3"].includes(model), "Modelo Quansheng no compatible.");
      await this.transport.open(38400);
      this.connected = true;
      return this.run("Identificacion F4HWN", async () => {
        this.model = model;
        await this.identify();
        return this.info;
      });
    }
    async exchange(type, data, expected = type + 1, timeout = 4000) {
      await this.transport.write(packet(type, data));
      const deadline = Date.now() + timeout;
      let previous = 0;
      while (Date.now() < deadline) {
        const byte = (await this.transport.readExact(1, Math.max(1, deadline - Date.now())))[0];
        if (previous !== 0xab || byte !== 0xcd) { previous = byte; continue; }
        const length = await this.transport.readExact(2, Math.max(1, deadline - Date.now()));
        const size = R.view(length).getUint16(0, true);
        R.assert(size >= 4 && size <= 512, "Longitud de paquete F4HWN fuera de rango.");
        const rest = await this.transport.readExact(size + 4, Math.max(1, deadline - Date.now()));
        const frame = new Uint8Array(size + 8);
        frame.set([0xab, 0xcd, ...length]);
        frame.set(rest, 4);
        const response = decodePacket(frame);
        if (response.type === expected) return response.data;
        previous = 0;
      }
      throw new Error(`No se recibio respuesta 0x${expected.toString(16)}.`);
    }
    async identify() {
      this.timestamp = Date.now() >>> 0;
      const data = new Uint8Array(4);
      R.view(data).setUint32(0, this.timestamp, true);
      const response = await this.exchange(0x0514, data);
      R.assert(response.length >= 16, "Respuesta de identificacion incompleta.");
      const firmware = R.text(response.subarray(0, 16));
      const match = firmware.match(/F4HWN.*v(\d+)(?:\.(\d+))?/i);
      R.assert(match && Number(match[1]) >= 6, `Firmware no compatible: ${firmware}. Se requiere F4HWN v6+.`);
      this.info = { family: this.family, model: this.model, firmware, hardwareConfirmed: false,
        legacyReadOnly: Number(match[1]) === 6 && Number(match[2] || 0) === 0 };
    }
    async catExchange(operation, frequency10Hz = 0) {
      const sequence = this.catSequence = (this.catSequence + 1) & 0xffff;
      const request = new Uint8Array(8);
      request[0] = 1;
      request[1] = operation;
      R.view(request).setUint16(2, sequence, true);
      R.view(request).setUint32(4, frequency10Hz, true);
      const response = await this.exchange(0x7b00, request, 0x7b01, 1000);
      R.assert(response.length === 16 && response[0] === 1 &&
        R.view(response).getUint16(2, true) === sequence, "Respuesta CAT Bricohams invalida o fuera de secuencia.");
      const statuses = ["OK", "En cola", "Longitud/campos invalidos", "Version no admitida",
        "Operacion no admitida", "Entra primero en SAT RX y habilita CAT con 8", "Frecuencia fuera de banda RX"];
      const status = response[1];
      R.assert(status === (operation === 0 ? 0 : 1),
        `CAT rechazado: ${statuses[status] || `estado desconocido ${status}`}.`);
      const capabilities = R.view(response).getUint32(4, true);
      const appliedFrequency10Hz = R.view(response).getUint32(8, true);
      const flags = R.view(response).getUint32(12, true);
      R.assert(capabilities === 7 && flags <= 7, "Capacidades/estado CAT v1 no reconocidos.");
      const active = Boolean(flags & 1);
      R.assert(active ? ((appliedFrequency10Hz >= 13600000 && appliedFrequency10Hz <= 17400000) ||
        (appliedFrequency10Hz >= 40000000 && appliedFrequency10Hz <= 47000000)) :
        appliedFrequency10Hz === 0 && flags === 0, "Frecuencia/estado CAT incoherentes.");
      return { version: 1, capabilities, active, remote: Boolean(flags & 2),
        pending: Boolean(flags & 4), appliedFrequency10Hz, leaseMilliseconds: 3000 };
    }
    getCatStatus() {
      return this.run("Consultar CAT RX Bricohams Beta", () => this.catExchange(0));
    }
    setCatReceive(frequency10Hz) {
      R.assert(Number.isInteger(frequency10Hz) &&
        ((frequency10Hz >= 13600000 && frequency10Hz <= 17400000) ||
        (frequency10Hz >= 40000000 && frequency10Hz <= 47000000)), "Frecuencia CAT RX fuera de banda o resolucion de 10 Hz.");
      return this.run("Sintonizar CAT RX Bricohams Beta", () => this.catChange(1, frequency10Hz));
    }
    stopCatReceive() {
      return this.run("Detener CAT RX Bricohams Beta", () => this.catChange(2, 0));
    }
    async catChange(operation, frequency10Hz) {
      R.assert((await this.catExchange(0)).active, "Entra primero en SAT RX del firmware Bricohams compatible y habilita CAT con 8.");
      await this.catExchange(operation, frequency10Hz);
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 75));
        const state = await this.catExchange(0);
        R.assert(state.active, "Se ha salido de SAT RX durante el cambio CAT.");
        if (state.pending) continue;
        R.assert(operation === 1 ? state.remote && state.appliedFrequency10Hz === frequency10Hz : !state.remote,
          "El receptor no confirma el cambio CAT solicitado.");
        return state;
      }
      throw new Error("El cambio CAT sigue pendiente; no se considera aplicado.");
    }
    async spectrumPresetExchange(operation, token, chunk = new Uint8Array()) {
      const request = new Uint8Array(6 + chunk.length);
      request[0] = 1;
      request[1] = operation;
      R.view(request).setUint32(2, token, true);
      request.set(chunk, 6);
      const result = await this.exchange(0x7b10, request, 0x7b11, 1500);
      R.assert(result.length >= 6 && result[0] === 1 && R.view(result).getUint32(2, true) === token,
        "Respuesta de presets Bricohams invalida o de otra transferencia.");
      const errors = ["OK", "Reservado", "Solicitud invalida", "Pausa Espectro con 4, sin captura/multipreset ni bloqueo",
        "No hay presets validos para exportar", "Transferencia caducada, interrumpida o fuera de orden",
        "Archivo BHSP corrupto", "Preset no admitido por esta imagen"];
      R.assert(result[1] === 0, `Presets rechazados: ${errors[result[1]] || `error ${result[1]}`}.`);
      R.assert(result.length === (operation <= 1 ? 110 : 6), "Longitud de respuesta de presets incorrecta.");
      return result.subarray(6);
    }
    presetTransferToken() {
      const token = new Uint32Array(1);
      do { root.crypto.getRandomValues(token); } while (token[0] === 0);
      return token[0];
    }
    async readSpectrumPresetsRaw() {
      const token = this.presetTransferToken();
      const first = await this.spectrumPresetExchange(0, token);
      const second = await this.spectrumPresetExchange(1, token);
      const bytes = new Uint8Array(208);
      bytes.set(first);
      bytes.set(second, 104);
      inspectSpectrumPresets(bytes);
      return bytes;
    }
    readArdfStatistics() {
      return this.run("Leer estadisticas ARDF Bricohams", async () => {
        const sequence = this.catSequence = (this.catSequence + 1) & 0xffff;
        const request = new Uint8Array(4);
        request[0] = 1;
        R.view(request).setUint16(2, sequence, true);
        const bytes = await this.exchange(0x7b20, request, 0x7b21, 1500);
        R.assert(bytes.length === 140 && bytes[0] === 1 && R.view(bytes).getUint16(4, true) === sequence,
          "Respuesta de estadisticas ARDF invalida o fuera de secuencia.");
        R.assert(bytes[1] === 0, bytes[1] === 3 ? "Entra al menos una vez en ARDF para iniciar una sesion." : `Estadisticas ARDF rechazadas: ${bytes[1]}.`);
        const view = R.view(bytes);
        const flags = bytes[2];
        const foxCount = bytes[3];
        const session = view.getUint32(8, true);
        const durationMilliseconds = view.getUint32(12, true);
        const elapsedMilliseconds = view.getUint32(16, true);
        R.assert(flags <= 15 && foxCount <= 10 && view.getUint16(6, true) === 0 && session > 0 &&
          durationMilliseconds >= 15000 && durationMilliseconds <= 120000 && durationMilliseconds % 15000 === 0 &&
          (!(flags & 2) || foxCount > 0), "Cabecera de estadisticas ARDF incoherente.");
        const observations = [];
        for (let index = 0; index < 10; index++) {
          const offset = 20 + index * 12;
          const count = view.getUint16(offset, true);
          const gainIndex = bytes[offset + 2];
          const valid = bytes[offset + 3];
          const firstMilliseconds = view.getUint32(offset + 4, true);
          const lastMilliseconds = view.getUint32(offset + 8, true);
          R.assert(count ? index < foxCount && valid === 1 && gainIndex <= 5 &&
            firstMilliseconds <= lastMilliseconds && lastMilliseconds <= elapsedMilliseconds :
            valid === 0 && gainIndex === 0 && firstMilliseconds === 0 && lastMilliseconds === 0,
          "Registro de observaciones ARDF incoherente.");
          if (count) observations.push({ fox: index + 1, count, gainIndex, firstMilliseconds, lastMilliseconds });
        }
        return { format: "bricohams-ardf-statistics", version: 1, session,
          connectionSession: this.session, receivedAt: new Date().toISOString(),
          active: Boolean(flags & 1), synchronized: Boolean(flags & 2), firmwareError: Boolean(flags & 4),
          countsSaturated: Boolean(flags & 8), foxCount, durationMilliseconds, elapsedMilliseconds, observations,
          warning: "Manual observations, not beacon detections or locations. Gain index is not dB. Relative radio times, not GPS/UTC. RAM only." };
      });
    }
    readSpectrumPresets() {
      return this.run("Exportar presets RAM Bricohams", () => this.readSpectrumPresetsRaw());
    }
    writeSpectrumPresets(input) {
      const bytes = R.bytes(input, 208).slice();
      inspectSpectrumPresets(bytes);
      return this.run("Importar presets RAM Bricohams", async () => {
        const token = this.presetTransferToken();
        await this.spectrumPresetExchange(2, token, bytes.subarray(0, 104));
        await this.spectrumPresetExchange(3, token, bytes.subarray(104));
        await this.spectrumPresetExchange(4, token);
        const checked = await this.readSpectrumPresetsRaw();
        R.assert(R.equal(checked, bytes), "Los presets RAM releidos no coinciden con el archivo. Importacion no verificada.");
        return inspectSpectrumPresets(checked);
      });
    }
    async readConfigurationRaw() {
      R.assert(/^F4HWN.*v6\./i.test(this.info?.firmware || ""), "La gestion de canales Beta solo admite F4HWN v6.x.");
      const out = new Uint8Array(0xa180);
      for (let offset = 0; offset < out.length; offset += 128) {
        const length = Math.min(128, out.length - offset);
        const request = new Uint8Array(8);
        R.view(request).setUint16(0, offset, true);
        request[2] = length;
        R.view(request).setUint32(4, this.timestamp, true);
        const data = await this.exchange(0x051b, request);
        R.assert(data.length === length + 4 && R.view(data).getUint16(0, true) === offset &&
          data[2] === length, `Respuesta de configuracion incorrecta en 0x${offset.toString(16)}.`);
        out.set(data.subarray(4), offset);
        this.progress((offset + length) / out.length, "Leyendo configuracion Quansheng");
      }
      return out;
    }
    readConfiguration() {
      return this.run("Leer canales Quansheng", () => this.readConfigurationRaw());
    }
    async writeConfiguration(image, original, permit) {
      R.assertBackup(this, permit);
      image = R.bytes(image, 0xa180).slice();
      original = R.bytes(original, 0xa180).slice();
      await R.verifyBackup(this, permit);
      return this.run("Escribir canales Quansheng Beta", async () => {
        R.assert(R.equal(image.subarray(0x8800), original.subarray(0x8800)),
          "Solo se pueden modificar memorias, nombres y atributos; VFO y ajustes estan protegidos.");
        R.assert(R.equal(await this.readConfigurationRaw(), original),
          "La configuracion de la radio ha cambiado. Vuelve a leer antes de escribir.");
        const attributes = new Map();
        for (let channel = 0; channel < 1024; channel++) {
          const record = channel * 16;
          const name = 0x4000 + record;
          const attr = 0x8000 + channel * 2;
          if (R.equal(image.subarray(record, record + 16), original.subarray(record, record + 16)) &&
            R.equal(image.subarray(name, name + 16), original.subarray(name, name + 16)) &&
            R.equal(image.subarray(attr, attr + 2), original.subarray(attr, attr + 2))) continue;
          const block = attr & ~7;
          if (!attributes.has(block)) attributes.set(block, original.slice(block, block + 8));
          attributes.get(block)[attr - block] |= 7;
        }
        // Hide affected memories until their records and names are persisted.
        const writes = [];
        for (const [offset, bytes] of attributes) {
          if (!R.equal(bytes, original.subarray(offset, offset + 8))) writes.push({ offset, bytes });
        }
        for (let offset = 0; offset < 0x8000; offset += 8) {
          if (!R.equal(image.subarray(offset, offset + 8), original.subarray(offset, offset + 8))) {
            writes.push({ offset, bytes: image.slice(offset, offset + 8) });
          }
        }
        for (const [offset, bytes] of attributes) {
          if (!R.equal(bytes, image.subarray(offset, offset + 8))) writes.push({ offset, bytes: image.slice(offset, offset + 8) });
        }
        for (const [index, { offset, bytes }] of writes.entries()) {
          const request = new Uint8Array(16);
          R.view(request).setUint16(0, offset, true);
          request[2] = 8;
          R.view(request).setUint32(4, this.timestamp, true);
          request.set(bytes, 8);
          const response = await this.exchange(0x051d, request);
          R.assert(response.length === 2 && R.view(response).getUint16(0, true) === offset,
            `Escritura Quansheng rechazada en 0x${offset.toString(16)}.`);
          this.progress((index + 1) / writes.length, "Escribiendo memorias Quansheng Beta");
        }
        R.assert(R.equal(await this.readConfigurationRaw(), image),
          "La relectura Quansheng no coincide. Escritura parcial o rechazada; conserva el respaldo y no continues.");
        return writes.length;
      });
    }
    async readCalibrationRaw() {
      const out = new Uint8Array(512);
      for (let offset = 0; offset < out.length; offset += 16) {
        const request = new Uint8Array(8);
        const v = R.view(request);
        v.setUint16(0, 0xb000 + offset, true);
        v.setUint16(2, 16, true);
        v.setUint32(4, this.timestamp, true);
        const data = await this.exchange(0x051b, request);
        R.assert(data.length === 20 && R.view(data).getUint16(0, true) === 0xb000 + offset && data[2] === 16, "Respuesta de calibracion incorrecta.");
        out.set(data.subarray(4), offset);
        this.progress((offset + 16) / 512, "Leyendo calibracion");
      }
      return out;
    }
    readCalibration() {
      return this.run("Leer calibracion", () => this.readCalibrationRaw());
    }
    async readFlashBlockRaw(address, length) {
      R.assert(Number.isInteger(address) && address >= 0 && Number.isInteger(length) &&
        length > 0 && length <= 128 && address + length <= 0x200000, "Rango de lectura Flash invalido.");
      const request = new Uint8Array(10);
      const v = R.view(request);
      v.setUint32(0, address, true);
      v.setUint16(4, length, true);
      v.setUint32(6, this.timestamp, true);
      const data = await this.exchange(0x0738, request);
      R.assert(data.length === length + 7 && R.view(data).getUint32(0, true) === address &&
        R.view(data).getUint16(4, true) === length && data[6] === 0,
      `Lectura Flash rechazada en 0x${address.toString(16)}. Se requiere Labs con acceso Flash externa.`);
      return data.slice(7);
    }
    async readFlashRaw(progress = () => {}) {
      const out = new Uint8Array(0x200000);
      for (let address = 0; address < out.length; address += 128) {
        out.set(await this.readFlashBlockRaw(address, 128), address);
        progress((address + 128) / out.length);
      }
      return out;
    }
    async verifyFlashRaw(flash) {
      const request = new Uint8Array(12);
      const v = R.view(request);
      v.setUint32(0, 0, true);
      v.setUint32(4, flash.length, true);
      v.setUint32(8, this.timestamp, true);
      this.progress(1, "Verificando CRC-32 de toda la Flash en la radio");
      const response = await this.exchange(0x073e, request, 0x073f, 30000);
      R.assert(response.length === 13 && R.view(response).getUint32(0, true) === 0 &&
        R.view(response).getUint32(4, true) === flash.length && response[12] === 0,
      "La radio no pudo verificar toda la Flash. Se requiere Labs con CRC de lectura fisica.");
      const checksum = R.view(response).getUint32(8, true);
      R.assert(checksum === R.crc32(flash), "El CRC de la Flash leida no coincide con la radio. No se habilitara escritura.");
      return checksum;
    }
    async backup(emit) {
      return this.run("Respaldo automatico", async () => {
        await this.identify();
        const calibration = await this.readCalibrationRaw();
        await emit("calibration", calibration, { address: 0xb000, contains: "Calibracion especifica de esta unidad" });
        if (this.info.legacyReadOnly) {
          const configuration = await this.readConfigurationRaw();
          await emit("configuration", configuration, { address: 0, contains: "Configuracion logica del banco activo; NO es una copia de toda la Flash" });
          return { complete: false, scope: "Solo lectura: F4HWN v6.0 no admite el respaldo Flash completo requerido. Calibracion y configuracion guardadas; escritura bloqueada. Se requiere Labs v6.1+ con acceso Flash externa y CRC." };
        }
        this.progress(0, "Flash externa 2 MiB: puede tardar 10-20 minutos a 38400 baudios. No desconectes.");
        const flash = await this.readFlashRaw(value => this.progress(value, "Leyendo Flash externa completa (2 MiB)"));
        const verifiedCRC32 = await this.verifyFlashRaw(flash);
        await emit("external-flash", flash, { address: 0, verifiedCRC32, contains: "Flash externa completa, configuraciones, Main, slots, apps y logs" });
        R.assert(R.equal(calibration, flash.subarray(0x10000, 0x10200)), "La calibracion no coincide con la Flash fisica. Respaldo bloqueado.");
        const { image, header } = baseFromFlash(flash);
        await emit("base-firmware", image, { address: 0x08002800, contains: "Aplicacion Main completa; NO incluye bootloader interno", header });
        return { complete: true, scope: "Calibracion + Flash externa 2 MiB + aplicacion Main validada por CRC. Bootloader interno no accesible." };
      });
    }
    async infoRaw(slot) {
      R.assert(Number.isInteger(slot) && slot >= 0 && slot <= 4, "Slot invalido.");
      const data = await this.exchange(0x0720, Uint8Array.of(slot));
      R.assert(data.length === 66 && data[0] === slot, "Respuesta de slot incorrecta.");
      return { slot, status: data[1], ...slotHeader(data.slice(2)) };
    }
    listSlots() {
      return this.run("Consultar slots", async () => {
        const slots = [];
        for (let slot = 0; slot <= 4; slot++) slots.push(await this.infoRaw(slot));
        return slots;
      });
    }
    async validateRaw(slot) {
      const data = await this.exchange(0x0726, Uint8Array.of(slot), 0x0727, 25000);
      R.assert(data.length === 6 && data[4] === slot && data[5] === 0, `Slot ${slot}: verificacion rechazada (estado ${data[5]}).`);
      return R.view(data).getUint32(0, true);
    }
    validateSlot(slot) {
      return this.run("Verificar CRC del slot", () => this.validateRaw(slot));
    }
    async slotMutation(type, slot, data) {
      const response = await this.exchange(type, data, type + 1, [0x0722, 0x0728, 0x0732].includes(type) ? 35000 : 5000);
      R.assert(response.length === 2 && response[0] === slot && response[1] === 0, `Operacion de slot rechazada: ${response[1]}.`);
    }
    authSlot(slot) {
      R.assert(Number.isInteger(slot) && slot >= 1 && slot <= 4, "Main esta protegido: solo se pueden modificar slots 1-4.");
      const data = new Uint8Array(6);
      data[0] = slot;
      R.view(data).setUint32(2, this.timestamp, true);
      return data;
    }
    async eraseSlot(slot, permit) {
      R.assertBackup(this, permit);
      const data = this.authSlot(slot);
      await R.verifyBackup(this, permit);
      return this.run("Borrar firmware de slot", () => this.slotMutation(0x0722, slot, data));
    }
    async resetBank(slot, permit) {
      R.assertBackup(this, permit);
      const data = this.authSlot(slot);
      await R.verifyBackup(this, permit);
      return this.run("Restablecer banco de configuracion", () => this.slotMutation(0x0728, slot, data));
    }
    async writeSlot(slot, image, name, permit) {
      R.assertBackup(this, permit);
      this.authSlot(slot);
      image = R.bytes(image).slice();
      const { version } = inspectSlotImage(image);
      R.assert(/^[\x20-\x7e]{1,15}$/.test(name), "Nombre de slot: 1-15 caracteres ASCII.");
      await R.verifyBackup(this, permit);
      return this.run("Instalar firmware en slot", async () => {
        const checksum = R.crc32(image);
        await this.slotMutation(0x0722, slot, this.authSlot(slot));
        const chunk = async (offset, source) => {
          const data = new Uint8Array(12 + source.length);
          data[0] = slot;
          const dv = R.view(data);
          dv.setUint32(2, offset, true);
          dv.setUint16(6, source.length, true);
          dv.setUint32(8, this.timestamp, true);
          data.set(source, 12);
          await this.slotMutation(0x0724, slot, data);
        };
        for (let position = 0; position < image.length; position += 128) {
          await chunk(0x1000 + position, image.subarray(position, position + 128));
          this.progress((position + Math.min(128, image.length - position)) / image.length, "Escribiendo imagen externa");
        }
        const header = new Uint8Array(64);
        const hv = R.view(header);
        hv.setUint32(0, 0x31424d46, true);
        hv.setUint16(4, 1, true);
        hv.setUint16(6, 1, true);
        hv.setUint32(8, image.length, true);
        hv.setUint32(12, checksum, true);
        header.set(new TextEncoder().encode(name), 16);
        header.set(new TextEncoder().encode(`v${version}`.slice(0, 15)), 32);
        await chunk(0, header);
        R.assert(await this.validateRaw(slot) === checksum, "CRC de la imagen escrita distinto al original.");
      });
    }
    async appInfoRaw(slot) {
      const data = await this.exchange(0x0730, Uint8Array.of(slot), 0x0731, 3000);
      R.assert(data.length === 66 && data[0] === slot, "Respuesta de hueco de app incorrecta.");
      return { slot, status: data[1], statusText: APP_STATUS[data[1]] || `Error ${data[1]}`, ...appHeader(data.slice(2)) };
    }
    listApps() {
      return this.run("Consultar apps", async () => {
        const apps = [];
        // Labs v6.0-6.2 has 16 app slots and v6.3 has 48: probe until the firmware says "out of range".
        for (let slot = 0; slot < 64; slot++) {
          let info;
          try { info = await this.appInfoRaw(slot); }
          catch (error) { R.assert(slot > 0, "Este firmware no admite apps: arranca la edicion Labs."); throw error; }
          if (info.status === 1) break;
          apps.push(info);
        }
        return apps;
      });
    }
    authApp(slot) {
      R.assert(Number.isInteger(slot) && slot >= 0 && slot < 64, "Hueco de app invalido.");
      const data = new Uint8Array(6);
      data[0] = slot;
      R.view(data).setUint32(2, this.timestamp, true);
      return data;
    }
    async deleteApp(slot, permit) {
      R.assertBackup(this, permit);
      const data = this.authApp(slot);
      await R.verifyBackup(this, permit);
      return this.run("Borrar app", () => this.slotMutation(0x0732, slot, data));
    }
    async installApp(slot, bytes, permit) {
      R.assertBackup(this, permit);
      const app = parseApp(bytes);
      this.authApp(slot);
      await R.verifyBackup(this, permit);
      return this.run(`Instalar app ${app.header.name}`, async () => {
        await this.slotMutation(0x0732, slot, this.authApp(slot));
        const total = app.code.length + app.assets.length;
        let done = 0;
        const write = async (offset, source) => {
          const data = new Uint8Array(12 + source.length);
          data[0] = slot;
          const dv = R.view(data);
          dv.setUint32(2, offset, true);
          dv.setUint16(6, source.length, true);
          dv.setUint32(8, this.timestamp, true);
          data.set(source, 12);
          await this.slotMutation(0x0734, slot, data);
          const saved = await this.readFlashBlockRaw(APP.base + slot * APP.stride + offset, source.length);
          R.assert(R.equal(saved, source), `La app escrita difiere del archivo en 0x${offset.toString(16)}.`);
        };
        for (const [part, base] of [[app.code, APP.codeOffset], [app.assets, APP.assetOffset]]) {
          for (let position = 0; position < part.length; position += 128) {
            const chunk = part.subarray(position, position + 128);
            await write(base + position, chunk);
            done += chunk.length;
            this.progress(done / total, "Escribiendo app");
          }
        }
        // Header last: it carries the "complete" flag, so an interrupted install never validates.
        await write(0, app.headerBytes);
        const data = await this.exchange(0x0736, Uint8Array.of(slot), 0x0737, 20000);
        R.assert(data.length === 2 && data[0] === slot, "Respuesta de verificacion de app incorrecta.");
        R.assert([0, 3, 9].includes(data[1]), `La app no se verifico: ${APP_STATUS[data[1]] || data[1]}.`);
        return { ...app.header, status: data[1], statusText: APP_STATUS[data[1]] };
      });
    }
  }
  Object.assign(R, { QuanshengConnector, inspectSpectrumPresets, quanshengPacket: packet, decodeQuanshengPacket: decodePacket, quanshengBaseFromFlash: baseFromFlash, crc16, parseQuanshengApp: parseApp, QUANSHENG_APP_STATUS: APP_STATUS, inspectQuanshengSlotImage: inspectSlotImage });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
