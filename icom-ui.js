// Icom IC-705 / IC-9700 custom firmware page. Mirrors the upstream web patcher flow
// (third_party/icom-custom-firmware/docs/js/app.js): MD5 -> index lookup -> patch -> build -> MD5 check -> download.
// Everything runs locally; the only requests are same-origin static files under DOCS.

const DOCS = "third_party/icom-custom-firmware/docs/";
const MAX_FILE_BYTES = 64 * 1048576;
const STAGES = {
  md5: ["Comprobando el MD5 de entrada", 0, 4],
  decode: ["Decodificando el contenedor", 4, 18],
  patch: ["Aplicando el parche", 18, 22],
  compress: ["Comprimiendo la imagen (LZSS)", 22, 92],
  seal: ["Sellando el contenedor y verificando el MD5", 92, 99],
  done: ["Listo", 100, 100]
};
const ERRORS = {
  wrong_input: "El archivo no es el archivo oficial para el que se creo este parche.",
  output_mismatch: "El resultado NO es identico a la build probada, por eso no se ofrece. No se guardo nada.",
  decode_mismatch: "El firmware decodificado no coincide con la imagen oficial esperada.",
  patch_mismatch: "Al aplicar el parche no se obtuvo la imagen esperada.",
  fetch: "No se pudo cargar el archivo de parche.",
  bad_patch: "El archivo de parche no coincide con el indice de versiones.",
  worker: "El proceso de trabajo fallo al iniciarse."
};

const $ = id => document.getElementById(id);

