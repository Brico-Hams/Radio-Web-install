// Quansheng TK-11: settings, channels and full-memory backup/restore. No firmware flashing.
// Framing, command IDs and memory layout follow CHIRP's chirp/drivers/tk11.py (GPL-3.0-or-later,
// Dan Smith 2012, Thibaut Berg 2025); see ACKNOWLEDGEMENTS.md. This file is an independent implementation.
(function (root) {
  const R = root.RadioWorkspace = root.RadioWorkspace || {};
  const KEY = Uint8Array.of(0x16, 0x6C, 0x14, 0xE6, 0x2E, 0x91, 0x0D, 0x40, 0x21, 0x35, 0xD5, 0x40, 0x13, 0x03, 0xE9, 0x80);
  const MAGIC = 5;
  const BASE = 0x080000;
  const MEMORY_SIZE = 0x23000;
  const CHUNK = 0x200;
  const CHANNELS = 999;
  const CHANNEL_SIZE = 64;
  const CMD = { connect: 0x01F4, connected: 0x01F5, read: 0x01FB, readData: 0x01FC, write: 0x01FD, written: 0x01FE, reboot: 0x05DD };
  const OFFSETS = { channels: 0x00000, usage: 0x11000, fm: 0x12000, general: 0x13000, general2: 0x14000, index: 0x15000,
    scanLists: 0x16000, dtmfContacts: 0x1A000, tone5Contacts: 0x1A800, noaaAddresses: 0x22000, noaaEvents: 0x22280 };
  // Only structures confirmed by the CHIRP driver are writable. Gaps, unknown areas and anything that may hold
  // calibration are never written; the radio keeps its own bytes there.
  const WRITABLE = Object.freeze([
    ["channels", OFFSETS.channels, CHANNELS * CHANNEL_SIZE],
    ["usage", OFFSETS.usage, 1011],
    ["fm", OFFSETS.fm, 0x48],
    ["general", OFFSETS.general, 0xF8],
    ["general2", OFFSETS.general2, 0x70],
    ["index", OFFSETS.index, 16],
    ["scan-lists", OFFSETS.scanLists, 32 * 0x80],
    ["dtmf-contacts", OFFSETS.dtmfContacts, 16 * 24],
    ["tone5-contacts", OFFSETS.tone5Contacts, 16 * 24],
    ["noaa-addresses", OFFSETS.noaaAddresses, 16 * 40],
    ["noaa-events", OFFSETS.noaaEvents, 128]
  ].map(([name, start, length]) => Object.freeze({ name, start, end: start + length })));
  const USAGE_RANGES_HZ = [[150000, 1800000], [1800000, 18000000], [18000000, 32000000], [32000000, 76000000],
    [108000000, 136000000], [136000000, 174000000], [174000000, 350000000], [350000000, 400000000],
    [400000000, 470000000], [470000000, 580000000], [580000000, 760000000], [760000000, 1000000000], [1000000000, 1160000000]];
  const MIN_HZ = 150000;
  const MAX_HZ = 1160000000;

  function crc16(data) {
    let crc = 0;
    for (const byte of data) {
      crc ^= byte << 8;
      for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? (crc << 1 ^ 0x1021) & 0xFFFF : crc << 1 & 0xFFFF;
    }
    return crc;
  }
  function frame(payload) {
    const body = new Uint8Array(payload.length + 2);
    body.set(payload);
    new DataView(body.buffer).setUint16(payload.length, crc16(payload), true);
    for (let index = 0; index < body.length; index++) body[index] ^= KEY[index % KEY.length];
    const out = new Uint8Array(body.length + 6);
    out.set([0xAB, 0xCD, payload.length & 255, payload.length >> 8]);
    out.set(body, 4);
    out.set([0xDC, 0xBA], out.length - 2);
    return out;
  }
  // Takes the bytes after the 4-byte header (body + CRC + trailer) and returns the plain payload.
  function unframe(length, rest) {
    R.assert(rest.length === length + 4, "Trama TK-11 incompleta.");
    R.assert(rest[length + 2] === 0xDC && rest[length + 3] === 0xBA, "Trama TK-11 sin cierre DC BA.");
    const body = rest.slice(0, length + 2);
    for (let index = 0; index < body.length; index++) body[index] ^= KEY[index % KEY.length];
    const payload = body.slice(0, length);
    const crc = new DataView(body.buffer).getUint16(length, true);
    R.assert(crc === 0xFFFF || crc === crc16(payload), "CRC de trama TK-11 incorrecto.");
    return payload;
  }
  function header(type, address, length) {
    const out = new Uint8Array(16);
    const view = new DataView(out.buffer);
    view.setUint16(0, type, true);
    view.setUint16(2, 12, true);
    view.setUint32(4, address, true);
    view.setUint16(8, length, true);
    view.setUint32(12, MAGIC, true);
    return out;
  }
  function checkRange(offset, length) {
    R.assert(Number.isInteger(offset) && Number.isInteger(length) && offset >= 0 && length > 0 && offset + length <= MEMORY_SIZE,
      "Direccion fuera del mapa de memoria del TK-11.");
  }
  function writableRegion(offset, length) {
    return WRITABLE.find(region => offset >= region.start && offset + length <= region.end) || null;
  }
  function assertWritable(offset, length) {
    checkRange(offset, length);
    R.assert(writableRegion(offset, length), `Escritura rechazada: 0x${offset.toString(16)}+${length} no esta en una zona de datos confirmada del TK-11.`);
  }
  function hex(bytes) {
    return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }

  const FREQ_DIRECTIONS = ["", "+", "-"];
  const MODES = ["FM", "AM", "LSB", "USB", "CW"];
  const POWERS = ["Low", "Mid", "High"];
  const PTT_IDS = ["Off", "Start", "End", "Start+End"];
  const TONE_TYPES = ["", "CTCSS", "DCS", "DCS-I"];
  const toneDecode = (type, value) => {
    if (!type) return null;
    return { type: TONE_TYPES[type], value: type === 1 ? value / 10 : Number(value.toString(8)) };
  };
  const toneEncode = tone => {
    if (!tone || !tone.type) return [0, 0];
    const type = TONE_TYPES.indexOf(tone.type);
    R.assert(type > 0, "Tipo de tono no valido.");
    if (type === 1) {
      R.assert(tone.value >= 60 && tone.value <= 260, "CTCSS fuera de rango.");
      return [1, Math.round(tone.value * 10)];
    }
    R.assert(/^[0-7]{1,3}$/.test(String(tone.value)), "Codigo DCS no valido (digitos octales).");
    return [type, parseInt(String(tone.value), 8)];
  };
  function usageFlag(hz) {
    if (!hz) return 0xFF;
    const index = USAGE_RANGES_HZ.findIndex(([low, high]) => hz >= low && hz < high);
    return index < 0 ? 0xFF : index;
  }
  // Returns null for an empty slot (zero RX frequency or 0xFF usage flag).
  function decodeChannel(record, usage = 0) {
    R.assert(record.length === CHANNEL_SIZE, "Registro de canal de 64 bytes esperado.");
    const view = new DataView(record.buffer, record.byteOffset, record.length);
    const rx = view.getUint32(0, true) * 10;
    if (!rx || usage === 0xFF) return null;
    const nameBytes = record.slice(24, 40);
    const name = nameBytes[0] === 0xFF ? "" : String.fromCharCode(...nameBytes.filter(byte => byte >= 0x20 && byte < 0x7F)).trimEnd();
    return {
      rxHz: rx, offsetHz: view.getUint32(4, true) * 10, direction: FREQ_DIRECTIONS[record[12]] ?? "",
      rxTone: toneDecode(record[10], view.getUint32(40, true)), txTone: toneDecode(record[11], view.getUint32(44, true)),
      narrow: (record[13] & 15) === 1, step: record[14], encrypt: record[15], power: POWERS[record[16]] ?? "Low", busyLock: Boolean(record[17]),
      reverse: Boolean(record[18]), pttId: PTT_IDS[record[20]] ?? "Off", mode: MODES[record[21]] ?? "FM",
      scanList: record[22] === 0xFF ? null : record[22], squelch: record[23], name, signal: record[60] ? "5TONE" : "DTMF"
    };
  }
  // `base` is the previous 64-byte record; bytes this editor does not model are preserved from it.
  function encodeChannel(channel, base = null) {
    const out = new Uint8Array(CHANNEL_SIZE);
    if (!channel) return out;
    if (base) out.set(base);
    R.assert(Number.isInteger(channel.rxHz) && channel.rxHz % 10 === 0 && channel.rxHz >= MIN_HZ && channel.rxHz <= MAX_HZ, "Frecuencia RX fuera de rango.");
    R.assert(Number.isInteger(channel.offsetHz ?? 0) && (channel.offsetHz ?? 0) % 10 === 0 && (channel.offsetHz ?? 0) >= 0, "Desplazamiento no valido.");
    const view = new DataView(out.buffer);
    view.setUint32(0, channel.rxHz / 10, true);
    view.setUint32(4, (channel.offsetHz ?? 0) / 10, true);
    const direction = FREQ_DIRECTIONS.indexOf(channel.direction ?? "");
    R.assert(direction >= 0, "Direccion de desplazamiento no valida.");
    out[12] = direction;
    const [rxType, rxValue] = toneEncode(channel.rxTone);
    const [txType, txValue] = toneEncode(channel.txTone);
    out[10] = rxType; out[11] = txType;
    view.setUint32(40, rxValue, true); view.setUint32(44, txValue, true);
    out[13] = out[13] & 0xF0 | (channel.narrow ? 1 : 0);
    const power = POWERS.indexOf(channel.power ?? "Low");
    const mode = MODES.indexOf(channel.mode ?? "FM");
    const ptt = PTT_IDS.indexOf(channel.pttId ?? "Off");
    R.assert(power >= 0 && mode >= 0 && ptt >= 0, "Potencia, modo o PTT-ID no validos.");
    out[16] = power; out[21] = mode; out[20] = ptt;
    if (channel.step !== undefined) {
      R.assert(Number.isInteger(channel.step) && channel.step >= 0 && channel.step <= 255, "Paso fuera de rango.");
      out[14] = channel.step;
    }
    if (channel.encrypt !== undefined) {
      R.assert(Number.isInteger(channel.encrypt) && channel.encrypt >= 0 && channel.encrypt <= 10, "Cifrado fuera de rango.");
      out[15] = channel.encrypt;
    }
    out[17] = channel.busyLock ? 1 : 0;
    out[18] = channel.reverse ? 1 : 0;
    const scan = channel.scanList ?? null;
    R.assert(scan === null || Number.isInteger(scan) && scan >= 0 && scan <= 31, "Lista de escaneo fuera de rango.");
    out[22] = scan === null ? 0xFF : scan;
    if (channel.squelch !== undefined || !base) {
      const squelch = channel.squelch ?? 4;
      R.assert(Number.isInteger(squelch) && squelch >= 0 && squelch <= 8, "Squelch fuera de rango.");
      out[23] = squelch;
    }
    const name = channel.name ?? "";
    R.assert(/^[\x20-\x7e]{0,16}$/.test(name), "Nombre de canal no valido (ASCII, 16 caracteres).");
    out.fill(0, 24, 40);
    for (let index = 0; index < name.length; index++) out[24 + index] = name.charCodeAt(index);
    if (!name) out[24] = 0xFF;
    out[60] = channel.signal === "5TONE" ? 1 : 0;
    return out;
  }

  const BACKLIGHT = ["Off", "1", "2", "3", "4", "5", "10", "15", "20", "25", "30", "Always ON"];
  const SIDE_KEYS = ["None", "Flashlight", "Power selection", "Monitor", "Scan", "VOX", "Alarm", "FM radio", "1750 MHz"];
  const numbers = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => String(from + index));
  const field = (key, label, base, offset, size, kind, extra = {}) => Object.freeze({ key, label, address: base + offset, size, kind, editable: kind !== "raw", ...extra });
  const SETTINGS = Object.freeze([
    field("tx_tot", "Tiempo maximo de TX (min)", OFFSETS.general, 2, 1, "option", { options: ["Off", ...numbers(1, 10)] }),
    field("keylock", "Bloqueo de teclado", OFFSETS.general, 4, 1, "option", { options: ["Unlocked", "Locked"] }),
    field("mic", "Ganancia de microfono", OFFSETS.general, 7, 1, "option", { options: numbers(1, 6) }),
    field("backlight", "Retroiluminacion (s)", OFFSETS.general, 13, 1, "option", { options: BACKLIGHT }),
    field("key_short1", "Tecla lateral 1, pulsacion corta", OFFSETS.general, 17, 1, "option", { options: SIDE_KEYS }),
    field("key_long1", "Tecla lateral 1, pulsacion larga", OFFSETS.general, 18, 1, "option", { options: SIDE_KEYS }),
    field("key_short2", "Tecla lateral 2, pulsacion corta", OFFSETS.general, 19, 1, "option", { options: SIDE_KEYS }),
    field("key_long2", "Tecla lateral 2, pulsacion larga", OFFSETS.general, 20, 1, "option", { options: SIDE_KEYS }),
    field("scan_mode", "Modo de escaneo", OFFSETS.general, 21, 1, "option", { options: ["TO", "CO", "SE"] }),
    field("alarm_mode", "Modo de alarma", OFFSETS.general, 24, 1, "option", { options: ["Local alarm", "Remote alarm"] }),
    field("roger_tone", "Tono de fin de TX", OFFSETS.general, 25, 1, "option", { options: ["OFF", "Beep tone", "MDC", "User1", "User2", "User3", "User4", "User5"] }),
    field("repeater_tail", "Cola de repetidor (ms)", OFFSETS.general, 26, 1, "option", { options: ["OFF", ...numbers(1, 10).map(value => String(value * 100))] }),
    field("volume_a", "Volumen canal A", OFFSETS.general, 32, 1, "option", { options: ["0%", "33%", "66%", "100%"] }),
    field("volume_b", "Volumen canal B", OFFSETS.general, 33, 1, "option", { options: ["0%", "33%", "66%", "100%"] }),
    field("brightness", "Brillo de pantalla", OFFSETS.general, 41, 1, "range", { min: 8, max: 200, step: 1 }),
    field("dtmf_response", "Respuesta DTMF", OFFSETS.general, 44, 1, "option", { options: ["OFF", "Remind", "Reply", "Remind & reply"] }),
    field("match_tot", "Tiempo de busqueda de tono", OFFSETS.general, 45, 1, "range", { min: 8, max: 32, step: 1 }),
    field("match_threshold", "Umbral de busqueda de tono", OFFSETS.general, 48, 1, "range", { min: 10, max: 200, step: 1 }),
    field("cw_pitch", "Tono CW (Hz)", OFFSETS.general, 50, 2, "range", { min: 400, max: 1500, step: 10 }),
    field("dtmf_reset_time", "Reinicio DTMF (s)", OFFSETS.general, 60, 1, "range", { min: 5, max: 60, step: 1 }),
    field("logo1", "Texto de bienvenida, linea 1", OFFSETS.general, 216, 16, "text", { max: 16 }),
    field("logo2", "Texto de bienvenida, linea 2", OFFSETS.general, 232, 16, "text", { max: 16 }),
    field("device_name", "Nombre del equipo", OFFSETS.general2, 0x60, 16, "text", { max: 12 }),
    field("channel_ab", "Canal activo A/B", OFFSETS.general, 0, 1, "raw"),
    field("noaa_sq", "Squelch NOAA", OFFSETS.general, 1, 1, "raw"),
    field("vox_sw", "VOX activado", OFFSETS.general, 5, 1, "raw"),
    field("vox_lvl", "Nivel VOX", OFFSETS.general, 6, 1, "raw"),
    field("power_save", "Ahorro de energia", OFFSETS.general, 11, 1, "raw"),
    field("dual_watch", "Doble escucha", OFFSETS.general, 12, 1, "raw"),
    field("call_ch", "Canal de llamada", OFFSETS.general, 14, 2, "raw"),
    field("beep", "Pitido de teclas", OFFSETS.general, 16, 1, "raw"),
    field("auto_lock", "Bloqueo automatico", OFFSETS.general, 22, 1, "raw"),
    field("boot_screen", "Pantalla de arranque", OFFSETS.general, 23, 1, "raw"),
    field("language", "Idioma", OFFSETS.general, 35, 1, "raw")
  ]);
  function readField(memory, item) {
    const view = new DataView(memory.buffer, memory.byteOffset, memory.length);
    if (item.kind === "text") {
      const raw = memory.slice(item.address, item.address + item.size);
      return String.fromCharCode(...raw.filter(byte => byte >= 0x20 && byte < 0x7F)).trimEnd();
    }
    if (item.size === 2) return view.getUint16(item.address, true);
    return memory[item.address];
  }
  function decodeSettings(memory) {
    R.assert(memory.length >= MEMORY_SIZE, "Memoria TK-11 incompleta.");
    return Object.fromEntries(SETTINGS.map(item => [item.key, readField(memory, item)]));
  }
  // Returns a copy of `memory` with the editable values applied; every value is range-checked.
  function encodeSettings(memory, values) {
    const out = memory.slice();
    const view = new DataView(out.buffer);
    for (const [key, value] of Object.entries(values)) {
      const item = SETTINGS.find(entry => entry.key === key);
      R.assert(item?.editable, `Ajuste no editable: ${key}.`);
      if (item.kind === "text") {
        R.assert(typeof value === "string" && value.length <= item.max && /^[\x20-\x7e]*$/.test(value), `Texto no valido para ${key}.`);
        out.fill(0, item.address, item.address + item.size);
        for (let index = 0; index < value.length; index++) out[item.address + index] = value.charCodeAt(index);
        continue;
      }
      R.assert(Number.isInteger(value), `Valor no valido para ${key}.`);
      if (item.kind === "option") R.assert(value >= 0 && value < item.options.length, `Opcion fuera de rango para ${key}.`);
      else R.assert(value >= item.min && value <= item.max && (value - item.min) % item.step === 0, `Valor fuera de rango para ${key}.`);
      if (item.size === 2) view.setUint16(item.address, value, true); else out[item.address] = value;
    }
    return out;
  }
  function decodeFm(memory) {
    const view = new DataView(memory.buffer, memory.byteOffset, memory.length);
    const frequencies = [];
    for (let index = 0; index < 32; index++) {
      const value = view.getUint16(OFFSETS.fm + 8 + index * 2, true);
      if (value !== 0xFFFF && value) frequencies.push(value / 10);
    }
    return { vfoMHz: view.getUint16(OFFSETS.fm, true) / 10, frequencies };
  }
  function decodeChannels(memory) {
    R.assert(memory.length >= MEMORY_SIZE, "Memoria TK-11 incompleta.");
    return Array.from({ length: CHANNELS }, (_, index) =>
      decodeChannel(memory.subarray(index * CHANNEL_SIZE, (index + 1) * CHANNEL_SIZE), memory[OFFSETS.usage + index]));
  }
  // Returns a copy of `memory` with all 999 slots (null = empty) re-encoded and usage flags updated.
  function encodeChannels(memory, channels) {
    R.assert(Array.isArray(channels) && channels.length <= CHANNELS, "Maximo 999 canales.");
    const out = memory.slice();
    for (let index = 0; index < CHANNELS; index++) {
      const channel = channels[index] ?? null;
      const base = out.slice(index * CHANNEL_SIZE, (index + 1) * CHANNEL_SIZE);
      out.set(channel ? encodeChannel(channel, base) : new Uint8Array(CHANNEL_SIZE), index * CHANNEL_SIZE);
      out[OFFSETS.usage + index] = channel ? usageFlag(channel.rxHz) : 0xFF;
    }
    return out;
  }
  // Template rows carry MHz numbers; they are RX frequencies, so TX stays simplex and the user adjusts offsets afterwards.
  function channelsFromTemplate(entries) {
    R.assert(Array.isArray(entries) && entries.length <= CHANNELS, "La plantilla supera los 999 canales del TK-11.");
    return entries.map(entry => {
      const rxHz = Math.round(Number(entry.rx) * 1e6 / 10) * 10;
      R.assert(rxHz >= MIN_HZ && rxHz <= MAX_HZ, `Frecuencia de plantilla fuera de rango: ${entry.rx}.`);
      return { rxHz, offsetHz: 0, direction: "", mode: "FM", power: "Low", name: String(entry.name ?? "").replace(/[^\x20-\x7e]/g, "?").slice(0, 16) };
    });
  }
  function channelsToCsv(channels) {
    const cell = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const tone = value => value ? `${value.type} ${value.value}` : "";
    const rows = [["Location", "Name", "Frequency", "Offset", "Direction", "Mode", "RxTone", "TxTone", "Power", "Narrow"].join(",")];
    channels.forEach((channel, index) => {
      if (channel) rows.push([index + 1, cell(channel.name), (channel.rxHz / 1e6).toFixed(5), (channel.offsetHz / 1e6).toFixed(5),
        channel.direction, channel.mode, cell(tone(channel.rxTone)), cell(tone(channel.txTone)), channel.power, channel.narrow ? "Yes" : "No"].join(","));
    });
    return rows.join("\r\n") + "\r\n";
  }
  function hexDump(data, start = 0, length = data.length - start) {
    const lines = [];
    for (let index = start; index < start + length; index += 16) {
      const row = data.slice(index, Math.min(index + 16, start + length));
      const ascii = [...row].map(byte => byte >= 0x20 && byte < 0x7F ? String.fromCharCode(byte) : ".").join("");
      lines.push(`${index.toString(16).padStart(6, "0")}  ${[...row].map(byte => byte.toString(16).padStart(2, "0")).join(" ").padEnd(47)}  ${ascii}`);
    }
    return lines.join("\n");
  }

  class TK11Connector extends R.Connector {
    constructor(transport = new R.SerialTransport()) {
      super(transport);
      this.family = "tk11";
      this.timeoutMs = 4000;
    }
    async connect(model = "TK-11") {
      R.assert(model === "TK-11", "Modelo no compatible.");
      await this.transport.open(38400, [], { bufferSize: 65536, dtr: true });
      this.connected = true;
      return this.run("Identificacion TK-11", async () => {
        this.model = model;
        const payload = new Uint8Array(8);
        const view = new DataView(payload.buffer);
        view.setUint16(0, CMD.connect, true);
        view.setUint16(2, 4, true);
        view.setUint32(4, MAGIC, true);
        const reply = await this.exchange(payload, CMD.connected);
        const firmware = String.fromCharCode(...reply.slice(4, 20).filter(byte => byte >= 0x20 && byte < 0x7F)).trim();
        this.info = { model, firmware: firmware || "desconocido", memoryBytes: MEMORY_SIZE };
        return this.info;
      });
    }
    async exchange(payload, expectedType) {
      this.transport.clear();
      await this.transport.write(frame(payload));
      const head = await this.transport.readExact(4, this.timeoutMs);
      R.assert(head[0] === 0xAB && head[1] === 0xCD, "Cabecera de trama TK-11 invalida.");
      const length = head[2] | head[3] << 8;
      R.assert(length >= 4 && length <= CHUNK + 64, "Longitud de trama TK-11 no valida.");
      const reply = unframe(length, await this.transport.readExact(length + 4, this.timeoutMs));
      const type = reply[0] | reply[1] << 8;
      R.assert(type === expectedType, `Respuesta TK-11 inesperada 0x${type.toString(16)}.`);
      return reply;
    }
    async readBlock(offset, length) {
      checkRange(offset, length);
      R.assert(length <= CHUNK, "Bloque de lectura demasiado grande.");
      const reply = await this.exchange(header(CMD.read, BASE + offset, length), CMD.readData);
      R.assert(reply.length === length + 12, "Longitud de lectura TK-11 inesperada.");
      return reply.slice(12);
    }
    // `original` is the block as currently stored on the radio. Bytes equal to it are written back unchanged,
    // so a block may straddle confirmed and unconfirmed areas as long as every changed byte is in a confirmed region.
    async writeBlock(offset, data, original = null) {
      R.assert(offset % CHUNK === 0 && data.length <= CHUNK, "Las escrituras TK-11 van en bloques alineados de 0x200.");
      if (original) {
        checkRange(offset, data.length);
        R.assert(original.length === data.length, "El bloque original no coincide en tamano.");
        for (let index = 0; index < data.length; index++) {
          if (data[index] !== original[index]) assertWritable(offset + index, 1);
        }
      } else {
        assertWritable(offset, data.length);
      }
      const payload = new Uint8Array(16 + data.length);
      payload.set(header(CMD.write, BASE + offset, data.length));
      payload.set(data, 16);
      await this.exchange(payload, CMD.written);
    }
    async readImage(label, from = 0, to = MEMORY_SIZE) {
      const out = new Uint8Array(MEMORY_SIZE);
      for (let offset = from; offset < to; offset += CHUNK) {
        out.set(await this.readBlock(offset, Math.min(CHUNK, to - offset)), offset);
        this.progress((offset + CHUNK) / to, label);
      }
      return out;
    }
    readMemory() {
      return this.run("Lectura de memoria TK-11", () => this.readImage("Leyendo memoria TK-11"));
    }
    // Two full passes must agree byte for byte before the image is accepted.
    async backup(emit) {
      return this.run("Respaldo TK-11", async () => {
        const first = await this.readImage("Respaldo TK-11: primera lectura");
        const second = await this.readImage("Respaldo TK-11: lectura de verificacion");
        R.assert(R.equal(first, second), "Las dos lecturas del TK-11 no coinciden; el respaldo se descarta.");
        R.assert(first.some(byte => byte !== 0) && first.some(byte => byte !== 0xFF), "La memoria leida esta vacia; respaldo rechazado.");
        const chunks = [];
        for (let offset = 0; offset < MEMORY_SIZE; offset += CHUNK) {
          chunks.push({ offset, sha256: await R.sha256(first.subarray(offset, offset + CHUNK)) });
        }
        const manifest = { format: "tk11-memory", version: 1, baseAddress: BASE, size: MEMORY_SIZE, chunkSize: CHUNK,
          firmware: this.info?.firmware, sha256: await R.sha256(first), verifiedByReread: true, chunks };
        await emit("memory", first, { base: BASE, size: MEMORY_SIZE, sha256: manifest.sha256 });
        await emit("manifest", new TextEncoder().encode(JSON.stringify(manifest, null, 1)), { format: manifest.format });
        return { complete: true, scope: `Memoria completa TK-11 (${MEMORY_SIZE} bytes, 2 lecturas identicas, SHA-256 ${manifest.sha256.slice(0, 16)}...)` };
      });
    }
    // Writes only confirmed regions whose bytes differ, using read-modify-write on aligned 0x200 blocks,
    // then re-reads every written block. `base` (optional) limits the blocks that are even read.
    async applyImage(next, permit, base = null) {
      await R.verifyBackup(this, permit);
      R.assert(next.length === MEMORY_SIZE, "Imagen TK-11 de tamano incorrecto.");
      return this.run("Escritura TK-11", async () => {
        const report = { written: 0, skippedBytes: 0 };
        const allowed = new Uint8Array(MEMORY_SIZE);
        for (const region of WRITABLE) allowed.fill(1, region.start, region.end);
        const touched = [];
        for (let offset = 0; offset < MEMORY_SIZE; offset += CHUNK) {
          let wanted = false;
          for (let index = offset; index < offset + CHUNK; index++) {
            if (!allowed[index]) continue;
            if (!base || base[index] !== next[index]) { wanted = true; break; }
          }
          if (wanted) touched.push(offset);
        }
        for (const [position, offset] of touched.entries()) {
          const live = await this.readBlock(offset, CHUNK);
          const merged = live.slice();
          for (let index = 0; index < CHUNK; index++) if (allowed[offset + index]) merged[index] = next[offset + index];
          if (R.equal(live, merged)) continue;
          await this.writeBlock(offset, merged, live);
          R.assert(R.equal(await this.readBlock(offset, CHUNK), merged), `La verificacion de 0x${offset.toString(16)} fallo tras escribir.`);
          report.written++;
          this.progress((position + 1) / touched.length, "Escribiendo TK-11");
        }
        for (let index = 0; index < MEMORY_SIZE; index++) if (!allowed[index]) report.skippedBytes++;
        return report;
      });
    }
    restore(image, permit) {
      return this.applyImage(R.bytes(image), permit);
    }
    async readChannels() {
      return decodeChannels(await this.readMemory());
    }
    async writeChannels(channels, permit) {
      const memory = await this.readMemory();
      return this.applyImage(encodeChannels(memory, channels), permit, memory);
    }
    async readSettings() {
      return decodeSettings(await this.readMemory());
    }
    async writeSettings(values, permit) {
      const memory = await this.readMemory();
      return this.applyImage(encodeSettings(memory, values), permit, memory);
    }
    // Reboot is the only non-memory command and is never sent automatically.
    reboot() {
      return this.run("Reinicio TK-11", async () => {
        const payload = new Uint8Array(4);
        new DataView(payload.buffer).setUint16(0, CMD.reboot, true);
        this.transport.clear();
        await this.transport.write(frame(payload));
      });
    }
  }
  Object.assign(R, {
    TK11Connector,
    TK11: Object.freeze({ MEMORY_SIZE, CHUNK, CHANNELS, BASE, CMD, OFFSETS, WRITABLE, SETTINGS, frame, unframe, crc16, header,
      assertWritable, usageFlag, decodeChannel, encodeChannel, decodeChannels, encodeChannels, decodeSettings, encodeSettings,
      decodeFm, channelsToCsv, channelsFromTemplate, hexDump, hex })
  });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
