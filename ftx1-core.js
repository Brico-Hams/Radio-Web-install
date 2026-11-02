(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const MODES = Object.freeze({ 1: "LSB", 2: "USB", 3: "CW-U", 4: "FM", 5: "AM", 6: "RTTY-L", 7: "CW-L", 8: "DATA-L",
    9: "RTTY-U", A: "DATA-FM", B: "FM-N", C: "DATA-U", D: "AM-N", E: "PSK", F: "DATA-FM-N", H: "C4FM-DN", I: "C4FM-VW" });
  const TONE_MODES = Object.freeze({ 0: "OFF", 1: "CTCSS ENC/DEC", 2: "CTCSS ENC", 3: "DCS", 4: "PR FREQ", 5: "REV TONE" });
  const SHIFTS = Object.freeze({ 0: "Simplex", 1: "Plus shift", 2: "Minus shift" });
  const MIN_CHANNEL = 1;
  const MAX_CHANNEL = 999;
  const MIN_HZ = 30000;
  const MAX_HZ = 470000000;
  const MAX_CLAR = 9990;
  const ID_ANSWER = "ID0840;";
  const MEMORY_ANSWER = /^MR(\d{5})(\d{9})([+-])(\d{4})([01])([01])([0-9A-I])([0-5])([0-5])00([0-2]);$/;
  const TAG_ANSWER = /^MT(\d{5})([\x20-\x7e]{12});$/;
  const MENU_ANSWER = /^EX(\d{2})(\d{2})(\d{2})([\x20-\x7e]*);$/;
  const pad = (value, length) => String(value).padStart(length, "0");
  const menuKey = item => `${item.p1}${item.p2}${item.p3}`;
  const menuItems = () => R.FTX1_MENU || [];
  const itemByKey = key => menuItems().find(item => menuKey(item) === key);

  function checkChannel(channel) {
    R.assert(Number.isInteger(channel) && channel >= MIN_CHANNEL && channel <= MAX_CHANNEL, "Canal fuera de rango 1-999.");
    return channel;
  }
  function checkName(name) {
    R.assert(typeof name === "string" && /^[\x20-\x7e]{0,12}$/.test(name) && !name.includes(";"),
      "Nombre no valido: maximo 12 caracteres ASCII imprimibles, sin punto y coma.");
    return name.trimEnd();
  }
  function normalizeMemory(input) {
    R.assert(input && typeof input === "object", "Memoria no valida.");
    const channel = checkChannel(input.channel);
    R.assert(Number.isInteger(input.frequencyHz) && input.frequencyHz >= MIN_HZ && input.frequencyHz <= MAX_HZ,
      "Frecuencia fuera de 30000 Hz - 470000000 Hz.");
    R.assert(input.clarDirection === "+" || input.clarDirection === "-", "Direccion de clarificador no valida.");
    R.assert(Number.isInteger(input.clarOffsetHz) && input.clarOffsetHz >= 0 && input.clarOffsetHz <= MAX_CLAR,
      "Offset de clarificador fuera de 0-9990 Hz.");
    R.assert(typeof input.rxClar === "boolean" && typeof input.txClar === "boolean", "Estado de clarificador no valido.");
    R.assert(typeof input.mode === "string" && Object.hasOwn(MODES, input.mode), "Modo no admitido por el FTX-1.");
    const channelType = input.channelType === undefined ? "1" : input.channelType;
    R.assert(typeof channelType === "string" && /^[0-5]$/.test(channelType), "Tipo de canal no valido.");
    R.assert(typeof input.toneMode === "string" && Object.hasOwn(TONE_MODES, input.toneMode), "Modo de tono no valido.");
    R.assert(typeof input.shift === "string" && Object.hasOwn(SHIFTS, input.shift), "Desplazamiento no valido.");
    return { channel, frequencyHz: input.frequencyHz, clarDirection: input.clarDirection,
      clarOffsetHz: input.clarOffsetHz, rxClar: input.rxClar, txClar: input.txClar, mode: input.mode,
      channelType, toneMode: input.toneMode, shift: input.shift };
  }
  function parseMemory(answer) {
    if (answer === "?;") return null;
    const match = MEMORY_ANSWER.exec(String(answer));
    R.assert(match, "Respuesta MR no valida.");
    return normalizeMemory({ channel: Number(match[1]), frequencyHz: Number(match[2]), clarDirection: match[3],
      clarOffsetHz: Number(match[4]), rxClar: match[5] === "1", txClar: match[6] === "1", mode: match[7],
      channelType: match[8], toneMode: match[9], shift: match[10] });
  }
  function memoryWriteCommand(memory) {
    const m = normalizeMemory(memory);
    return `MW${pad(m.channel, 5)}${pad(m.frequencyHz, 9)}${m.clarDirection}${pad(m.clarOffsetHz, 4)}` +
      `${m.rxClar ? 1 : 0}${m.txClar ? 1 : 0}${m.mode}${m.channelType}${m.toneMode}00${m.shift};`;
  }
  function parseTag(answer, channel) {
    if (answer === "?;") return "";
    const match = TAG_ANSWER.exec(String(answer));
    R.assert(match, "Respuesta MT no valida.");
    R.assert(Number(match[1]) === checkChannel(channel), "Respuesta MT de otro canal.");
    return match[2].trimEnd();
  }
  function tagWriteCommand(channel, name) {
    return `MT${pad(checkChannel(channel), 5)}${checkName(name).padEnd(12, " ")};`;
  }
  const memoryReadCommand = channel => `MR${pad(checkChannel(channel), 5)};`;
  const tagReadCommand = channel => `MT${pad(checkChannel(channel), 5)};`;

  const menuReadCommand = item => `EX${item.p1}${item.p2}${item.p3};`;
  function parseMenuAnswer(item, answer) {
    if (answer === "?;") return null;
    const match = MENU_ANSWER.exec(String(answer));
    R.assert(match && match[1] === item.p1 && match[2] === item.p2 && match[3] === item.p3, "Respuesta EX no valida.");
    return match[4];
  }
  // Shape check shared by reads, writes and backup restore; it does not forbid read-only items.
  // The length the radio answers wins over the manual: a real FTX-1 returns DCS CODE with 3 digits, not 2.
  function checkMenuValue(item, value, previous) {
    R.assert(typeof value === "string", "Valor de menu no valido.");
    const read = typeof previous === "string" && previous.length > 0 ? previous.length : null;
    const length = item.kind === "text" ? Math.max(item.digits ?? 0, read ?? 0) || null : read ?? item.digits;
    R.assert(length !== null && length > 0, "Longitud de valor de menu desconocida.");
    let result = value;
    if (item.kind === "text") {
      R.assert(/^[\x20-\x7e]*$/.test(value) && !value.includes(";"), "Texto de menu no valido (ASCII imprimible).");
      R.assert(value.length <= length, "Valor de menu con longitud incorrecta.");
      result = value.padEnd(length, " ");
    } else {
      R.assert(value.length === length, "Valor de menu con longitud incorrecta.");
      if (item.kind === "signed") R.assert(/^[+-]\d+$/.test(value), "Valor con signo de menu no valido.");
      else R.assert(/^\d+$/.test(value), "Valor numerico de menu no valido.");
    }
    if (item.options) R.assert(item.options.some(([option]) => option === result), "Valor de menu fuera de las opciones.");
    return result;
  }
  function validateMenuValue(item, value, previous) {
    R.assert(item && !item.readOnly, "Elemento de menu de solo lectura: no se escribe.");
    return checkMenuValue(item, value, previous);
  }
  function menuWriteCommand(item, value, previous) {
    return `EX${item.p1}${item.p2}${item.p3}${validateMenuValue(item, value, previous)};`;
  }

  const clone = value => JSON.parse(JSON.stringify(value));
  const FIELDS = ["frequencyHz", "mode", "toneMode", "shift", "clarDirection", "clarOffsetHz", "rxClar", "txClar"];
  function diffMemories(before, after) {
    const previous = new Map(before.map(slot => [slot.channel, slot]));
    const result = [];
    for (const slot of after) {
      const old = previous.get(slot.channel) || { channel: slot.channel, empty: true, memory: null, name: "" };
      const changes = [];
      if (old.empty !== slot.empty) changes.push({ field: "empty", from: old.empty, to: slot.empty });
      if (!slot.empty) {
        for (const field of FIELDS) {
          const from = old.empty ? null : old.memory[field];
          if (from !== slot.memory[field]) changes.push({ field, from, to: slot.memory[field] });
        }
        const from = old.empty ? null : old.name;
        if (from !== slot.name) changes.push({ field: "name", from, to: slot.name });
      }
      if (changes.length) result.push({ channel: slot.channel, changes });
    }
    return result.sort((a, b) => a.channel - b.channel);
  }
  function diffMenu(beforeMap, afterMap) {
    const result = [];
    for (const key of Object.keys(afterMap)) {
      const item = itemByKey(key);
      if (!item || item.readOnly || !Object.hasOwn(beforeMap, key)) continue;
      if (beforeMap[key] !== afterMap[key]) result.push({ key, item, from: beforeMap[key], to: afterMap[key] });
    }
    return result;
  }

  function backup(kind, data) {
    R.assert(kind === "memories" || kind === "menu", "Tipo de copia no valido.");
    return { format: "bricohams-ftx1-backup", version: 1, kind, radio: "FTX-1", createdAt: new Date().toISOString(),
      data: clone(data) };
  }
  function readBackup(input) {
    const json = typeof input === "string" ? JSON.parse(input) : input;
    R.assert(json && json.format === "bricohams-ftx1-backup" && json.version === 1 && json.radio === "FTX-1" &&
      (json.kind === "memories" || json.kind === "menu") && typeof json.createdAt === "string",
    "Copia no reconocida: formato, version o tipo incorrectos.");
    if (json.kind === "memories") {
      R.assert(Array.isArray(json.data) && json.data.length <= MAX_CHANNEL, "Copia con datos no validos.");
      const seen = new Set();
      const slots = json.data.map(slot => {
        R.assert(slot && typeof slot === "object" && typeof slot.empty === "boolean", "Copia con datos no validos.");
        const channel = checkChannel(slot.channel);
        R.assert(!seen.has(channel), "Copia con canales repetidos.");
        seen.add(channel);
        if (slot.empty) return { channel, empty: true, memory: null, name: "" };
        const memory = normalizeMemory(slot.memory);
        R.assert(memory.channel === channel, "Copia con datos no validos.");
        return { channel, empty: false, memory, name: checkName(slot.name) };
      });
      return { kind: "memories", createdAt: json.createdAt, data: slots.sort((a, b) => a.channel - b.channel) };
    }
    R.assert(json.data && typeof json.data === "object" && !Array.isArray(json.data), "Copia con datos no validos.");
    const values = {};
    for (const [key, value] of Object.entries(json.data)) {
      const item = itemByKey(key);
      R.assert(item, "Copia con elementos de menu desconocidos.");
      values[key] = checkMenuValue(item, value, value);
    }
    return { kind: "menu", createdAt: json.createdAt, data: values };
  }

  const CHIRP_MODES = Object.freeze({ FM: "FM", "FM-N": "NFM", AM: "AM", "AM-N": "NAM", USB: "USB", LSB: "LSB",
    "CW-U": "CW", "CW-L": "CWR" });
  const chirpMode = label => CHIRP_MODES[label] || (label.startsWith("RTTY") ? "RTTY" : "DIG");
  function memoriesCSV(slots) {
    const cell = value => value === "+" || value === "-" ? `"${value}"` : R.csvCell(value);
    const rows = [["Location", "Name", "Frequency", "Duplex", "Offset", "Tone", "rToneFreq", "cToneFreq", "DtcsCode",
      "DtcsPolarity", "Mode", "TStep", "Skip", "Comment"]];
    for (const slot of slots) {
      if (slot.empty) continue;
      const m = slot.memory;
      const tone = m.toneMode === "2" ? "Tone" : m.toneMode === "1" ? "TSQL" : m.toneMode === "3" ? "DTCS" : "";
      rows.push([m.channel, slot.name, (m.frequencyHz / 1e6).toFixed(6), m.shift === "1" ? "+" : m.shift === "2" ? "-" : "",
        "0.000000", tone, "88.5", "88.5", "023", "NN", chirpMode(MODES[m.mode]), "5.00", "",
        `Modo FTX-1 ${MODES[m.mode]}; tono CAT ${TONE_MODES[m.toneMode]}. La frecuencia de tono y el ancho del desplazamiento no se leen por CAT.`]);
    }
    return rows.map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
  }
  function importCSV(text, startChannel, slots) {
    R.assert(Number.isInteger(startChannel) && startChannel >= MIN_CHANNEL && startChannel <= MAX_CHANNEL,
      "Canal de inicio no valido (1-999).");
    const parsed = R.parseChannelCSV(text);
    R.assert(parsed.channels.length > 0, "El CSV no contiene canales validos.");
    R.assert(startChannel + parsed.channels.length - 1 <= MAX_CHANNEL, "El CSV llegaria mas alla del canal 999.");
    const result = clone(slots);
    parsed.channels.forEach((entry, index) => {
      const channel = startChannel + index;
      const rx = Math.round(Number(entry.rx) * 1e6);
      const tx = Math.round(Number(entry.tx) * 1e6);
      const slot = { channel, empty: false, name: checkName(R.asciiName(entry.name, 12).replace(/;/g, "-")),
        memory: normalizeMemory({ channel, frequencyHz: rx, clarDirection: "+", clarOffsetHz: 0, rxClar: false,
          txClar: false, mode: entry.narrow ? "B" : "4", channelType: "1", toneMode: "0",
          shift: tx > rx ? "1" : tx < rx ? "2" : "0" }) };
      const position = result.findIndex(item => item.channel === channel);
      if (position < 0) result.push(slot);
      else result[position] = slot;
    });
    result.sort((a, b) => a.channel - b.channel);
    return { slots: result, imported: parsed.channels.length, rejected: parsed.rejected };
  }
  function copySlot(slots, from, to) {
    checkChannel(from);
    checkChannel(to);
    R.assert(from !== to, "Origen y destino deben ser distintos.");
    const source = slots.find(slot => slot.channel === from);
    R.assert(source && !source.empty, "El canal origen esta vacio.");
    const result = clone(slots);
    const copy = clone(source);
    copy.channel = to;
    copy.memory.channel = to;
    const position = result.findIndex(slot => slot.channel === to);
    if (position < 0) result.push(copy);
    else result[position] = copy;
    return result.sort((a, b) => a.channel - b.channel);
  }

  class Ftx1Cat {
    constructor(transport) {
      this.transport = transport;
      this.queue = Promise.resolve();
    }
    command(text, expectAnswer = true) {
      const run = async () => {
        R.assert(/^[\x20-\x7e]+;$/.test(text), "Comando CAT no valido.");
        if (!this.transport.pending) this.transport.clear();
        await this.transport.write(new TextEncoder().encode(text));
        if (!expectAnswer) return "";
        let answer = "";
        while (answer.length < 128) {
          let byte;
          try { [byte] = await this.transport.readExact(1, 2000, false); }
          catch (error) {
            if (error.code === "READ_TIMEOUT") throw new Error("La radio no responde.");
            throw error;
          }
          answer += String.fromCharCode(byte);
          if (byte === 0x3b) return answer;
        }
        throw new Error("Respuesta de la radio demasiado larga.");
      };
      const result = this.queue.then(run);
      this.queue = result.catch(() => {});
      return result;
    }
    async connect() {
      const id = await this.command("ID;");
      R.assert(id === ID_ANSWER, `No es un FTX-1: respuesta ID inesperada (${id}).`);
      await this.command("AI0;", false);
    }
    async readMemory(channel) {
      const memory = parseMemory(await this.command(memoryReadCommand(channel)));
      if (!memory) return { channel, empty: true, memory: null, name: "" };
      R.assert(memory.channel === channel, "Respuesta MR de otro canal.");
      return { channel, empty: false, memory, name: parseTag(await this.command(tagReadCommand(channel)), channel) };
    }
    async readMemories(from, to, onProgress = () => {}) {
      R.assert(Number.isInteger(from) && Number.isInteger(to) && from >= MIN_CHANNEL && to <= MAX_CHANNEL && from <= to,
        "Rango de canales no valido (1-999).");
      const slots = [];
      for (let channel = from; channel <= to; channel++) {
        slots.push(await this.readMemory(channel));
        onProgress(channel - from + 1, to - from + 1);
      }
      return slots;
    }
    async writeMemories(changedSlots, onProgress = () => {}, originals = []) {
      const previous = new Map(originals.map(slot => [slot.channel, slot]));
      const jobs = changedSlots.map(slot => {
        R.assert(slot && !slot.empty, `El canal ${slot?.channel} esta vacio: no hay borrado documentado, no se puede escribir un canal vacio.`);
        const memory = normalizeMemory(slot.memory);
        const name = checkName(slot.name);
        const old = previous.get(memory.channel);
        return { memory, name, command: memoryWriteCommand(memory), tag: !old || old.empty || old.name !== name };
      });
      const verified = [];
      for (const [index, job] of jobs.entries()) {
        const channel = job.memory.channel;
        await this.command(job.command, false);
        if (job.tag) await this.command(tagWriteCommand(channel, job.name), false);
        const back = parseMemory(await this.command(memoryReadCommand(channel)));
        const same = back && FIELDS.every(field => field === "clarDirection"
          ? back.clarOffsetHz === 0 && job.memory.clarOffsetHz === 0 || back[field] === job.memory[field]
          : back[field] === job.memory[field]) && back.channelType === job.memory.channelType;
        const name = job.tag ? parseTag(await this.command(tagReadCommand(channel)), channel) : job.name;
        R.assert(same && name === job.name, `Verificacion fallida en el canal ${channel}: la radio no coincide con lo escrito.`);
        verified.push({ channel, empty: false, memory: back, name });
        onProgress(index + 1, jobs.length);
      }
      return verified;
    }
    async readMenu(items, onProgress = () => {}) {
      const values = {};
      const unavailable = [];
      for (const [index, item] of items.entries()) {
        const value = parseMenuAnswer(item, await this.command(menuReadCommand(item)));
        let valid = value !== null;
        if (valid) {
          try { checkMenuValue(item, value, value); } catch { valid = false; }
        }
        if (valid) values[menuKey(item)] = value;
        else unavailable.push(menuKey(item));
        onProgress(index + 1, items.length);
      }
      return { values, unavailable };
    }
    async writeMenu(changes, onProgress = () => {}) {
      const jobs = changes.map(change => {
        const value = validateMenuValue(change.item, change.to ?? change.value, change.from);
        return { item: change.item, value, command: menuWriteCommand(change.item, value, change.from) };
      });
      const values = {};
      for (const [index, job] of jobs.entries()) {
        await this.command(job.command, false);
        const back = parseMenuAnswer(job.item, await this.command(menuReadCommand(job.item)));
        // Text items may come back without the trailing padding (an empty APRS CALLSIGN answers "EX060105;").
        const same = job.item.kind === "text" ? back?.trimEnd() === job.value.trimEnd() : back === job.value;
        R.assert(same, `Verificacion fallida en el menu ${job.item.name}: la radio no coincide con lo escrito.`);
        values[menuKey(job.item)] = back;
        onProgress(index + 1, jobs.length);
      }
      return values;
    }
  }

  Object.assign(R, { FTX1_MODES: MODES, FTX1_TONE_MODES: TONE_MODES, FTX1_SHIFTS: SHIFTS, ftx1MenuKey: menuKey,
    parseFtx1Memory: parseMemory, ftx1MemoryWriteCommand: memoryWriteCommand, parseFtx1Tag: parseTag,
    ftx1TagWriteCommand: tagWriteCommand, ftx1MenuReadCommand: menuReadCommand, parseFtx1MenuAnswer: parseMenuAnswer,
    validateFtx1MenuValue: validateMenuValue, ftx1MenuWriteCommand: menuWriteCommand,
    diffFtx1Memories: diffMemories, diffFtx1Menu: diffMenu, ftx1Backup: backup, readFtx1Backup: readBackup,
    ftx1MemoriesCSV: memoriesCSV, ftx1ImportCSV: importCSV, ftx1CopySlot: copySlot, Ftx1Cat });
  if (typeof module !== "undefined") module.exports = R;
})(typeof globalThis !== "undefined" ? globalThis : this);
