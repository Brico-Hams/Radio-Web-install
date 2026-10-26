(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const CONFIG_SIZE = 0xa180;
  function configuration(image) {
    R.bytes(image, CONFIG_SIZE);
    R.assert(/^v6\.\d+\.\d+$/.test(R.text(image.subarray(0xa160, 0xa170))),
      "La configuracion no contiene una version F4HWN v6 reconocida.");
  }
  function positions(number) {
    R.assert(Number.isInteger(number) && number >= 1 && number <= 1024, "Canal Quansheng fuera de 1-1024.");
    const index = number - 1;
    return { record: index * 16, name: 0x4000 + index * 16, attributes: 0x8000 + index * 2 };
  }
  function frequency(value) {
    R.assert(/^\d{1,3}(?:\.\d{1,5})?$/.test(String(value)), "Frecuencia Quansheng: MHz con hasta 5 decimales.");
    const units = Math.round(Number(value) * 100000);
    R.assert(units >= 13600000 && units <= 17400000 || units >= 40000000 && units <= 47000000,
      "La importacion Beta se limita a RX VHF 136-174 y UHF 400-470 MHz.");
    return units;
  }
  function readQuanshengChannels(image) {
    configuration(image);
    const channels = [];
    const view = R.view(image);
    for (let number = 1; number <= 1024; number++) {
      const { record, name, attributes } = positions(number);
      if ((image[attributes] & 7) === 7) continue;
      const rx = view.getUint32(record, true);
      if (rx === 0 || rx === 0xffffffff) continue;
      const offset = view.getUint32(record + 4, true);
      const direction = image[record + 11] & 15;
      R.assert(rx > 0 && rx < 150000000 && direction <= 2, `Canal Quansheng ${number}: frecuencia o desplazamiento corruptos.`);
      const tx = rx + (direction === 1 ? offset : direction === 2 ? -offset : 0);
      R.assert(tx > 0 && tx < 150000000, `Canal Quansheng ${number}: TX nominal corrupta.`);
      channels.push({
        number, name: R.text(image.subarray(name, name + 10)) || `CH${number}`,
        rx: (rx / 100000).toFixed(5), tx: (tx / 100000).toFixed(5),
        mode: image[record + 11] >>> 4, rxOnly: Boolean(image[record + 12] & 64)
      });
    }
    return channels;
  }
  function appendQuanshengChannels(image, channels, templateNumber) {
    configuration(image);
    R.assert(Array.isArray(channels) && channels.length > 0 && channels.length <= 1024, "Selecciona 1-1024 canales.");
    const existing = readQuanshengChannels(image);
    const template = existing.find(channel => channel.number === templateNumber);
    R.assert(template && template.mode === 0, "Selecciona un canal FM existente como plantilla Quansheng.");
    const source = positions(templateNumber);
    const result = image.slice();
    const view = R.view(result);
    const identity = channel => `${channel.name}:${channel.rx}:${channel.tx}:${channel.mode}`;
    const known = new Set(existing.map(identity));
    let added = 0;
    let duplicates = 0;
    for (const channel of channels) {
      R.assert(channel.mode === 0, "Quansheng solo importa canales FM analogicos.");
      R.assert(/^[\x20-\x7e]{1,16}$/.test(channel.name), "Nombre Quansheng: 1-16 caracteres ASCII (se guardan los primeros 10).");
      const rx = frequency(channel.rx);
      const tx = frequency(channel.tx);
      const name = channel.name.slice(0, 10);
      const key = identity({ name, rx: (rx / 100000).toFixed(5), tx: (tx / 100000).toFixed(5), mode: 0 });
      if (known.has(key)) { duplicates++; continue; }
      let destination;
      for (let number = 1; number <= 1024; number++) {
        const position = positions(number);
        const storedRX = view.getUint32(position.record, true);
        if ((result[position.attributes] & 7) === 7 || storedRX === 0 || storedRX === 0xffffffff) { destination = position; break; }
      }
      R.assert(destination, "No quedan memorias Quansheng libres. Archivo original intacto.");
      const { record, attributes } = destination;
      result.set(image.subarray(source.record, source.record + 16), record);
      view.setUint32(record, rx, true);
      view.setUint32(record + 4, Math.abs(tx - rx), true);
      result.fill(0, record + 8, record + 11);
      result[record + 11] = tx > rx ? 1 : tx < rx ? 2 : 0;
      result[record + 12] = (result[record + 12] & ~1) | 64;
      if (channel.narrow) result[record + 12] |= 2;
      result[record + 13] = 0;
      result.fill(0, destination.name, destination.name + 16);
      result.set(new TextEncoder().encode(name), destination.name);
      // F4HWN frequencyBandTable: BAND2 108-137, BAND3 137-174 ... BAND6 400-470 MHz (attribute value = band index).
      view.setUint16(attributes, rx < 13700000 ? 1 : rx < 17400000 ? 2 : rx < 35000000 ? 3 : rx < 40000000 ? 4 : rx < 47000000 ? 5 : 6, true);
      known.add(key);
      added++;
    }
    return { image: result, added, duplicates };
  }
  function updateQuanshengChannel(image, channel) {
    configuration(image);
    R.assert(channel && Number.isInteger(channel.number), "Selecciona un canal Quansheng valido.");
    const existing = readQuanshengChannels(image).find(item => item.number === channel.number);
    R.assert(existing && existing.mode === 0, "Solo se editan canales FM existentes.");
    R.assert(/^[\x20-\x7e]{1,10}$/.test(channel.name), "Nombre Quansheng: 1-10 caracteres ASCII.");
    const rx = frequency(channel.rx);
    const tx = frequency(channel.tx);
    R.assert((rx < 35000000) === (tx < 35000000), "RX y TX deben permanecer en la misma banda.");
    const { record, name, attributes } = positions(channel.number);
    const result = image.slice();
    const view = R.view(result);
    view.setUint32(record, rx, true);
    view.setUint32(record + 4, Math.abs(tx - rx), true);
    result[record + 11] = (result[record + 11] & 0xf0) | (tx > rx ? 1 : tx < rx ? 2 : 0);
    result[record + 12] |= 64;
    result.fill(0, name, name + 16);
    result.set(new TextEncoder().encode(channel.name), name);
    const band = rx < 17400000 ? 2 : rx < 35000000 ? 3 : rx < 40000000 ? 4 : 5;
    view.setUint16(attributes, (view.getUint16(attributes, true) & ~7) | band, true);
    return result;
  }
  function deleteQuanshengChannel(image, number) {
    configuration(image);
    const { record, name, attributes } = positions(number);
    R.assert((image[attributes] & 7) !== 7, "El canal Quansheng ya esta vacio.");
    const result = image.slice();
    result.fill(255, record, record + 16);
    result.fill(0, name, name + 16);
    R.view(result).setUint16(attributes, 7, true);
    return result;
  }
  Object.assign(R, { QUANSHENG_CONFIG_SIZE: CONFIG_SIZE, readQuanshengChannels, appendQuanshengChannels,
    updateQuanshengChannel, deleteQuanshengChannel });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