function init() {
  if (!$("icom-file")) return;
  let index = null;
  let fileBuf = null;
  let entry = null;
  let worker = null;
  let jobId = 0;
  let busy = false;
  let downloadUrl = null;
  let selection = 0;

  const status = $("icom-status");
  const progress = $("icom-progress");
  const download = $("icom-download");
  const build = $("icom-build");
  const accept = $("icom-accept");

  function setStatus(message, detail) {
    status.replaceChildren(message);
    if (detail) status.append(" ", Object.assign(document.createElement("span"), { textContent: `Detalles tecnicos: ${detail}` }));
  }

  function updateButtons() {
    accept.disabled = !entry || busy;
    build.disabled = !entry || !accept.checked || busy;
  }

  function clearResult() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
    download.hidden = true;
    download.removeAttribute("href");
    progress.hidden = true;
    progress.value = 0;
  }

  function getWorker() {
    worker ||= new Worker(new URL(`${DOCS}js/worker.js`, location.href), { type: "module" });
    return worker;
  }

  function runWorker(message, onProgress) {
    return new Promise((resolve, reject) => {
      const w = getWorker();
      const id = ++jobId;
      const handler = event => {
        const data = event.data;
        if (data.id !== id) return;
        if (data.type === "progress") { onProgress?.(data.stage, data.frac); return; }
        w.removeEventListener("message", handler);
        if (data.type === "error") reject(data); else resolve(data);
      };
      w.addEventListener("message", handler);
      w.onerror = event => {
        w.removeEventListener("message", handler);
        worker = null;
        reject({ code: "worker", message: event.message || "worker failed to start" });
      };
      w.postMessage({ ...message, id });
    });
  }

  function cell(row, content) {
    const td = row.insertCell();
    if (typeof content === "string") td.textContent = content;
    else td.append(content);
  }
  const code = text => Object.assign(document.createElement("code"), { textContent: text });

  async function loadIndex() {
    const response = await fetch(`${DOCS}patches/index.json`, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    index = await response.json();
    const body = $("icom-files-rows");
    body.replaceChildren();
    for (const { input, release } of index.releases) {
      const row = body.insertRow();
      cell(row, `${input.radio} ${input.region} ${input.version}`);
      cell(row, code(input.file));
      cell(row, code(input.md5));
      cell(row, code(release.label));
      cell(row, code(release.output_md5));
    }
  }
  const indexReady = loadIndex().catch(error => {
    index = null;
    $("icom-index-status").textContent = `No se pudo cargar la lista de versiones admitidas: ${error.message}`;
  });

  async function onFile(file) {
    if (!file || busy) return;
    const mine = ++selection;
    entry = null;
    fileBuf = null;
    accept.checked = false;
    clearResult();
    updateButtons();
    $("icom-file-info").textContent = "";
    if (file.size > MAX_FILE_BYTES) {
      setStatus("El archivo es demasiado grande para ser un firmware de Icom.");
      return;
    }
    setStatus("Calculando el MD5 del archivo...");
    try {
      fileBuf = await file.arrayBuffer();
      const { md5 } = await runWorker({ type: "md5", buf: fileBuf.slice(0) });
      if (mine !== selection) return;
      $("icom-file-info").textContent = `Archivo: ${file.name} - MD5: ${md5}`;
      await indexReady;
      const found = index?.releases.find(item => item.input.md5 === md5);
      if (!found) {
        setStatus(index
          ? "Archivo no admitido: su MD5 no coincide con ninguna version oficial de la tabla. Usa el .dat original de Icom, tal como se descargo y descomprimio."
          : "No se pudo comprobar el archivo porque la lista de versiones admitidas no esta disponible.");
        return;
      }
      entry = found;
      setStatus(`Archivo reconocido: ${found.input.radio} ${found.input.region} ${found.input.version}. Marca el aviso y pulsa Preparar el firmware.`);
    } catch (error) {
      if (mine !== selection) return;
      fileBuf = null;
      setStatus(ERRORS[error.code] || "No se pudo leer el archivo.", String(error.message || error));
    } finally {
      if (mine === selection) updateButtons();
    }
  }

  function showProgress(stage, frac = 0) {
    const [label, from, to] = STAGES[stage] || [stage, 0, 0];
    progress.hidden = false;
    progress.value = Math.round(from + (to - from) * frac);
    setStatus(label);
  }

  async function run() {
    if (!entry || busy || !fileBuf) return;
    busy = true;
    clearResult();
    updateButtons();
    showProgress("md5");
    try {
      const response = await fetch(`${DOCS}patches/${encodeURIComponent(entry.release.patch_file)}`, { cache: "no-cache" });
      if (!response.ok) throw { code: "fetch", message: `HTTP ${response.status}` };
      const patch = await response.json();
      if (patch.input.md5 !== entry.input.md5 || patch.output.md5 !== entry.release.output_md5) throw { code: "bad_patch", message: entry.release.patch_file };
      const result = await runWorker({ type: "build", buf: fileBuf.slice(0), patch }, showProgress);
      if (result.md5 !== entry.release.output_md5) throw { code: "output_mismatch", message: `MD5 ${result.md5}` };
      const name = `${entry.release.name}.dat`;
      downloadUrl = URL.createObjectURL(new Blob([result.out], { type: "application/octet-stream" }));
      download.href = downloadUrl;
      download.download = name;
      download.textContent = "Descargar el firmware";
      download.hidden = false;
      progress.value = 100;
      setStatus(`Firmware listo (${name}): el MD5 coincide con la build probada. Pulsa Descargar el firmware.`);
    } catch (error) {
      clearResult();
      setStatus(ERRORS[error.code] || "La preparacion fallo y no hay nada que descargar.", String(error.message || error));
    } finally {
      busy = false;
      updateButtons();
    }
  }

  const drop = $("icom-drop");
  $("icom-file").addEventListener("change", event => { onFile(event.target.files[0]); });
  for (const type of ["dragenter", "dragover"]) drop.addEventListener(type, event => { event.preventDefault(); drop.classList.add("icom-over"); });
  for (const type of ["dragleave", "drop"]) drop.addEventListener(type, event => { event.preventDefault(); drop.classList.remove("icom-over"); });
  drop.addEventListener("drop", event => { onFile(event.dataTransfer.files[0]); });
  drop.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $("icom-file").click(); }
  });
  window.addEventListener("dragover", event => event.preventDefault());
  window.addEventListener("drop", event => event.preventDefault());
  accept.addEventListener("change", updateButtons);
  build.addEventListener("click", run);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
