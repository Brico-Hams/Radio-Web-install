(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const COUNTRIES = Object.freeze([
    ["ES", "España", true], ["GB", "UK", true], ["US", "Estados Unidos", false],
    ["DE", "Alemania", true], ["FR", "Francia", true], ["HU", "Hungría", true], ["IT", "Italia", true]
  ].map(([code, name, pmr]) => ({ code, name, pmr })));
  function validateCountryTemplate(file, code) {
    R.assert(file?.format === "bricohams-country-template" && file.version === 1 &&
      file.country === code && COUNTRIES.some(country => country.code === code) &&
      Number.isFinite(Date.parse(file.fetchedAt)) && typeof file.source === "string" &&
      Array.isArray(file.regions) && Array.isArray(file.channels) && file.channels.length <= 30000,
    "Plantilla de pais no valida.");
    const ids = new Set();
    for (const region of file.regions) {
      R.assert(typeof region.id === "string" && region.id.startsWith(`${code}-`) && !ids.has(region.id) &&
        typeof region.name === "string" && Number.isFinite(region.latitude) && Math.abs(region.latitude) <= 90 &&
        Number.isFinite(region.longitude) && Math.abs(region.longitude) <= 180, "Region de plantilla no valida.");
      ids.add(region.id);
    }
    const keys = new Set();
    for (const entry of file.channels) {
      R.assert(typeof entry.key === "string" && !keys.has(entry.key) && typeof entry.name === "string" &&
        entry.name.length > 0 && entry.name.length <= 16 && entry.rxOnly === true && entry.mode === 0 &&
        ids.has(entry.regionId) && entry.country === code && typeof entry.source === "string",
      "Canal de plantilla no valido.");
      R.validMHz(entry.rx); R.validMHz(entry.tx);
      R.assert((Number(entry.rx) < 350) === (Number(entry.tx) < 350), "RX y TX deben permanecer en la misma banda.");
      keys.add(entry.key);
    }
    return file;
  }
  // Same carrier rule as the generator: 25 kHz / 8.33 kHz carrier grid, never a three-decimal channel designator.
  function airbandRx(value) {
    if (!/^\d{3}\.\d{5}$/.test(String(value))) return false;
    const mhz = Number(value);
    return mhz >= 118 && mhz <= 136.975 && Math.abs(mhz * 120 - Math.round(mhz * 120)) < 0.00061;
  }
  function validateAirportTemplate(file, code) {
    R.assert(file?.format === "bricohams-airport-template" && file.version === 1 && file.country === code &&
      COUNTRIES.some(country => country.code === code) && Number.isFinite(Date.parse(file.fetchedAt)) &&
      typeof file.source === "string" && typeof file.airportsSource === "string" && file.license === "Public Domain" &&
      typeof file.coverage === "string" && file.airports && typeof file.airports === "object" && !Array.isArray(file.airports) &&
      Array.isArray(file.frequencies) && file.frequencies.length <= 100000, "Plantilla de aeropuertos no valida.");
    for (const airport of Object.values(file.airports))
      R.assert(typeof airport.regionId === "string" && airport.regionId.startsWith(`${code}-`) &&
        Number.isFinite(airport.latitude) && Number.isFinite(airport.longitude) && typeof airport.name === "string",
      "Aeropuerto de plantilla no valido.");
    const ids = new Set();
    for (const entry of file.frequencies) {
      R.assert(Number.isInteger(entry.id) && !ids.has(entry.id) && Object.hasOwn(file.airports, entry.ident) &&
        typeof entry.type === "string" && airbandRx(entry.rx), "Frecuencia aeronautica de plantilla no valida.");
      ids.add(entry.id);
    }
    return file;
  }
  // AM RX-only entries: mode "AM" (never 0) so a legacy FM-only writer fails instead of storing them as FM.
  function airportChannels(file) {
    validateAirportTemplate(file, file.country);
    return file.frequencies.map(entry => {
      const airport = file.airports[entry.ident];
      return { key: `ourairports:${entry.id}`, name: R.asciiName(`${entry.ident} ${entry.type}`), callsign: entry.ident,
        ident: entry.ident, airport: airport.name, rx: entry.rx, tx: entry.rx, mode: "AM", rxOnly: true, txLocked: true,
        narrow: false, country: file.country, regionId: airport.regionId, city: airport.municipality || "",
        zone: `${file.country} ${airport.regionId}`, latitude: airport.latitude, longitude: airport.longitude,
        source: `https://ourairports.com/airports/${encodeURIComponent(entry.ident)}/`, sourceId: entry.id,
        license: file.license, attribution: "OurAirports (public domain)",
        notes: `${airport.name}${entry.description ? ` - ${entry.description}` : ""}. AM RX only, published frequency; not for navigation.` };
    });
  }
  function countryTemplateChannels(file, { region = "", query = "", pmr = false, satellites = null, airports = null } = {}) {
    validateCountryTemplate(file, file.country);
    R.assert(!region || file.regions.some(entry => entry.id === region), "Selecciona una region de la plantilla.");
    const search = String(query).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const regions = new Map(file.regions.map((entry, index) => [entry.id, index]));
    const pool = [...file.channels];
    if (airports) {
      R.assert(airports.country === file.country, "Los aeropuertos no pertenecen al pais de la plantilla.");
      const extra = airportChannels(airports);
      R.assert(extra.every(entry => regions.has(entry.regionId)), "Aeropuerto en una region ausente del catalogo.");
      pool.push(...extra);
    }
    const channels = pool.filter(entry => (!region || entry.regionId === region) &&
      `${entry.name} ${entry.city} ${entry.callsign} ${entry.airport || ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().includes(search)).map(entry => ({ ...entry }))
      .sort((a, b) => regions.get(a.regionId) - regions.get(b.regionId));
    if (satellites) {
      R.validateSatellitesFile(satellites);
      for (const orbital of satellites.satellites) {
        R.validateSatelliteEntry(orbital);
        for (const transmitter of orbital.transmitters.filter(fmReceivable))
          channels.push(R.satelliteChannel(orbital, transmitter));
      }
    }
    if (pmr) {
      R.assert(COUNTRIES.find(country => country.code === file.country).pmr, "PMR446 no es una plantilla de Estados Unidos.");
      channels.push(...R.pmrChannels().map(channel => ({ ...channel, country: file.country, regionId: "PMR446", zone: "PMR446" })));
    }
    return [...new Map(channels.map(channel => [channel.key, channel])).values()];
  }
  // Single source of truth shared with data/channel-templates/profiles.json (Android reads that file).
  // No profile writes hardware: they only describe what a model can represent as modulation + TX lock.
  const FM_BANDS = [[136, 174], [400, 470]];
  const PROFILES = Object.freeze({
    radicodex: { label: "RadiCodex", modulations: ["FM", "AM"], bands: { FM: FM_BANDS, AM: [[118, 137]] },
      txLock: "reference-column", output: "reference-csv", extension: "csv" },
    rt950pro: { label: "Radtel RT-950 Pro", modulations: ["FM", "AM"], bands: { FM: FM_BANDS, AM: [[118, 137]] },
      txLock: "reference-column", output: "reference-csv", extension: "csv" },
    uvk5v3: { label: "Quansheng UV-K5 V3", modulations: ["FM", "AM"], bands: { FM: FM_BANDS, AM: [[118, 137]] },
      txLock: "memory-bit", output: "chirp-csv", extension: "csv" },
    d878: { label: "AnyTone AT-D878", modulations: ["FM"], bands: { FM: FM_BANDS },
      txLock: "project-flag", output: "anytone-project", extension: "json" },
    ftx1: { label: "Yaesu FTX-1", modulations: ["FM", "AM"], bands: { FM: FM_BANDS, AM: [[118, 137]] },
      txLock: "reference-column", output: "reference-csv", extension: "csv" }
  });
  // Native importers of the web pages that hold an editable local file; not offered as export models.
  const IMPORT_PROFILES = Object.freeze({
    opengd77: { label: "OpenGD77", modulations: ["FM"], bands: { FM: FM_BANDS }, txLock: "none", output: "local-file" }
  });
  function templateModulation(channel) {
    const mode = channel.mode;
    return mode === undefined || mode === 0 || mode === "FM" ? "FM" : mode === "AM" ? "AM" : mode === 1 || mode === "DMR" ? "DMR" : String(mode);
  }
  // Returns the channels the profile can represent with their modulation and a safe TX lock, and counts the rest by reason.
  function prepareTemplateExport(profileId, channels) {
    const profile = PROFILES[profileId] || IMPORT_PROFILES[profileId];
    R.assert(profile, "Modelo de plantilla desconocido.");
    R.assert(Array.isArray(channels), "Canales de plantilla no validos.");
    const accepted = [], reasons = {};
    const omit = reason => { reasons[reason] = (reasons[reason] || 0) + 1; };
    const inBands = (value, bands) => Number.isFinite(value) && bands.some(([low, high]) => value >= low && value <= high);
    for (const channel of channels) {
      const modulation = templateModulation(channel);
      const rx = Number(channel.rx), tx = Number(channel.tx);
      if (!profile.modulations.includes(modulation)) omit(`modulation:${modulation}`);
      else if (channel.rxOnly !== true) omit("txLock");
      else if (modulation === "AM" && channel.tx !== channel.rx) omit("txLock");
      else if (!inBands(rx, profile.bands[modulation]) || !inBands(tx, profile.bands[modulation]) || (rx < 350) !== (tx < 350)) omit("band");
      else accepted.push(channel);
    }
    const omitted = channels.length - accepted.length;
    const warnings = profile.txLock === "none" ? ["rxOnlyNotGuaranteed"] : [];
    return { profile: profileId, accepted, omitted, reasons, warnings };
  }
  // Native-importer shape: UV-K5 AM goes through the existing `extended` contract (mode 1, TX lock kept).
  function templateImportChannels(profileId, channels) {
    R.assert(profileId === "uvk5v3" || Object.hasOwn(IMPORT_PROFILES, profileId), "Este modelo no tiene importador en esta pagina.");
    const prepared = prepareTemplateExport(profileId, channels);
    prepared.accepted = prepared.accepted.map(channel => templateModulation(channel) === "AM"
      ? { ...channel, mode: 1, extended: true, narrow: false, rxOnly: true } : channel);
    return prepared;
  }
  function chirpAmCSV(channels) {
    const rows = [["Location", "Name", "Frequency", "Duplex", "Offset", "Tone", "rToneFreq", "cToneFreq", "DtcsCode", "DtcsPolarity", "RxDtcsCode", "CrossMode", "Mode", "TStep", "Skip", "Comment"]];
    channels.forEach((channel, index) => rows.push([index, R.asciiName(channel.name, 10), channel.rx, "off", "0.000000",
      "", "88.5", "88.5", "023", "NN", "023", "Tone->Tone", templateModulation(channel) === "AM" ? "AM" : channel.narrow ? "NFM" : "FM", "5.00", "",
      `RX ONLY. Zone: ${channel.regionId || "SAT"}. TX nominal ${channel.tx}; tono de proveedor ${channel.tone || "sin dato"}. ${channel.source || ""} ${channel.notes || ""} ${channel.attribution || ""} ${channel.license || ""}`]));
    return rows.map(row => row.map(R.csvCell).join(",")).join("\r\n") + "\r\n";
  }
  function referenceCSV(channels) {
    const rows = [["Name", "RX_MHz", "TX_nominal_MHz", "Modulation", "RX_Only", "Country", "Region_ID", "Locality", "Identifier", "Key", "Source", "Notes"]];
    for (const c of channels) rows.push([c.name, c.rx, c.tx, templateModulation(c), "Yes", c.country || "", c.regionId || "",
      c.city || "", c.callsign || c.ident || "", c.key, c.source || "", c.notes || ""]);
    return rows.map(row => row.map(R.csvCell).join(",")).join("\r\n") + "\r\n";
  }
  function anytoneProject(channels) {
    return { format: "bricohams-anytone-project", version: 1, profile: "D878", airband: false, fmBroadcast: false,
      channels: channels.map(c => ({ name: R.asciiName(c.name), rx: c.rx, tx: c.tx, mode: "FM", colorCode: 0, timeslot: 1,
        talkgroup: 0, bandwidth: c.narrow === true ? "12.5" : "pending", broadcastOnly: false, rxOnly: true,
        source: String(c.source || "bricohams-template").slice(0, 500), zone: String(c.zone || `${c.country || ""} ${c.regionId || ""}`).trim().slice(0, 64) || "Plantilla",
        notes: String(c.notes || "").slice(0, 1000) })) };
  }
  // Safe export in a format that already exists; omitted channels are counted, never silently dropped. Never a CPS or CAT script.
  function templateExportFile(profileId, channels) {
    R.assert(Object.hasOwn(PROFILES, profileId), "Modelo de plantilla desconocido.");
    const prepared = prepareTemplateExport(profileId, channels), profile = PROFILES[profileId];
    R.assert(prepared.accepted.length > 0, `Ningun canal es representable en ${profile.label} con modo y bloqueo de TX seguros.`);
    let content, mime;
    if (profile.output === "anytone-project") {
      R.assert(prepared.accepted.length <= 4000, "AnyTone admite 4000 canales por proyecto. Selecciona una zona.");
      content = JSON.stringify(anytoneProject(prepared.accepted), null, 2); mime = "application/json";
    }
    else {
      mime = "text/csv;charset=utf-8";
      content = profile.output === "reference-csv" ? referenceCSV(prepared.accepted) :
        chirpAmCSV(prepared.accepted);
    }
    return { ...prepared, label: profile.label, extension: profile.extension, mime, content };
  }
  function fmReceivable(transmitter) {
    return ["FM", "FMN"].includes(transmitter.mode) && Number.isFinite(transmitter.downlink) &&
      (!transmitter.downlinkHigh || transmitter.downlinkHigh === transmitter.downlink) &&
      ((transmitter.downlink >= 136e6 && transmitter.downlink <= 174e6) ||
        (transmitter.downlink >= 400e6 && transmitter.downlink <= 470e6));
  }
  // Operational 7-day passes from predictPasses (5 s sampling) in 48 h windows, inside TLE validity.
  function weeklyTemplatePasses(satellites, observer, now = Date.now()) {
    R.validateSatellitesFile(satellites);
    const passes = [];
    for (const orbital of satellites.satellites) {
      const { epoch } = R.validateSatelliteEntry(orbital, now);
      const end = Math.min(now + 7 * 86400000, epoch + 7 * 86400000);
      const downlink = orbital.transmitters.find(fmReceivable)?.downlink ?? 0;
      let previous = null;
      for (let start = now; end - start >= 60000; start += 48 * 3600000) {
        const hours = Math.min(48, (end - start) / 3600000);
        for (const pass of R.predictPasses(orbital, observer, { start, hours, minimum: 10 }).passes) {
          // A pass cut by the window edge continues as the first pass of the next window.
          if (previous?.partialEnd && pass.partialStart && pass.aos.time - previous.end <= 60000) {
            previous.end = pass.los.time;
            previous.azimuthEnd = Number(pass.los.azimuth.toFixed(1));
            previous.partialEnd = Boolean(pass.partialEnd);
            if (pass.maximum.elevation > previous.elevation) {
              previous.maximum = pass.maximum.time;
              previous.elevation = Number(pass.maximum.elevation.toFixed(1));
            }
            continue;
          }
          previous = { norad: orbital.norad, name: orbital.name, start: pass.aos.time, maximum: pass.maximum.time,
            end: pass.los.time, elevation: Number(pass.maximum.elevation.toFixed(1)),
            azimuthStart: Number(pass.aos.azimuth.toFixed(1)), azimuthEnd: Number(pass.los.azimuth.toFixed(1)),
            partialStart: Boolean(pass.partialStart), partialEnd: Boolean(pass.partialEnd),
            tentative: false, epoch: new Date(epoch).toISOString(), downlink };
          passes.push(previous);
        }
      }
    }
    return passes.sort((a, b) => a.start - b.start);
  }
  function monthlyTemplatePasses(satellites, observer, now = Date.now()) {
    R.validateSatellitesFile(satellites);
    const passes = [];
    for (const orbital of satellites.satellites) {
      R.validateSatelliteEntry(orbital, now);
      const prediction = R.predictMonthlyPasses(orbital, observer, now);
      for (const pass of prediction.passes) passes.push({
        norad: orbital.norad, name: orbital.name, start: pass.aos.time, maximum: pass.maximum.time,
        end: pass.los.time, elevation: Number(pass.maximum.elevation.toFixed(1)),
        azimuthStart: Number(pass.aos.azimuth.toFixed(1)), azimuthEnd: Number(pass.los.azimuth.toFixed(1)),
        partialStart: Boolean(pass.partialStart), partialEnd: Boolean(pass.partialEnd),
        tentative: pass.los.time > Date.parse(prediction.validUntil), epoch: prediction.epoch
      });
    }
    return passes.sort((a, b) => a.start - b.start);
  }
  Object.assign(R, { TEMPLATE_COUNTRIES: COUNTRIES, TEMPLATE_PROFILES: PROFILES, validateCountryTemplate, validateAirportTemplate, airportChannels,
    countryTemplateChannels, prepareTemplateExport, templateImportChannels, templateExportFile, templateModulation,
    monthlyTemplatePasses, weeklyTemplatePasses });
  if (typeof module !== "undefined") module.exports = R;
})(typeof globalThis !== "undefined" ? globalThis : this);
