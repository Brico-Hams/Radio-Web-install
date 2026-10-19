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
      this.info = { family: this.family, model: this.model, firmware, hardwareConfirmed: false };
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
    async readFlashRaw(progress = () => {}) {
      const out = new Uint8Array(0x200000);
      for (let address = 0; address < out.length; address += 128) {
        const request = new Uint8Array(10);
        const v = R.view(request);
        v.setUint32(0, address, true);
        v.setUint16(4, 128, true);
        v.setUint32(6, this.timestamp, true);
        const data = await this.exchange(0x0738, request);
        R.assert(data.length === 135 && R.view(data).getUint32(0, true) === address &&
          R.view(data).getUint16(4, true) === 128 && data[6] === 0, `Lectura Flash rechazada en 0x${address.toString(16)}. Se requiere Labs con acceso Flash externa.`);
        out.set(data.subarray(7), address);
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
      const response = await this.exchange(type, data, type + 1, type === 0x0722 || type === 0x0728 ? 35000 : 5000);
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
      R.assert(image.length >= 256 && image.length <= 0x1d800, "Imagen fuera del limite de 118 KiB.");
      const v = R.view(image);
      const stack = v.getUint32(0, true);
      const reset = v.getUint32(4, true);
      R.assert(stack >= 0x20000000 && stack <= 0x20004000 && (stack & 3) === 0 &&
        (reset & 1) === 1 && reset >= 0x08002801 && reset < 0x08002800 + image.length, "Vectores de aplicacion PY32 no validos.");
      const content = new TextDecoder("ascii").decode(image);
      const version = content.match(/F4HWN[^\x00\r\n]{0,12}?v(6\.\d+\.\d+)(?![-\w.])/i);
      R.assert(version && !/dev|rolling/i.test(version[0]), "Solo se admiten imagenes F4HWN estables v6.x reconocibles. No stock, v5 ni desarrollo.");
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
        header.set(new TextEncoder().encode(`v${version[1]}`.slice(0, 15)), 32);
        await chunk(0, header);
        R.assert(await this.validateRaw(slot) === checksum, "CRC de la imagen escrita distinto al original.");
      });
    }
  }
  Object.assign(R, { QuanshengConnector, quanshengPacket: packet, decodeQuanshengPacket: decodePacket, quanshengBaseFromFlash: baseFromFlash, crc16 });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
