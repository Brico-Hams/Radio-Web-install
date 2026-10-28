(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  function mountCountryTemplates({ container, action, download, addChannels }) {
    container.innerHTML = `<h3>2. Elegir plantilla</h3>
      <p>Elige pais y zona, revisa la seleccion y anadela al archivo local. La radio no se modifica.</p>
      <div class="template-filters">
        <div><label for="country-template">Pais</label><select id="country-template"></select></div>
        <div><label for="region-template">Region / estado</label><select id="region-template"><option value="">Todas las regiones</option></select></div>
      </div>
      <label for="search-template">Buscar indicativo o localidad</label><input id="search-template" type="search" maxlength="80">
      <label class="check"><input id="pmr-template" type="checkbox"> Anadir PMR446 (16 canales solo RX)</label>
      <label class="check"><input id="sat-template" type="checkbox"> Anadir memorias de satelites FM (solo RX)</label>
      <p>PMR446 no autoriza transmitir con un walkie de radioaficionado. Las memorias SAT no contienen horarios ni seguimiento Doppler.</p>
      <p id="template-coverage" role="status"></p>
      <div class="operation-buttons"><button id="template-select" type="button" class="button secondary">Seleccionar resultados (max. 1024)</button><button id="template-clear" type="button" class="button secondary">Quitar seleccion</button></div>
      <div class="table-scroll template-preview"><table><thead><tr><th>Elegir</th><th>Nombre</th><th>RX MHz</th><th>Localidad</th></tr></thead><tbody id="template-preview"></tbody></table></div>
      <div class="operation-buttons"><button id="template-previous" type="button" class="button secondary">Anterior</button><span id="template-page" role="status"></span><button id="template-next" type="button" class="button secondary">Siguiente</button></div>
      <p id="template-count" role="status"></p>
      <div class="operation-buttons"><button id="template-add" type="button" class="button primary">Anadir seleccion al archivo local</button><button id="template-export" type="button" class="button secondary">Descargar seleccion CSV</button></div>
      <details class="template-pass-panel"><summary>Pases del mes por zona</summary>
        <p>Prevision orientativa, no operativa. Solo dias restantes del mes UTC. Mas de 7 dias desde el TLE: provisional. Recalcula con tu posicion y TLE reciente antes de usar.</p>
        <label for="template-pass-zone">Ciudad / punto de referencia</label><select id="template-pass-zone"></select>
        <p id="template-pass-position"></p>
        <div class="operation-buttons"><button id="template-pass-show" type="button" class="button secondary">Ver pases de referencia</button><button id="template-pass-export" type="button" class="button secondary">Descargar pases JSON</button></div>
        <details><summary>Recalcular para mi posicion</summary>
          <label for="template-lat">Latitud</label><input id="template-lat" type="number" min="-90" max="90" step="any">
          <label for="template-lon">Longitud</label><input id="template-lon" type="number" min="-180" max="180" step="any">
          <button id="template-recalculate" type="button" class="button secondary">Recalcular mes (solo prevision)</button>
        </details>
        <p id="template-pass-status" role="status"></p>
        <div class="table-scroll template-preview"><table><thead><tr><th>Satelite</th><th>Inicio UTC</th><th>Fin UTC</th><th>Elevacion max.</th><th>Provisional</th></tr></thead><tbody id="template-pass-rows"></tbody></table></div>
        <div class="operation-buttons"><button id="template-pass-previous" type="button" class="button secondary">Anterior</button><span id="template-pass-page"></span><button id="template-pass-next" type="button" class="button secondary">Siguiente</button></div>
      </details><p id="template-status" role="status"></p>`;
    const $ = id => container.querySelector(`#${id}`);
    for (const country of R.TEMPLATE_COUNTRIES) $("country-template").add(new Option(country.name, country.code));
    let file = null, forecast = null, satellites = null, entries = [], passRows = [], passSource = null;
    let page = 0, passPage = 0, request = 0, previewRequest = 0, blocked = false, calculating = false;
    const selected = new Set(), cache = new Map();
    const text = (id, value) => { $(id).textContent = value; };
    async function json(name) {
      if (cache.has(name)) {
        const existing = cache.get(name);
        const date = existing.generatedAt || existing.fetchedAt;
        if (Date.now() - Date.parse(date) <= 86400000 &&
          (!name.endsWith("-passes") || existing.month === new Date().toISOString().slice(0, 7))) return existing;
        cache.delete(name);
      }
      const response = await fetch(`data/channel-templates/${name}.json`, { signal: AbortSignal.timeout(30000) });
      R.assert(response.ok, `Plantilla no disponible: HTTP ${response.status} (${name}).`);
      const data = await response.json();
      cache.set(name, data);
      return data;
    }
    function run(label, handler) {
      return action(label, async () => {
        try { await handler(); }
        catch (error) { text("template-status", `ERROR: ${error.message}`); throw error; }
      });
    }
    function on(id, label, handler) { $(id).addEventListener("click", () => run(label, handler)); }
    function updateButtons() {
      $("template-add").disabled = blocked || !file || !selected.size;
      $("template-export").disabled = blocked || !selected.size;
      $("template-recalculate").disabled = blocked || calculating || !file;
    }
    function render() {
      $("template-preview").replaceChildren();
      const pages = Math.max(1, Math.ceil(entries.length / 50));
      page = Math.min(page, pages - 1);
      for (const entry of entries.slice(page * 50, (page + 1) * 50)) {
        const row = document.createElement("tr"), choice = document.createElement("td"), checkbox = document.createElement("input");
        checkbox.type = "checkbox"; checkbox.checked = selected.has(entry.key); checkbox.disabled = blocked;
        checkbox.setAttribute("aria-label", `Seleccionar ${entry.name}`);
        checkbox.addEventListener("change", () => { checkbox.checked ? selected.add(entry.key) : selected.delete(entry.key); count(); });
        choice.append(checkbox); row.append(choice);
        for (const value of [entry.name, entry.rx, entry.city || entry.region || "SAT / PMR"]) {
          const cell = document.createElement("td"); cell.textContent = value; row.append(cell);
        }
        $("template-preview").append(row);
      }
      text("template-page", `${page + 1} / ${pages}`);
      $("template-previous").disabled = page === 0;
      $("template-next").disabled = page + 1 >= pages;
      count();
    }
    function count() { text("template-count", `${selected.size} seleccionados / ${entries.length} resultados.`); updateButtons(); }
    async function preview() {
      if (!file) return;
      const current = ++previewRequest, country = file;
      entries = []; selected.clear(); page = 0; render();
      if ($("sat-template").checked && !satellites) satellites = await json("satellites");
      if (current !== previewRequest || country !== file) return;
      entries = R.countryTemplateChannels(file, { region: $("region-template").value, query: $("search-template").value,
        pmr: $("pmr-template").checked, satellites: $("sat-template").checked ? satellites : null });
      selected.clear(); page = 0;
      render();
    }
    async function load() {
      const id = ++request, code = $("country-template").value;
      previewRequest++;
      file = null; forecast = null; passSource = null; entries = []; selected.clear(); passRows = [];
      $("region-template").replaceChildren(new Option("Todas las regiones", ""));
      $("template-pass-zone").replaceChildren(); render(); renderPasses();
      const pmr = R.TEMPLATE_COUNTRIES.find(country => country.code === code).pmr;
      $("pmr-template").disabled = !pmr; if (!pmr) $("pmr-template").checked = false;
      text("template-coverage", "Cargando plantilla...");
      const data = R.validateCountryTemplate(await json(code), code);
      if (id !== request) return;
      file = data;
      for (const region of file.regions) {
        const total = file.channels.filter(entry => entry.regionId === region.id).length;
        $("region-template").add(new Option(`${region.name} (${total})`, region.id));
      }
      text("template-coverage", `${file.channels.length} repetidores FM disponibles. HearHam.com · ${file.fetchedAt.slice(0, 10)}. Cobertura parcial; no es un registro nacional completo.`);
      await preview();
      text("template-status", "Selecciona una region o busca una localidad. Ningun canal se selecciona automaticamente.");
    }
    function renderPasses() {
      const pages = Math.max(1, Math.ceil(passRows.length / 50));
      passPage = Math.min(passPage, pages - 1);
      $("template-pass-rows").replaceChildren();
      for (const pass of passRows.slice(passPage * 50, (passPage + 1) * 50)) {
        const row = document.createElement("tr");
        for (const value of [pass.name, new Date(pass.start).toISOString(), new Date(pass.end).toISOString(),
          `${pass.elevation}°`, pass.tentative ? "Si" : "No"]) {
          const cell = document.createElement("td"); cell.textContent = value; row.append(cell);
        }
        $("template-pass-rows").append(row);
      }
      text("template-pass-page", `${passPage + 1} / ${pages}`);
      $("template-pass-previous").disabled = passPage === 0;
      $("template-pass-next").disabled = passPage + 1 >= pages;
    }
    function useZone() {
      const zone = forecast?.zones.find(item => item.id === $("template-pass-zone").value);
      if (!zone) return;
      $("template-lat").value = zone.latitude; $("template-lon").value = zone.longitude;
      passRows = zone.passes.filter(pass => pass.end > Date.now()); passPage = 0;
      passSource = { ...forecast, zones: [{ ...zone, passes: passRows }] };
      text("template-pass-position", `${zone.name}: ${zone.latitude}, ${zone.longitude} · UTC`);
      text("template-pass-status", `${passRows.length} pases. ${forecast.month} · ${forecast.generatedAt}. Solo prevision; no usar para CAT.`);
      renderPasses();
    }
    on("template-pass-show", "Ver pases de referencia", async () => {
      const code = $("country-template").value;
      const data = await json(`${code}-passes`);
      if (code !== $("country-template").value) return;
      R.assert(data.format === "bricohams-monthly-passes" && data.planningOnly === true && data.operational === false &&
        Array.isArray(data.zones) && data.month === new Date().toISOString().slice(0, 7), "Prevision mensual caducada o no valida.");
      R.assert(Date.now() - Date.parse(data.generatedAt) <= 7 * 86400000, "Prevision sin actualizar en mas de siete dias.");
      forecast = data; $("template-pass-zone").replaceChildren(...data.zones.map(zone => new Option(zone.name, zone.id))); useZone();
    });
    $("template-pass-zone").addEventListener("change", useZone);
    on("template-pass-export", "Descargar pases JSON", async () => {
      R.assert(passSource, "Muestra o recalcula primero los pases.");
      download(`sat-${$("country-template").value}-monthly-passes.json`, JSON.stringify(passSource, null, 2), "application/json");
    });
    on("template-recalculate", "Recalcular mes (solo prevision)", async () => {
      R.assert($("template-lat").value.trim() && $("template-lon").value.trim(), "Introduce latitud y longitud.");
      const observer = { latitude: Number($("template-lat").value), longitude: Number($("template-lon").value), height: 0 };
      R.assert(Number.isFinite(observer.latitude) && Math.abs(observer.latitude) <= 90 &&
        Number.isFinite(observer.longitude) && Math.abs(observer.longitude) <= 180, "Posicion no valida.");
      satellites = await json("satellites");
      calculating = true; updateButtons(); text("template-pass-status", "Calculando prevision mensual...");
      const code = $("country-template").value;
      const worker = new Worker("channel-template-worker.js");
      try {
        const result = await new Promise((resolve, reject) => {
          worker.onmessage = event => event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.result);
          worker.onerror = event => reject(new Error(event.message || "Error al calcular los pases."));
          worker.postMessage({ satellites, observer, now: Date.now() });
        });
        if (code !== $("country-template").value) return;
        passRows = result.passes; passPage = 0; passSource = result;
        text("template-pass-position", `${observer.latitude}, ${observer.longitude} · UTC`);
        text("template-pass-status", `${passRows.length} pases. Solo prevision; no usar para CAT.`);
        renderPasses();
      } finally { worker.terminate(); calculating = false; updateButtons(); }
    });
    $("country-template").addEventListener("change", () => run("Cargar plantilla de pais", load));
    for (const id of ["region-template", "pmr-template", "sat-template"]) $(id).addEventListener("change", () => run("Actualizar plantilla", preview));
    $("search-template").addEventListener("input", () => run("Actualizar plantilla", preview));
    on("template-select", "Seleccionar resultados (max. 1024)", async () => {
      R.assert(entries.length <= 1024, "Mas de 1024 canales: elige una region o filtra antes de seleccionar todos.");
      entries.forEach(entry => selected.add(entry.key)); render();
    });
    on("template-clear", "Quitar seleccion", async () => { selected.clear(); render(); });
    on("template-previous", "Anterior", async () => { page--; render(); });
    on("template-next", "Siguiente", async () => { page++; render(); });
    on("template-pass-previous", "Anterior", async () => { passPage--; renderPasses(); });
    on("template-pass-next", "Siguiente", async () => { passPage++; renderPasses(); });
    const chosen = () => { const channels = entries.filter(entry => selected.has(entry.key)); R.assert(channels.length > 0, "Selecciona canales de la plantilla."); return channels; };
    on("template-add", "Anadir seleccion al archivo local", async () => {
      const channels = chosen(), result = await addChannels(channels); selected.clear(); render();
      text("template-status", `${result.added} canales anadidos; ${result.duplicates} duplicados omitidos. La radio no se modifica.`);
    });
    on("template-export", "Descargar seleccion CSV", async () => download(`channels-${$("country-template").value}.csv`, R.channelCSV(chosen()), "text/csv;charset=utf-8"));
    run("Cargar plantilla de pais", load);
    return { setBusy(value) { blocked = value; container.querySelectorAll("input,select,button").forEach(control => { control.disabled = value; }); $("pmr-template").disabled = value || $("country-template").value === "US"; if (!value) { render(); renderPasses(); } updateButtons(); } };
  }
  R.mountCountryTemplates = mountCountryTemplates;
})(globalThis);
