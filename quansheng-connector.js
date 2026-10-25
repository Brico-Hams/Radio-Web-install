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
  Object.assign(R, { QuanshengConnector, quanshengPacket: packet, decodeQuanshengPacket: decodePacket, quanshengBaseFromFlash: baseFromFlash, crc16, parseQuanshengApp: parseApp, QUANSHENG_APP_STATUS: APP_STATUS, inspectQuanshengSlotImage: inspectSlotImage });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
