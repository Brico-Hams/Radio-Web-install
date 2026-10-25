(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  // Same rule as bricohams-firmware/scripts/build_args.py: only changes against the preset, ON/OFF.
  function customFirmwareRequest(catalog, preset, selected) {
    const options = catalog?.presets?.[preset]?.options;
    R.assert(options, "Edicion F4HWN desconocida.");
    return Object.keys(options).filter(name => name in selected && selected[name] !== options[name])
      .map(name => `${name}=${selected[name] ? "ON" : "OFF"}`).join(" ");
  }
  function bricohamsModuleCommand(name) {
    R.assert(["ardf", "satellite", "spectrum"].includes(name), "Modulo Bricohams desconocido.");
    return `npm run build:bricohams -- --source '..\\Multiboot\\Fusion61' --output '.\\firmware-builds\\${name}-beta' --preset FieldOps --option ENABLE_FEAT_F4HWN_BEACON=OFF --option ENABLE_VOX=OFF --module ${name}`;
  }
  function parseSums(text) {
    const sums = new Map();
    for (const line of String(text).split(/\r?\n/)) {
      if (!line.trim()) continue;
      const match = line.match(/^([0-9a-f]{64}) [ *]?(.+)$/i);
      R.assert(match, `Linea de SHA256SUMS no valida: ${line.slice(0, 60)}`);
      const name = match[2].trim();
      R.assert(name && !sums.has(name), `Nombre duplicado en SHA256SUMS: ${name}`);
      sums.set(name, match[1].toLowerCase());
    }
    return sums;
  }
  // files: [{ name, bytes }]. Every file listed in SHA256SUMS must be present and match.
  async function verifyBuild(files) {
    const byName = new Map(files.map(file => [file.name, file.bytes]));
    R.assert(byName.size === files.length, "Hay archivos con nombres duplicados.");
    R.assert(byName.has("SHA256SUMS"), "Falta SHA256SUMS en los archivos cargados.");
    const sums = parseSums(new TextDecoder().decode(byName.get("SHA256SUMS")));
    R.assert(sums.size > 0, "SHA256SUMS esta vacio.");
    const results = [];
    for (const [name, expected] of sums) {
      R.assert(byName.has(name), `Falta ${name}, listado en SHA256SUMS.`);
      const actual = await R.sha256(byName.get(name));
      R.assert(actual === expected, `${name}: SHA-256 distinto. No uses este archivo.`);
      results.push({ name, sha256: actual, bytes: byName.get(name) });
    }
    let info = null;
    if (byName.has("build-info.json")) {
      info = JSON.parse(new TextDecoder().decode(byName.get("build-info.json")));
      R.assert(sums.has("build-info.json"), "build-info.json no esta en SHA256SUMS: compilacion antigua o modificada.");
      R.assert(info.format === "bricohams-firmware-build" && sums.has(info.firmware), "build-info.json no corresponde a esta compilacion.");
      R.assert(typeof info.firmware === "string" && info.firmware.endsWith(".bin") &&
        typeof info.preset === "string" && typeof info.upstream?.tag === "string" &&
        Array.isArray(info.options) && info.options.every(option => typeof option === "string"),
      "Metadatos de compilacion incompletos.");
    }
    R.assert(info, "Falta build-info.json en los archivos cargados.");
    return { results, info, firmware: results.find(item => item.name === info.firmware) };
  }
  function mountCustomFirmware({ page, action, log, useImage }) {
    const catalog = R.F4HWN_OPTIONS;
    if (page !== "quansheng" || !catalog) return;
    const panel = document.createElement("section");
    panel.id = "custom-firmware";
    panel.className = "panel operations";
    panel.innerHTML = `<h2>Firmware a medida</h2>
      <p class="muted">Elige una edicion de F4HWN ${catalog.upstream.tag} y activa o desactiva funciones. Se genera la peticion para el workflow <b>Firmware a la carta</b> de GitHub Actions, que compila con la toolchain fijada y entrega el .bin con SHA256SUMS. No todas las combinaciones estan probadas y el firmware debe caber en 118 KiB: grabalo en un slot, nunca en Main.</p>
      <p class="muted">Alternativa local: el repositorio web incluye <code>npm run build:bricohams</code> para crear Bricohams V3 sobre F4HWN v6.1.0 con opciones <code>--option ENABLE_XXX=ON/OFF</code>. Sigue las instrucciones del README; es una base distinta del catalogo online ${catalog.upstream.tag}, no Karina. Los artefactos locales se comprueban tambien en el formulario inferior.</p>
      <p class="card-note"><strong>Bricohams BETA:</strong> modulos seleccionados al compilar, no plugins universales. Verificacion de estructura no equivale a prueba fisica. Elige solo las opciones necesarias para tu hardware; las protecciones del protocolo y los respaldos siguen siendo obligatorios.</p>
      <label for="fw-preset">Edicion base</label><select id="fw-preset">${Object.keys(catalog.presets).map(name => `<option${name === "Labs" ? " selected" : ""}>${name}</option>`).join("")}</select>
      <label for="fw-search">Filtrar opciones</label><input id="fw-search" type="search" placeholder="APRS, SPECTRUM, VOX...">
      <div class="table-scroll"><table><thead><tr><th>Activa</th><th>Opcion</th><th>En la edicion</th></tr></thead><tbody id="fw-options"></tbody></table></div>
      <label for="fw-request">Valor para el campo options del workflow</label><textarea id="fw-request" rows="2" readonly></textarea>
      <label for="fw-repo">Repositorio de compilacion</label><input id="fw-repo" value="Brico-Hams/bricohams-firmware">
      <div class="operation-buttons"><button id="fw-copy" class="button secondary" type="button">Copiar peticion</button><a id="fw-run" class="button secondary" target="_blank" rel="noopener noreferrer">Abrir el workflow &nearr;</a></div>
      <h3>Imagenes Bricohams locales: ARDF, Satelites y Espectro</h3>
      <p class="card-note">Base F4HWN v6.1.0, independiente del workflow online anterior. Elige una imagen: no se mezclan estos adaptadores. ARDF incluye ciclos; Satelites aplica Doppler RX manual y CAT RX v1 experimental habilitable con 8, sin TLE/SGP4; Espectro incluye 128 puntos, multipreset RAM, blacklist temporal y VFO-PRO con entrada RX, ganancia manual y busqueda CTCSS/DCS FM opcional (PTT captura, no transmite). No guarda calibracion ni tonos. BETA sin prueba fisica.</p>
      <label for="fw-local-module">Modulo de la imagen</label><select id="fw-local-module"><option value="ardf">ARDF / caza del zorro</option><option value="satellite">Satelites / Doppler RX manual</option><option value="spectrum">Espectro / presets RAM</option></select>
      <label for="fw-local-command">Comando PowerShell desde el repositorio web</label><textarea id="fw-local-command" rows="4" readonly></textarea>
      <p class="muted">Requiere Node.js, Git, toolchain ARM, CMake y Ninja locales. Ajusta la ruta de Fusion61 y usa un destino nuevo si ya existe. Este comando no usa las casillas del catalogo online ni instala nada en la radio. <a href="ayuda-bricohams.html">Controles, fuentes, licencias y limites</a>.</p>
      <div class="operation-buttons"><button id="fw-local-copy" class="button secondary" type="button">Copiar comando local</button></div>
      <h3>Comprobar la compilacion descargada</h3>
      <label for="fw-files">Carga juntos SHA256SUMS, build-info.json y los .bin/.app del artefacto</label><input id="fw-files" type="file" multiple>
      <p id="fw-verify" class="card-note" role="status">Sin archivos.</p>
      <div class="operation-buttons"><button id="fw-use" class="button primary" type="button" disabled>Usar este firmware en Instalar en slot</button></div>`;
    const anchor = document.getElementById("radio-operations");
    anchor.after(panel);
    const $ = id => document.getElementById(id);
    let selected = {};
    let verified = null;
    function render() {
      const preset = $("fw-preset").value;
      const defaults = catalog.presets[preset].options;
      const filter = $("fw-search").value.trim().toUpperCase();
      $("fw-options").replaceChildren(...Object.keys(defaults).filter(name => !filter || name.includes(filter)).map(name => {
        const row = document.createElement("tr");
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = name in selected ? selected[name] : defaults[name];
        box.setAttribute("aria-label", name);
        box.addEventListener("change", () => { selected[name] = box.checked; update(); });
        const cells = [box, name.replace(/^ENABLE_/, ""), defaults[name] ? "ON" : "OFF"].map(content => {
          const cell = document.createElement("td");
          cell.append(content);
          return cell;
        });
        if (name in selected && selected[name] !== defaults[name]) row.className = "changed";
        row.append(...cells);
        return row;
      }));
      update();
    }
    function update() {
      $("fw-request").value = customFirmwareRequest(catalog, $("fw-preset").value, selected);
      const repo = $("fw-repo").value.trim();
      $("fw-run").href = /^[\w.-]+\/[\w.-]+$/.test(repo) ? `https://github.com/${repo}/actions/workflows/build.yml` : "#";
    }
    $("fw-preset").addEventListener("change", () => { selected = {}; render(); });
    $("fw-search").addEventListener("input", render);
    $("fw-repo").addEventListener("input", update);
    $("fw-copy").addEventListener("click", () => action("Copiar peticion", async () => {
      await root.navigator.clipboard.writeText($("fw-request").value);
      log(`Peticion copiada: edicion ${$("fw-preset").value}, cambios "${$("fw-request").value || "ninguno"}".`);
    }));
    const updateLocalCommand = () => {
      $("fw-local-command").value = bricohamsModuleCommand($("fw-local-module").value);
    };
    $("fw-local-module").addEventListener("change", updateLocalCommand);
    $("fw-local-copy").addEventListener("click", () => action("Copiar comando Bricohams", async () => {
      await root.navigator.clipboard.writeText($("fw-local-command").value);
      log(`Comando local copiado: ${$("fw-local-module").value}. No se ha compilado ni instalado firmware.`);
    }));
    updateLocalCommand();
    $("fw-files").addEventListener("change", () => action("Comprobar compilacion", async () => {
      verified = null;
      $("fw-use").disabled = true;
      const files = await Promise.all([...$("fw-files").files].map(async file => ({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })));
      const result = await verifyBuild(files);
      verified = result;
      $("fw-verify").textContent = `${result.results.length} archivos con SHA-256 correcto` +
        (result.info ? ` · ${result.info.preset} ${result.info.upstream.tag}, cambios: ${result.info.options.join(" ") || "ninguno"}` : "") +
        (result.firmware ? ` · firmware ${result.firmware.name}` : " · sin .bin");
      $("fw-use").disabled = !result.firmware;
      log(`Compilacion comprobada: ${result.results.map(item => item.name).join(", ")}.`);
    }));
    $("fw-use").addEventListener("click", () => action("Preparar firmware a medida", async () => {
      R.assert(verified?.firmware, "Primero comprueba una compilacion con firmware.");
      useImage(verified.firmware.bytes, (verified.info?.preset || "Custom").slice(0, 15));
      document.getElementById("radio-operations").scrollIntoView({ block: "start" });
    }));
    render();
  }
  Object.assign(R, { customFirmwareRequest, bricohamsModuleCommand, verifyCustomBuild: verifyBuild, mountCustomFirmware });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
