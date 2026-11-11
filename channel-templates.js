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
  function airportChannels(file, regionNames = new Map()) {
    validateAirportTemplate(file, file.country);
    return file.frequencies.map(entry => {
      const airport = file.airports[entry.ident];
      return { key: `ourairports:${entry.id}`, name: R.asciiName(`${entry.ident} ${entry.type}`), callsign: entry.ident,
        ident: entry.ident, airport: airport.name, rx: entry.rx, tx: entry.rx, mode: "AM", rxOnly: true, txLocked: true,
        narrow: false, country: file.country, regionId: airport.regionId, region: regionNames.get(airport.regionId) || "", city: airport.municipality || "",
        zone: `${file.country} ${airport.regionId}`, latitude: airport.latitude, longitude: airport.longitude,
        source: `https://ourairports.com/airports/${encodeURIComponent(entry.ident)}/`, sourceId: entry.id,
        license: file.license, attribution: "OurAirports (public domain)",
        notes: `${airport.name}${entry.description ? ` - ${entry.description}` : ""}. AM RX only, published frequency; not for navigation.` };
    });
  }
  // CEPT CB channels 1-40 (23-25 out of order by design); Orden ETU/1033/2017, also scripts/build-chirp-spain.py.
  const CB_MHZ = [26.965, 26.975, 26.985, 27.005, 27.015, 27.025, 27.035, 27.055, 27.065, 27.075, 27.085, 27.105, 27.115,
    27.125, 27.135, 27.155, 27.165, 27.175, 27.185, 27.205, 27.215, 27.225, 27.255, 27.235, 27.245, 27.265,
    27.275, 27.285, 27.295, 27.305, 27.315, 27.325, 27.335, 27.345, 27.355, 27.365, 27.375, 27.385, 27.395, 27.405];
  const CB_SOURCE = "https://www.fediea.org/legislacb/oetu10332017-cb.php";
  // RX only: an amateur or airband radio is not a type-approved CB station. Only Spain has a sourced CB plan here.
  function cbChannels(country) {
    R.assert(country === "ES", "CB 27 MHz: solo hay fuente oficial para Espana (Orden ETU/1033/2017); otros paises pendiente de fuente.");
    return CB_MHZ.flatMap((mhz, index) => ["AM", "FM"].map(mode => {
      const n = String(index + 1).padStart(2, "0"), rx = mhz.toFixed(5);
      return { key: `cb27:${index + 1}:${mode}`, name: `CB${n} ${mode}`, rx, tx: rx, mode, rxOnly: true, txLocked: true, narrow: false,
        country, regionId: "CB27", zone: "CB27", source: CB_SOURCE, notes: `CB 27 MHz canal ${index + 1} ${mode} · solo RX.` };
    }));
  }
  function countryTemplateChannels(file, { region = "", query = "", pmr = false, cb = false, satellites = null, airports = null } = {}) {
    validateCountryTemplate(file, file.country);
    R.assert(!region || file.regions.some(entry => entry.id === region), "Selecciona una region de la plantilla.");
    const search = String(query).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const regions = new Map(file.regions.map((entry, index) => [entry.id, index]));
    const pool = [...file.channels];
    if (airports) {
      R.assert(airports.country === file.country, "Los aeropuertos no pertenecen al pais de la plantilla.");
      const extra = airportChannels(airports, new Map(file.regions.map(entry => [entry.id, entry.name])));
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
    if (cb) channels.push(...cbChannels(file.country));
    return [...new Map(channels.map(channel => [channel.key, channel])).values()];
  }
  // Single source of truth shared with data/channel-templates/profiles.json (Android reads that file).
  // No profile writes hardware: they only describe what a model can represent as modulation + TX lock.
  const FM_BANDS = [[136, 174], [400, 470]];
  // 27 MHz only where the repo documents RX there: FTX-1 CAT accepts 30 kHz-470 MHz (ftx1-core.js); RadiCodex is the reference file.
  const CB_BAND = [[26.965, 27.405]];
  const PROFILES = Object.freeze({
    radicodex: { label: "RadiCodex", modulations: ["FM", "AM"], bands: { FM: [...CB_BAND, ...FM_BANDS], AM: [...CB_BAND, [118, 137]] },
      txLock: "reference-column", output: "reference-csv", extension: "csv", layout: { kind: "reference" } },
    rt950pro: { label: "Radtel RT-950 Pro", modulations: ["FM", "AM"], bands: { FM: FM_BANDS, AM: [[118, 137]] },
      txLock: "reference-column", output: "reference-csv", extension: "csv",
      layout: { kind: "zones", zones: 10, slotsPerZone: 99, nameLength: 12,
        reserved: { zone: 10, fromSlot: 70, toSlot: 99, reason: "Channels 961-990 (0x7800-0x7BFF) are reserved until the firmware variant is identified; see docs/RADTEL-RT950-PRO.md" } } },
    uvk5v3: { label: "Quansheng UV-K5 V3", modulations: ["FM", "AM"], bands: { FM: FM_BANDS, AM: [[118, 137]] },
      txLock: "memory-bit", output: "chirp-csv", extension: "csv", layout: { kind: "scanlists", lists: 24 } },
    d878: { label: "AnyTone AT-D878", modulations: ["FM"], bands: { FM: FM_BANDS },
      txLock: "project-flag", output: "anytone-project", extension: "json", layout: { kind: "zones", channelLimit: 4000 } },
    // memory groups: pendiente de fuente
    ftx1: { label: "Yaesu FTX-1", modulations: ["FM", "AM"], bands: { FM: [...CB_BAND, ...FM_BANDS], AM: [...CB_BAND, [118, 137]] },
      txLock: "reference-column", output: "reference-csv", extension: "csv", layout: { kind: "memories", from: 1, to: 999 } }
  });
  // readQuanshengChannels / the importer address memories 1-1024; the scan list count comes from the layout.
  const QUANSHENG_MEMORIES = 1024;
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
  // Groups the selected channels (catalog region order, PMR446 last) into the radio's zones/banks. Whole regions stay together,
  // repeaters first then airports; only a region larger than one zone is split. What does not fit is counted in reasons.capacity.
  function templateZonePlan(profileId, channels, { variantConfirmed = false } = {}) {
    R.assert(Object.hasOwn(PROFILES, profileId), "Modelo de plantilla desconocido.");
    const profile = PROFILES[profileId], layout = profile.layout, prepared = prepareTemplateExport(profileId, channels);
    const reasons = { ...prepared.reasons };
    const overflow = count => { if (count > 0) reasons.capacity = (reasons.capacity || 0) + count; };
    const reserved = layout.reserved && !variantConfirmed ? layout.reserved : null;
    let room = layout.kind === "memories" ? layout.to - layout.from + 1 : layout.kind === "scanlists" ? QUANSHENG_MEMORIES :
      layout.channelLimit ?? Infinity;
    const fullCapacity = layout.slotsPerZone ?? room;
    const zoneCapacity = index => reserved?.zone === index ? Math.min(fullCapacity, reserved.fromSlot - 1) : fullCapacity;
    const maxZones = layout.zones ?? layout.lists ?? Infinity;
    const regional = new Map(), satellite = [], pmr = [];
    const isAirport = channel => String(channel.key).startsWith("ourairports:");
    for (const channel of prepared.accepted) {
      if (channel.regionId === "PMR446" || channel.regionId === "CB27") pmr.push(channel);
      else if (!channel.regionId || String(channel.key).startsWith("sat")) satellite.push(channel);
      else regional.has(channel.regionId) ? regional.get(channel.regionId).push(channel) : regional.set(channel.regionId, [channel]);
    }
    const regularLimit = maxZones - (pmr.length ? 1 : 0), zones = [];
    const take = items => {
      const kept = items.slice(0, Math.max(0, room));
      overflow(items.length - kept.length); room -= kept.length;
      return kept;
    };
    // Places a list in one zone, or in consecutive "n/N" parts when it exceeds the zone capacity.
    const fill = (list, name, regions, last = false) => {
      const made = [];
      let rest = list;
      while (rest.length) {
        const index = last && layout.zones ? layout.zones : zones.length + 1;
        if (made.length && last || !last && zones.length >= regularLimit) { overflow(rest.length); break; }
        const size = Math.min(rest.length, zoneCapacity(index)), items = take(rest.slice(0, size));
        rest = rest.slice(size);
        if (!items.length) { overflow(rest.length); break; }
        const zone = { index, name, regions, items };
        zones.push(zone); made.push(zone);
      }
      if (made.length > 1) made.forEach((zone, part) => { zone.name = `${name} ${part + 1}/${made.length}`; });
      return made;
    };
    const regionName = (id, list) => list[0].region || id;
    // Without a per-zone slot count (zones/lists/memories), one zone per region; regions share a zone only when there are more regions than zones.
    const perZone = layout.slotsPerZone ? Infinity :
      Math.max(1, Math.ceil(regional.size / Math.max(1, regularLimit - (satellite.length ? 1 : 0))));
    let current = null;
    for (const [regionId, found] of regional) {
      const list = [...found.filter(channel => !isAirport(channel)), ...found.filter(isAirport)];
      const name = regionName(regionId, list);
      if (current && current.regions.length < perZone && current.items.length + list.length <= zoneCapacity(current.index) && room >= list.length) {
        current.items.push(...take(list)); current.regions.push({ id: regionId, name });
        current.name = `${current.regions[0].name} - ${name}`;
        continue;
      }
      const made = fill(list, name, [{ id: regionId, name }]);
      current = made.length === 1 ? made[0] : null;
    }
    if (satellite.length) fill(satellite, "SAT", []);
    // PMR446 and CB share the last zone ("PMR446 + CB").
    const services = [...new Set(pmr.map(channel => channel.regionId))];
    const lastName = services.map(id => id === "CB27" ? "CB" : id).join(" + ");
    if (pmr.length) fill(pmr, lastName, services.map(id => ({ id, name: id === "CB27" ? "CB" : id })), true);
    const planned = zones.map(zone => ({ index: zone.index, name: zone.name, regionIds: zone.regions.map(entry => entry.id),
      channels: zone.items.map((channel, slot) => ({ ...channel, zone: zone.name, slot: slot + 1 })) }));
    const accepted = planned.flatMap(zone => zone.channels);
    return { profile: profileId, zones: planned, reasons, accepted, omitted: channels.length - accepted.length, warnings: prepared.warnings };
  }
  // Native-importer shape: UV-K5 AM goes through the existing `extended` contract (mode 1, TX lock kept).
  // For the UV-K5 the channel zone is the radio zone, so groupQuanshengChannels(..., "zone") gives one scan list per zone.
  function templateImportChannels(profileId, channels) {
    R.assert(profileId === "uvk5v3" || Object.hasOwn(IMPORT_PROFILES, profileId), "Este modelo no tiene importador en esta pagina.");
    const prepared = profileId === "uvk5v3" ? templateZonePlan(profileId, channels) : prepareTemplateExport(profileId, channels);
    prepared.accepted = prepared.accepted.map(channel => templateModulation(channel) === "AM"
      ? { ...channel, mode: 1, extended: true, narrow: false, rxOnly: true } : channel);
    return prepared;
  }
  function chirpAmCSV(channels) {
    const rows = [["Location", "Name", "Frequency", "Duplex", "Offset", "Tone", "rToneFreq", "cToneFreq", "DtcsCode", "DtcsPolarity", "RxDtcsCode", "CrossMode", "Mode", "TStep", "Skip", "Comment"]];
    channels.forEach((channel, index) => rows.push([index, R.asciiName(channel.name, 10), channel.rx, "off", "0.000000",
      "", "88.5", "88.5", "023", "NN", "023", "Tone->Tone", templateModulation(channel) === "AM" ? "AM" : channel.narrow ? "NFM" : "FM", "5.00", "",
      `RX ONLY. Zone: ${channel.zone}. TX nominal ${channel.tx}; tono de proveedor ${channel.tone || "sin dato"}. ${channel.source || ""} ${channel.notes || ""} ${channel.attribution || ""} ${channel.license || ""}`]));
    return rows.map(row => row.map(R.csvCell).join(",")).join("\r\n") + "\r\n";
  }
  function referenceCSV(plan, profile) {
    const { layout } = profile;
    const extra = profile === PROFILES.rt950pro ? ["Zone", "Slot", "Channel_Number"] : profile === PROFILES.ftx1 ? ["Memory", "Zone"] : ["Zone"];
    const rows = [["Name", "RX_MHz", "TX_nominal_MHz", "Modulation", "RX_Only", "Country", "Region_ID", "Locality", "Identifier", "Key", "Source", "Notes", ...extra]];
    let memory = layout.from;
    for (const zone of plan.zones) for (const c of zone.channels) {
      const numbers = profile === PROFILES.rt950pro ? [c.zone, c.slot, (zone.index - 1) * layout.slotsPerZone + c.slot] :
        profile === PROFILES.ftx1 ? [memory++, c.zone] : [c.zone];
      rows.push([c.name, c.rx, c.tx, templateModulation(c), "Yes", c.country || "", c.regionId || "",
        c.city || "", c.callsign || c.ident || "", c.key, c.source || "", c.notes || "", ...numbers]);
    }
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
  function templateExportFile(profileId, channels, options = {}) {
    R.assert(Object.hasOwn(PROFILES, profileId), "Modelo de plantilla desconocido.");
    const profile = PROFILES[profileId], prepared = prepareTemplateExport(profileId, channels);
    R.assert(prepared.accepted.length > 0, `Ningun canal es representable en ${profile.label} con modo y bloqueo de TX seguros.`);
    if (profile.output === "anytone-project") R.assert(prepared.accepted.length <= profile.layout.channelLimit, "AnyTone admite 4000 canales por proyecto. Selecciona una zona.");
    const plan = templateZonePlan(profileId, channels, options);
    R.assert(plan.accepted.length > 0, `Ningun canal cabe en ${profile.label}.`);
    let content, mime;
    if (profile.output === "anytone-project") { content = JSON.stringify(anytoneProject(plan.accepted), null, 2); mime = "application/json"; }
    else {
      mime = "text/csv;charset=utf-8";
      content = profile.output === "reference-csv" ? referenceCSV(plan, profile) : chirpAmCSV(plan.accepted);
    }
    return { ...plan, label: profile.label, extension: profile.extension, mime, content,
      summary: plan.zones.map(zone => ({ index: zone.index, name: zone.name, count: zone.channels.length })) };
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
  Object.assign(R, { TEMPLATE_COUNTRIES: COUNTRIES, TEMPLATE_PROFILES: PROFILES, cbChannels, validateCountryTemplate, validateAirportTemplate, airportChannels,
    countryTemplateChannels, prepareTemplateExport, templateZonePlan, templateImportChannels, templateExportFile, templateModulation,
    monthlyTemplatePasses, weeklyTemplatePasses });
  if (typeof module !== "undefined") module.exports = R;
})(typeof globalThis !== "undefined" ? globalThis : this);
