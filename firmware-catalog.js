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
  const MAX_FILE = 4 * 1024 * 1024;
  // Web mode: the user downloads the file at the official source and loads it here; same size/SHA-256 guarantees.
  async function verifyLocalFirmware(entry, data, fileName) {
    R.assert(data instanceof Uint8Array && data.length > 0 && data.length <= MAX_FILE, "El archivo debe tener entre 1 B y 4 MiB.");
    if (fileName !== undefined && entry.format === "zip" && !entry.expectedSHA256) {
      R.assert(R.firmwareCore.TARGETS[entry.target]?.pattern?.test(fileName), "El nombre del archivo no corresponde al modelo seleccionado.");
      R.assert(data[0] === 0x50 && data[1] === 0x4b && data[2] === 3 && data[3] === 4, "El archivo no es un ZIP.");
    }
    R.assert(entry.size == null || data.length === entry.size, "Tamano distinto al publicado. Archivo rechazado.");
    const sha256 = await R.sha256(data);
    if (entry.expectedSHA256) R.assert(sha256 === entry.expectedSHA256, "SHA-256 distinto al publicado por el editor. Archivo rechazado.");
    const verified = Boolean(entry.expectedSHA256);
    return {
      data,
      manifest: {
        manifestFormat: "radio-workspace-firmware-download", manifestVersion: 1,
        downloadedAt: new Date().toISOString(), ...entry, size: data.length, sha256,
        publisherHashVerified: verified,
        warning: verified
          ? "SHA-256 coincide con GitHub Releases del editor; no es una firma digital ni una garantia de compatibilidad."
          : "Archivo cargado por el usuario. SHA-256 calculado localmente; el editor no publica un hash en este indice. No acredita autenticidad criptografica.",
        backupSubstitute: false
      }
    };
  }
  async function mountFirmwareCatalog({ page, model, action, download, log, useImage }) {
    const web = (await R.runtime).mode === "web";
    const { TARGETS, loadQuanshengEntries } = R.firmwareCore;
    const panel = document.createElement("section");
    panel.className = "panel operations firmware-panel";
    panel.setAttribute("aria-label", "Catalogo oficial de firmware");
    panel.innerHTML = `<h2>Descargar firmware de fuentes oficiales</h2>
      <p class="muted">Solo publicaciones estables: Armel F4HWN y reald ARDF (GitHub Releases), y OpenGD77 (servidor oficial). Quansheng incluye el historial reconocido con SHA-256 publicado; ARDF, F4HWN anterior a v6 y SA818 son solo descarga, no imagenes para slots. Sin mirrors ni versiones de desarrollo. Descargar no escribe en la radio ni sustituye un respaldo.</p>
      <label for="firmware-target">Modelo y revision exactos de destino (seleccion manual)</label>
      <select id="firmware-target"><option value="">Primero consulta los modelos disponibles</option></select>
      <div class="operation-buttons"><button id="firmware-targets" class="button secondary" type="button">Consultar modelos oficiales</button><button id="firmware-refresh" class="button secondary" type="button">${page === "quansheng" ? "Consultar versiones estables" : "Consultar ultima version estable"}</button></div>
      <p id="firmware-status" role="status" class="muted">No se ha consultado ninguna fuente. MD-380, DM-32 y UV008 no se ofrecen: fuente de activos no confirmada.</p>
      <label for="firmware-entry">Firmware / variante</label><select id="firmware-entry" disabled><option value="">Sin catalogo</option></select>
      <p id="firmware-metadata" class="card-note"></p>
      <label class="check"><input id="firmware-confirm" type="checkbox"><span>He comprobado el modelo, la revision y la variante. La descarga no demuestra compatibilidad con mi unidad.</span></label>
      <div class="operation-buttons">${web ? '<a id="firmware-source" class="button secondary" target="_blank" rel="noopener noreferrer" hidden>Descargar en la fuente oficial ↗</a><label for="firmware-file">Cargar el archivo descargado</label><input id="firmware-file" type="file" accept=".bin,.zip" disabled>' : '<button id="firmware-download" class="button primary" type="button" disabled>Descargar y verificar</button>'}<button id="firmware-manifest" class="button secondary" type="button" disabled>Guardar manifiesto SHA-256</button>${page === "quansheng" ? '<button id="firmware-use" class="button secondary" type="button" disabled>Preparar imagen para slot (sin escribir)</button>' : ""}</div>`;
    document.getElementById("radio-operations").before(panel);
    const $ = id => document.getElementById(id);
    let catalog = null;
    let loaded = null;
    let targets = [];
    let loading = false;
    const sizeText = entry => entry.size == null ? "tamano no publicado" : `${entry.size} B`;
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
      if ($("firmware-download")) $("firmware-download").disabled = loading || !entry || !$("firmware-confirm").checked;
      if ($("firmware-file")) $("firmware-file").disabled = loading || !entry || !$("firmware-confirm").checked;
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
      if ($("firmware-source")) $("firmware-source").hidden = true;
      if ($("firmware-file")) $("firmware-file").value = "";
      $("firmware-metadata").textContent = "";
      $("firmware-status").textContent = message;
      refreshState();
    }
    function renderTargets() {
      const options = targets.filter(target => target.family === family());
      $("firmware-target").replaceChildren(new Option("Selecciona modelo exacto", ""),
        ...options.map(target => new Option(target.label, target.id)));
      if (page === "quansheng" && options.some(target => target.id === model.value)) $("firmware-target").value = model.value;
      clear(options.length ? "Selecciona la revision exacta y consulta el catalogo estable." : "No hay una fuente de activos confirmada para la familia seleccionada.");
    }
    $("firmware-targets").addEventListener("click", () => perform("Consultar modelos oficiales", async () => {
      targets = web ? Object.entries(TARGETS).map(([id, target]) => ({ id, family: target.family, label: target.label }))
        : await requestJSON("api/firmware/targets");
      R.assert(Array.isArray(targets), "Lista de modelos no valida.");
      renderTargets();
    }));
    async function webCatalog(target) {
      const config = TARGETS[target];
      const fetchedAt = new Date().toISOString();
      if (config.family !== "quansheng") {
        const url = `https://www.opengd77.com/downloads/releases/${config.group}/`;
        return { target, label: config.label, fetchedAt, expiresAt: "n/a", entries: [{
          id: `${target}|${url}`, target, family: config.family, name: "Archivo OpenGD77 descargado manualmente", version: "manual",
          edition: "Standard", url, source: url, publisher: "OpenGD77 / VK3KYY", expectedSHA256: null, size: null,
          verification: "manual-file-no-published-hash", format: "zip", slotCompatible: false }] };
      }
      const files = await loadQuanshengEntries(target, async url => {
        const response = await fetch(url,
          { signal: AbortSignal.timeout(30000), credentials: "omit", headers: { Accept: "application/vnd.github+json" } });
        R.assert(response.ok, `GitHub respondio HTTP ${response.status}. Reintenta mas tarde.`);
        return response.json();
      });
      const entries = files.map(entry => ({ ...entry, id: `${target}|${entry.url}` }));
      return { target, label: config.label, fetchedAt, expiresAt: "n/a", entries };
    }
    $("firmware-target").addEventListener("change", () => clear("Modelo cambiado. Consulta de nuevo para evitar mezclar firmware."));
    model.addEventListener("change", () => {
      if (page === "quansheng") useImage(null, "F4HWN");
      renderTargets();
    });
    $("firmware-refresh").addEventListener("click", () => perform("Consultar catalogo oficial", async () => {
      const target = $("firmware-target").value;
      R.assert(targets.some(item => item.id === target && item.family === family()), "Modelo no perteneciente a la familia seleccionada.");
      clear("Consultando fuente oficial...");
      const result = web ? await webCatalog(target) : await requestJSON(`api/firmware/catalog?target=${encodeURIComponent(target)}`);
      R.assert(result.target === target && Array.isArray(result.entries) && result.entries.length > 0, "Catalogo sin activos reconocidos.");
      catalog = result;
      $("firmware-entry").replaceChildren(new Option("Selecciona firmware y variante", ""),
        ...result.entries.map(entry => new Option(`${entry.publisher} / ${entry.version} / ${entry.name} / ${sizeText(entry)}${entry.family === "quansheng" && !entry.slotCompatible ? " / solo descarga" : ""}`, entry.id)));
      $("firmware-status").textContent = `${result.label}: ${result.entries.length} archivos. Consulta: ${result.fetchedAt}. Caduca: ${result.expiresAt}.`;
    }));
    $("firmware-entry").addEventListener("change", () => {
      loaded = null;
      $("firmware-confirm").checked = false;
      if ($("firmware-file")) $("firmware-file").value = "";
      const entry = selected();
      const metadata = $("firmware-metadata");
      metadata.replaceChildren();
      if (entry) {
        const info = document.createElement("span");
        info.textContent = `${entry.publisher} | ${entry.name} | ${sizeText(entry)} | ${entry.family === "quansheng" && !entry.slotCompatible ? "Solo descarga: no se admite instalar esta variante en slots desde esta web. " : ""}${entry.expectedSHA256 ? `SHA-256 publicado: ${entry.expectedSHA256}` : web ? "Sin hash publicado: SHA-256 solo calculado localmente." : "Sin hash publicado: se verificaran HTTPS, tamano y formato ZIP; SHA-256 solo calculado localmente."} `;
        const source = document.createElement("a");
        source.textContent = "Ver publicacion original";
        const url = new URL(entry.source);
        R.assert(url.protocol === "https:" && ["github.com", "www.opengd77.com"].includes(url.hostname), "Fuente del catalogo no permitida.");
        source.href = url.href;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        metadata.append(info, source);
        if (web) {
          const official = new URL(entry.url);
          R.assert(official.protocol === "https:" && ["github.com", "www.opengd77.com"].includes(official.hostname), "Fuente del catalogo no permitida.");
          $("firmware-source").href = official.href;
          $("firmware-source").hidden = false;
        }
      } else if (web) $("firmware-source").hidden = true;
      refreshState();
    });
    $("firmware-confirm").addEventListener("change", refreshState);
    if (!web) $("firmware-download").addEventListener("click", () => perform("Descargar firmware oficial", async () => {
      const entry = selected();
      loaded = null;
      R.assert(entry && $("firmware-confirm").checked, "Confirma modelo y variante.");
      const result = await requestJSON(`api/firmware/file?id=${encodeURIComponent(entry.id)}`);
      loaded = await verifyFirmwarePayload(entry, result);
      download(entry.name, loaded.data, entry.format === "zip" ? "application/zip" : "application/octet-stream");
      $("firmware-status").textContent = `${entry.name}: verificado y descarga solicitada. SHA-256 ${loaded.manifest.sha256}. ${loaded.manifest.warning}`;
      log(`Descarga oficial: ${entry.url}; SHA-256 ${loaded.manifest.sha256}. No se ha escrito en la radio.`);
    }));
    if (web) $("firmware-file").addEventListener("change", () => perform("Verificar archivo cargado", async () => {
      const entry = selected();
      const file = $("firmware-file").files[0];
      loaded = null;
      R.assert(entry && $("firmware-confirm").checked, "Confirma modelo y variante.");
      R.assert(file && file.size > 0 && file.size <= MAX_FILE, "El archivo debe tener entre 1 B y 4 MiB.");
      const data = new Uint8Array(await file.arrayBuffer());
      let checked = entry;
      if (entry.size == null) {
        checked = { ...entry, name: file.name };
      }
      loaded = await verifyLocalFirmware(checked, data, file.name);
      refreshState();
      $("firmware-status").textContent = `${checked.name}: verificado. SHA-256 ${loaded.manifest.sha256}. ${loaded.manifest.warning}`;
      log(`Firmware cargado: ${checked.name}; SHA-256 ${loaded.manifest.sha256}. No se ha escrito en la radio.`);
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
  Object.assign(R, { mountFirmwareCatalog, verifyFirmwarePayload, verifyLocalFirmware });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
