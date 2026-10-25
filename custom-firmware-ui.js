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
  function parseSums(text) {
    const sums = new Map();
    for (const line of String(text).split(/\r?\n/)) {
      if (!line.trim()) continue;
      const match = line.match(/^([0-9a-f]{64}) [ *]?(.+)$/i);
      R.assert(match, `Linea de SHA256SUMS no valida: ${line.slice(0, 60)}`);
      sums.set(match[2].trim(), match[1].toLowerCase());
    }
    return sums;
  }
  // files: [{ name, bytes }]. Every file listed in SHA256SUMS must be present and match.
  async function verifyBuild(files) {
    const byName = new Map(files.map(file => [file.name, file.bytes]));
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
    }
    return { results, info, firmware: results.find(item => item.name.endsWith(".bin")) || null };
  }
  function mountCustomFirmware({ page, action, log, useImage }) {
    const catalog = R.F4HWN_OPTIONS;
    if (page !== "quansheng" || !catalog) return;
    const panel = document.createElement("section");
    panel.id = "custom-firmware";
    panel.className = "panel operations";
    panel.innerHTML = `<h2>Firmware a medida</h2>
      <p class="muted">Elige una edicion de F4HWN ${catalog.upstream.tag} y activa o desactiva funciones. Se genera la peticion para el workflow <b>Firmware a la carta</b> de GitHub Actions, que compila con la toolchain fijada y entrega el .bin con SHA256SUMS. No todas las combinaciones estan probadas y el firmware debe caber en 118 KiB: grabalo en un slot, nunca en Main.</p>
      <label for="fw-preset">Edicion base</label><select id="fw-preset">${Object.keys(catalog.presets).map(name => `<option${name === "Labs" ? " selected" : ""}>${name}</option>`).join("")}</select>
      <label for="fw-search">Filtrar opciones</label><input id="fw-search" type="search" placeholder="APRS, SPECTRUM, VOX...">
      <div class="table-scroll"><table><thead><tr><th>Activa</th><th>Opcion</th><th>En la edicion</th></tr></thead><tbody id="fw-options"></tbody></table></div>
      <label for="fw-request">Valor para el campo options del workflow</label><textarea id="fw-request" rows="2" readonly></textarea>
      <label for="fw-repo">Repositorio de compilacion</label><input id="fw-repo" value="anatolbricoham/bricohams-firmware">
      <div class="operation-buttons"><button id="fw-copy" class="button secondary" type="button">Copiar peticion</button><a id="fw-run" class="button secondary" target="_blank" rel="noopener noreferrer">Abrir el workflow &nearr;</a></div>
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
    $("fw-use").addEventListener("click", () => {
      if (!verified?.firmware) return;
      useImage(verified.firmware.bytes, (verified.info?.preset || "Custom").slice(0, 15));
      document.getElementById("radio-operations").scrollIntoView({ block: "start" });
    });
    render();
  }
  Object.assign(R, { customFirmwareRequest, verifyCustomBuild: verifyBuild, mountCustomFirmware });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
