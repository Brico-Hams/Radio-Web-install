(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  R.mountAnytoneUI = function () {
    const $ = id => document.getElementById(`at-${id}`);
    let channels = R.mergeAnytoneChannels([], R.pmrChannels()).channels;
    let editing = -1;
    let location = null;
    const status = text => { $("status").textContent = text; };
    const airband = () => $("airband").checked;
    const fmBroadcast = () => $("fm-broadcast").checked;
    const project = () => ({ format: "bricohams-anytone-project", version: 1,
      profile: $("profile").value, airband: airband(), fmBroadcast: fmBroadcast(), channels });
    function render() {
      $("channels").replaceChildren(...channels.map((channel, index) => {
        const row = document.createElement("tr");
        for (const value of [channel.name, channel.rx, channel.tx, channel.mode,
          channel.mode === "DMR" ? `${channel.colorCode}/${channel.timeslot}/${channel.talkgroup}` : "-", channel.zone]) {
          const cell = document.createElement("td"); cell.textContent = value; row.append(cell);
        }
        const actions = document.createElement("td");
        for (const action of ["Editar", "Borrar"]) {
          const button = document.createElement("button");
          button.type = "button"; button.className = "button secondary"; button.textContent = action;
          button.addEventListener("click", () => {
            if (action === "Borrar") { channels = channels.filter((_, i) => i !== index); editing = -1; render(); status("Canal borrado del proyecto; radio intacta."); return; }
            editing = index;
            for (const [field, value] of Object.entries({ name: channel.name, rx: channel.rx, tx: channel.tx,
              mode: channel.mode, cc: channel.colorCode, ts: channel.timeslot, tg: channel.talkgroup,
              zone: channel.zone, source: channel.source, bandwidth: channel.bandwidth })) $(field).value = value;
            $("broadcast").checked = channel.broadcastOnly;
            updateMode(); $("name").focus(); status(`Editando ${channel.name}.`);
          });
          actions.append(button);
        }
        row.append(actions); return row;
      }));
      const count = mode => channels.filter(c => c.mode === mode).length;
      $("summary").textContent = `${channels.length} canales RX: FM ${count("FM")}, DMR ${count("DMR")}, AM ${count("AM")}. ` +
        `${channels.filter(c => c.mode === "DMR" && !c.talkgroup).length} DMR con TG pendiente. ` +
        `${channels.filter(c => c.broadcastOnly).length} FM comerciales. ` +
        "Cobertura nacional no certificada; importa repetidores actuales y revisa los datos heredados.";
    }
    function bind(id, event, action) {
      $(id).addEventListener(event, async e => {
        e.preventDefault();
        try { await action(e); }
        catch (error) { status(`Error: ${error.message}. Proyecto anterior conservado si la importacion no termino.`); }
      });
    }
    async function file(id, binary = false) {
      const selected = $(id).files[0];
      R.assert(selected && selected.size > 0 && selected.size <= 8 * 1024 * 1024, "Selecciona un archivo de hasta 8 MiB.");
      return binary ? new Uint8Array(await selected.arrayBuffer()) : JSON.parse(await selected.text());
    }
    function merge(incoming) {
      const result = R.mergeAnytoneChannels(channels, incoming, airband(), fmBroadcast());
      const added = result.channels.length - channels.length;
      channels = result.channels; editing = -1; render();
      status(`${added} canales anadidos; ${result.duplicates} duplicados. Exporta para conservarlos.`);
    }
    function download(content, name, type) {
      const url = URL.createObjectURL(new Blob([content], { type }));
      const link = document.createElement("a"); link.href = url; link.download = name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status(`Descarga solicitada: ${name}. No es un codeplug RDT nativo.`);
    }
    for (const [value, text] of Object.entries(R.anytoneProfiles)) {
      const option = document.createElement("option"); option.value = value; option.textContent = text; $("profile").append(option);
    }
    $("profile").value = "OTHER";
    $("airband").disabled = false;
    $("fm-broadcast").disabled = false;
    let previousProfile = $("profile").value;
    $("profile").addEventListener("change", () => {
      if ($("profile").value !== "OTHER" && channels.some(c => c.mode === "AM" || c.broadcastOnly)) {
        $("profile").value = previousProfile; status("Elimina o exporta primero los canales AM/FM comercial: el perfil seleccionado no tiene esas capacidades confirmadas."); return;
      }
      previousProfile = $("profile").value;
      $("airband").disabled = previousProfile !== "OTHER";
      $("fm-broadcast").disabled = previousProfile !== "OTHER";
      if ($("airband").disabled) $("airband").checked = false;
      if ($("fm-broadcast").disabled) $("fm-broadcast").checked = false;
      updateAirband();
      updateFMBroadcast();
    });
    function updateAirband() {
      $("am").disabled = !airband(); $("airports-file").disabled = !airband();
      $("air-guard").disabled = !airband();
      if (!airband() && $("mode").value === "AM") $("mode").value = "FM";
      updateMode();
    }
    function updateFMBroadcast() {
      $("fm-file").disabled = !fmBroadcast();
      $("broadcast").disabled = !fmBroadcast();
      if (!fmBroadcast()) $("broadcast").checked = false;
      updateMode();
    }
    $("airband").addEventListener("change", () => {
      if (!airband() && channels.some(c => c.mode === "AM")) {
        $("airband").checked = true; status("Elimina primero los canales AM para desactivar esta capacidad."); return;
      }
      updateAirband();
    });
    $("fm-broadcast").addEventListener("change", () => {
      if (!fmBroadcast() && channels.some(c => c.broadcastOnly)) {
        $("fm-broadcast").checked = true; status("Elimina primero los canales FM comerciales para desactivar esta capacidad."); return;
      }
      updateFMBroadcast();
    });
    updateAirband();
    updateFMBroadcast();
    function updateMode() {
      const am = $("mode").value === "AM";
      const broadcast = $("mode").value === "FM" && $("broadcast").checked && fmBroadcast();
      $("broadcast").disabled = !fmBroadcast() || $("mode").value !== "FM";
      $("tx").disabled = am || broadcast; $("tx").required = !am && !broadcast;
      if (am || broadcast) $("tx").value = $("rx").value;
    }
    $("mode").addEventListener("change", updateMode);
    $("rx").addEventListener("input", updateMode);
    $("broadcast").addEventListener("change", updateMode);
    bind("pmr", "click", () => merge(R.pmrChannels()));
    bind("cancel", "click", () => { editing = -1; $("form").reset(); updateMode(); status("Edicion cancelada."); });
    bind("form", "submit", () => {
      const channel = R.validateAnytoneChannel({ name: $("name").value, rx: $("rx").value,
        tx: $("tx").value, mode: $("mode").value, colorCode: Number($("cc").value),
        timeslot: Number($("ts").value), talkgroup: Number($("tg").value), zone: $("zone").value,
        source: $("source").value, bandwidth: $("bandwidth").value, broadcastOnly: $("broadcast").checked,
        rxOnly: true, notes: editing < 0 ? "" : channels[editing].notes }, airband(), fmBroadcast());
      if (editing < 0) merge([channel]);
      else { const copy = channels.slice(); copy[editing] = channel; channels = copy; editing = -1; render(); status("Canal actualizado (solo RX)."); }
    });
    bind("base-file", "change", async () => {
      const data = await file("base-file", true);
      if ($("base-file").files[0].name.toLowerCase().endsWith(".json")) {
        const loaded = R.readAnytoneProject(JSON.parse(new TextDecoder().decode(data)));
        R.assert(channels.length === 0 || root.confirm("Reemplazar el proyecto actual por el archivo? Exporta antes si quieres conservarlo."), "Apertura cancelada");
        channels = loaded.channels; $("profile").value = loaded.profile; previousProfile = loaded.profile;
        $("airband").disabled = loaded.profile !== "OTHER"; $("airband").checked = loaded.airband; updateAirband();
        $("fm-broadcast").disabled = loaded.profile !== "OTHER"; $("fm-broadcast").checked = loaded.fmBroadcast; updateFMBroadcast();
        editing = -1; render(); status("Proyecto abierto."); return;
      }
      const gd77 = data.length === 0x20000;
      R.assert(gd77 || data.length === R.QUANSHENG_CONFIG_SIZE, "Solo binario OpenGD77 estandar o configuracion F4HWN v6 reconocida; RDT no admitido.");
      const read = gd77 ? R.readChannels(data) : R.readQuanshengChannels(data);
      const contacts = gd77 ? R.readContacts(data) : [];
      const supported = read.filter(c => gd77 ? c.mode === 0 || c.mode === 1 : c.mode === 0);
      merge(supported.map(c => ({ ...c, talkgroup: gd77 && c.mode === 1 ?
        contacts.find(contact => contact.number === c.contact && contact.type === 0)?.id || 0 : 0,
      source: gd77 ? "Codeplug OpenGD77 importado; ubicacion pendiente de verificar" : "Configuracion Quansheng importada; ubicacion pendiente de verificar",
      zone: gd77 ? "Importado OpenGD77" : "Importado Quansheng",
      notes: "Revisar tonos, contacto y listas RX en el CPS destino; no se convierten ajustes propietarios." })));
      status($("status").textContent + ` ${read.length - supported.length} canales omitidos por modo no convertible; no se certifica ubicacion Espana.`);
    });
    bind("repeaters-file", "change", async () => {
      const payload = await file("repeaters-file");
      if (payload && Array.isArray(payload.items)) {
        const result = R.anytoneURERepeaters(payload);
        R.assert(result.channels.length, "No hay repetidores FM validos en el listado URE");
        merge(result.channels);
        status($("status").textContent + ` ${result.rejected.length} registros URE omitidos por modo o datos no convertibles.`);
        return;
      }
      if (payload && Array.isArray(payload.rptrs)) {
        const result = R.anytoneRadioIDRepeaters(payload);
        R.assert(result.channels.length, "No hay registros espanoles DMR validos en RadioID");
        merge(result.channels);
        status($("status").textContent + ` ${result.rejected.length} registros espanoles rechazados por campos invalidos. ACTIVE no certifica operacion actual.`);
        return;
      }
      const incoming = [];
      const rejected = [];
      for (const mode of ["FM", "DMR"]) {
        const normalized = R.normalizeRepeaters(payload, mode);
        incoming.push(...normalized.entries.filter(c => ["spain", "espana", "es"].includes(R.norm(c.country)))
          .map(c => ({ ...c, zone: `Espana ${c.mode === 1 ? "DMR" : "FM"} ${c.region}`.slice(0, 64),
            notes: `Tono publicado: ${c.tone || "sin dato"}. TS/TG por revisar; no inferidos de la frecuencia.` })));
        rejected.push(...normalized.rejected);
      }
      R.assert(incoming.length, "No hay repetidores FM/DMR operativos identificados como Espana");
      merge(incoming);
      status($("status").textContent + ` ${rejected.length} evaluaciones FM/DMR rechazadas; paises distintos de Espana omitidos.`);
    });
    bind("airports-file", "change", async () => {
      R.assert(airband(), "Confirma AM aerea para tu modelo");
      const payload = await file("airports-file");
      R.assert(payload && Array.isArray(payload.results) && payload.results.length > 0 && payload.results.length <= 4000, "Se requiere results con 1-4000 servicios aereos");
      const result = location
        ? R.anytoneNearbyAirportChannels(payload, location, Number($("radius").value))
        : { channels: payload.results.map(row => {
          R.assert(/AIP/i.test(String(row.source || "")), `Aeropuerto ${row.name || "sin nombre"}: incluye referencia AIP vigente en source.`);
          return { name: row.name, rx: row.frequencyMHz, mode: "AM",
            rxOnly: true, source: row.source, zone: `Aeropuertos Espana ${row.airport || row.icao || ""}`.slice(0, 64),
            notes: `${row.service || "Servicio aeronautico"}; referencia AIP aportada por el usuario.` };
        }), omitted: 0 };
      R.assert(result.channels.length, "No hay servicios AIP dentro del radio elegido con coordenadas validas.");
      merge(result.channels);
      if (result.omitted) status(`${$("status").textContent} ${result.omitted} registros fuera del radio o sin coordenadas omitidos.`);
    });
    bind("air-guard", "click", () => {
      R.assert(airband(), "Confirma AM aerea para tu modelo");
      merge([R.anytoneAirbandGuardChannel()]);
    });
    bind("location", "click", async () => {
      R.assert(navigator.geolocation, "Geolocalizacion no disponible.");
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve,
        error => reject(new Error(`No se obtuvo la ubicacion (${error.code}).`)),
        { timeout: 15000, maximumAge: 60000, enableHighAccuracy: false }));
      location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      $("location-status").textContent = `Ubicacion guardada solo en memoria local; precision ${Math.round(position.coords.accuracy)} m. No se envia a ningun servicio.`;
    });
    bind("fm-file", "change", async () => {
      R.assert(fmBroadcast(), "Confirma recepcion FM comercial para tu modelo.");
      R.assert(location, "Pulsa primero Usar ubicacion del navegador.");
      const result = R.anytoneNearbyFMChannels(await file("fm-file"), location, Number($("radius").value));
      R.assert(result.channels.length, "No hay emisoras validas en el radio elegido.");
      merge(result.channels);
      if (result.omitted) status(`${$("status").textContent} ${result.omitted} emisoras fuera del radio o sin coordenadas omitidas.`);
    });
    bind("save", "click", () => {
      const data = project(); R.readAnytoneProject(data);
      download(JSON.stringify(data, null, 2), "Bricohams-AnyTone-Espana-RX.proyecto.json", "application/json");
    });
    bind("csv", "click", () => download(R.anytoneProjectCSV(project()), "Bricohams-AnyTone-Espana-RX.intercambio.csv", "text/csv"));
    render();
  };
})(globalThis);
