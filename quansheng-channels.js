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
    const identity = channel => `${channel.name}:${channel.rx}:${channel.tx}:${channel.mode}`;
    const known = new Set(existing.filter(channel => channel.rxOnly).map(identity));
    const templateRecord = image.slice(source.record, source.record + 16);
    let added = 0;
    let duplicates = 0;
    for (const channel of channels) {
      const memory = plannedMemory(templateRecord, channel, scanList(channel.scanList ?? targetList));
      const key = identity({ name: channel.name.slice(0, 10), rx: (memory.rx / 100000).toFixed(5), tx: (memory.tx / 100000).toFixed(5), mode: 0 });
      if (known.has(key)) { duplicates++; continue; }
      let destination = 0;
      for (let number = 1; number <= 1024 && !destination; number++) if (!occupied(result, number)) destination = number;
      R.assert(destination, "No quedan memorias Quansheng libres. Archivo original intacto.");
      putMemory(result, memory, destination);
      known.add(key);
      added++;
    }
    return { image: result, added, duplicates };
  }
  // One planned FM channel on a template record: RX-only, tones off, band and scan list set.
  function plannedMemory(templateRecord, channel, list) {
    R.assert(channel.mode === 0, "Quansheng solo importa canales FM analogicos.");
    R.assert(/^[\x20-\x7e]{1,16}$/.test(channel.name), "Nombre Quansheng: 1-16 caracteres ASCII (se guardan los primeros 10).");
    const rx = frequency(channel.rx);
    const tx = frequency(channel.tx);
    R.assert((rx < 35000000) === (tx < 35000000), "RX y TX deben permanecer en la misma banda.");
    const record = templateRecord.slice();
    const view = R.view(record);
    view.setUint32(0, rx, true);
    view.setUint32(4, Math.abs(tx - rx), true);
    record.fill(0, 8, 11);
    record[11] = tx > rx ? 1 : tx < rx ? 2 : 0;
    record[12] = (record[12] & ~1) | 64;
    if (channel.narrow !== undefined) record[12] = (record[12] & ~2) | (channel.narrow ? 2 : 0);
    record[13] = 0;
    const name = new Uint8Array(16);
    name.set(new TextEncoder().encode(channel.name.slice(0, 10)));
    const attributes = new Uint8Array(2);
    // F4HWN frequencyBandTable: BAND2 108-137, BAND3 137-174 ... BAND6 400-470 MHz (attribute value = band index).
    R.view(attributes).setUint16(0, bandFor(rx) | (list << 8), true);
    return { record, name, attributes, rx, tx };
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
  // Same rule as readQuanshengChannels: a hidden attribute or an unset frequency is a free memory.
  function occupied(image, number) {
    const { record, attributes } = positions(number);
    const rx = R.view(image).getUint32(record, true);
    return (image[attributes] & 7) !== 7 && rx !== 0 && rx !== 0xffffffff;
  }
  // Copies and moves carry every byte of the memory (tones, DCS, step, flags), not only the fields this editor shows.
  function copyRaw(result, image, from, to) {
    putMemory(result, memoryAt(image, from), to);
  }
  function memoryAt(image, number) {
    const { record, name, attributes } = positions(number);
    return { record: image.slice(record, record + 16), name: image.slice(name, name + 16), attributes: image.slice(attributes, attributes + 2) };
  }
  function putMemory(result, memory, number) {
    R.assert(memory?.record?.length === 16 && memory.name?.length === 16 && memory.attributes?.length === 2,
      "Memoria Quansheng incompleta: 16 bytes de registro, 16 de nombre y 2 de atributos.");
    const { record, name, attributes } = positions(number);
    result.set(memory.record, record);
    result.set(memory.name, name);
    result.set(memory.attributes, attributes);
  }
  // Raw bytes of one memory, for copy and paste between tables or radios.
  function readQuanshengMemory(image, number) {
    configuration(image);
    R.assert(occupied(image, number), `El canal Quansheng ${number} esta vacio.`);
    return memoryAt(image, number);
  }
  function plannedQuanshengMemory(image, channel, templateNumber, list = 25) {
    configuration(image);
    R.assert(occupied(image, templateNumber) && (image[positions(templateNumber).record + 11] >>> 4) === 0,
      "Selecciona un canal FM existente como plantilla Quansheng.");
    return plannedMemory(memoryAt(image, templateNumber).record, channel, scanList(list));
  }
  // Inserts a memory at a position; the occupied memories from there move down one place, up to the next free one.
  function insertQuanshengMemory(image, memory, position) {
    configuration(image);
    positions(position);
    R.assert((memory?.attributes?.[0] & 7) !== 7, "No se puede insertar una memoria vacia.");
    let free = position;
    while (free <= 1024 && occupied(image, free)) free++;
    R.assert(free <= 1024, `No hay memorias libres desde la ${position}; borra alguna antes de insertar.`);
    const result = image.slice();
    for (let number = free; number > position; number--) copyRaw(result, image, number - 1, number);
    putMemory(result, memory, position);
    return result;
  }
  function copyQuanshengChannel(image, number, target) {
    configuration(image);
    R.assert(occupied(image, number), `El canal Quansheng ${number} esta vacio.`);
    let destination = target;
    if (destination === undefined) {
      for (let candidate = number + 1; candidate <= 1024 && !destination; candidate++) if (!occupied(image, candidate)) destination = candidate;
      for (let candidate = 1; candidate < number && !destination; candidate++) if (!occupied(image, candidate)) destination = candidate;
      R.assert(destination, "No quedan memorias Quansheng libres para copiar el canal.");
    }
    R.assert(!occupied(image, destination), `La memoria ${destination} esta ocupada; borrala o mueve el canal.`);
    const result = image.slice();
    copyRaw(result, image, number, destination);
    return { image: result, number: destination };
  }
  // Moves a memory to a position and shifts the ones in between by one, like dragging a row in a list.
  function moveQuanshengChannel(image, from, to) {
    configuration(image);
    positions(to);
    R.assert(occupied(image, from), `El canal Quansheng ${from} esta vacio.`);
    const result = image.slice();
    const step = from < to ? 1 : -1;
    for (let number = from; number !== to; number += step) copyRaw(result, image, number + step, number);
    copyRaw(result, image, from, to);
    return result;
  }
  function moveQuanshengChannels(image, numbers, target, placement = "before") {
    configuration(image);
    positions(target);
    R.assert(Array.isArray(numbers) && numbers.length > 0 && new Set(numbers).size === numbers.length,
      "Selecciona canales distintos para mover.");
    R.assert(placement === "before" || placement === "after", "Elige antes o despues para mover los canales.");
    const selected = new Set(numbers);
    for (const number of numbers) {
      positions(number);
      R.assert(occupied(image, number), `El canal Quansheng ${number} esta vacio.`);
    }
    if (selected.has(target)) return image.slice();
    const order = Array.from({ length: 1024 }, (_, index) => index + 1);
    const moving = order.filter(number => selected.has(number));
    const remaining = order.filter(number => !selected.has(number));
    remaining.splice(remaining.indexOf(target) + (placement === "after" ? 1 : 0), 0, ...moving);
    const result = image.slice();
    remaining.forEach((source, index) => {
      if (source !== index + 1) copyRaw(result, image, source, index + 1);
    });
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
    updateQuanshengChannel, deleteQuanshengChannel, copyQuanshengChannel, moveQuanshengChannel, assignQuanshengScanList,
    groupQuanshengChannels, readQuanshengMemory, plannedQuanshengMemory, insertQuanshengMemory, moveQuanshengChannels });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
