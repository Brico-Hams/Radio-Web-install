(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const S = typeof module !== "undefined" ? require("satellite.js") : root.satellite;
  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const remerSource = "Referencia aportada por el usuario: tabla REMER nacional y repetidores de Murcia; fecha no visible, confirmar vigencia con REMER.";
  const remerVHF = Object.freeze([
    { repeater: "R4", channel: "14", rx: "146.70000", tx: "146.10000", tone: "88.5", site: "Lorca" },
    { repeater: "R2", channel: "22", rx: "146.65000", tx: "146.05000", tone: "156.7", site: "Carrascoy" },
    { repeater: "R3", channel: "23", rx: "146.67500", tx: "146.07500", tone: "91.5", site: "Ricote" },
    { repeater: "R4", channel: "24", rx: "146.70000", tx: "146.10000", tone: "91.5", site: "Carche" },
    { repeater: "R2", channel: "32", rx: "146.65000", tx: "146.05000", tone: "103.5", site: "Yecla" },
    { repeater: "R3", channel: "33", rx: "146.67500", tx: "146.07500", tone: "118.8", site: "Espuña" },
    { repeater: "R3", channel: "43", rx: "146.67500", tx: "146.07500", tone: "103.5", site: "Cabo Tinoso" },
    { repeater: "R3", channel: "44", rx: "146.70000", tx: "146.10000", tone: "103.5", site: "San Julian" },
    { repeater: "R1", channel: "", rx: "146.62500", tx: "146.02500", tone: "", site: "Sin ubicacion indicada" },
    { repeater: "R5", channel: "", rx: "146.72500", tx: "146.12500", tone: "", site: "Sin ubicacion indicada" },
    { repeater: "R6", channel: "", rx: "146.75000", tx: "146.15000", tone: "", site: "Sin ubicacion indicada" }
  ]);
  const remerHF = Object.freeze([
    { band: "80 m", channel: "1", frequency: "3.8045" },
    { band: "40 m", channel: "2", frequency: "6.9930" },
    { band: "40 m", channel: "2.1", frequency: "7.3025" },
    { band: "40 m", channel: "2.2", frequency: "7.5430" },
    { band: "40 m", channel: "2.3", frequency: "7.5445" },
    { band: "20 m", channel: "3", frequency: "13.9885" },
    { band: "30 m", channel: "4", frequency: "10.1614" },
    { band: "15 m", channel: "5", frequency: "21.8700" },
    { band: "60 m", channel: "6", frequency: "5.3565" }
  ]);
  function remerVHFChannels() {
    const shortSite = value => ({
      Lorca: "LORC", Carrascoy: "CARR", Ricote: "RIC", Carche: "CARCH",
      Yecla: "YECLA", Espuna: "ESP", "Cabo Tinoso": "CABO", "San Julian": "SANJ"
    }[value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")] || value.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""));
    return remerVHF.map(entry => ({
      key: `remer:${entry.repeater}:${entry.channel || entry.rx}`,
      name: `${entry.site === "Sin ubicacion indicada" ? entry.repeater : shortSite(entry.site)}-${entry.repeater}${entry.channel ? `-${entry.channel}` : ""}`,
      rx: entry.rx, tx: entry.tx, mode: 0, colorCode: 0, timeslot: 1, rxOnly: true,
      country: "Spain", region: "Murcia", city: entry.site, tone: entry.tone,
      source: remerSource, zone: "REMER Murcia",
      notes: `${entry.site}. CTCSS publicado ${entry.tone ? `${entry.tone} Hz` : "no indicado"}; el editor conserva el dato como nota, no programa tonos.`
    }));
  }
  function remerHFChannels() {
    return remerHF.map(entry => ({ ...entry, mode: "SSB", source: remerSource }));
  }
  function asciiName(value, length = 16) {
    const name = String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "").trim().slice(0, length);
    R.assert(name.length > 0, "Nombre sin caracteres ASCII utilizables.");
    return name;
  }
  function validMHz(value) {
    R.assert(/^\d{1,3}(?:\.\d{1,5})?$/.test(String(value)), "Frecuencia no representable en pasos de 10 Hz.");
    const mhz = Number(value);
    R.assert((mhz >= 136 && mhz <= 174) || (mhz >= 400 && mhz <= 470), "Solo se importan VHF 136-174 / UHF 400-470 MHz. Comprueba las bandas de tu modelo.");
    return mhz.toFixed(5);
  }
  function normalizeRepeaters(payload, mode) {
    R.assert(["FM", "DMR"].includes(mode), "Modo no admitido.");
    R.assert(payload && Array.isArray(payload.results) && payload.results.length <= 30000, "Se requiere JSON de exportacion RepeaterBook con results (maximo 30000).");
    const entries = [];
    const rejected = [];
    const seen = new Set();
    for (let index = 0; index < payload.results.length; index++) {
      const row = payload.results[index];
      try {
        R.assert(row && typeof row === "object", "Registro no valido.");
        R.assert(norm(row[mode === "FM" ? "FM Analog" : "DMR"]) === "yes", `No consta soporte ${mode}.`);
        const status = row["Operational Status"];
        R.assert(!status || norm(status) === "on-air", "No figura operativo.");
        const rx = validMHz(row.Frequency);
        const tx = validMHz(row["Input Freq"]);
        const name = asciiName(row.Callsign || row.Landmark);
        const cc = Number(row["DMR Color Code"]);
        R.assert(mode !== "DMR" || (row["DMR Color Code"] !== "" && row["DMR Color Code"] != null && Number.isInteger(cc) && cc >= 0 && cc <= 15), "Color Code DMR ausente/invalido.");
        const key = `${mode}:${rx}:${tx}:${name}`;
        if (seen.has(key)) { rejected.push({ index: index + 1, reason: "Duplicado en la consulta." }); continue; }
        seen.add(key);
        entries.push({ key, name, rx, tx, mode: mode === "DMR" ? 1 : 0, colorCode: mode === "DMR" ? cc : 0,
          country: String(row.Country || ""), region: String(row.State || row.Region || ""),
          city: String(row["Nearest City"] || row.Landmark || ""), tone: String(row.PL || ""),
          source: "https://www.repeaterbook.com", rxOnly: true });
      } catch (error) { rejected.push({ index: index + 1, reason: error.message }); }
    }
    return { entries, rejected };
  }
  function filterRecords(entries, { country = "", region = "", query = "", band = "both" }) {
    return entries.filter(entry => (!country || norm(entry.country).includes(norm(country))) &&
      (!region || norm(`${entry.region} ${entry.city}`).includes(norm(region))) &&
      (!query || norm(`${entry.name} ${entry.callsign || ""} ${entry.id || ""}`).includes(norm(query))) &&
      (!entry.rx || band === "both" || (band === "vhf" ? Number(entry.rx) < 200 : Number(entry.rx) >= 400)));
  }
  function csvCell(value) {
    let text = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }
  function channelCSV(channels) {
    R.assert(channels.length > 0 && channels.every(channel => channel.mode === 0), "CSV CHIRP: solo canales FM, nunca DMR.");
    const rows = [["Location", "Name", "Frequency", "Duplex", "Offset", "Tone", "rToneFreq", "cToneFreq", "DtcsCode", "DtcsPolarity", "RxDtcsCode", "CrossMode", "Mode", "TStep", "Skip", "Comment"]];
    channels.forEach((channel, index) => rows.push([index, asciiName(channel.name, 10), validMHz(channel.rx), "off", "0.000000",
      "", "88.5", "88.5", "023", "NN", "023", "Tone->Tone", "FM", "5.00", "",
      `RX ONLY. ${channel.window ? `Doppler ${channel.window}, error max. ${channel.errorHz} Hz. ` : ""}TX nominal ${channel.tx}; tono de proveedor ${channel.tone || "sin dato"}. ${channel.source || ""} ${channel.attribution || ""} ${channel.license || ""}`]));
    return rows.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }
  function parseChannelCSV(text) {
    R.assert(typeof text === "string" && text.length > 0 && text.length <= 8 * 1024 * 1024,
      "CSV de canales vacio o superior a 8 MiB.");
    const rows = [];
    let row = [];
    let value = "";
    let quoted = false;
    let closedQuote = false;
    for (let index = 0; index < text.length; index++) {
      const character = text[index];
      if (quoted) {
        if (character === '"' && text[index + 1] === '"') { value += '"'; index++; }
        else if (character === '"') { quoted = false; closedQuote = true; }
        else value += character;
      } else if (closedQuote && character === "\r" && text[index + 1] === "\n") {
        continue;
      } else if (character === ",") { row.push(value); value = ""; closedQuote = false; }
      else if (character === "\n") {
        row.push(value.replace(/\r$/, "")); value = "";
        if (row.some(cellValue => cellValue !== "")) rows.push(row);
        row = [];
        closedQuote = false;
        R.assert(rows.length <= 4097, "CSV superior al maximo de 4096 registros.");
      } else if (closedQuote) R.assert(false, "CSV con caracteres tras una comilla de cierre.");
      else if (character === '"' && value.length === 0) quoted = true;
      else if (character === '"') R.assert(false, "CSV con comilla sin escapar.");
      else value += character;
    }
    R.assert(!quoted, "CSV con comillas sin cerrar.");
    if (row.length || value.length) {
      row.push(value.replace(/\r$/, ""));
      if (row.some(cellValue => cellValue !== "")) rows.push(row);
    }
    R.assert(rows.length >= 2, "CSV sin filas de canales.");
    const headers = rows[0].map((header, index) => norm(index === 0 ? header.replace(/^\uFEFF/, "") : header));
    R.assert(new Set(headers).size === headers.length, "CSV con columnas duplicadas.");
    const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]));
    const column = (record, name) => {
      const position = headerIndex[norm(name)];
      return position === undefined ? "" : String(record[position] ?? "").trim();
    };
    const openGD77 = ["channel name", "channel type", "rx frequency", "tx frequency"]
      .every(header => Object.hasOwn(headerIndex, header));
    const chirp = ["name", "frequency", "duplex", "offset", "mode"]
      .every(header => Object.hasOwn(headerIndex, header));
    R.assert(openGD77 || chirp,
      "Formato CSV no reconocido. Admite OpenGD77 CPS Channels.csv o CHIRP; no convierte exportaciones propietarias.");
    const channels = [];
    const rejected = [];
    const seen = new Set();
    const parseMHz = (input, label) => {
      const frequency = String(input).replace(/\s/g, "");
      R.assert(/^\d{1,3}(?:\.\d{1,5})?$/.test(frequency), `${label}: frecuencia MHz invalida.`);
      return validMHz(frequency);
    };
    for (let index = 1; index < rows.length; index++) {
      const record = rows[index];
      try {
        R.assert(record.length <= headers.length, "La fila tiene mas campos que la cabecera.");
        let name;
        let rx;
        let tx;
        let notes;
        if (openGD77) {
          const type = norm(column(record, "Channel Type"));
          R.assert(type === "analogue", type === "digital"
            ? "DMR omitido: contactos, TG Lists y referencias CPS no se migran automaticamente."
            : "Tipo de canal OpenGD77 no admitido.");
          name = asciiName(column(record, "Channel Name"), 16);
          rx = parseMHz(column(record, "Rx Frequency"), "RX");
          tx = parseMHz(column(record, "Tx Frequency"), "TX");
          const rxTone = column(record, "RX Tone");
          const txTone = column(record, "TX Tone");
          notes = `OpenGD77 CPS CSV; solo RX. Tonos de origen RX=${rxTone || "sin dato"}, TX=${txTone || "sin dato"}; revisar en CPS.`;
        } else {
          const mode = norm(column(record, "Mode"));
          R.assert(mode === "fm" || mode === "nfm", `Modo CHIRP ${mode || "vacio"} no convertido (solo FM/NFM).`);
          name = asciiName(column(record, "Name"), 16);
          rx = parseMHz(column(record, "Frequency"), "RX");
          const duplex = norm(column(record, "Duplex"));
          const offsetText = column(record, "Offset").replace(/\s/g, "");
          if (duplex === "off" || duplex === "") tx = rx;
          else if (duplex === "+" || duplex === "-") {
            R.assert(/^\d{1,3}(?:\.\d{1,5})?$/.test(offsetText), "Offset CHIRP invalido.");
            const offset = Number(offsetText);
            R.assert(offset > 0, "Offset CHIRP debe ser mayor que cero.");
            tx = parseMHz((Number(rx) + (duplex === "+" ? offset : -offset)).toFixed(5), "TX");
          } else if (duplex === "split") tx = parseMHz(offsetText, "TX split");
          else throw new Error(`Duplex CHIRP ${duplex} no admitido.`);
          const tone = column(record, "Tone");
          notes = `CHIRP ${mode.toUpperCase()} CSV; solo RX. Tono de origen ${tone || "sin dato"} no programado.`;
        }
        const key = `csv:${rx}:${tx}:${name}:${openGD77 ? "opengd77" : "chirp"}`;
        if (seen.has(key)) { rejected.push({ row: index + 1, reason: "Canal duplicado en el CSV." }); continue; }
        seen.add(key);
        channels.push({ key, name, rx, tx, mode: 0, colorCode: 0, timeslot: 1,
          rxOnly: true, country: "", region: "", city: "", tone: "", zone: openGD77 ? "OpenGD77 CSV" : "CHIRP CSV",
          source: openGD77 ? "Importacion de OpenGD77 CPS Channels.csv" : "Importacion de CSV CHIRP", notes });
      } catch (error) {
        rejected.push({ row: index + 1, reason: error.message });
      }
    }
    return { format: openGD77 ? "OpenGD77 CPS" : "CHIRP", channels, rejected };
  }
  function validateTLE(orbital, now = Date.now()) {
    R.assert(orbital && typeof orbital.tle1 === "string" && typeof orbital.tle2 === "string", "Faltan lineas TLE.");
    const lines = [orbital.tle1, orbital.tle2];
    for (let index = 0; index < 2; index++) {
      const line = lines[index];
      R.assert(line.length === 69 && line[0] === String(index + 1) && /^\d$/.test(line[68]), "Longitud/numero/checksum de linea TLE incorrectos.");
      let checksum = 0;
      for (const char of line.slice(0, 68)) checksum += /\d/.test(char) ? Number(char) : char === "-" ? 1 : 0;
      R.assert(checksum % 10 === Number(line[68]), "Checksum TLE incorrecto.");
    }
    R.assert(lines.every(line => Number(line.slice(2, 7)) === Number(orbital.norad)), "NORAD TLE inconsistente.");
    const record = S.twoline2satrec(...lines);
    R.assert(record.error === 0 && Number.isFinite(record.jdsatepoch), "Elementos orbitales no propagables.");
    const epoch = (record.jdsatepoch - 2440587.5) * 86400000;
    R.assert(now - epoch <= 7 * 86400000 && epoch - now <= 86400000, "TLE caducado (>7 dias) o con epoca futura (>24 h). Actualiza los elementos.");
    return { record, epoch };
  }
  function validateSatellitesFile(json) {
    R.assert(json && json.format === "radio-workspace-satellites" && json.version === 1 && Array.isArray(json.satellites) &&
      typeof json.attribution === "string" && typeof json.license === "string" && Number.isFinite(Date.parse(json.fetchedAt)),
    "Archivo de satelites: formato o version no reconocidos.");
    return json;
  }
  function validateSatelliteEntry(entry, now = Date.now()) {
    R.assert(entry && Number.isInteger(entry.norad) && entry.norad > 0 && entry.norad < 100000 && typeof entry.name === "string" &&
      typeof entry.source === "string" && typeof entry.stale === "boolean" && Array.isArray(entry.transmitters) &&
      Number.isFinite(Date.parse(entry.fetchedAt)), "registro de satelite no valido.");
    return validateTLE(entry, now);
  }
  // Client-facing lookup: only the requested satellite must be valid, so one bad entry does not hide the others.
  function pickSatellite(file, norad) {
    validateSatellitesFile(file);
    const sat = file.satellites.find(item => item && item.norad === Number(norad));
    R.assert(sat, "Satelite no incluido en la lista diaria. Usa la version instalada para otros NORAD.");
    try { validateSatelliteEntry(sat, Date.parse(sat.fetchedAt)); } // valid when fetched; use-time age is re-checked by the caller
    catch (error) { throw new Error(`Datos del satelite ${norad} no validos en la lista diaria: ${error.message}`); }
    return sat;
  }
  function satelliteAgeWarning(file, now = Date.now()) {
    const age = now - Date.parse(file.fetchedAt);
    return age > 7 * 86400000 ? `Aviso: la lista de satelites tiene ${Math.floor(age / 86400000)} dias (mas de 7 dias); los elementos pueden no ser fiables.` : null;
  }
  function lookFor(record, observer) {
    const location = { latitude: observer.latitude * Math.PI / 180, longitude: observer.longitude * Math.PI / 180, height: observer.height };
    return function look(time) {
      const date = new Date(time);
      const state = S.propagate(record, date);
      R.assert(state && state.position && record.error === 0, "Fallo SGP4: orbita no propagable.");
      const position = S.eciToEcf(state.position, S.gstime(date));
      const angles = S.ecfToLookAngles(location, position);
      R.assert(Number.isFinite(angles.elevation), "Prediccion orbital no finita.");
      return { time, elevation: angles.elevation * 180 / Math.PI, azimuth: angles.azimuth * 180 / Math.PI, rangeKm: angles.rangeSat };
    };
  }
  function predictPasses(orbital, observer, options = {}) {
    const start = options.start ?? Date.now();
    const hours = options.hours ?? 24;
    const minimum = options.minimum ?? 10;
    R.assert(Number.isFinite(start) && Number.isFinite(hours) && hours > 0 && hours <= 48 &&
      Number.isFinite(minimum) && minimum >= 0 && minimum <= 60, "Ventana/elevacion de prediccion no validas.");
    R.assert(Number.isFinite(observer.latitude) && Math.abs(observer.latitude) <= 90 &&
      Number.isFinite(observer.longitude) && Math.abs(observer.longitude) <= 180 &&
      Number.isFinite(observer.height) && observer.height >= -0.5 && observer.height <= 9, "Posicion no valida (altura en km).");
    const { record, epoch } = validateTLE(orbital, start);
    R.assert(start + hours * 3600000 - epoch <= 7 * 86400000, "La ventana supera la validez maxima de siete dias del TLE.");
    const look = lookFor(record, observer);
    function crossing(left, right, rising) {
      while (right - left > 500) {
        const middle = (left + right) / 2;
        if ((look(middle).elevation >= minimum) === rising) right = middle; else left = middle;
      }
      return look((left + right) / 2);
    }
    const end = start + hours * 3600000;
    const passes = [];
    let previous = look(start);
    let current = previous.elevation >= minimum ? { aos: previous, maximum: previous, partialStart: true } : null;
    for (let time = Math.min(start + 5000, end); ; time = Math.min(time + 5000, end)) {
      const point = look(time);
      if (!current && point.elevation >= minimum) current = { aos: crossing(previous.time, time, true), maximum: point, partialStart: false };
      if (current) {
        if (point.elevation > current.maximum.elevation) current.maximum = point;
        if (point.elevation < minimum) {
          current.los = crossing(previous.time, time, false);
          passes.push(current);
          current = null;
        }
      }
      previous = point;
      if (time === end) break;
    }
    if (current) passes.push({ ...current, los: look(end), partialEnd: true });
    return { norad: orbital.norad, name: orbital.name, epoch: new Date(epoch).toISOString(),
      source: orbital.source, calculatedAt: new Date().toISOString(), start: new Date(start).toISOString(),
      hours, minimumElevation: minimum, observer: { ...observer }, sampleSeconds: 5, passes };
  }
  function satelliteChannel(orbital, transmitter) {
    R.assert(transmitter && ["FM", "FMN"].includes(transmitter.mode) &&
      Number.isFinite(transmitter.downlink) && (!transmitter.downlinkHigh || transmitter.downlinkHigh === transmitter.downlink),
    "Solo se preparan frecuencias puntuales FM/FM estrecha, no transpondedores lineales ni datos.");
    const rx = validMHz((transmitter.downlink / 1000000).toFixed(5));
    return { key: `sat:${orbital.norad}:${transmitter.id}`, name: asciiName(orbital.name), rx,
      tx: rx, mode: 0, colorCode: 0, rxOnly: true, source: transmitter.source,
      tone: "", note: "Solo RX nominal. Sin seguimiento Doppler ni control automatico de la radio.", norad: orbital.norad,
      attribution: transmitter.attribution || "SatNOGS DB / Libre Space Foundation (CC BY-SA 4.0).",
      license: transmitter.license || "https://creativecommons.org/licenses/by-sa/4.0/" };
  }
  const LIGHT_KM_S = 299792.458;
  // Received frequency for a downlink at `time`: range rate from a centred 1 s difference (km/s, positive = receding).
  function dopplerHz(look, downlinkHz, time) {
    const rangeRate = look(time + 500).rangeKm - look(time - 500).rangeKm;
    return downlinkHz * (1 - rangeRate / LIGHT_KM_S);
  }
  function catPassTarget(orbital, transmitter, pass, observer, time = Date.now()) {
    R.assert(Number.isFinite(time) && pass && Number.isFinite(pass.aos?.time) &&
      Number.isFinite(pass.los?.time) && pass.los.time > pass.aos.time &&
      pass.los.time - pass.aos.time <= 2 * 3600000, "Pase CAT no valido.");
    R.assert(time >= pass.aos.time && time < pass.los.time, "Fuera del pase CAT seleccionado.");
    R.assert(observer && Number.isFinite(observer.latitude) && Math.abs(observer.latitude) <= 90 &&
      Number.isFinite(observer.longitude) && Math.abs(observer.longitude) <= 180 &&
      Number.isFinite(observer.height) && observer.height >= -0.5 && observer.height <= 9, "Posicion CAT no valida.");
    satelliteChannel(orbital, transmitter);
    const { record } = validateTLE(orbital, time);
    const look = lookFor(record, observer);
    const position = look(time);
    R.assert(position.elevation >= 0, "Satelite bajo el horizonte; CAT detenido.");
    const frequency10Hz = Math.round(dopplerHz(look, transmitter.downlink, time) / 10);
    R.assert(Number.isInteger(frequency10Hz) &&
      ((frequency10Hz >= 13600000 && frequency10Hz <= 17400000) ||
      (frequency10Hz >= 40000000 && frequency10Hz <= 47000000)), "Doppler CAT fuera de banda RX.");
    return { frequency10Hz, elevation: position.elevation, azimuth: position.azimuth, time };
  }
  class CatPassTracker {
    constructor(connector, plan, clock = () => Date.now()) {
      this.connector = connector;
      this.plan = structuredClone(plan);
      this.clock = clock;
      this.active = false;
      this.inFlight = null;
      this.lastTime = null;
      this.started = false;
      this.stopPromise = null;
    }
    async start() {
      R.assert(!this.started && !this.stopPromise, "Crea una sesion CAT nueva para cada inicio.");
      this.started = true;
      catPassTarget(this.plan.orbital, this.plan.transmitter, this.plan.pass, this.plan.observer, this.clock());
      this.active = true;
      return this.step();
    }
    async step() {
      R.assert(this.active && !this.inFlight, "Seguimiento CAT inactivo u ocupado.");
      const task = async () => {
        const time = this.clock();
        R.assert(this.lastTime === null || time > this.lastTime && time - this.lastTime <= 2000,
          "Reloj o intervalo CAT discontinuo; reinicia el seguimiento.");
        const target = catPassTarget(this.plan.orbital, this.plan.transmitter, this.plan.pass, this.plan.observer, time);
        this.lastTime = time;
        const state = await this.connector.setCatReceive(target.frequency10Hz);
        if (!this.active) return null;
        R.assert(this.clock() - time >= 0 && this.clock() - time < 2000,
          "Confirmacion CAT demasiado tardia; reinicia el seguimiento.");
        return { ...target, state };
      };
      const operation = task();
      this.inFlight = operation;
      try { return await operation; }
      catch (error) { this.active = false; throw error; }
      finally { if (this.inFlight === operation) this.inFlight = null; }
    }
    stop() {
      this.active = false;
      if (!this.stopPromise) this.stopPromise = this.finishStop();
      return this.stopPromise;
    }
    async finishStop() {
      const errors = [];
      if (this.inFlight) {
        try { await this.inFlight; } catch (error) { errors.push(error); }
      }
      if (this.connector.connected) {
        try { await this.connector.stopCatReceive(); } catch (error) { errors.push(error); }
      } else {
        errors.push(new Error("Sin conexion CAT: restauracion no confirmada; esperar caducidad del lease en el firmware."));
      }
      if (errors.length) throw new AggregateError(errors, "Seguimiento CAT detenido sin restauracion confirmada");
    }
  }
  // Splits one pass into equal frequency steps (short windows around closest approach), so every RX-only
  // memory is within half a step of the received frequency for its whole window.
  function dopplerChannels(orbital, transmitter, pass, observer, segments = 5) {
    R.assert(Number.isInteger(segments) && segments >= 1 && segments <= 10, "Entre 1 y 10 canales Doppler por pase.");
    R.assert(pass && Number.isFinite(pass.aos?.time) && Number.isFinite(pass.los?.time) && pass.los.time > pass.aos.time, "Pase no valido.");
    const base = satelliteChannel(orbital, transmitter);
    const { record } = validateTLE(orbital, pass.aos.time);
    const look = lookFor(record, observer);
    const at = time => dopplerHz(look, transmitter.downlink, time);
    const first = at(pass.aos.time), last = at(pass.los.time);
    // Within one pass the range rate only grows, so the received frequency falls monotonically.
    R.assert(first > last, "Doppler no monotono en este pase; usa el canal nominal.");
    const level = index => first + (last - first) * index / segments;
    const edges = [pass.aos.time];
    for (let index = 1; index < segments; index++) {
      let left = edges[index - 1], right = pass.los.time;
      while (right - left > 500) { const middle = (left + right) / 2; if (at(middle) > level(index)) left = middle; else right = middle; }
      edges.push((left + right) / 2);
    }
    edges.push(pass.los.time);
    const label = asciiName(orbital.name.replace(/\s*\(.*?\)\s*/g, " ").trim() || orbital.name, 7);
    const channels = [];
    for (let index = 0; index < segments; index++) {
      const from = edges[index], to = edges[index + 1];
      const centre = (level(index) + level(index + 1)) / 2;
      const window = `${new Date(from).toISOString().slice(11, 19)}-${new Date(to).toISOString().slice(11, 19)} UTC`;
      const rx = validMHz((centre / 1000000).toFixed(5));
      const tunedHz = Number(rx) * 1000000;
      const errorHz = Math.ceil(Math.max(Math.abs(at(from) - tunedHz), Math.abs(at(to) - tunedHz)));
      channels.push({ ...base, key: `${base.key}:${pass.aos.time}:${index}`, name: asciiName(`${label} ${index + 1}`, 10), rx, tx: rx,
        window, from, to, errorHz: Math.round(errorHz),
        note: `Solo RX. Doppler corregido para ${window} (error max. ${Math.round(errorHz)} Hz). Cambia de memoria al pasar cada ventana.` });
    }
    return channels;
  }
  function pmrChannels() {
    return Array.from({ length: 16 }, (_, index) => {
      const frequency = ((44600625 + index * 1250) / 100000).toFixed(5);
      return { key: `pmr446:${index + 1}`, name: `PMR${String(index + 1).padStart(2, "0")}`,
        rx: frequency, tx: frequency, mode: 0, rxOnly: true, narrow: true, source: "PMR446 analogico solo RX" };
    });
  }
  function normalizeTalkgroups(data, prefix) {
    R.assert(/^\d{1,7}$/.test(String(prefix)), "Prefijo TG: 1-7 digitos.");
    R.assert(data && typeof data === "object" && !Array.isArray(data), "Lista BrandMeister no reconocida.");
    const entries = Object.entries(data).filter(([id]) => id.startsWith(prefix)).map(([id, name]) => {
      R.assert(/^\d+$/.test(id) && Number(id) > 0 && Number(id) <= 0xffffff && typeof name === "string",
        "Grupo BrandMeister invalido.");
      return { id: Number(id), callsign: `TG${id}`, name: name.slice(0, 80), type: 0, source: "https://brandmeister.network" };
    }).sort((a, b) => a.id - b.id);
    R.assert(entries.length > 0 && entries.length <= 1024, "Seleccion TG vacia o superior a 1024. Ajusta el prefijo.");
    return { provider: "BrandMeister", entries };
  }
  Object.assign(R, { norm, asciiName, normalizeRepeaters, filterRecords, channelCSV, parseChannelCSV, validateTLE, validateSatellitesFile, validateSatelliteEntry, pickSatellite, satelliteAgeWarning, predictPasses, satelliteChannel, dopplerChannels, catPassTarget, CatPassTracker, csvCell, pmrChannels, remerVHFChannels, remerHFChannels, normalizeTalkgroups });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
