(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  async function requestJSON(path) {
    R.assert(root.location.protocol !== "file:", "El catalogo requiere el servidor local: npm start y http://127.0.0.1:8787.");
    const response = await fetch(path, { signal: AbortSignal.timeout(60000), credentials: "omit", cache: "no-store" });
    const type = response.headers.get("content-type") || "";
    R.assert(type.includes("application/json"), "El servidor no ofrece la API de firmware. Reinicialo con npm start.");
    const result = await response.json();
    R.assert(response.ok, result.error || `Error HTTP ${response.status} al consultar firmware.`);
    return result;
  }
  async function verifyFirmwarePayload(entry, payload) {
    const manifest = payload?.manifest;
    R.assert(manifest && manifest.manifestFormat === "radio-workspace-firmware-download" &&
      manifest.manifestVersion === 1 && manifest.id === entry.id && manifest.target === entry.target &&
      manifest.name === entry.name && manifest.url === entry.url &&
      manifest.size === entry.size && manifest.version === entry.version &&
      manifest.format === entry.format && manifest.family === entry.family &&
      manifest.source === entry.source && manifest.publisher === entry.publisher &&
      manifest.slotCompatible === entry.slotCompatible &&
      manifest.expectedSHA256 === entry.expectedSHA256 && manifest.verification === entry.verification &&
      manifest.backupSubstitute === false, "El manifiesto no corresponde al firmware seleccionado.");
    R.assert(typeof payload.data === "string" && payload.data.length <= 6 * 1024 * 1024, "Descarga fuera de limites.");
    const binary = root.atob(payload.data);
    const data = Uint8Array.from(binary, character => character.charCodeAt(0));
    R.assert(data.length === entry.size, "El tamano recibido no coincide con el catalogo.");
    const checksum = await R.sha256(data);
    R.assert(checksum === manifest.sha256, "SHA-256 de descarga incorrecto.");
    if (entry.expectedSHA256) {
      R.assert(checksum === entry.expectedSHA256 && manifest.publisherHashVerified === true, "SHA-256 distinto al publicado por el editor.");
    } else {
      R.assert(manifest.publisherHashVerified === false, "No se puede afirmar un hash del editor cuando no esta publicado.");
    }
    return { data, manifest };
  }
  function mountFirmwareCatalog({ page, model, action, download, log, useImage }) {
    const panel = document.createElement("section");
    panel.className = "panel operations firmware-panel";
    panel.setAttribute("aria-label", "Catalogo oficial de firmware");
    panel.innerHTML = `<h2>Descargar firmware de fuentes oficiales</h2>
      <p class="muted">Solo publicaciones estables: Armel F4HWN (GitHub Releases) y OpenGD77 (servidor oficial). Sin mirrors, URL personalizadas, firmware donante ni versiones de desarrollo. Descargar no escribe en la radio ni sustituye un respaldo.</p>
      <label for="firmware-target">Modelo y revision exactos de destino (seleccion manual)</label>
      <select id="firmware-target"><option value="">Primero consulta los modelos disponibles</option></select>
      <div class="operation-buttons"><button id="firmware-targets" class="button secondary" type="button">Consultar modelos oficiales</button><button id="firmware-refresh" class="button secondary" type="button">Consultar ultima version estable</button></div>
      <p id="firmware-status" role="status" class="muted">No se ha consultado ninguna fuente. MD-380, DM-32 y UV008 no se ofrecen: fuente de activos no confirmada.</p>
      <label for="firmware-entry">Firmware / variante</label><select id="firmware-entry" disabled><option value="">Sin catalogo</option></select>
      <p id="firmware-metadata" class="card-note"></p>
      <label class="check"><input id="firmware-confirm" type="checkbox"><span>He comprobado el modelo, la revision y la variante. La descarga no demuestra compatibilidad con mi unidad.</span></label>
      <div class="operation-buttons"><button id="firmware-download" class="button primary" type="button" disabled>Descargar y verificar</button><button id="firmware-manifest" class="button secondary" type="button" disabled>Guardar manifiesto SHA-256</button>${page === "quansheng" ? '<button id="firmware-use" class="button secondary" type="button" disabled>Preparar imagen para slot (sin escribir)</button>' : ""}</div>`;
    document.getElementById("radio-operations").before(panel);
    const $ = id => document.getElementById(id);
    let catalog = null;
    let loaded = null;
    let targets = [];
    let loading = false;
    const family = () => page === "quansheng" ? "quansheng" : model.value;
    const selected = () => catalog?.entries.find(entry => entry.id === $("firmware-entry").value);
    function refreshState() {
      const entry = selected();
      const matching = loaded && entry && loaded.manifest.id === entry.id;
      $("firmware-targets").disabled = loading;
      $("firmware-refresh").disabled = loading || !$("firmware-target").value;
      $("firmware-target").disabled = loading;
      $("firmware-entry").disabled = loading || !catalog?.entries.length;
      $("firmware-confirm").disabled = loading;
      $("firmware-download").disabled = loading || !entry || !$("firmware-confirm").checked;
      $("firmware-manifest").disabled = loading || !matching;
      if ($("firmware-use")) $("firmware-use").disabled = loading || !matching ||
        loaded.manifest.publisherHashVerified !== true || !entry.slotCompatible ||
        !model.value || model.value !== entry.target || !$("firmware-confirm").checked;
    }
    async function perform(label, callback) {
      await action(label, async () => {
        loading = true;
        refreshState();
        try { await callback(); }
        catch (error) { $("firmware-status").textContent = `ERROR: ${error.message}`; throw error; }
        finally { loading = false; refreshState(); }
      });
    }
    function clear(message) {
      catalog = null;
      loaded = null;
      $("firmware-entry").replaceChildren(new Option("Sin catalogo", ""));
      $("firmware-confirm").checked = false;
      $("firmware-metadata").textContent = "";
      $("firmware-status").textContent = message;
      refreshState();
    }
    function renderTargets() {
      const options = targets.filter(target => target.family === family());
      $("firmware-target").replaceChildren(new Option("Selecciona modelo exacto", ""),
        ...options.map(target => new Option(target.label, target.id)));
      if (page === "quansheng" && options.some(target => target.id === model.value)) $("firmware-target").value = model.value;
      clear(options.length ? "Selecciona la revision exacta y consulta la ultima version estable." : "No hay una fuente de activos confirmada para la familia seleccionada.");
    }
    $("firmware-targets").addEventListener("click", () => perform("Consultar modelos oficiales", async () => {
      targets = await requestJSON("/api/firmware/targets");
      R.assert(Array.isArray(targets), "Lista de modelos no valida.");
      renderTargets();
    }));
    $("firmware-target").addEventListener("change", () => clear("Modelo cambiado. Consulta de nuevo para evitar mezclar firmware."));
    model.addEventListener("change", () => {
      if (page === "quansheng") useImage(null, "F4HWN");
      renderTargets();
    });
    $("firmware-refresh").addEventListener("click", () => perform("Consultar catalogo oficial", async () => {
      const target = $("firmware-target").value;
      R.assert(targets.some(item => item.id === target && item.family === family()), "Modelo no perteneciente a la familia seleccionada.");
      clear("Consultando fuente oficial...");
      const result = await requestJSON(`/api/firmware/catalog?target=${encodeURIComponent(target)}`);
      R.assert(result.target === target && Array.isArray(result.entries) && result.entries.length > 0, "Catalogo sin activos reconocidos.");
      catalog = result;
      $("firmware-entry").replaceChildren(new Option("Selecciona firmware y variante", ""),
        ...result.entries.map(entry => new Option(`${entry.version} / ${entry.name} / ${entry.size} B`, entry.id)));
      $("firmware-status").textContent = `${result.label}: ${result.entries.length} archivos. Consulta: ${result.fetchedAt}. Caduca: ${result.expiresAt}.`;
    }));
    $("firmware-entry").addEventListener("change", () => {
      loaded = null;
      $("firmware-confirm").checked = false;
      const entry = selected();
      const metadata = $("firmware-metadata");
      metadata.replaceChildren();
      if (entry) {
        const info = document.createElement("span");
        info.textContent = `${entry.publisher} | ${entry.name} | ${entry.size} B | ${entry.expectedSHA256 ? `SHA-256 publicado: ${entry.expectedSHA256}` : "Sin hash publicado: se verificaran HTTPS, tamano y formato ZIP; SHA-256 solo calculado localmente."} `;
        const source = document.createElement("a");
        source.textContent = "Ver publicacion original";
        const url = new URL(entry.source);
        R.assert(url.protocol === "https:" && ["github.com", "www.opengd77.com"].includes(url.hostname), "Fuente del catalogo no permitida.");
        source.href = url.href;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        metadata.append(info, source);
      }
      refreshState();
    });
    $("firmware-confirm").addEventListener("change", refreshState);
    $("firmware-download").addEventListener("click", () => perform("Descargar firmware oficial", async () => {
      const entry = selected();
      loaded = null;
      R.assert(entry && $("firmware-confirm").checked, "Confirma modelo y variante.");
      const result = await requestJSON(`/api/firmware/file?id=${encodeURIComponent(entry.id)}`);
      loaded = await verifyFirmwarePayload(entry, result);
      download(entry.name, loaded.data, entry.format === "zip" ? "application/zip" : "application/octet-stream");
      $("firmware-status").textContent = `${entry.name}: verificado y descarga solicitada. SHA-256 ${loaded.manifest.sha256}. ${loaded.manifest.warning}`;
      log(`Descarga oficial: ${entry.url}; SHA-256 ${loaded.manifest.sha256}. No se ha escrito en la radio.`);
    }));
    $("firmware-manifest").addEventListener("click", () => perform("Guardar manifiesto de procedencia", async () => {
      R.assert(loaded, "Primero descarga el firmware.");
      download(`${loaded.manifest.name}.provenance.json`, JSON.stringify(loaded.manifest, null, 2), "application/json");
    }));
    if ($("firmware-use")) $("firmware-use").addEventListener("click", () => perform("Preparar imagen oficial para slot", async () => {
      const entry = selected();
      R.assert(loaded && entry && entry.slotCompatible && loaded.manifest.publisherHashVerified &&
        model.value === entry.target && $("firmware-confirm").checked, "El modelo o la verificacion no coinciden.");
      R.assert(await R.sha256(loaded.data) === entry.expectedSHA256, "La imagen descargada cambio en memoria.");
      useImage(loaded.data.slice(), entry.edition);
      $("firmware-status").textContent = "Imagen preparada, NO escrita. La instalacion sigue requiriendo respaldo automatico completo y confirmacion.";
    }));
    refreshState();
  }
  Object.assign(R, { mountFirmwareCatalog, verifyFirmwarePayload });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
