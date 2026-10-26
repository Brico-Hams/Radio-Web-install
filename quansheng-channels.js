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
  const bandFor = rx => rx < 13700000 ? 1 : rx < 17400000 ? 2 : rx < 35000000 ? 3 : rx < 40000000 ? 4 : rx < 47000000 ? 5 : 6;
  function scanList(value) {
    R.assert(Number.isInteger(value) && value >= 0 && value <= 25, "Lista Quansheng: 0 (ninguna), 1-24 o 25 (todas).");
    return value;
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
        mode: image[record + 11] >>> 4, rxOnly: Boolean(image[record + 12] & 64),
        scanList: image[attributes + 1], scanExcluded: Boolean(image[attributes] & 128),
        narrow: Boolean(image[record + 12] & 2)
      });
    }
    return channels;
  }
  function appendQuanshengChannels(image, channels, templateNumber, options = {}) {
    configuration(image);
    R.assert(Array.isArray(channels) && channels.length > 0 && channels.length <= 1024, "Selecciona 1-1024 canales.");
    const existing = readQuanshengChannels(image);
    const template = existing.find(channel => channel.number === templateNumber);
    R.assert(template && template.mode === 0, "Selecciona un canal FM existente como plantilla Quansheng.");
    const source = positions(templateNumber);
    const targetList = scanList(options.scanList ?? 25);
    const result = image.slice();
    const view = R.view(result);
    const identity = channel => `${channel.name}:${channel.rx}:${channel.tx}:${channel.mode}`;
    const known = new Set(existing.filter(channel => channel.rxOnly).map(identity));
    let added = 0;
    let duplicates = 0;
    for (const channel of channels) {
      R.assert(channel.mode === 0, "Quansheng solo importa canales FM analogicos.");
      R.assert(/^[\x20-\x7e]{1,16}$/.test(channel.name), "Nombre Quansheng: 1-16 caracteres ASCII (se guardan los primeros 10).");
      const rx = frequency(channel.rx);
      const tx = frequency(channel.tx);
      R.assert((rx < 35000000) === (tx < 35000000), "RX y TX deben permanecer en la misma banda.");
      const list = scanList(channel.scanList ?? targetList);
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
      if (channel.narrow !== undefined) result[record + 12] = (result[record + 12] & ~2) | (channel.narrow ? 2 : 0);
      result[record + 13] = 0;
      result.fill(0, destination.name, destination.name + 16);
      result.set(new TextEncoder().encode(name), destination.name);
      // F4HWN frequencyBandTable: BAND2 108-137, BAND3 137-174 ... BAND6 400-470 MHz (attribute value = band index).
      view.setUint16(attributes, bandFor(rx) | (list << 8), true);
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
    view.setUint16(attributes, (view.getUint16(attributes, true) & ~7) | bandFor(rx), true);
    if (channel.scanList !== undefined) {
      result[attributes + 1] = scanList(channel.scanList);
      result[attributes] &= ~128;
    }
    return result;
  }
  function assignQuanshengScanList(image, numbers, list) {
    configuration(image);
    scanList(list);
    R.assert(Array.isArray(numbers) && numbers.length > 0, "Selecciona canales para la lista de escaneo.");
    const existing = new Set(readQuanshengChannels(image).map(channel => channel.number));
    const result = image.slice();
    for (const number of numbers) {
      const { attributes } = positions(number);
      R.assert(existing.has(number), `El canal ${number} no existe.`);
      result[attributes + 1] = list;
      result[attributes] &= ~128;
    }
    return result;
  }
  function groupQuanshengChannels(image, channels, field, defaultList = 25) {
    R.assert(["none", "zone", "region", "city"].includes(field), "Agrupacion de escaneo no reconocida.");
    scanList(defaultList);
    const occupied = new Set(readQuanshengChannels(image).map(channel => channel.scanList));
    const groups = new Map();
    const grouped = channels.map(channel => {
      if (field === "none") return { ...channel, scanList: defaultList };
      const name = String(channel[field] || "").trim();
      R.assert(name, `El canal ${channel.name} no contiene ${field}; elige lista unica o completa los datos.`);
      if (!groups.has(name)) {
        const list = Array.from({ length: 24 }, (_, index) => index + 1).find(number => !occupied.has(number));
        R.assert(list, "No quedan listas libres (1-24) para los grupos. El archivo original no se modifica.");
        occupied.add(list);
        groups.set(name, list);
      }
      return { ...channel, scanList: groups.get(name) };
    });
    return { channels: grouped, groups: [...groups].map(([name, list]) => ({ name, list })) };
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
  function restoreQuanshengChannels(backup, current) {
    readQuanshengChannels(backup);
    readQuanshengChannels(current);
    R.assert(R.text(backup.subarray(0xa160, 0xa170)) === R.text(current.subarray(0xa160, 0xa170)),
      "Restore requiere la misma version de configuracion F4HWN que el banco leido.");
    const restored = current.slice();
    restored.set(backup.subarray(0, 0x8800));
    return restored;
  }
  Object.assign(R, { QUANSHENG_CONFIG_SIZE: CONFIG_SIZE, readQuanshengChannels, appendQuanshengChannels, restoreQuanshengChannels,
    updateQuanshengChannel, deleteQuanshengChannel, assignQuanshengScanList, groupQuanshengChannels });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
