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
  function countryTemplateChannels(file, { region = "", query = "", pmr = false, satellites = null } = {}) {
    validateCountryTemplate(file, file.country);
    R.assert(!region || file.regions.some(entry => entry.id === region), "Selecciona una region de la plantilla.");
    const search = String(query).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const channels = file.channels.filter(entry => (!region || entry.regionId === region) &&
      `${entry.name} ${entry.city} ${entry.callsign}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().includes(search)).map(entry => ({ ...entry }));
    if (pmr) {
      R.assert(COUNTRIES.find(country => country.code === file.country).pmr, "PMR446 no es una plantilla de Estados Unidos.");
      channels.push(...R.pmrChannels());
    }
    if (satellites) {
      R.validateSatellitesFile(satellites);
      for (const orbital of satellites.satellites) {
        R.validateSatelliteEntry(orbital);
        for (const transmitter of orbital.transmitters) {
          if (["FM", "FMN"].includes(transmitter.mode) && Number.isFinite(transmitter.downlink) &&
            (!transmitter.downlinkHigh || transmitter.downlinkHigh === transmitter.downlink) &&
            ((transmitter.downlink >= 136e6 && transmitter.downlink <= 174e6) ||
              (transmitter.downlink >= 400e6 && transmitter.downlink <= 470e6))) {
            channels.push(R.satelliteChannel(orbital, transmitter));
          }
        }
      }
    }
    return [...new Map(channels.map(channel => [channel.key, channel])).values()];
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
  Object.assign(R, { TEMPLATE_COUNTRIES: COUNTRIES, validateCountryTemplate, countryTemplateChannels, monthlyTemplatePasses });
  if (typeof module !== "undefined") module.exports = R;
})(typeof globalThis !== "undefined" ? globalThis : this);
