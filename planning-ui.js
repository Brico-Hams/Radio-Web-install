(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  function mountPlanningUI({ page, model, action, download, log, importChannels, importContacts, importSatellites, readSatellites, templates }) {
    const panel = document.createElement("section");
    panel.id = "planning-panel";
    panel.className = "panel operations planning-panel";
    panel.innerHTML = `<h2>Codeplug: contactos, repetidores y SAT</h2>
      <p>Consulta proveedores solo al pulsar un boton. Los datos se preparan localmente; no se envian copias ni codeplugs. Todos los canales importados empiezan <strong>solo recepcion</strong>. Comprueba bandas, permisos, tonos y parametros antes de transmitir.</p>
      <p class="card-note">${page === "quansheng"
        ? "Quansheng es analogico: no admite contactos DMR. Se exportan canales FM en CSV CHIRP para revisar en una herramienta compatible con tu firmware. No hay escritura remota de canales ni formato nativo SAT verificado en este conector."
        : "Anade contactos privados (max. 1024 en total), canales y satelites (lista SAT, max. 25) a tu binario estandar abierto. No es la base masiva de indicativos DMR. Se preservan los registros existentes. Escribir en la radio sigue bloqueado sin respaldo MCU completo."}</p>
      <fieldset id="plan-controls" class="planning-controls">
      <div class="guide-tabs" role="group" aria-label="Tipo de datos">
        <button type="button" class="guide-tab" data-plan-tab="repeaters" aria-pressed="true">Repetidores</button>
        <button type="button" class="guide-tab" data-plan-tab="contacts" aria-pressed="false" ${page === "quansheng" ? "disabled" : ""}>Contactos DMR</button>
        <button type="button" class="guide-tab" data-plan-tab="sat" aria-pressed="false">SAT / pases</button>
      </div>
      <div class="planning-filters" id="plan-geographic">
        <div><label for="plan-country">Pais (nombre del proveedor, p. ej. Spain)</label><input id="plan-country" value="Spain" maxlength="80"></div>
        <div><label for="plan-region">Zona / estado / provincia (opcional)</label><input id="plan-region" maxlength="80" placeholder="Madrid"></div>
        <div><label for="plan-query">Filtrar resultados visibles por nombre / indicativo / ID</label><input id="plan-query" maxlength="80"></div>
      </div>
      <div id="plan-repeaters">
        <p><a href="https://www.repeaterbook.com/api/token_request.php" target="_blank" rel="noopener noreferrer">Solicitar aprobacion de RepeaterBook</a>. Data courtesy of RepeaterBook.com. Solo importacion para programar tu radio con autorizacion; sin scraping, mirrors ni directorio publico.</p>
        <div class="planning-filters">
          <div><label for="plan-mode">Modo de repetidores</label><select id="plan-mode"><option value="FM">FM analogica</option>${page !== "quansheng" ? '<option value="DMR">DMR (requiere plantilla DMR)</option>' : ""}</select></div>
          <div><label for="plan-band">Banda de recepcion compatible con tu equipo</label><select id="plan-band"><option value="both">VHF y UHF (verificar hardware)</option><option value="vhf">Solo VHF</option><option value="uhf">Solo UHF</option></select></div>
          <div><label for="plan-state-id">ID de estado/provincia RepeaterBook (EE.UU./Canada/Mexico)</label><input id="plan-state-id" inputmode="numeric" maxlength="4"></div>
        </div>
        <label class="check"><input id="plan-rb-consent" type="checkbox"><span>Tengo autorizacion para usar estos datos de RepeaterBook en la programacion personal de mi radio.</span></label>
        <div class="operation-buttons"><button id="plan-rb-query" type="button" class="button secondary">Consultar RepeaterBook autorizado</button><button id="plan-rb-status" type="button" class="button secondary">Comprobar configuracion de acceso</button></div>
        <label for="plan-rb-file">O importar una exportacion JSON RepeaterBook obtenida con autorizacion (max. 8 MiB)</label><input id="plan-rb-file" type="file" accept=".json,application/json">
        <p id="plan-rb-web-notice" role="status" hidden>RepeaterBook solo est&aacute; disponible en la versi&oacute;n instalada (requiere tu clave aprobada). <a id="plan-rb-release" href="#" target="_blank" rel="noopener noreferrer" hidden>Descargar la versi&oacute;n instalada</a></p>
        <p id="plan-rb-info" role="status">Sin consultas. El token individual se configura solo en el entorno del servidor.</p>
        <div class="operation-buttons"><button id="plan-rb-select" type="button" class="button secondary">Seleccionar visibles</button><button id="plan-rb-stage" type="button" class="button primary">Anadir seleccion a canales preparados</button></div>
        <div class="table-scroll"><table><thead><tr><th>Elegir</th><th>Nombre</th><th>RX / TX MHz</th><th>Zona</th><th>Modo / tono</th></tr></thead><tbody id="plan-rb-results"></tbody></table></div>
      </div>
      <div id="plan-contacts" hidden>
        <p id="plan-contacts-help">RadioID: busqueda paginada por pais y estado. La zona/ciudad adicional y el texto se filtran en la pagina actual. Selecciona paginas conscientemente; no se descarga toda la base automaticamente. Se anaden contactos privados, no grupos de conversacion.</p>
        <div class="operation-buttons"><button id="plan-contacts-query" type="button" class="button secondary">Buscar contactos RadioID</button><button id="plan-contacts-prev" type="button" class="button secondary">Pagina anterior</button><button id="plan-contacts-next" type="button" class="button secondary">Pagina siguiente</button><button id="plan-contacts-select" type="button" class="button secondary">Seleccionar pagina visible</button></div>
        <div id="plan-web-contacts" hidden>
          <p><a href="https://radioid.net/static/user.csv" target="_blank" rel="noopener noreferrer">Descargar user.csv en radioid.net &#8599;</a></p>
          <label for="plan-contacts-csv">Cargar user.csv (max. 100 MiB; se filtra por el pais y la zona de arriba, max. 5000 contactos)</label><input id="plan-contacts-csv" type="file" accept=".csv,text/csv">
          <fieldset><legend>Mi perfil (solo en este navegador, nunca se env&iacute;a)</legend>
            <div class="planning-filters">
              <div><label for="plan-profile-call">Indicativo</label><input id="plan-profile-call" maxlength="10" autocomplete="off"></div>
              <div><label for="plan-profile-id">ID DMR (7 digitos)</label><input id="plan-profile-id" inputmode="numeric" maxlength="7" autocomplete="off"></div>
            </div>
            <div class="operation-buttons"><button id="plan-profile-save" type="button" class="button secondary">Guardar perfil</button><button id="plan-profile-clear" type="button" class="button secondary">Borrar perfil</button></div>
            <p id="plan-profile-status" role="status"></p>
          </fieldset>
        </div>
        <p id="plan-contacts-info" role="status">Sin consulta.</p>
        <div class="table-scroll"><table><thead><tr><th>Elegir</th><th>ID</th><th>Indicativo</th><th>Nombre</th><th>Pais / zona</th></tr></thead><tbody id="plan-contact-results"></tbody></table></div>
        <div class="operation-buttons"><button id="plan-contacts-add" type="button" class="button primary">Anadir seleccion al codeplug local abierto</button><button id="plan-contacts-save" type="button" class="button secondary">Guardar seleccion de contactos JSON</button><button id="plan-contacts-clear" type="button" class="button secondary">Vaciar seleccion de contactos</button></div>
        <p id="plan-contacts-count" role="status">0 contactos seleccionados.</p>
      </div>
      <div id="plan-sat" hidden>
        <p>Los pases se calculan con SGP4 en este navegador, no se descargan como horarios universales. La posicion no se envia a los proveedores. SatNOGS DB publica datos comunitarios: una frecuencia activa no garantiza que el satelite opere ahora como repetidor de voz.</p>
        <div class="planning-filters">
          <div><label for="plan-sat-preset">Elegir satelite (NORAD conocido, comprobar estado operativo)</label><select id="plan-sat-preset"><option value="">Otro NORAD / seleccion manual</option><option value="25544">ISS / 25544</option><option value="27607">SO-50 / 27607</option><option value="43017">AO-91 / 43017</option><option value="43678">PO-101 / 43678</option></select></div>
          <div><label for="plan-norad">NORAD del satelite</label><input id="plan-norad" inputmode="numeric" value="25544" maxlength="5"></div>
          <div><label for="plan-orbit-source">Proveedor orbital</label><select id="plan-orbit-source"><option value="satnogs">SatNOGS DB (TLE)</option><option value="celestrak">CelesTrak (TLE)</option></select></div>
        </div>
        <div class="operation-buttons"><button id="plan-tle-load" type="button" class="button secondary">Actualizar elementos orbitales</button><button id="plan-tx-load" type="button" class="button secondary">Consultar frecuencias SatNOGS</button></div>
        <p id="plan-tle-info" role="status">Sin elementos orbitales.</p>
        <label for="plan-tx">Frecuencia puntual FM de recepcion (solo VHF/UHF)</label><select id="plan-tx"><option value="">Consulta las frecuencias</option></select>
        <p id="plan-tx-info" role="status">No se han consultado frecuencias.</p>
        <div class="operation-buttons"><button id="plan-sat-stage" type="button" class="button secondary">Preparar canal SAT FM solo RX</button>${page !== "quansheng" ? '<button id="plan-sat-codeplug" type="button" class="button primary">Cargar satelite en lista SAT del codeplug local</button><button id="plan-sat-list" type="button" class="button secondary">Ver satelites del codeplug</button>' : ""}</div>
        ${page !== "quansheng" ? '<p id="plan-sat-codeplug-info" role="status">Lista SAT OpenGD77 (max. 25, bloque de datos personalizados tipo 3). Solo RX: sin subida, tonos ni APRS. Se conservan los satelites existentes y el resto de bloques (imagen de arranque, melodia, tema).</p>' : ""}
        <div class="planning-filters">
          <div><label for="plan-lat">Latitud (-90 a 90)</label><input id="plan-lat" type="number" step="any" min="-90" max="90"></div>
          <div><label for="plan-lon">Longitud (-180 a 180)</label><input id="plan-lon" type="number" step="any" min="-180" max="180"></div>
          <div><label for="plan-alt">Altitud del observador, metros (-500 a 9000)</label><input id="plan-alt" type="number" value="0" min="-500" max="9000"></div>
          <div><label for="plan-hours">Proximas horas</label><select id="plan-hours"><option value="24">24</option><option value="48">48</option></select></div>
          <div><label for="plan-elevation">Elevacion minima (grados)</label><input id="plan-elevation" type="number" value="10" min="0" max="60"></div>
        </div>
        <label class="check"><input id="plan-location-consent" type="checkbox"><span>Autorizo usar mi posicion para calcular pases localmente. Si exporto el plan, incluira esa posicion.</span></label>
        <div class="operation-buttons"><button id="plan-gps" type="button" class="button secondary">Usar mi ubicacion (pedir permiso)</button><button id="plan-predict" type="button" class="button primary">Calcular proximos pases</button><button id="plan-pass-save" type="button" class="button secondary">Guardar plan de pases JSON</button><button id="plan-tle-save" type="button" class="button secondary">Guardar TLE para herramienta compatible</button></div>
        <p id="plan-pass-info" role="status">TLE obligatorio con epoca de menos de 7 dias. Precision de muestreo 5 s; cruces refinados a 0,5 s. Sin relieve ni correccion atmosferica. No controla antenas; el Doppler se compensa con canales por tramos.</p>
        <div class="table-scroll"><table><thead><tr><th>Inicio UTC</th><th>Maximo UTC</th><th>Fin UTC</th><th>Elevacion max.</th><th>Azimut inicio / fin</th></tr></thead><tbody id="plan-pass-results"></tbody></table></div>
        <div class="planning-filters">
          <div><label for="plan-doppler-pass">Pase para canales Doppler</label><select id="plan-doppler-pass"><option value="">Calcula los pases primero</option></select></div>
          <div><label for="plan-doppler-segments">Canales por pase (1 a 10)</label><input id="plan-doppler-segments" type="number" value="5" min="1" max="10"></div>
        </div>
        <div class="operation-buttons"><button id="plan-doppler-stage" type="button" class="button secondary">Preparar canales con Doppler corregido (solo RX)</button></div>
        <p id="plan-doppler-info" role="status">Una memoria por salto de frecuencia igual del Doppler; las ventanas son mas cortas cerca del maximo. Cambia de memoria a la hora indicada; la radio no sigue el Doppler sola.</p>
      </div>
      <hr><h3>Canales preparados (sin escribir en la radio)</h3>
      ${page !== "quansheng" ? '<label for="plan-template">Plantilla del codeplug abierto: se preservan sus ajustes no importados</label><select id="plan-template"><option value="">Abre o lee un codeplug primero</option></select><button id="plan-template-refresh" type="button" class="button secondary">Actualizar plantillas</button>' : ""}
      <p id="plan-channel-count" role="status">0 canales preparados. Los tonos no se activan automaticamente; revisalos en el editor oficial.</p>
      <div class="table-scroll"><table><thead><tr><th>Nombre</th><th>RX / TX nominal</th><th>Modo</th><th>Fuente</th><th>Quitar</th></tr></thead><tbody id="plan-channel-results"></tbody></table></div>
      <div class="operation-buttons">${page !== "quansheng" ? '<button id="plan-channels-add" type="button" class="button primary">Anadir canales al codeplug local abierto</button>' : '<button id="plan-chirp-save" type="button" class="button primary">Exportar canales FM CSV CHIRP (solo RX)</button>'}<button id="plan-channel-save" type="button" class="button secondary">Guardar proyecto de canales JSON</button></div>
      <button type="button" class="button secondary" disabled>Instalacion directa de estos datos no disponible con las garantias actuales</button>
      </fieldset><p id="plan-status" role="status">Listo. Sin solicitudes externas ni geolocalizacion automatica.</p>`;
    document.getElementById("radio-operations").before(panel);
    const $ = id => document.getElementById(id);
    let busy = false;
    let web = false;
    let currentTab = "repeaters";
    let repeaters = [];
    let rbRejected = [];
    let contactResult = null;
    let contactQuery = null;
    let orbital = null;
    let transmitters = [];
    let prediction = null;
    const chosenRepeaters = new Set();
    const chosenContacts = new Map();
    const staged = new Map();
    function notify(message) { $("plan-status").textContent = message; log(message); }
    let satFile = null;
    function loadSatFile() {
      satFile = satFile || fetch("data/satellites.json", { credentials: "omit", cache: "no-cache", signal: AbortSignal.timeout(30000) })
        .then(async response => {
          R.assert(response.ok, `Lista diaria de satelites no disponible (HTTP ${response.status}).`);
          return R.validateSatellitesFile(await response.json());
        });
      satFile.catch(() => { satFile = null; }); // allow a retry after a failure
      return satFile;
    }
    async function webSatellite(endpoint, params) {
      R.assert(params.provider === undefined || params.provider === "satnogs", "En la web solo esta disponible SatNOGS.");
      const file = await loadSatFile();
      const sat = R.pickSatellite(file, params.norad);
      return endpoint === "satellite" ? { ...sat, fromFile: true }
        : { norad: sat.norad, source: sat.source, attribution: file.attribution, fetchedAt: sat.fetchedAt, entries: sat.transmitters };
    }
    async function request(endpoint, params = {}) {
      if ((endpoint === "satellite" || endpoint === "transmitters") && (await R.runtime).mode === "web") return webSatellite(endpoint, params);
      R.assert(root.location.protocol !== "file:", "Los proveedores requieren npm start y el servidor local.");
      const response = await fetch(`api/data/${endpoint}?${new URLSearchParams(params)}`, {
        credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(40000)
      });
      R.assert((response.headers.get("content-type") || "").includes("application/json"), "API de proveedores no disponible. Reinicia npm start.");
      const result = await response.json();
      R.assert(response.ok, result.error || `Error del proveedor HTTP ${response.status}.`);
      return result;
    }
    function perform(label, operation) {
      return action(label, async () => {
        try { await operation(); }
        catch (error) { $("plan-status").textContent = `ERROR: ${error.message}`; throw error; }
      });
    }
    function attach(id, label, handler) { $(id).addEventListener("click", () => perform(label, handler)); }
    function cell(row, value) {
      const td = document.createElement("td");
      td.textContent = value;
      row.append(td);
      return td;
    }
    function filters() {
      return { country: $("plan-country").value, region: $("plan-region").value, query: $("plan-query").value, band: $("plan-band").value };
    }
    function visibleRepeaters() { return R.filterRecords(repeaters, filters()); }
    function renderRepeaters() {
      $("plan-rb-results").replaceChildren();
      for (const entry of visibleRepeaters()) {
        const row = document.createElement("tr");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.setAttribute("aria-label", `Elegir repetidor ${entry.name} ${entry.rx}`);
        checkbox.checked = chosenRepeaters.has(entry.key);
        checkbox.addEventListener("change", () => checkbox.checked ? chosenRepeaters.add(entry.key) : chosenRepeaters.delete(entry.key));
        cell(row, "").append(checkbox);
        cell(row, entry.name); cell(row, `${entry.rx} / ${entry.tx}`);
        cell(row, `${entry.country} ${entry.region} ${entry.city}`);
        cell(row, `${entry.mode ? "DMR CC " + entry.colorCode : "FM"} / ${entry.tone || "sin dato"}`);
        $("plan-rb-results").append(row);
      }
      $("plan-rb-info").textContent = `${visibleRepeaters().length} visibles de ${repeaters.length}; ${rbRejected.length} excluidos. ${rbRejected.slice(0, 4).map(item => `#${item.index}: ${item.reason}`).join(" | ")} Data courtesy of RepeaterBook.com.`;
    }
    function visibleContacts() {
      // Country/state were applied by RadioID; local text never hides missing-state records by assumption.
      return R.filterRecords(contactResult?.entries || [], { query: $("plan-query").value });
    }
    function renderContacts() {
      $("plan-contact-results").replaceChildren();
      const profile = web && R.profile ? R.profile.get() : null;
      for (const entry of visibleContacts()) {
        const row = document.createElement("tr");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = chosenContacts.has(entry.id);
        checkbox.setAttribute("aria-label", `Elegir contacto ${entry.callsign} ${entry.id}`);
        checkbox.addEventListener("change", () => {
          if (checkbox.checked) chosenContacts.set(entry.id, entry); else chosenContacts.delete(entry.id);
          $("plan-contacts-count").textContent = `${chosenContacts.size} contactos seleccionados (se conservan entre paginas).`;
        });
        cell(row, "").append(checkbox);
        const mine = web && profile && String(entry.id) === profile.dmrId;
        for (const value of [entry.id, mine ? `${entry.callsign} (t\u00fa)` : entry.callsign, entry.name, `${entry.country} / ${entry.region} / ${entry.city}`]) cell(row, value);
        $("plan-contact-results").append(row);
      }
      $("plan-contacts-info").textContent = contactResult?.csv
        ? `user.csv: ${contactResult.total} contactos coinciden${contactResult.truncated ? ` (se muestran los primeros ${contactResult.entries.length})` : ""}; ${visibleContacts().length} visibles.`
        : contactResult
        ? `RadioID: pagina ${contactResult.page}/${contactResult.pages}; ${contactResult.total} contactos en la busqueda; ${visibleContacts().length} visibles. ${contactResult.fetchedAt}`
        : "Sin consulta. Los filtros modificados requieren una nueva busqueda.";
      $("plan-contacts-count").textContent = `${chosenContacts.size} contactos seleccionados (se conservan entre paginas).`;
    }
    function renderStaged() {
      $("plan-channel-results").replaceChildren();
      for (const entry of staged.values()) {
        const row = document.createElement("tr");
        cell(row, entry.name); cell(row, `${entry.rx} / ${entry.tx}`); cell(row, entry.mode ? "DMR solo RX" : "FM solo RX");
        cell(row, entry.window ? `${entry.source} · Doppler ${entry.window}` : entry.source);
        const remove = document.createElement("button");
        remove.type = "button"; remove.className = "guide-tab"; remove.textContent = "Quitar";
        remove.addEventListener("click", () => { if (busy) return; staged.delete(entry.key); renderStaged(); });
        cell(row, "").append(remove);
        $("plan-channel-results").append(row);
      }
      $("plan-channel-count").textContent = `${staged.size} canales preparados. Tonos RX/TX desactivados al importar; TX bloqueada. DMR hereda TS, contacto y lista RX de la plantilla: revisar antes de transmitir.`;
    }
    function stage(entries) {
      R.assert(entries.length > 0, "Selecciona registros primero.");
      const additional = entries.filter(entry => !staged.has(entry.key));
      R.assert(staged.size + additional.length <= 1024, "Maximo 1024 canales preparados.");
      entries.forEach(entry => staged.set(entry.key, entry));
      renderStaged();
      notify(`${additional.length} canales anadidos al proyecto local; no se ha escrito en la radio.`);
    }
    function refreshTemplates() {
      if (!$("plan-template")) return;
      const channels = templates();
      $("plan-template").replaceChildren(new Option("Selecciona canal plantilla con el mismo modo del lote", ""),
        ...channels.filter(channel => [0, 1].includes(channel.mode)).map(channel => new Option(`${channel.number}: ${channel.name} (${channel.mode ? "DMR" : "FM"})`, channel.number)));
    }
    function invalidatePrediction() {
      prediction = null;
      $("plan-pass-results").replaceChildren();
      $("plan-doppler-pass").replaceChildren(new Option("Calcula los pases primero", ""));
      $("plan-pass-info").textContent = "Datos cambiados: vuelve a calcular los pases antes de exportar.";
    }
    function clearOrbit() {
      orbital = null;
      transmitters = [];
      $("plan-tx").replaceChildren(new Option("Consulta las frecuencias", ""));
      $("plan-tle-info").textContent = "Satelite/proveedor cambiado: actualiza los elementos.";
      $("plan-tx-info").textContent = "Sin frecuencias consultadas.";
      invalidatePrediction();
    }
    panel.querySelectorAll("[data-plan-tab]").forEach(button => button.addEventListener("click", () => {
      currentTab = button.dataset.planTab;
      for (const tab of ["repeaters", "contacts", "sat"]) $(`plan-${tab}`).hidden = tab !== currentTab;
      $("plan-geographic").hidden = currentTab === "sat";
      panel.querySelectorAll("[data-plan-tab]").forEach(item => item.setAttribute("aria-pressed", item === button));
    }));
    $("plan-query").addEventListener("input", () => { renderRepeaters(); renderContacts(); });
    for (const id of ["plan-country", "plan-region"]) $(id).addEventListener("input", () => {
      contactResult = null; contactQuery = null; renderContacts(); renderRepeaters();
    });
    $("plan-band").addEventListener("change", renderRepeaters);
    $("plan-mode").addEventListener("change", () => { repeaters = []; rbRejected = []; chosenRepeaters.clear(); renderRepeaters(); });
    function requireRB() { R.assert($("plan-rb-consent").checked, "Confirma tu autorizacion para usar los datos RepeaterBook."); }
    function acceptRepeaters(data) {
      const result = R.normalizeRepeaters(data, $("plan-mode").value);
      repeaters = result.entries;
      rbRejected = result.rejected;
      chosenRepeaters.clear();
      renderRepeaters();
      notify(`${repeaters.length} repetidores compatibles preparados para seleccionar; ${rbRejected.length} excluidos. Consulta el resumen.`);
    }
    attach("plan-rb-status", "Comprobar acceso RepeaterBook", async () => {
      const status = await request("status");
      notify(`${status.repeaterbookConfigured ? "Entorno configurado; la aprobacion se comprueba al consultar." : "Acceso sin configurar."} ${status.notice}`);
    });
    attach("plan-rb-query", "Consultar RepeaterBook", async () => {
      requireRB();
      acceptRepeaters(await request("repeaters", { country: $("plan-country").value, region: $("plan-region").value,
        stateId: $("plan-state-id").value, mode: $("plan-mode").value }));
    });
    $("plan-rb-file").addEventListener("change", () => perform("Importar JSON RepeaterBook autorizado", async () => {
      requireRB();
      const file = $("plan-rb-file").files[0];
      R.assert(file && file.size > 0 && file.size <= 8 * 1024 * 1024, "Archivo JSON: 1 byte a 8 MiB.");
      acceptRepeaters(JSON.parse(await file.text()));
    }));
    attach("plan-rb-select", "Seleccionar repetidores visibles", async () => {
      visibleRepeaters().forEach(entry => chosenRepeaters.add(entry.key)); renderRepeaters();
    });
    attach("plan-rb-stage", "Preparar repetidores seleccionados", async () => {
      requireRB();
      stage(visibleRepeaters().filter(entry => chosenRepeaters.has(entry.key)));
    });
    async function loadContacts(pageNumber, fresh = false) {
      R.assert(page !== "quansheng", "Esta radio no admite contactos DMR.");
      if (fresh) contactQuery = { country: $("plan-country").value, region: $("plan-region").value };
      R.assert(contactQuery, "Realiza una nueva busqueda.");
      const result = await request("contacts", { ...contactQuery, page: String(pageNumber) });
      R.assert(Array.isArray(result.entries), "Contactos no reconocidos.");
      contactResult = result;
      renderContacts();
    }
    attach("plan-contacts-query", "Buscar contactos RadioID", () => loadContacts(1, true));
    attach("plan-contacts-prev", "Pagina anterior RadioID", async () => {
      R.assert(contactResult && contactResult.page > 1, "No hay pagina anterior.");
      await loadContacts(contactResult.page - 1);
    });
    attach("plan-contacts-next", "Pagina siguiente RadioID", async () => {
      R.assert(contactResult && contactResult.page < contactResult.pages, "No hay pagina siguiente.");
      await loadContacts(contactResult.page + 1);
    });
    attach("plan-contacts-select", "Seleccionar contactos visibles", async () => {
      R.assert(contactResult, "Busca contactos primero.");
      visibleContacts().forEach(entry => chosenContacts.set(entry.id, entry)); renderContacts();
    });
    attach("plan-contacts-clear", "Vaciar seleccion", async () => { chosenContacts.clear(); renderContacts(); });
    attach("plan-contacts-add", "Anadir contactos al codeplug local", async () => {
      R.assert(page !== "quansheng", "Quansheng no admite contactos DMR.");
      const result = importContacts([...chosenContacts.values()]);
      notify(`${result.added} contactos privados anadidos; ${result.duplicates} duplicados omitidos. Guarda el binario en el editor. Sin escritura en la radio.`);
    });
    attach("plan-contacts-save", "Guardar seleccion RadioID", async () => {
      R.assert(chosenContacts.size > 0, "No hay contactos seleccionados.");
      download("radioid-contact-selection.json", JSON.stringify({ format: "radio-workspace-contacts", source: "https://radioid.net",
        exportedAt: new Date().toISOString(), contacts: [...chosenContacts.values()] }, null, 2), "application/json");
    });
    if ($("plan-template-refresh")) attach("plan-template-refresh", "Actualizar plantillas", refreshTemplates);
    if ($("plan-channels-add")) attach("plan-channels-add", "Anadir canales al codeplug local", async () => {
      const result = importChannels([...staged.values()], Number($("plan-template").value));
      refreshTemplates();
      notify(`${result.added} canales anadidos; ${result.duplicates} duplicados omitidos. Solo RX. Guarda el binario en el editor; no se ha instalado en la radio.`);
    });
    if ($("plan-chirp-save")) attach("plan-chirp-save", "Exportar canales FM", async () => {
      download("quansheng-rx-channels.csv", R.channelCSV([...staged.values()]), "text/csv;charset=utf-8");
      notify("CSV CHIRP solo RX exportado. Importalo y revisalo en un controlador compatible con tu modelo/firmware; no es un volcado binario ni una instalacion.");
    });
    attach("plan-channel-save", "Guardar proyecto local", async () => {
      R.assert(staged.size > 0, "No hay canales preparados.");
      download("radio-channel-project.json", JSON.stringify({ format: "radio-workspace-channel-project", version: 1,
        target: model.value, channels: [...staged.values()], warning: "Proyecto local, no codeplug binario. Todos los canales solo RX." }, null, 2), "application/json");
    });
    for (const id of ["plan-norad", "plan-orbit-source"]) $(id).addEventListener("change", clearOrbit);
    for (const id of ["plan-lat", "plan-lon", "plan-alt", "plan-hours", "plan-elevation", "plan-location-consent"]) $(id).addEventListener("change", invalidatePrediction);
    function requireOrbit() {
      R.assert(orbital && orbital.norad === Number($("plan-norad").value), "Actualiza los elementos para el NORAD seleccionado.");
      R.validateTLE(orbital);
    }
    async function loadOrbit() {
      clearOrbit();
      const result = await request("satellite", { norad: $("plan-norad").value, provider: $("plan-orbit-source").value });
      const { epoch } = R.validateTLE(result);
      orbital = result;
      const warning = result.fromFile ? R.satelliteAgeWarning({ fetchedAt: result.fetchedAt }) : null;
      $("plan-tle-info").textContent = `${warning ? `${warning} ` : ""}${result.name} / NORAD ${result.norad}. Epoca UTC ${new Date(epoch).toISOString()}. ${result.source}${result.stale ? " (dato del ultimo despliegue correcto)" : ""}. SatNOGS puede distribuir TLE de terceros; no son una garantia de disponibilidad operativa.`;
    }
    attach("plan-tle-load", "Actualizar TLE oficial", loadOrbit);
    $("plan-sat-preset").addEventListener("change", () => {
      if (!$("plan-sat-preset").value) return;
      $("plan-norad").value = $("plan-sat-preset").value;
      perform("Actualizar TLE del satelite elegido", loadOrbit);
    });
    attach("plan-tx-load", "Consultar frecuencias de satelite", async () => {
      requireOrbit();
      transmitters = [];
      $("plan-tx").replaceChildren(new Option("Consulta en curso", ""));
      const result = await request("transmitters", { norad: String(orbital.norad) });
      R.assert(result.norad === orbital.norad && Array.isArray(result.entries), "Frecuencias de otro satelite.");
      let excluded = 0;
      for (const entry of result.entries) {
        try { R.satelliteChannel(orbital, entry); transmitters.push(entry); }
        catch { excluded++; }
      }
      $("plan-tx").replaceChildren(new Option("Selecciona frecuencia FM para recepcion", ""),
        ...transmitters.map(entry => new Option(`${entry.name}: ${(entry.downlink / 1000000).toFixed(5)} MHz (${entry.mode})`, entry.id)));
      $("plan-tx-info").textContent = `${transmitters.length} frecuencias FM compatibles; ${excluded} modos/rangos no compatibles excluidos. ${result.attribution}`;
    });
    attach("plan-sat-stage", "Preparar canal satelital", async () => {
      requireOrbit();
      const entry = transmitters.find(item => item.id === $("plan-tx").value);
      stage([R.satelliteChannel(orbital, entry)]);
    });
    function describeSatellites(list) {
      return list.length ? list.map(sat => `${sat.name} RX ${sat.rx1.toFixed(5)}${sat.tx1 ? ` / TX ${sat.tx1.toFixed(5)}` : " (solo RX)"}`).join("; ") : "ninguno";
    }
    if ($("plan-sat-codeplug")) attach("plan-sat-codeplug", "Cargar satelite en codeplug local", async () => {
      requireOrbit();
      const entry = transmitters.find(item => item.id === $("plan-tx").value);
      const channel = R.satelliteChannel(orbital, entry);
      const result = importSatellites([{ name: orbital.name.replace(/\s*\(.*?\)\s*/g, " ").trim() || orbital.name, tle1: orbital.tle1, tle2: orbital.tle2, rx: Number(channel.rx) }]);
      $("plan-sat-codeplug-info").textContent = `Satelites en el codeplug local (${result.total}/25): ${describeSatellites(result.satellites)}.`;
      notify(`${result.added} satelite anadido, ${result.replaced} actualizado. Guarda el binario; la escritura en la radio sigue protegida por el respaldo verificado.`);
    });
    if ($("plan-sat-list")) attach("plan-sat-list", "Leer lista SAT del codeplug", async () => {
      const list = readSatellites();
      $("plan-sat-codeplug-info").textContent = `Satelites en el codeplug local (${list.length}/25): ${describeSatellites(list)}.`;
    });
    function consentLocation() { R.assert($("plan-location-consent").checked, "Autoriza expresamente el uso local de tu posicion."); }
    attach("plan-gps", "Obtener posicion con consentimiento", async () => {
      consentLocation();
      R.assert(navigator.geolocation, "Geolocalizacion no disponible; introduce coordenadas manuales.");
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve,
        error => reject(new Error(`No se obtuvo la ubicacion (${error.code}). Introduce coordenadas manuales.`)),
        { timeout: 15000, maximumAge: 60000, enableHighAccuracy: false }));
      $("plan-lat").value = position.coords.latitude;
      $("plan-lon").value = position.coords.longitude;
      $("plan-alt").value = Number.isFinite(position.coords.altitude) ? Math.round(position.coords.altitude) : 0;
      invalidatePrediction();
      notify(`Posicion obtenida solo para este navegador. Precision declarada: ${Math.round(position.coords.accuracy)} m. ${position.coords.altitude === null ? "Sin altitud GPS: se usa 0 m, revisala." : ""}`);
    });
    attach("plan-predict", "Calcular pases localmente", async () => {
      requireOrbit(); consentLocation();
      const numeric = id => { R.assert($(id).value.trim() !== "", "Introduce todas las coordenadas y parametros."); return Number($(id).value); };
      const result = R.predictPasses(orbital, { latitude: numeric("plan-lat"), longitude: numeric("plan-lon"), height: numeric("plan-alt") / 1000 },
        { hours: numeric("plan-hours"), minimum: numeric("plan-elevation") });
      prediction = result;
      $("plan-pass-results").replaceChildren();
      for (const pass of result.passes) {
        const row = document.createElement("tr");
        for (const value of [`${new Date(pass.aos.time).toISOString()}${pass.partialStart ? " (ya visible)" : ""}`,
          new Date(pass.maximum.time).toISOString(), `${new Date(pass.los.time).toISOString()}${pass.partialEnd ? " (fin de ventana)" : ""}`,
          `${pass.maximum.elevation.toFixed(1)} grados`, `${pass.aos.azimuth.toFixed(1)} / ${pass.los.azimuth.toFixed(1)}`]) cell(row, value);
        $("plan-pass-results").append(row);
      }
      $("plan-doppler-pass").replaceChildren(new Option(result.passes.length ? "Selecciona un pase" : "Sin pases en la ventana", ""),
        ...result.passes.map((pass, index) => new Option(`${new Date(pass.aos.time).toISOString().slice(0, 16)} UTC, max. ${pass.maximum.elevation.toFixed(0)} grados`, index)));
      $("plan-pass-info").textContent = `${result.passes.length} pases por encima de ${result.minimumElevation} grados en ${result.hours} h desde ${result.start}. Epoca TLE: ${result.epoch}. Horas UTC, no hora local. Sin escritura en la radio; para el Doppler prepara canales por tramos.`;
    });
    attach("plan-doppler-stage", "Preparar canales Doppler", async () => {
      requireOrbit(); consentLocation();
      R.assert(prediction && Date.now() - Date.parse(prediction.start) < 15 * 60000, "Calcula de nuevo los pases (caducidad 15 minutos).");
      const pass = prediction.passes[Number($("plan-doppler-pass").value)];
      R.assert($("plan-doppler-pass").value !== "" && pass, "Selecciona un pase.");
      const entry = transmitters.find(item => item.id === $("plan-tx").value);
      const channels = R.dopplerChannels(orbital, entry, pass, prediction.observer, Number($("plan-doppler-segments").value));
      stage(channels);
      $("plan-doppler-info").textContent = channels.map(channel => `${channel.name}: ${channel.rx} MHz, ${channel.window} (error max. ${channel.errorHz} Hz)`).join("; ");
    });
    attach("plan-pass-save", "Guardar prediccion de pases", async () => {
      requireOrbit(); consentLocation();
      R.assert(prediction && Date.now() - Date.parse(prediction.start) < 15 * 60000, "Calcula de nuevo los pases (caducidad 15 minutos).");
      download(`sat-${orbital.norad}-passes.json`, JSON.stringify({ format: "radio-workspace-satellite-plan", version: 1,
        orbital, prediction, warning: "Contiene tu posicion. Plan local, no formato de instalacion SAT nativo." }, null, 2), "application/json");
    });
    attach("plan-tle-save", "Guardar elementos orbitales", async () => {
      requireOrbit();
      download(`sat-${orbital.norad}.tle`, `${orbital.name}\r\n${orbital.tle1}\r\n${orbital.tle2}\r\n`, "text/plain");
      download(`sat-${orbital.norad}.source.json`, JSON.stringify(orbital, null, 2), "application/json");
      notify("TLE y procedencia/licencia solicitados para descarga. Comprueba que el navegador haya guardado ambos archivos; no se ha instalado en la radio.");
    });
    function webMode() {
      web = true;
      for (const id of ["plan-rb-query", "plan-rb-status", "plan-rb-file", "plan-rb-consent"]) $(id).disabled = true;
      $("plan-rb-web-notice").hidden = false;
      $("plan-orbit-source").value = "satnogs"; $("plan-orbit-source").disabled = true;
      const repository = typeof BRAND !== "undefined" ? BRAND.repository : "";
      if (repository) { $("plan-rb-release").href = `${repository}/releases/latest`; $("plan-rb-release").hidden = false; }
      // Quansheng has no DMR contacts, and its page does not load radioid-csv.js.
      if (page === "quansheng" || !R.profile) return;
      for (const id of ["plan-contacts-query", "plan-contacts-prev", "plan-contacts-next"]) $(id).hidden = true;
      $("plan-web-contacts").hidden = false;
      $("plan-contacts-help").hidden = true;
      const profile = R.profile.get();
      if (profile) { $("plan-profile-call").value = profile.callsign; $("plan-profile-id").value = profile.dmrId; }
      $("plan-contacts-csv").addEventListener("change", () => perform("Cargar user.csv de RadioID", async () => {
        const file = $("plan-contacts-csv").files[0];
        R.assert(file && file.size > 0 && file.size <= 100 * 1024 * 1024, "Archivo CSV: 1 byte a 100 MiB.");
        const text = await file.text();
        let country = $("plan-country").value;
        const mine = R.profile.get();
        if (!country.trim() && mine) {
          const at = text.indexOf(`\n${mine.dmrId},`);
          const end = at < 0 ? -1 : text.indexOf("\n", at + 1);
          const found = at < 0 ? "" : text.slice(at + 1, end < 0 ? undefined : end).trim().split(",").pop().replace(/"/g, "");
          if (found) { country = found; $("plan-country").value = found; }
        }
        const result = R.parseRadioIdCSV(text, { country, region: $("plan-region").value });
        contactResult = { ...result, csv: true };
        renderContacts();
        notify(`user.csv: ${result.total} contactos coinciden${result.truncated ? "; se muestran los primeros 5000, afina la zona" : ""}.`);
      }).catch(() => {}).finally(() => { $("plan-contacts-csv").value = ""; }));
      $("plan-profile-save").addEventListener("click", () => {
        try {
          const saved = R.profile.set({ callsign: $("plan-profile-call").value, dmrId: $("plan-profile-id").value });
          $("plan-profile-call").value = saved.callsign;
          $("plan-profile-status").textContent = "Perfil guardado solo en este navegador.";
          renderContacts();
        } catch (error) { $("plan-profile-status").textContent = `ERROR: ${error.message}`; }
      });
      $("plan-profile-clear").addEventListener("click", () => {
        R.profile.clear();
        $("plan-profile-call").value = ""; $("plan-profile-id").value = "";
        $("plan-profile-status").textContent = "Perfil borrado.";
        renderContacts();
      });
    }
    R.runtime.then(runtime => { if (runtime.mode === "web") webMode(); })
      .catch(error => { $("plan-status").textContent = `ERROR: ${error.message}`; });
    model.addEventListener("change", () => {
      staged.clear(); chosenRepeaters.clear(); chosenContacts.clear();
      renderStaged(); renderContacts(); refreshTemplates();
      notify("Destino cambiado: canales preparados y seleccion de contactos vaciados para no mezclar modelos.");
    });
    return {
      setBusy(value) { busy = value; $("plan-controls").disabled = value; },
      refreshTemplates
    };
  }
  R.mountPlanningUI = mountPlanningUI;
})(globalThis);
