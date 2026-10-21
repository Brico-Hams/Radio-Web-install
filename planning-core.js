(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const S = typeof module !== "undefined" ? require("satellite.js") : root.satellite;
  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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
      `RX ONLY. TX nominal ${channel.tx}; tono de proveedor ${channel.tone || "sin dato"}. ${channel.source || ""} ${channel.attribution || ""} ${channel.license || ""}`]));
    return rows.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
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
    const location = { latitude: observer.latitude * Math.PI / 180, longitude: observer.longitude * Math.PI / 180, height: observer.height };
    function look(time) {
      const date = new Date(time);
      const state = S.propagate(record, date);
      R.assert(state && state.position && record.error === 0, "Fallo SGP4: orbita no propagable.");
      const position = S.eciToEcf(state.position, S.gstime(date));
      const angles = S.ecfToLookAngles(location, position);
      R.assert(Number.isFinite(angles.elevation), "Prediccion orbital no finita.");
      return { time, elevation: angles.elevation * 180 / Math.PI, azimuth: angles.azimuth * 180 / Math.PI, rangeKm: angles.rangeSat };
    }
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
  Object.assign(R, { norm, asciiName, normalizeRepeaters, filterRecords, channelCSV, validateTLE, validateSatellitesFile, validateSatelliteEntry, pickSatellite, satelliteAgeWarning, predictPasses, satelliteChannel, csvCell });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
