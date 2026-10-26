(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const profiles = Object.freeze({
    D868: "AT-D868UV",
    D878: "AT-D878UV / UVII (confirmar variante)",
    D578: "AT-D578UV (confirmar variante)",
    OTHER: "Otro AnyTone: capacidades verificadas manualmente"
  });
  function validateChannel(input, airband = false, fmBroadcast = false) {
    R.assert(input && typeof input === "object", "Canal no valido.");
    R.assert(typeof input.name === "string" && input.name.trim().length > 0, "Falta el nombre del canal.");
    const mode = input.mode === 0 ? "FM" : input.mode === 1 ? "DMR" : input.mode;
    R.assert(["FM", "DMR", "AM"].includes(mode), "Modo no admitido.");
    const broadcastOnly = mode === "FM" && input.broadcastOnly === true;
    R.assert(!broadcastOnly || fmBroadcast, "FM comercial 87.5-108 requiere capacidad confirmada en el perfil del modelo.");
    const frequency = value => {
      R.assert(/^\d{1,3}(?:\.\d{1,5})?$/.test(String(value)), "Frecuencia RF en MHz: hasta cinco decimales.");
      const n = Number(value);
      R.assert(mode === "AM" ? airband && n >= 118 && n < 137 : broadcastOnly ?
        n >= 87.5 && n <= 108 :
        n >= 136 && n <= 174 || n >= 400 && n <= 470, "Banda no admitida o AM aerea sin confirmar.");
      R.assert(mode !== "AM" || Math.abs(n * 120 - Math.round(n * 120)) < 0.00061,
        "AM aerea: usa la frecuencia RF de la portadora (rejilla 8.33/25 kHz), no el designador de canal.");
      return n.toFixed(5);
    };
    const rx = frequency(input.rx);
    const tx = mode === "AM" || broadcastOnly ? rx : frequency(input.tx);
    const colorCode = Number(input.colorCode ?? 0);
    const timeslot = Number(input.timeslot ?? 1);
    const talkgroup = Number(input.talkgroup ?? 0);
    R.assert(Number.isInteger(colorCode) && colorCode >= 0 && colorCode <= 15, "Color Code fuera de 0-15.");
    R.assert([1, 2].includes(timeslot), "Time Slot fuera de 1-2.");
    R.assert(Number.isInteger(talkgroup) && talkgroup >= 0 && talkgroup <= 0xffffff, "TG fuera de rango.");
    const source = String(input.source || "").trim();
    const bandwidth = input.bandwidth ?? (input.narrow === true ? "12.5" : "pending");
    R.assert(["12.5", "25", "pending"].includes(bandwidth), "Ancho de banda no admitido.");
    R.assert(source.length > 0 && source.length <= 500, "Indica la procedencia del canal.");
    R.assert(mode !== "AM" && !broadcastOnly || input.rxOnly !== false, "Estos canales son solo recepcion.");
    return { name: R.asciiName(input.name), rx, tx, mode, colorCode, timeslot, talkgroup, bandwidth, broadcastOnly,
      rxOnly: true, source, zone: String(input.zone || (mode === "AM" ? "Aeropuertos" : `Espana ${mode}`)).slice(0, 64),
      notes: String(input.notes || "").slice(0, 1000) };
  }
  function mergeChannels(existing, incoming, airband = false, fmBroadcast = false) {
    R.assert(Array.isArray(existing) && Array.isArray(incoming), "Se requieren listas de canales.");
    const result = existing.map(channel => validateChannel(channel, airband, fmBroadcast));
    const key = c => `${c.mode}:${c.rx}:${c.tx}:${c.name}:${c.colorCode}:${c.timeslot}:${c.talkgroup}:${c.broadcastOnly}`;
    const known = new Set(result.map(key));
    let duplicates = 0;
    for (const input of incoming) {
      const channel = validateChannel(input, airband, fmBroadcast);
      if (known.has(key(channel))) { duplicates++; continue; }
      known.add(key(channel));
      result.push(channel);
    }
    R.assert(result.length <= 4000, "Limite del proyecto Beta: 4000 canales; verifica el limite de tu modelo.");
    return { channels: result, duplicates };
  }
  function readProject(project) {
    R.assert(project && project.format === "bricohams-anytone-project" && project.version === 1 &&
      Object.hasOwn(profiles, project.profile) && typeof project.airband === "boolean" &&
      (project.fmBroadcast === undefined || typeof project.fmBroadcast === "boolean"), "Proyecto AnyTone no reconocido.");
    const fmBroadcast = project.fmBroadcast === true;
    R.assert(project.profile === "OTHER" || (!project.airband && !fmBroadcast),
      "AM requiere y FM comercial requieren capacidades confirmadas manualmente.");
    return { profile: project.profile, airband: project.airband, fmBroadcast,
      channels: mergeChannels([], project.channels, project.airband, fmBroadcast).channels };
  }
  function projectCSV(project) {
    const checked = readProject(project);
    const rows = [["Name", "RX_MHz", "TX_nominal_MHz", "Mode", "ColorCode", "TimeSlot", "Talkgroup", "Bandwidth_kHz",
      "RX_Only", "FM_Broadcast_RX", "Zone", "Source", "Notes"]];
    checked.channels.forEach(c => rows.push([c.name, c.rx, c.tx, c.mode, c.colorCode, c.timeslot,
      c.talkgroup, c.bandwidth, "Yes", c.broadcastOnly ? "Yes" : "No", c.zone, c.source, c.notes]));
    return rows.map(row => row.map(R.csvCell).join(",")).join("\r\n") + "\r\n";
  }
  function radioIDRepeaters(payload) {
    R.assert(payload && Array.isArray(payload.rptrs) && payload.rptrs.length <= 100000, "Registro RadioID: se requiere rptrs.");
    const channels = [];
    const rejected = [];
    for (const row of payload.rptrs) {
      if (!row || !["spain", "espana", "es"].includes(R.norm(row.country))) continue;
      try {
        R.assert(row.status === "ACTIVE", "No figura ACTIVE.");
        R.assert(/^[+-]?\d{1,2}(?:\.\d{1,5})?$/.test(String(row.offset)), "Desplazamiento ausente o invalido.");
        R.assert(row.color_code !== null && row.color_code !== "" && row.color_code !== undefined, "Falta Color Code.");
        const rx = Number(row.frequency);
        const tx = (rx + Number(row.offset)).toFixed(5);
        const published = Array.isArray(row.talkgroups) && row.talkgroups.length ? row.talkgroups : null;
        const slots = published || [1, 2].filter(ts => String(row.ts_linked).split(/\s+/).includes(`TS${ts}`))
          .map(timeslot => ({ timeslot, talkgroup: 0 }));
        R.assert(slots.length > 0 && slots.length <= 100, "No hay TS publicado o hay demasiados grupos.");
        const converted = slots.map(group => {
          R.assert(group && [1, 2].includes(group.timeslot) && Number.isInteger(group.talkgroup) &&
            group.talkgroup >= (published ? 1 : 0), "Asignacion TS/TG publicada invalida.");
          return validateChannel({ name: `${row.callsign} ${group.timeslot} ${group.talkgroup}`,
            rx: String(row.frequency), tx, mode: "DMR", colorCode: Number(row.color_code),
            timeslot: group.timeslot, talkgroup: group.talkgroup, bandwidth: "12.5",
            source: `https://radioid.net/static/rptrs.json ; ID ${row.id}`,
            zone: `Espana DMR ${row.state || row.city || ""}`,
            notes: `Registro ACTIVE del proveedor, no comprobacion en RF. ${row.city || ""}. ${published ? "TS/TG publicados; revisar vigencia." : "TG pendiente; no publicado."}` });
        });
        channels.push(...converted);
      } catch (error) {
        rejected.push({ id: row.id, reason: error.message });
      }
    }
    return { channels: mergeChannels([], channels).channels, rejected };
  }
  function ureRepeaters(payload) {
    R.assert(payload && payload.success === true && payload.is_baliza === false &&
      Array.isArray(payload.items) && payload.items.length <= 10000, "Listado URE de repetidores no reconocido.");
    const channels = [];
    const rejected = [];
    for (const row of payload.items) {
      try {
        R.assert(row && row.mode === "FM", "Solo se convierte FM explicitamente publicada.");
        const rx = /^(\d{1,3}(?:\.\d{1,5})?) MHz$/.exec(String(row.freq));
        const shift = /^([+-]?\d+(?:\.\d+)?) (kHz|MHz)$/.exec(String(row.shift));
        R.assert(rx && shift, "Frecuencia o desplazamiento sin unidades reconocidas.");
        channels.push(validateChannel({ name: row.name, rx: rx[1],
          tx: (Number(rx[1]) + Number(shift[1]) / (shift[2] === "kHz" ? 1000 : 1)).toFixed(5), mode: "FM",
          source: `https://www.ure.es/repetidores/ ; ${payload.key} ID ${row.id}`,
          zone: `Espana FM ${row.provincia || ""}`,
          notes: `Subtono publicado: ${row.subtono || "sin dato"}. Revisar vigencia; URE advierte posibles datos desactualizados. Tono no activado.` }));
      } catch (error) { rejected.push({ id: row?.id, reason: error.message }); }
    }
    return { channels: mergeChannels([], channels).channels, rejected };
  }
  function distanceKm(first, second) {
    const radians = degrees => degrees * Math.PI / 180;
    const dLat = radians(second.latitude - first.latitude);
    const dLon = radians(second.longitude - first.longitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(first.latitude)) *
      Math.cos(radians(second.latitude)) * Math.sin(dLon / 2) ** 2;
    return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function nearbyRows(payload, location, radiusKm) {
    R.assert(payload && Array.isArray(payload.results) && payload.results.length > 0 &&
      payload.results.length <= 4000, "La lista local debe contener de 1 a 4000 registros en results.");
    const validCoordinates = point => point && Number.isFinite(point.latitude) && point.latitude >= -90 &&
      point.latitude <= 90 && Number.isFinite(point.longitude) && point.longitude >= -180 && point.longitude <= 180;
    R.assert(validCoordinates(location), "Se requiere una ubicacion valida.");
    R.assert(Number.isFinite(radiusKm) && radiusKm >= 1 && radiusKm <= 500, "Radio de busqueda: 1-500 km.");
    const nearby = [];
    let omitted = 0;
    for (const row of payload.results) {
      const latitude = row?.latitude ?? row?.lat;
      const longitude = row?.longitude ?? row?.lon;
      const point = { latitude: latitude === "" || latitude == null ? NaN : Number(latitude),
        longitude: longitude === "" || longitude == null ? NaN : Number(longitude) };
      if (!validCoordinates(point)) { omitted++; continue; }
      const distance = distanceKm(location, point);
      if (distance <= radiusKm) nearby.push({ row, distance });
      else omitted++;
    }
    return { nearby, omitted };
  }
  function nearbyAirportChannels(payload, location, radiusKm) {
    const { nearby, omitted } = nearbyRows(payload, location, radiusKm);
    const channels = nearby.map(({ row, distance }) => {
      const source = String(row.source || "");
      R.assert(/AIP/i.test(source), `Aeropuerto ${row.name || "sin nombre"}: incluye referencia AIP vigente en source.`);
      return validateChannel({ name: row.name, rx: row.frequencyMHz, mode: "AM",
        source, zone: `Aeropuertos Espana ${row.airport || row.icao || ""}`.slice(0, 64),
        notes: `${row.service || "Servicio aeronautico"}; ${distance.toFixed(1)} km de la ubicacion elegida. Frecuencia RF AIP, no designador 8.33 kHz.`,
        rxOnly: true }, true);
    });
    return { channels, omitted };
  }
  function nearbyFMChannels(payload, location, radiusKm) {
    const { nearby, omitted } = nearbyRows(payload, location, radiusKm);
    const channels = nearby.map(({ row, distance }) => validateChannel({
      name: row.name, rx: row.frequencyMHz ?? row.frequency, tx: row.frequencyMHz ?? row.frequency,
      mode: "FM", broadcastOnly: true, rxOnly: true,
      source: String(row.source || ""), zone: `FM comercial ${row.region || row.province || "local"}`.slice(0, 64),
      notes: `${row.station || row.name}; ${distance.toFixed(1)} km de la ubicacion elegida.`
    }, false, true));
    return { channels, omitted };
  }
  function airbandGuardChannel() {
    return validateChannel({ name: "GUARDIA-1215", rx: "121.500", mode: "AM", rxOnly: true,
      source: "Frecuencia internacional de guardia aeronautica; verificar asignacion y procedimiento en AIP ENAIRE vigente.",
      zone: "Aeronautico", notes: "Solo recepcion; no usar para comunicaciones rutinarias ni transmitir." }, true);
  }
  Object.assign(R, { anytoneProfiles: profiles, validateAnytoneChannel: validateChannel,
    mergeAnytoneChannels: mergeChannels, readAnytoneProject: readProject, anytoneProjectCSV: projectCSV,
    anytoneRadioIDRepeaters: radioIDRepeaters, anytoneURERepeaters: ureRepeaters,
    anytoneNearbyAirportChannels: nearbyAirportChannels, anytoneNearbyFMChannels: nearbyFMChannels,
    anytoneAirbandGuardChannel: airbandGuardChannel });
  if (typeof module !== "undefined") module.exports = R;
})(typeof globalThis !== "undefined" ? globalThis : this);
