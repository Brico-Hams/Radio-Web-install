(function (root) {
  "use strict";
  const R = root.RadioWorkspace || (typeof module !== "undefined" ? require("./radio-core.js") : undefined);
  const EARTH_RADIUS_KM = 6371.0088;
  const SPEED_OF_LIGHT = 299.792458;
  const finite = value => typeof value === "number" && Number.isFinite(value);

  function latLonToLocator(lat, lon, length = 6) {
    R.assert(finite(lat) && lat >= -90 && lat <= 90, "Latitud no valida (-90 a 90).");
    R.assert(finite(lon) && lon >= -180 && lon <= 180, "Longitud no valida (-180 a 180).");
    R.assert([4, 6, 8].includes(length), "Longitud de locator no valida (4, 6 u 8).");
    // Cells of the 8-character grid (1/120 deg wide, 1/240 deg high); the pole and antimeridian fall in the last cell.
    const ix = Math.min(Math.floor((lon + 180) * 120), 43199);
    const iy = Math.min(Math.floor((lat + 90) * 240), 43199);
    const letter = (index, base) => String.fromCharCode(base + index);
    let text = letter(Math.floor(ix / 2400), 65) + letter(Math.floor(iy / 2400), 65)
      + Math.floor(ix / 240) % 10 + Math.floor(iy / 240) % 10;
    if (length >= 6) text += letter(Math.floor(ix / 10) % 24, 97) + letter(Math.floor(iy / 10) % 24, 97);
    if (length === 8) text += ix % 10 + "" + iy % 10;
    return text;
  }

  function greatCircle(a, b) {
    for (const point of [a, b]) {
      R.assert(point && finite(point.latitude) && point.latitude >= -90 && point.latitude <= 90
        && finite(point.longitude) && point.longitude >= -180 && point.longitude <= 180, "Coordenadas no validas.");
    }
    const rad = Math.PI / 180;
    const [p1, p2] = [a.latitude * rad, b.latitude * rad];
    const dLat = p2 - p1, dLon = (b.longitude - a.longitude) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) ** 2;
    const distanceKm = 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
    const initial = (from, to, lon) => {
      const y = Math.sin(lon) * Math.cos(to);
      const x = Math.cos(from) * Math.sin(to) - Math.sin(from) * Math.cos(to) * Math.cos(lon);
      return (Math.atan2(y, x) / rad + 360) % 360;
    };
    return {
      distanceKm,
      longPathKm: 2 * Math.PI * EARTH_RADIUS_KM - distanceKm,
      bearing: initial(p1, p2, dLon),
      reverseBearing: initial(p2, p1, -dLon)
    };
  }

  function swrResult(gamma) {
    return {
      swr: (1 + gamma) / (1 - gamma),
      gamma,
      returnLossDb: gamma === 0 ? Infinity : -20 * Math.log10(gamma),
      mismatchLossDb: -10 * Math.log10(1 - gamma * gamma),
      reflectedPercent: gamma * gamma * 100
    };
  }
  function swrFromPower(forwardW, reflectedW) {
    R.assert(finite(forwardW) && finite(reflectedW) && forwardW > 0 && reflectedW >= 0, "Introduce potencias validas: directa mayor que 0 y reflejada 0 o mas.");
    R.assert(reflectedW < forwardW, "La potencia reflejada debe ser menor que la directa.");
    return swrResult(Math.sqrt(reflectedW / forwardW));
  }
  function swrFromRatio(swr) {
    R.assert(finite(swr) && swr >= 1, "La ROE debe ser un numero igual o mayor que 1.");
    return swrResult((swr - 1) / (swr + 1));
  }

  // Typical catalogue matched-line attenuation, dB per 100 m, by frequency in MHz.
  const COAX_TABLE = {
    "RG-58": { 10: 4.6, 50: 10.8, 100: 16.1, 200: 23.0, 400: 33.8, 1000: 60.0 },
    "RG-8X": { 10: 3.3, 50: 8.2, 100: 12.1, 200: 17.7, 400: 26.2, 1000: 44.3 },
    "RG-213": { 10: 2.0, 50: 4.6, 100: 6.6, 200: 9.8, 400: 14.8, 1000: 26.2 },
    "LMR-400": { 30: 2.2, 50: 2.9, 150: 4.9, 450: 8.9, 900: 12.8 }
  };
  function coaxDbPer100m(cable, frequencyMHz) {
    const table = COAX_TABLE[cable];
    R.assert(table, "Cable no reconocido.");
    const points = Object.entries(table).map(([f, db]) => [Number(f), db]).sort((x, y) => x[0] - y[0]);
    R.assert(finite(frequencyMHz) && frequencyMHz >= points[0][0] && frequencyMHz <= points[points.length - 1][0],
      "Frecuencia fuera de la tabla del cable; introduce la atenuacion del fabricante.");
    const upper = points.findIndex(([f]) => f >= frequencyMHz);
    if (points[upper][0] === frequencyMHz) return points[upper][1];
    const [f0, d0] = points[upper - 1], [f1, d1] = points[upper];
    const t = Math.log(frequencyMHz / f0) / Math.log(f1 / f0);
    return Math.exp(Math.log(d0) + t * Math.log(d1 / d0));
  }
  function coaxLoss({ cable, frequencyMHz, lengthM, powerW, customDbPer100m } = {}) {
    R.assert(finite(lengthM) && lengthM >= 0, "Introduce una longitud valida (0 m o mas).");
    R.assert(finite(powerW) && powerW >= 0, "Introduce una potencia valida (0 W o mas).");
    let dbPer100m;
    if (customDbPer100m !== undefined && customDbPer100m !== null) {
      R.assert(finite(customDbPer100m) && customDbPer100m >= 0, "Introduce una atenuacion valida (0 dB/100 m o mas).");
      dbPer100m = customDbPer100m;
    } else dbPer100m = coaxDbPer100m(cable, frequencyMHz);
    const lossDb = dbPer100m * lengthM / 100;
    const efficiency = 10 ** (-lossDb / 10);
    return { dbPer100m, lossDb, powerOutW: powerW * efficiency, efficiencyPercent: efficiency * 100 };
  }

  function power(value, unit) {
    R.assert(finite(value), "Introduce un valor de potencia valido.");
    R.assert(["W", "dBm", "dBW"].includes(unit), "Unidad no reconocida.");
    if (unit === "W") {
      R.assert(value > 0, "La potencia en W debe ser mayor que 0.");
      return { watts: value, dBm: 10 * Math.log10(value) + 30, dBW: 10 * Math.log10(value) };
    }
    const dBW = unit === "dBW" ? value : value - 30;
    return { watts: 10 ** (dBW / 10), dBm: dBW + 30, dBW };
  }

  function erp({ powerW, lossDb, gainDbd } = {}) {
    R.assert(finite(powerW) && powerW > 0, "La potencia debe ser mayor que 0 W.");
    R.assert(finite(lossDb) && lossDb >= 0, "La perdida del cable debe ser 0 dB o mas.");
    R.assert(finite(gainDbd), "Introduce una ganancia de antena valida.");
    const erpW = powerW * 10 ** ((gainDbd - lossDb) / 10);
    return { erpW, eirpW: erpW * 10 ** 0.215 };
  }

  function antennaLengths(frequencyMHz, velocityFactor = 0.95) {
    R.assert(finite(frequencyMHz) && frequencyMHz > 0, "Introduce una frecuencia valida mayor que 0 MHz.");
    R.assert(finite(velocityFactor) && velocityFactor >= 0.5 && velocityFactor <= 1, "El factor de velocidad debe estar entre 0,5 y 1.");
    const wavelengthM = SPEED_OF_LIGHT / frequencyMHz;
    return { wavelengthM, halfWaveM: wavelengthM / 2 * velocityFactor, quarterWaveM: wavelengthM / 4 * velocityFactor };
  }

  // ITU Radio Regulations amateur allocations; national rules may be narrower.
  const BAND_SPECS = [
    ["160m", [1.81, 2.0], [1.8, 2.0], [1.8, 2.0]],
    ["80m", [3.5, 3.8], [3.5, 4.0], [3.5, 3.9]],
    ["60m", [5.3515, 5.3665], [5.3515, 5.3665], [5.3515, 5.3665]],
    ["40m", [7.0, 7.2], [7.0, 7.3], [7.0, 7.2]],
    ["30m", [10.1, 10.15], [10.1, 10.15], [10.1, 10.15]],
    ["20m", [14.0, 14.35], [14.0, 14.35], [14.0, 14.35]],
    ["17m", [18.068, 18.168], [18.068, 18.168], [18.068, 18.168]],
    ["15m", [21.0, 21.45], [21.0, 21.45], [21.0, 21.45]],
    ["12m", [24.89, 24.99], [24.89, 24.99], [24.89, 24.99]],
    ["10m", [28.0, 29.7], [28.0, 29.7], [28.0, 29.7]],
    ["6m", [50, 52], [50, 54], [50, 54]],
    ["4m", [70.0, 70.5], null, null],
    ["2m", [144, 146], [144, 148], [144, 148]],
    ["1.25m", null, [222, 225], null],
    ["70cm", [430, 440], [420, 450], [430, 440]],
    ["23cm", [1240, 1300], [1240, 1300], [1240, 1300]]
  ];
  const REGION_BANDS = Object.fromEntries([1, 2, 3].map(region => [region, BAND_SPECS
    .filter(spec => spec[region])
    .map(spec => ({ band: spec[0], minMHz: spec[region][0], maxMHz: spec[region][1] }))]));

  function bandOf(frequencyMHz, region = 1) {
    R.assert(REGION_BANDS[region], "Region IARU no valida (1, 2 o 3).");
    if (!finite(frequencyMHz)) return null;
    const hit = REGION_BANDS[region].find(entry => frequencyMHz >= entry.minMHz && frequencyMHz <= entry.maxMHz);
    return hit ? hit.band : null;
  }

  const RST = {
    R: {
      1: "Ilegible", 2: "Apenas legible, algunas palabras", 3: "Legible con dificultad",
      4: "Legible sin dificultad", 5: "Perfectamente legible"
    },
    S: {
      1: "Apenas perceptible", 2: "Muy debil", 3: "Debil", 4: "Regular", 5: "Bastante buena",
      6: "Buena", 7: "Moderadamente fuerte", 8: "Fuerte", 9: "Extremadamente fuerte"
    },
    T: {
      1: "Zumbido de red muy aspero", 2: "Zumbido aspero y ancho", 3: "Tono aspero, rectificacion sin filtrar",
      4: "Tono aspero, algo filtrado", 5: "Tono filtrado, muy modulado por rizado", 6: "Tono filtrado, ligero rizado",
      7: "Tono casi puro, rastro de rizado", 8: "Tono casi perfecto, ligera modulacion", 9: "Tono perfecto, sin rizado"
    }
  };

  Object.assign(R, { latLonToLocator, greatCircle, swrFromPower, swrFromRatio, COAX_TABLE, coaxLoss, power, erp, antennaLengths, bandOf, REGION_BANDS, RST });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
