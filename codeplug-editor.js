(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  function position(number) {
    R.assert(Number.isInteger(number) && number >= 1 && number <= 1024, "Canal fuera de 1-1024.");
    const bank = Math.floor((number - 1) / 128);
    const index = (number - 1) % 128;
    const base = bank === 0 ? 0x3780 : 0xb1b0 + (bank - 1) * (16 + 56 * 128);
    return { bitmap: base + Math.floor(index / 8), bit: 1 << (index % 8), offset: base + 16 + index * 56 };
  }
  function frequency(data) {
    let value = 0;
    for (let index = 3; index >= 0; index--) {
      const hi = data[index] >>> 4;
      const lo = data[index] & 15;
      R.assert(hi < 10 && lo < 10, "Frecuencia BCD corrupta.");
      value = value * 100 + hi * 10 + lo;
    }
    return (value / 100000).toFixed(5);
  }
  function encodeFrequency(value) {
    const input = String(value);
    R.assert(/^\d{1,3}(?:\.\d{1,5})?$/.test(input), "Frecuencia: MHz con hasta 5 decimales.");
    let integer = Math.round(Number(input) * 100000);
    R.assert(integer > 0 && integer < 100000000, "Frecuencia fuera del rango representable.");
    const data = new Uint8Array(4);
    for (let i = 0; i < 4; i++) {
      data[i] = (Math.floor(integer / 10) % 10) * 16 + integer % 10;
      integer = Math.floor(integer / 100);
    }
    return data;
  }
  function readChannels(image) {
    R.bytes(image, 0x20000);
    const channels = [];
    for (let number = 1; number <= 1024; number++) {
      const { bitmap, bit, offset } = position(number);
      if (!(image[bitmap] & bit)) continue;
      const data = image.subarray(offset, offset + 56);
      const name = R.text(data.subarray(0, 16));
      if (!name) continue;
      channels.push({
        number, name, rx: frequency(data.subarray(16, 20)), tx: frequency(data.subarray(20, 24)),
        mode: data[24], colorCode: data[44], timeslot: (data[49] & 64) ? 2 : 1,
        contact: R.view(data).getUint16(46, true), rxOnly: Boolean(data[51] & 4)
      });
    }
    return channels;
  }
  function updateChannel(image, channel) {
    R.bytes(image, 0x20000);
    const { bitmap, bit, offset } = position(channel.number);
    R.assert(image[bitmap] & bit, "Solo se editan canales existentes: no se inventaran ajustes de un canal nuevo.");
    R.assert(/^[\x20-\x7e]{1,16}$/.test(channel.name), "Nombre: 1-16 caracteres ASCII.");
    R.assert([0, 1].includes(channel.mode), "Solo se permite editar modos FM y DMR.");
    R.assert(Number.isInteger(channel.colorCode) && channel.colorCode >= 0 && channel.colorCode <= 15, "Color Code fuera de 0-15.");
    R.assert([1, 2].includes(channel.timeslot), "Time Slot invalido.");
    const rx = encodeFrequency(channel.rx);
    const tx = encodeFrequency(channel.tx);
    const result = image.slice();
    result.fill(255, offset, offset + 16);
    result.set(new TextEncoder().encode(channel.name), offset);
    result.set(rx, offset + 16);
    result.set(tx, offset + 20);
    result[offset + 24] = channel.mode;
    result[offset + 44] = channel.colorCode;
    result[offset + 49] = (result[offset + 49] & ~64) | (channel.timeslot === 2 ? 64 : 0);
    result[offset + 51] = (result[offset + 51] & ~4) | (channel.rxOnly ? 4 : 0);
    return result;
  }
  function appendChannels(image, channels, templateNumber) {
    R.bytes(image, 0x20000);
    R.assert(Array.isArray(channels) && channels.length > 0 && channels.length <= 1024, "Selecciona 1-1024 canales.");
    const template = readChannels(image).find(channel => channel.number === templateNumber);
    R.assert(template && [0, 1].includes(template.mode), "Selecciona un canal existente como plantilla FM o DMR.");
    const source = position(templateNumber);
    const result = image.slice();
    const identity = channel => `${channel.mode}:${channel.rx}:${channel.tx}:${channel.name}:${channel.colorCode}:${channel.timeslot}`;
    const known = new Set(readChannels(image).map(identity));
    let added = 0;
    let duplicates = 0;
    for (const channel of channels) {
      R.assert(channel.mode === template.mode, "Cada lote debe coincidir con el modo de la plantilla.");
      const rx = frequency(encodeFrequency(channel.rx));
      const tx = frequency(encodeFrequency(channel.tx));
      const settings = { ...channel, rx, tx, colorCode: channel.colorCode ?? template.colorCode, timeslot: channel.timeslot ?? template.timeslot };
      const key = identity(settings);
      if (known.has(key)) { duplicates++; continue; }
      let destination;
      let number;
      for (number = 1; number <= 1024; number++) {
        const candidate = position(number);
        if (!(result[candidate.bitmap] & candidate.bit)) { destination = candidate; break; }
      }
      R.assert(destination, "No hay espacio. No se ha aplicado ningun cambio al archivo original.");
      result.set(image.subarray(source.offset, source.offset + 56), destination.offset);
      result[destination.bitmap] |= destination.bit;
      const changed = updateChannel(result, { ...settings, number, rxOnly: true });
      result.set(changed.subarray(destination.offset, destination.offset + 56), destination.offset);
      // Imported channels start receive-only and without inherited squelch tones.
      result.fill(255, destination.offset + 32, destination.offset + 36);
      known.add(key);
      added++;
    }
    return { image: result, added, duplicates };
  }
  function readContacts(image) {
    R.bytes(image, 0x20000);
    const result = [];
    for (let index = 0; index < 1024; index++) {
      const offset = 0x17620 + index * 24;
      if ([0, 255].includes(image[offset])) continue;
      let id = 0;
      for (const byte of image.subarray(offset + 16, offset + 20)) {
        R.assert((byte >> 4) <= 9 && (byte & 15) <= 9, `Contacto ${index + 1}: ID BCD corrupto.`);
        id = id * 100 + (byte >> 4) * 10 + (byte & 15);
      }
      result.push({ number: index + 1, name: R.text(image.subarray(offset, offset + 16)), id, type: image[offset + 20] });
    }
    return result;
  }
  function appendContacts(image, contacts) {
    R.bytes(image, 0x20000);
    R.assert(Array.isArray(contacts) && contacts.length > 0 && contacts.length <= 1024, "Selecciona 1-1024 contactos.");
    const known = new Set(readContacts(image).filter(contact => contact.type === 1).map(contact => contact.id));
    const result = image.slice();
    let added = 0;
    let duplicates = 0;
    for (const contact of contacts) {
      R.assert(Number.isInteger(contact.id) && contact.id > 0 && contact.id <= 0xffffff, "ID DMR fuera de 1-16777215.");
      R.assert(/^[\x20-\x7e]{1,16}$/.test(contact.callsign), "Indicativo de contacto: 1-16 caracteres ASCII.");
      if (known.has(contact.id)) { duplicates++; continue; }
      let offset = -1;
      for (let index = 0; index < 1024; index++) {
        const candidate = 0x17620 + index * 24;
        if ([0, 255].includes(result[candidate])) { offset = candidate; break; }
      }
      R.assert(offset >= 0, "No hay espacio para contactos. Archivo original intacto.");
      result.fill(255, offset, offset + 24);
      result.set(new TextEncoder().encode(contact.callsign), offset);
      const digits = String(contact.id).padStart(8, "0");
      for (let index = 0; index < 4; index++) result[offset + 16 + index] = parseInt(digits.slice(index * 2, index * 2 + 2), 16);
      result.set([1, 0, 0, 1], offset + 20);
      known.add(contact.id);
      added++;
    }
    return { image: result, added, duplicates };
  }
  // OpenGD77 custom data region (flash 0x0 / 0x20000) mapped at codeplug offset 0x1EE60.
  const CUSTOM_BASE = 0x1ee60;
  const CUSTOM_SIZE = 0x11a0;
  const SAT_TYPE = 3;
  const SAT_RECORD = 100;
  const SAT_MAX = 25;
  const SAT_BLOCK = 2520;
  const TLE_LUT = "0123456789. +-*";
  const u32 = (data, offset) => (data[offset] | data[offset + 1] << 8 | data[offset + 2] << 16 | data[offset + 3] << 24) >>> 0;
  function customBlocks(region) {
    const blocks = [];
    let offset = 12;
    while (offset + 8 <= region.length) {
      const type = region[offset];
      const size = u32(region, offset + 4);
      if (type === 255 || type === 0 || size === 0) return { blocks, free: type === 255 ? offset : -1 };
      R.assert(size <= CUSTOM_SIZE && offset + 8 + size <= region.length, "Cadena de datos personalizados OpenGD77 corrupta. Archivo original intacto.");
      blocks.push({ type, offset, size });
      offset += 8 + size;
    }
    return { blocks, free: -1 };
  }
  function customRegion(image) {
    R.bytes(image, 0x20000);
    const region = image.subarray(CUSTOM_BASE, CUSTOM_BASE + CUSTOM_SIZE);
    return { region, initialised: R.text(region.subarray(0, 8)) === "OpenGD77" };
  }
  function unpackTLE(data) {
    let text = "";
    for (const byte of data) text += TLE_LUT[byte >> 4] + TLE_LUT[byte & 15];
    return text;
  }
  function packTLE(text) {
    const result = new Uint8Array(text.length / 2);
    for (let index = 0; index < text.length; index++) {
      const value = TLE_LUT.indexOf(text[index]);
      R.assert(value >= 0, `TLE con caracter no representable en OpenGD77: ${JSON.stringify(text[index])}.`);
      result[index >> 1] |= index % 2 ? value : value << 4;
    }
    return result;
  }
  function tleChecksum(line) {
    let sum = 0;
    for (const char of line.slice(0, 68)) sum += char === "-" ? 1 : /\d/.test(char) ? Number(char) : 0;
    return sum % 10 === Number(line[68]);
  }
  function satelliteRecords(region, block) {
    const records = [];
    const count = Math.min(SAT_MAX, Math.floor(block.size / SAT_RECORD));
    for (let index = 0; index < count; index++) {
      const raw = region.subarray(block.offset + 8 + index * SAT_RECORD, block.offset + 8 + (index + 1) * SAT_RECORD);
      if (raw[0] === 0 || raw[0] === 255) break;
      records.push(raw);
    }
    return records;
  }
  function decodeSatellite(raw) {
    const zeroText = data => R.text(data.subarray(0, data.indexOf(0) < 0 ? data.length : data.indexOf(0)));
    return {
      name: zeroText(raw.subarray(0, 8)),
      tleFields: { line1: unpackTLE(raw.subarray(8, 20)), line2: unpackTLE(raw.subarray(20, 48)) },
      rx1: u32(raw, 48) / 1e6, tx1: u32(raw, 52) / 1e6, txCtcss: (raw[56] | raw[57] << 8) / 10, armCtcss: (raw[58] | raw[59] << 8) / 10,
      rx2: u32(raw, 60) / 1e6, tx2: u32(raw, 64) / 1e6, rx3: u32(raw, 68) / 1e6, tx3: u32(raw, 72) / 1e6,
      additional: zeroText(raw.subarray(76, 100))
    };
  }
  function readSatellites(image) {
    const { region, initialised } = customRegion(image);
    if (!initialised) return [];
    const block = customBlocks(region).blocks.find(item => item.type === SAT_TYPE);
    return block ? satelliteRecords(region, block).map(decodeSatellite) : [];
  }
  function encodeSatellite(satellite) {
    const name = String(satellite.name || "").normalize("NFD").replace(/[^\x20-\x7e]/g, "").trim().slice(0, 8);
    R.assert(name.length > 0, "Nombre de satelite sin caracteres ASCII.");
    const line1 = String(satellite.tle1 || "");
    const line2 = String(satellite.tle2 || "");
    R.assert(line1.length === 69 && line2.length === 69 && line1[0] === "1" && line2[0] === "2" && tleChecksum(line1) && tleChecksum(line2) &&
      line1.slice(2, 7) === line2.slice(2, 7), "TLE no valido (longitud, numero de linea, NORAD o checksum).");
    const rx = Number(satellite.rx);
    R.assert(Number.isFinite(rx) && ((rx >= 136 && rx <= 174) || (rx >= 400 && rx <= 470)), "Frecuencia SAT fuera de VHF 136-174 / UHF 400-470 MHz.");
    const raw = new Uint8Array(SAT_RECORD);
    raw.set(new TextEncoder().encode(name), 0);
    raw.set(packTLE(line1.slice(18, 20) + line1.slice(20, 32) + line1.slice(33, 43)), 8);
    raw.set(packTLE(line2.slice(8, 16) + line2.slice(17, 25) + line2.slice(26, 33) + line2.slice(34, 42) +
      line2.slice(43, 51) + line2.slice(52, 63) + line2.slice(63, 68) + " "), 20);
    const hz = Math.round(rx * 1e6);
    raw.set([hz & 255, hz >>> 8 & 255, hz >>> 16 & 255, hz >>> 24 & 255], 48);
    // TX, tones and APRS stay zero: imported satellites are receive-only and no uplink is fabricated.
    return { name, raw };
  }
  function writeSatellites(image, satellites) {
    R.assert(Array.isArray(satellites) && satellites.length > 0 && satellites.length <= SAT_MAX, `Selecciona 1-${SAT_MAX} satelites.`);
    const result = image.slice();
    const { region, initialised } = customRegion(result);
    if (!initialised) {
      R.assert(region.every(byte => byte === 255), "Zona de datos personalizados sin cabecera OpenGD77 y no vacia. Archivo original intacto.");
      region.set(new TextEncoder().encode("OpenGD77"), 0);
      region.fill(0, 8, 12);
    }
    const chain = customBlocks(region);
    let block = chain.blocks.find(item => item.type === SAT_TYPE);
    const records = new Map();
    if (block) {
      R.assert(block.size === SAT_BLOCK, "Bloque SAT OpenGD77 con tamano inesperado. Archivo original intacto.");
      for (const raw of satelliteRecords(region, block)) records.set(decodeSatellite(raw).name, raw.slice());
    } else {
      R.assert(chain.free >= 0 && chain.free + 8 + SAT_BLOCK <= region.length, "Sin espacio para el bloque SAT en los datos personalizados. Archivo original intacto.");
      block = { offset: chain.free, size: SAT_BLOCK };
    }
    let added = 0;
    let replaced = 0;
    for (const satellite of satellites) {
      const { name, raw } = encodeSatellite(satellite);
      if (records.has(name)) replaced++; else added++;
      records.set(name, raw);
    }
    R.assert(records.size <= SAT_MAX, `OpenGD77 admite ${SAT_MAX} satelites. Archivo original intacto.`);
    region.set([SAT_TYPE, 0, 0, 0, SAT_BLOCK & 255, SAT_BLOCK >> 8, 0, 0], block.offset);
    region.fill(0, block.offset + 8, block.offset + 8 + SAT_BLOCK);
    [...records.keys()].sort((a, b) => a.localeCompare(b)).forEach((name, index) =>
      region.set(records.get(name), block.offset + 8 + index * SAT_RECORD));
    return { image: result, added, replaced, total: records.size };
  }
  Object.assign(R, { readChannels, updateChannel, appendChannels, readContacts, appendContacts, readSatellites, writeSatellites,
    encodeFrequency, decodeFrequency: frequency });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
