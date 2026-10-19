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
  Object.assign(R, { readChannels, updateChannel, appendChannels, readContacts, appendContacts, encodeFrequency, decodeFrequency: frequency });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
