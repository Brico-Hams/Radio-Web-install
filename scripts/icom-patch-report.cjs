"use strict";
// Generates docs/ICOM-PATCH-ANALYSIS.md (and its en/de/it/fr translations) from the vendored Icom patch JSON files.
// Usage: node scripts/icom-patch-report.cjs [--check]
// Deterministic: sorted inputs, no timestamps, no dependencies.
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const PATCH_DIRS = Object.freeze(["third_party/icom-custom-firmware/docs/patches", "third_party/icom-byof/patches"]);
const LAYOUT_DOCS = Object.freeze({
  dat: "third_party/icom-byof/IC705_DAT_FORMAT.md",
  flash705: "third_party/icom-byof/IC705_FLASH_LAYOUT.md",
  flash9700: "third_party/icom-byof/IC9700_FLASH_LAYOUT.md",
  readme: "third_party/icom-byof/README.md",
  repack: "third_party/icom-byof/ic_rza1_repack.py"
});
const MERGE_GAP = 32;
const BLOCK = 0x10000;
const LARGEST = 40;
const LANGS = Object.freeze(["es", "en", "de", "it", "fr"]);
const outputPath = lang => lang === "es" ? "docs/ICOM-PATCH-ANALYSIS.md" : `docs/i18n/${lang}/ICOM-PATCH-ANALYSIS.md`;

const parseHex = value => {
  if (typeof value === "number") return value;
  const text = String(value).replace(/^0x/i, "");
  if (!/^[0-9a-f]+$/i.test(text)) throw new Error(`Invalid hex number: ${value}`);
  return parseInt(text, 16);
};
const hex = value => `0x${value.toString(16)}`;

// Each op becomes {start, end, type, length, key}; start is the address written in the patch (absolute).
function parseOps(ops) {
  return ops.map((op, index) => {
    const start = parseHex(op.at);
    let type, length, key;
    if (Object.hasOwn(op, "copy_from")) {
      type = "copy";
      length = op.len;
      key = `${start}:copy:${parseHex(op.copy_from)}:${length}`;
    } else {
      if (typeof op.hex !== "string" || op.hex.length % 2 || /[^0-9a-f]/i.test(op.hex)) throw new Error(`Invalid hex payload in op ${index}`);
      type = "hex";
      length = op.hex.length / 2;
      key = `${start}:hex:${op.hex.toLowerCase()}`;
    }
    return { start, end: start + length, type, length, key };
  });
}

// Groups ops closer than MERGE_GAP bytes (or overlapping); regions come out sorted and never overlap.
function mergeRegions(ops) {
  const sorted = [...ops].sort((a, b) => a.start - b.start || a.end - b.end);
  const regions = [];
  for (const op of sorted) {
    const last = regions.at(-1);
    if (last && op.start - last.end < MERGE_GAP) {
      last.end = Math.max(last.end, op.end);
      last.ops++;
    } else regions.push({ start: op.start, end: op.end, ops: 1, hexBytes: 0, copyBytes: 0 });
    const region = regions.at(-1);
    if (op.type === "hex") region.hexBytes += op.length; else region.copyBytes += op.length;
  }
  for (const region of regions) {
    region.size = region.end - region.start;
    region.kind = region.copyBytes === 0 ? "own" : region.hexBytes === 0 ? "relocated" : "mixed";
  }
  return regions;
}

// Distinct bytes touched (union of ops), split per 64 KiB block.
function blockHistogram(ops, regions) {
  const sorted = [...ops].sort((a, b) => a.start - b.start || a.end - b.end);
  const union = [];
  for (const op of sorted) {
    const last = union.at(-1);
    if (last && op.start <= last.end) last.end = Math.max(last.end, op.end); else union.push({ start: op.start, end: op.end });
  }
  const blocks = new Map();
  for (const range of union) {
    for (let block = Math.floor(range.start / BLOCK); block * BLOCK < range.end; block++) {
      const covered = Math.min(range.end, (block + 1) * BLOCK) - Math.max(range.start, block * BLOCK);
      blocks.set(block, (blocks.get(block) || 0) + covered);
    }
  }
  const covered = union.reduce((sum, range) => sum + range.end - range.start, 0);
  const rows = [...blocks.entries()].sort((a, b) => a[0] - b[0]).map(([block, bytes]) => ({
    start: block * BLOCK,
    bytes,
    regions: regions.filter(region => region.start < (block + 1) * BLOCK && region.end > block * BLOCK).length
  }));
  return { rows, covered };
}

function analyzeSection(rawOps) {
  const ops = parseOps(rawOps);
  const regions = mergeRegions(ops);
  const { rows, covered } = blockHistogram(ops, regions);
  const hexOps = ops.filter(op => op.type === "hex");
  const copyOps = ops.filter(op => op.type === "copy");
  return {
    ops: ops.length,
    hexOps: hexOps.length,
    copyOps: copyOps.length,
    hexBytes: hexOps.reduce((sum, op) => sum + op.length, 0),
    copyBytes: copyOps.reduce((sum, op) => sum + op.length, 0),
    regions,
    largest: [...regions].sort((a, b) => b.size - a.size || a.start - b.start).slice(0, LARGEST),
    covered,
    blocks: rows,
    keys: new Set(ops.map(op => op.key))
  };
}

// Documented ranges, parsed from the vendored reverse-engineering docs. Anything not found stays null.
function parseLayout(read) {
  const find = (file, pattern) => { const match = pattern.exec(read(file) || ""); return match ? match : null; };
  const layout = { loader: null, loaderRam: null, loaderStart9700: null, bootstrap: null, tag: null, mainRam: null, entry: null, stock: {} };
  let match = find(LAYOUT_DOCS.dat, /Loader copy \| Bootstrap \+(0x[0-9a-f]+), length (0x[0-9a-f]+), RAM (0x[0-9a-f]+)/i);
  if (match) {
    layout.loader = { start: parseHex(match[1]), end: parseHex(match[1]) + parseHex(match[2]), source: LAYOUT_DOCS.dat };
    layout.loaderRam = { start: parseHex(match[3]), source: LAYOUT_DOCS.dat };
  } else if ((match = find(LAYOUT_DOCS.flash705, /bootstrap\[(0x[0-9a-f]+):(0x[0-9a-f]+)\]/i))) {
    layout.loader = { start: parseHex(match[1]), end: parseHex(match[2]), source: LAYOUT_DOCS.flash705 };
  }
  if ((match = find(LAYOUT_DOCS.flash9700, /bootstrap\[(0x[0-9a-f]+):\]/i))) layout.loaderStart9700 = { start: parseHex(match[1]), source: LAYOUT_DOCS.flash9700 };
  if ((match = find(LAYOUT_DOCS.dat, /DAT (0x[0-9a-f]+)\.\.(0x[0-9a-f]+) maps to flash (0x[0-9a-f]+)/i))) {
    layout.bootstrap = { size: parseHex(match[2]) - parseHex(match[1]), flash: parseHex(match[3]), source: LAYOUT_DOCS.dat };
  }
  if ((match = find(LAYOUT_DOCS.repack, /tag at\s+(0x[0-9a-f]+)\.\.(0x[0-9a-f]+)/i))) {
    layout.tag = { start: parseHex(match[1]), end: parseHex(match[2]), source: LAYOUT_DOCS.repack };
  }
  if ((match = find(LAYOUT_DOCS.dat, /Main decoded image \| \*\*RAM (0x[0-9a-f]+)\*\*/i))) {
    layout.mainRam = { start: parseHex(match[1]), source: LAYOUT_DOCS.dat };
  }
  if ((match = find(LAYOUT_DOCS.flash705, /entry\s+`(0x[0-9a-f]+)`/i))) layout.entry = { start: parseHex(match[1]), source: LAYOUT_DOCS.flash705 };
  if ((match = find(LAYOUT_DOCS.flash705, /`output_size = (0x[0-9a-f]+)`/i))) layout.stock["IC-705"] = { size: parseHex(match[1]), source: LAYOUT_DOCS.flash705 };
  if ((match = find(LAYOUT_DOCS.flash9700, /`osz = (0x[0-9a-f]+)`/i))) layout.stock["IC-9700"] = { size: parseHex(match[1]), source: LAYOUT_DOCS.flash9700 };
  return layout;
}

function radioOf(file) {
  const match = /^(\d+)([A-Z])(\d)(\d+)/.exec(file);
  if (!match) return { radio: file, region: "", version: "" };
  return { radio: `IC-${match[1]}`, region: match[2], version: `${match[3]}.${match[4]}` };
}

// Areas of the main image (RAM addresses) and of the bootstrap (offsets) that the docs let us delimit.
function areasFor(patch, layout, radio, loadAddress) {
  const main = [];
  const stock = layout.stock[radio];
  const base = layout.mainRam ? layout.mainRam.start : null;
  if (base !== null && stock) {
    const entry = layout.entry ? layout.entry.start : null;
    if (entry !== null && entry > base) main.push({ id: "mainHead", start: base, end: entry, sources: [layout.mainRam.source, layout.entry.source] });
    main.push({ id: "mainStock", start: entry !== null && entry > base ? entry : base, end: base + stock.size, sources: [layout.mainRam.source, stock.source] });
    if (loadAddress + patch.image_size > base + stock.size) {
      main.push({ id: "mainAppended", start: base + stock.size, end: loadAddress + patch.image_size, sources: [layout.mainRam.source, stock.source] });
    }
  }
  const bootstrap = [];
  if (radio === "IC-9700" && layout.bootstrap && layout.loaderStart9700 && layout.tag) {
    // IC9700_FLASH_LAYOUT.md gives only the loader start (the length is documented for the IC-705 only).
    const { loaderStart9700: loader, tag } = layout;
    bootstrap.push({ id: "bootEarly", start: 0, end: loader.start, sources: [loader.source] });
    bootstrap.push({ id: "bootLoaderOpen", start: loader.start, end: tag.start, sources: [loader.source, tag.source] });
    bootstrap.push({ id: "bootTag", start: tag.start, end: tag.end, sources: [tag.source] });
    bootstrap.push({ id: "bootAfter", start: tag.end, end: layout.bootstrap.size, sources: [tag.source, layout.bootstrap.source] });
  } else if (radio === "IC-705" && layout.bootstrap && layout.loader) {
    const { loader, tag } = layout;
    const size = layout.bootstrap.size;
    bootstrap.push({ id: "bootEarly", start: 0, end: loader.start, sources: [loader.source] });
    bootstrap.push({ id: "bootLoader", start: loader.start, end: loader.end, sources: [loader.source] });
    if (tag) {
      bootstrap.push({ id: "bootBeyond", start: loader.end, end: tag.start, sources: [loader.source, tag.source] });
      bootstrap.push({ id: "bootTag", start: tag.start, end: tag.end, sources: [tag.source] });
      bootstrap.push({ id: "bootAfter", start: tag.end, end: size, sources: [tag.source, layout.bootstrap.source] });
    } else bootstrap.push({ id: "bootAfter", start: loader.end, end: size, sources: [loader.source, layout.bootstrap.source] });
  }
  return { main, bootstrap };
}

function intersect(regions, area) {
  let count = 0;
  let bytes = 0;
  for (const region of regions) {
    const overlap = Math.min(region.end, area.end) - Math.max(region.start, area.start);
    if (overlap > 0) { count++; bytes += overlap; }
  }
  return { count, bytes };
}

function analyze(patch, layout = { stock: {} }, source = "") {
  const loadAddress = parseHex(patch.load_address ?? 0);
  const { radio, region, version } = radioOf(patch.input.file);
  const main = analyzeSection(patch.ops);
  const bootstrap = patch.bootstrap ? analyzeSection(patch.bootstrap.ops) : null;
  const areas = areasFor(patch, layout, radio, loadAddress);
  const stock = layout.stock[radio] ? layout.stock[radio].size : null;
  const crossRef = kind => (areas[kind]).map(area => ({ ...area, ...intersect((kind === "main" ? main : bootstrap)?.regions || [], area) }));
  return {
    name: patch.name,
    source,
    description: patch.description || "",
    radio, region, version,
    file: patch.input.file,
    release: patch.name.replace(/^[^_]+_/, ""),
    loadAddress,
    imageSize: patch.image_size,
    stockSize: stock,
    inputMd5: patch.input.md5,
    inputMainMd5: patch.input.main_md5,
    outputMd5: patch.output.md5,
    outputMainMd5: patch.output.main_md5,
    main,
    bootstrap,
    bootstrapInputMd5: patch.bootstrap ? patch.bootstrap.input_md5 : null,
    bootstrapOutputMd5: patch.bootstrap ? patch.bootstrap.output_md5 : null,
    mainAreas: crossRef("main"),
    bootstrapAreas: bootstrap ? crossRef("bootstrap") : [],
    appendedBytes: (areas.main.find(area => area.id === "mainAppended")
      ? intersect(main.regions, areas.main.find(area => area.id === "mainAppended")) : { count: 0, bytes: 0 })
  };
}

function loadPatches(base = root) {
  const files = [];
  for (const dir of PATCH_DIRS) {
    const absolute = path.join(base, dir);
    if (!fs.existsSync(absolute)) continue;
    for (const name of fs.readdirSync(absolute).sort()) {
      if (name === "index.json" || !name.endsWith(".json")) continue;
      files.push({ relative: `${dir}/${name}`, patch: JSON.parse(fs.readFileSync(path.join(absolute, name), "utf8")) });
    }
  }
  return files;
}

const readDoc = base => file => {
  const absolute = path.join(base, file);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8") : "";
};

function analyzeAll(base = root) {
  const layout = parseLayout(readDoc(base));
  const reports = loadPatches(base).map(({ relative, patch }) => analyze(patch, layout, relative));
  return { layout, reports };
}

const STRINGS = {
  es: {
    generated: "Documento generado por `scripts/icom-patch-report.cjs`; no se debe editar a mano.",
    title: "Analisis de los parches del firmware Icom",
    intro: "Este informe se calcula a partir de los parches JSON vendidos en `third_party/icom-custom-firmware/docs/patches/` y `third_party/icom-byof/patches/`. Indica direccion por direccion que bytes cambia cada parche. El contexto (formato, mecanismo y funciones) esta en [ICOM-FIRMWARE-INTERNALS.md](ICOM-FIRMWARE-INTERNALS.md) y el uso en [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).",
    howTitle: "Como leer este informe",
    how: [
      "Las operaciones `hex` escriben bytes propios del proyecto (codigo o datos nuevos). Las operaciones `copy_from` copian bytes de la imagen oficial a otra direccion (codigo oficial reubicado). No se distribuye ningun byte de Icom.",
      "Las direcciones de la imagen principal son absolutas en RAM (`load_address`, normalmente `0x20005000`). Las del bootstrap son desplazamientos dentro de los 64 KiB iniciales del contenedor.",
      "Una region agrupa operaciones separadas por menos de 32 bytes; su tamano es el intervalo completo, huecos incluidos.",
      "Tipo: propio = solo bytes `hex`; reubicado = solo bytes `copy_from`; mixto = ambos.",
      "Cada bloque del histograma ocupa 64 KiB (`0x10000`); la cobertura cuenta los bytes distintos tocados, sin repetir los solapados."
    ],
    summaryTitle: "Resumen por parche",
    summaryHead: ["Parche", "Radio", "Release", "Direccion de carga", "Tamano de imagen", "MD5 de entrada", "MD5 de salida", "Operaciones hex", "Operaciones copy", "Bytes hex", "Bytes copiados", "Regiones", "Operaciones bootstrap", "Bytes bootstrap", "Regiones bootstrap"],
    general: "Datos generales", generalHead: ["Campo", "Valor"],
    fields: { source: "Fichero del parche", description: "Descripcion", radio: "Radio y version oficial", file: "Archivo oficial", release: "Release", load: "Direccion de carga", size: "Tamano de imagen", stock: "Tamano de la imagen oficial (documentado)", growth: "Crecimiento respecto a la oficial", inMd5: "MD5 de entrada", inMain: "MD5 de la imagen principal de entrada", outMd5: "MD5 de salida", outMain: "MD5 de la imagen principal de salida",
      hexOps: "Operaciones hex", copyOps: "Operaciones copy", hexBytes: "Bytes escritos por operaciones hex", copyBytes: "Bytes copiados de la imagen oficial", regions: "Regiones distintas (hueco menor de 32 bytes)", covered: "Bytes distintos tocados", appended: "Bytes de regiones por encima de la imagen oficial" },
    notAvailable: "no documentado",
    largestTitle: "Las 40 regiones mayores de la imagen principal", largestNote: "Se muestran como maximo 40 regiones, ordenadas de mayor a menor tamano.",
    regionHead: ["Inicio", "Fin", "Tamano", "Tipo", "Operaciones", "Bytes hex", "Bytes copiados"],
    kinds: { own: "propio (codigo o datos nuevos)", relocated: "reubicado (bytes oficiales)", mixed: "mixto" },
    histTitle: "Histograma por bloque de 64 KiB", histHead: ["Bloque", "Bytes tocados", "Cobertura", "Regiones"],
    crossTitle: "Cruce con el mapa de memoria documentado", crossHead: ["Zona", "Inicio", "Fin", "Fuente", "Regiones", "Bytes dentro"],
    crossNone: "Ninguna region coincide con un rango documentado de `IC705_FLASH_LAYOUT.md` o `IC9700_FLASH_LAYOUT.md`.",
    crossNoLayout: "Los documentos de mapa de memoria no dan rangos utilizables para esta radio.",
    areas: { mainHead: "Cabecera de la imagen (vectores y literales) hasta el punto de entrada", mainStock: "Cuerpo de la imagen oficial", mainAppended: "Anadido por encima de la imagen oficial (codigo propio)",
      bootEarly: "Bootstrap antes del cargador (vectores de arranque)", bootLoader: "Cargador original (copiado a RAM)", bootBeyond: "Por encima del cargador original, antes de la etiqueta", bootTag: "Etiqueta del bootloader (se conserva)",       bootAfter: "Resto del bootstrap", bootLoaderOpen: "Cargador (desde su inicio; longitud no documentada) hasta la etiqueta" },
    bootTitle: "Bootstrap y bootloader", bootNone: "Este parche no tiene seccion bootstrap.", bootNote: "Las direcciones son desplazamientos dentro de los 64 KiB del bootstrap (cargador en RAM `0x20004000`).",
    bootFields: { inMd5: "MD5 del bootstrap de entrada", outMd5: "MD5 del bootstrap de salida" },
    compareTitle: "Comparacion entre las releases", compareHead: ["Metrica"],
    compare: { radio: "Radio", file: "Archivo oficial", inMd5: "MD5 de entrada", outMd5: "MD5 de salida", size: "Tamano de imagen", growth: "Crecimiento respecto a la oficial", hexOps: "Operaciones hex", copyOps: "Operaciones copy", hexBytes: "Bytes hex", copyBytes: "Bytes copiados", regions: "Regiones", appended: "Bytes por encima de la imagen oficial", bootOps: "Operaciones bootstrap", bootHex: "Bytes hex bootstrap", bootCopy: "Bytes copiados bootstrap", bootRegions: "Regiones bootstrap" },
    sharedTitle: "Operaciones identicas entre parches de la misma radio",
    sharedHead: ["Parche A", "Parche B", "Operaciones identicas", "Operaciones de A", "Operaciones de B", "Identicas en bootstrap", "Bootstrap de A", "Bootstrap de B"],
    layoutTitle: "Fuentes del mapa de memoria", layoutHead: ["Dato", "Valor", "Fuente"],
    layoutRows: { loader: "Cargador copiado a RAM (desplazamiento en el bootstrap)", loaderRam: "Direccion RAM del cargador", bootstrap: "Tamano del bootstrap", tag: "Etiqueta del bootloader", mainRam: "Direccion RAM de la imagen principal", entry: "Punto de entrada", stock705: "Tamano de la imagen oficial IC-705", stock9700: "Tamano de la imagen oficial IC-9700" }
  },
  en: {
    generated: "Document generated by `scripts/icom-patch-report.cjs`; do not edit it by hand.",
    title: "Analysis of the Icom firmware patches",
    intro: "This report is computed from the vendored JSON patches in `third_party/icom-custom-firmware/docs/patches/` and `third_party/icom-byof/patches/`. It states, address by address, which bytes each patch changes. Context (format, mechanism and features) is in [ICOM-FIRMWARE-INTERNALS.md](ICOM-FIRMWARE-INTERNALS.md) and usage in [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).",
    howTitle: "How to read this report",
    how: [
      "`hex` operations write bytes owned by the project (new code or data). `copy_from` operations copy bytes from the official image to another address (relocated official code). No Icom byte is distributed.",
      "Main image addresses are absolute RAM addresses (`load_address`, normally `0x20005000`). Bootstrap addresses are offsets inside the first 64 KiB of the container.",
      "A region groups operations less than 32 bytes apart; its size is the full interval, gaps included.",
      "Kind: own = only `hex` bytes; relocated = only `copy_from` bytes; mixed = both.",
      "Each histogram block spans 64 KiB (`0x10000`); coverage counts distinct bytes touched, without repeating overlapped ones."
    ],
    summaryTitle: "Summary per patch",
    summaryHead: ["Patch", "Radio", "Release", "Load address", "Image size", "Input MD5", "Output MD5", "Hex operations", "Copy operations", "Hex bytes", "Copied bytes", "Regions", "Bootstrap operations", "Bootstrap bytes", "Bootstrap regions"],
    general: "General data", generalHead: ["Field", "Value"],
    fields: { source: "Patch file", description: "Description", radio: "Radio and official version", file: "Official file", release: "Release", load: "Load address", size: "Image size", stock: "Official image size (documented)", growth: "Growth over the official image", inMd5: "Input MD5", inMain: "Input main image MD5", outMd5: "Output MD5", outMain: "Output main image MD5",
      hexOps: "Hex operations", copyOps: "Copy operations", hexBytes: "Bytes written by hex operations", copyBytes: "Bytes copied from the official image", regions: "Distinct regions (gap under 32 bytes)", covered: "Distinct bytes touched", appended: "Bytes of regions above the official image" },
    notAvailable: "not documented",
    largestTitle: "The 40 largest regions of the main image", largestNote: "At most 40 regions are shown, sorted from largest to smallest.",
    regionHead: ["Start", "End", "Size", "Kind", "Operations", "Hex bytes", "Copied bytes"],
    kinds: { own: "own (new code or data)", relocated: "relocated (official bytes)", mixed: "mixed" },
    histTitle: "Histogram per 64 KiB block", histHead: ["Block", "Bytes touched", "Coverage", "Regions"],
    crossTitle: "Cross-reference with the documented memory map", crossHead: ["Area", "Start", "End", "Source", "Regions", "Bytes inside"],
    crossNone: "No region matches a documented range of `IC705_FLASH_LAYOUT.md` or `IC9700_FLASH_LAYOUT.md`.",
    crossNoLayout: "The memory layout documents give no usable ranges for this radio.",
    areas: { mainHead: "Image head (vectors and literals) up to the entry point", mainStock: "Body of the official image", mainAppended: "Added above the official image (own code)",
      bootEarly: "Bootstrap before the loader (boot vectors)", bootLoader: "Original loader (copied to RAM)", bootBeyond: "Above the original loader, before the tag", bootTag: "Bootloader tag (kept)", bootAfter: "Rest of the bootstrap", bootLoaderOpen: "Loader (from its start; length not documented) up to the tag" },
    bootTitle: "Bootstrap and bootloader", bootNone: "This patch has no bootstrap section.", bootNote: "Addresses are offsets inside the 64 KiB bootstrap (loader in RAM at `0x20004000`).",
    bootFields: { inMd5: "Input bootstrap MD5", outMd5: "Output bootstrap MD5" },
    compareTitle: "Comparison between the releases", compareHead: ["Metric"],
    compare: { radio: "Radio", file: "Official file", inMd5: "Input MD5", outMd5: "Output MD5", size: "Image size", growth: "Growth over the official image", hexOps: "Hex operations", copyOps: "Copy operations", hexBytes: "Hex bytes", copyBytes: "Copied bytes", regions: "Regions", appended: "Bytes above the official image", bootOps: "Bootstrap operations", bootHex: "Bootstrap hex bytes", bootCopy: "Bootstrap copied bytes", bootRegions: "Bootstrap regions" },
    sharedTitle: "Identical operations between patches of the same radio",
    sharedHead: ["Patch A", "Patch B", "Identical operations", "Operations of A", "Operations of B", "Identical in bootstrap", "Bootstrap of A", "Bootstrap of B"],
    layoutTitle: "Memory map sources", layoutHead: ["Item", "Value", "Source"],
    layoutRows: { loader: "Loader copied to RAM (offset in the bootstrap)", loaderRam: "Loader RAM address", bootstrap: "Bootstrap size", tag: "Bootloader tag", mainRam: "Main image RAM address", entry: "Entry point", stock705: "Official IC-705 image size", stock9700: "Official IC-9700 image size" }
  },
  de: {
    generated: "Dokument, erzeugt von `scripts/icom-patch-report.cjs`; nicht von Hand bearbeiten.",
    title: "Analyse der Icom-Firmware-Patches",
    intro: "Dieser Bericht wird aus den eingebundenen JSON-Patches in `third_party/icom-custom-firmware/docs/patches/` und `third_party/icom-byof/patches/` berechnet. Er nennt adressgenau, welche Bytes jeder Patch ändert. Kontext (Format, Mechanismus und Funktionen) steht in [ICOM-FIRMWARE-INTERNALS.md](ICOM-FIRMWARE-INTERNALS.md), die Anwendung in [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).",
    howTitle: "So liest man diesen Bericht",
    how: [
      "`hex`-Operationen schreiben Bytes des Projekts (neuer Code oder neue Daten). `copy_from`-Operationen kopieren Bytes aus dem offiziellen Image an eine andere Adresse (verschobener offizieller Code). Es wird kein Icom-Byte verteilt.",
      "Adressen des Hauptimages sind absolute RAM-Adressen (`load_address`, normalerweise `0x20005000`). Adressen des Bootstrap sind Offsets in den ersten 64 KiB des Containers.",
      "Eine Region fasst Operationen mit weniger als 32 Bytes Abstand zusammen; ihre Größe ist das gesamte Intervall einschließlich der Lücken.",
      "Art: eigen = nur `hex`-Bytes; verschoben = nur `copy_from`-Bytes; gemischt = beides.",
      "Jeder Histogrammblock umfasst 64 KiB (`0x10000`); die Abdeckung zählt die verschiedenen berührten Bytes, überlappende nicht doppelt."
    ],
    summaryTitle: "Übersicht je Patch",
    summaryHead: ["Patch", "Funkgerät", "Release", "Ladeadresse", "Image-Größe", "Eingabe-MD5", "Ausgabe-MD5", "Hex-Operationen", "Copy-Operationen", "Hex-Bytes", "Kopierte Bytes", "Regionen", "Bootstrap-Operationen", "Bootstrap-Bytes", "Bootstrap-Regionen"],
    general: "Allgemeine Daten", generalHead: ["Feld", "Wert"],
    fields: { source: "Patch-Datei", description: "Beschreibung", radio: "Funkgerät und offizielle Version", file: "Offizielle Datei", release: "Release", load: "Ladeadresse", size: "Image-Größe", stock: "Größe des offiziellen Images (dokumentiert)", growth: "Zuwachs gegenüber dem offiziellen Image", inMd5: "Eingabe-MD5", inMain: "MD5 des Eingabe-Hauptimages", outMd5: "Ausgabe-MD5", outMain: "MD5 des Ausgabe-Hauptimages",
      hexOps: "Hex-Operationen", copyOps: "Copy-Operationen", hexBytes: "Von Hex-Operationen geschriebene Bytes", copyBytes: "Aus dem offiziellen Image kopierte Bytes", regions: "Verschiedene Regionen (Lücke unter 32 Bytes)", covered: "Verschiedene berührte Bytes", appended: "Bytes von Regionen oberhalb des offiziellen Images" },
    notAvailable: "nicht dokumentiert",
    largestTitle: "Die 40 größten Regionen des Hauptimages", largestNote: "Es werden höchstens 40 Regionen gezeigt, nach Größe absteigend sortiert.",
    regionHead: ["Anfang", "Ende", "Größe", "Art", "Operationen", "Hex-Bytes", "Kopierte Bytes"],
    kinds: { own: "eigen (neuer Code oder neue Daten)", relocated: "verschoben (offizielle Bytes)", mixed: "gemischt" },
    histTitle: "Histogramm je 64-KiB-Block", histHead: ["Block", "Berührte Bytes", "Abdeckung", "Regionen"],
    crossTitle: "Abgleich mit der dokumentierten Speicherkarte", crossHead: ["Bereich", "Anfang", "Ende", "Quelle", "Regionen", "Bytes darin"],
    crossNone: "Keine Region entspricht einem dokumentierten Bereich aus `IC705_FLASH_LAYOUT.md` oder `IC9700_FLASH_LAYOUT.md`.",
    crossNoLayout: "Die Speicherkarten-Dokumente liefern für dieses Funkgerät keine nutzbaren Bereiche.",
    areas: { mainHead: "Image-Kopf (Vektoren und Literale) bis zum Einsprungpunkt", mainStock: "Rumpf des offiziellen Images", mainAppended: "Oberhalb des offiziellen Images angehängt (eigener Code)",
      bootEarly: "Bootstrap vor dem Loader (Boot-Vektoren)", bootLoader: "Ursprünglicher Loader (ins RAM kopiert)", bootBeyond: "Oberhalb des ursprünglichen Loaders, vor dem Tag", bootTag: "Bootloader-Tag (bleibt erhalten)", bootAfter: "Rest des Bootstrap", bootLoaderOpen: "Loader (ab seinem Anfang; Länge nicht dokumentiert) bis zum Tag" },
    bootTitle: "Bootstrap und Bootloader", bootNone: "Dieser Patch hat keinen Bootstrap-Abschnitt.", bootNote: "Adressen sind Offsets innerhalb der 64 KiB des Bootstrap (Loader im RAM bei `0x20004000`).",
    bootFields: { inMd5: "MD5 des Eingabe-Bootstrap", outMd5: "MD5 des Ausgabe-Bootstrap" },
    compareTitle: "Vergleich der Releases", compareHead: ["Messgröße"],
    compare: { radio: "Funkgerät", file: "Offizielle Datei", inMd5: "Eingabe-MD5", outMd5: "Ausgabe-MD5", size: "Image-Größe", growth: "Zuwachs gegenüber dem offiziellen Image", hexOps: "Hex-Operationen", copyOps: "Copy-Operationen", hexBytes: "Hex-Bytes", copyBytes: "Kopierte Bytes", regions: "Regionen", appended: "Bytes oberhalb des offiziellen Images", bootOps: "Bootstrap-Operationen", bootHex: "Bootstrap-Hex-Bytes", bootCopy: "Bootstrap-Kopierbytes", bootRegions: "Bootstrap-Regionen" },
    sharedTitle: "Identische Operationen zwischen Patches desselben Funkgeräts",
    sharedHead: ["Patch A", "Patch B", "Identische Operationen", "Operationen von A", "Operationen von B", "Identisch im Bootstrap", "Bootstrap von A", "Bootstrap von B"],
    layoutTitle: "Quellen der Speicherkarte", layoutHead: ["Angabe", "Wert", "Quelle"],
    layoutRows: { loader: "Ins RAM kopierter Loader (Offset im Bootstrap)", loaderRam: "RAM-Adresse des Loaders", bootstrap: "Größe des Bootstrap", tag: "Bootloader-Tag", mainRam: "RAM-Adresse des Hauptimages", entry: "Einsprungpunkt", stock705: "Größe des offiziellen IC-705-Images", stock9700: "Größe des offiziellen IC-9700-Images" }
  },
  it: {
    generated: "Documento generato da `scripts/icom-patch-report.cjs`; non modificarlo a mano.",
    title: "Analisi delle patch del firmware Icom",
    intro: "Questo rapporto è calcolato dalle patch JSON incluse in `third_party/icom-custom-firmware/docs/patches/` e `third_party/icom-byof/patches/`. Indica, indirizzo per indirizzo, quali byte modifica ogni patch. Il contesto (formato, meccanismo e funzioni) è in [ICOM-FIRMWARE-INTERNALS.md](ICOM-FIRMWARE-INTERNALS.md) e l'uso in [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).",
    howTitle: "Come leggere questo rapporto",
    how: [
      "Le operazioni `hex` scrivono byte propri del progetto (codice o dati nuovi). Le operazioni `copy_from` copiano byte dall'immagine ufficiale a un altro indirizzo (codice ufficiale ricollocato). Nessun byte di Icom viene distribuito.",
      "Gli indirizzi dell'immagine principale sono indirizzi RAM assoluti (`load_address`, normalmente `0x20005000`). Quelli del bootstrap sono offset nei primi 64 KiB del contenitore.",
      "Una regione raggruppa operazioni distanti meno di 32 byte; la sua dimensione è l'intervallo completo, lacune comprese.",
      "Tipo: proprio = solo byte `hex`; ricollocato = solo byte `copy_from`; misto = entrambi.",
      "Ogni blocco dell'istogramma copre 64 KiB (`0x10000`); la copertura conta i byte distinti toccati, senza ripetere quelli sovrapposti."
    ],
    summaryTitle: "Riepilogo per patch",
    summaryHead: ["Patch", "Radio", "Release", "Indirizzo di caricamento", "Dimensione immagine", "MD5 di ingresso", "MD5 di uscita", "Operazioni hex", "Operazioni copy", "Byte hex", "Byte copiati", "Regioni", "Operazioni bootstrap", "Byte bootstrap", "Regioni bootstrap"],
    general: "Dati generali", generalHead: ["Campo", "Valore"],
    fields: { source: "File della patch", description: "Descrizione", radio: "Radio e versione ufficiale", file: "File ufficiale", release: "Release", load: "Indirizzo di caricamento", size: "Dimensione immagine", stock: "Dimensione dell'immagine ufficiale (documentata)", growth: "Crescita rispetto all'immagine ufficiale", inMd5: "MD5 di ingresso", inMain: "MD5 dell'immagine principale di ingresso", outMd5: "MD5 di uscita", outMain: "MD5 dell'immagine principale di uscita",
      hexOps: "Operazioni hex", copyOps: "Operazioni copy", hexBytes: "Byte scritti dalle operazioni hex", copyBytes: "Byte copiati dall'immagine ufficiale", regions: "Regioni distinte (lacuna sotto i 32 byte)", covered: "Byte distinti toccati", appended: "Byte di regioni sopra l'immagine ufficiale" },
    notAvailable: "non documentato",
    largestTitle: "Le 40 regioni maggiori dell'immagine principale", largestNote: "Sono mostrate al massimo 40 regioni, ordinate dalla più grande alla più piccola.",
    regionHead: ["Inizio", "Fine", "Dimensione", "Tipo", "Operazioni", "Byte hex", "Byte copiati"],
    kinds: { own: "proprio (codice o dati nuovi)", relocated: "ricollocato (byte ufficiali)", mixed: "misto" },
    histTitle: "Istogramma per blocco da 64 KiB", histHead: ["Blocco", "Byte toccati", "Copertura", "Regioni"],
    crossTitle: "Confronto con la mappa di memoria documentata", crossHead: ["Zona", "Inizio", "Fine", "Fonte", "Regioni", "Byte all'interno"],
    crossNone: "Nessuna regione coincide con un intervallo documentato in `IC705_FLASH_LAYOUT.md` o `IC9700_FLASH_LAYOUT.md`.",
    crossNoLayout: "I documenti sulla mappa di memoria non danno intervalli utilizzabili per questa radio.",
    areas: { mainHead: "Testa dell'immagine (vettori e letterali) fino al punto di ingresso", mainStock: "Corpo dell'immagine ufficiale", mainAppended: "Aggiunto sopra l'immagine ufficiale (codice proprio)",
      bootEarly: "Bootstrap prima del loader (vettori di avvio)", bootLoader: "Loader originale (copiato in RAM)", bootBeyond: "Sopra il loader originale, prima del tag", bootTag: "Tag del bootloader (conservato)",       bootAfter: "Resto del bootstrap", bootLoaderOpen: "Loader (dal suo inizio; lunghezza non documentata) fino al tag" },
    bootTitle: "Bootstrap e bootloader", bootNone: "Questa patch non ha una sezione bootstrap.", bootNote: "Gli indirizzi sono offset nei 64 KiB del bootstrap (loader in RAM a `0x20004000`).",
    bootFields: { inMd5: "MD5 del bootstrap di ingresso", outMd5: "MD5 del bootstrap di uscita" },
    compareTitle: "Confronto tra le release", compareHead: ["Metrica"],
    compare: { radio: "Radio", file: "File ufficiale", inMd5: "MD5 di ingresso", outMd5: "MD5 di uscita", size: "Dimensione immagine", growth: "Crescita rispetto all'immagine ufficiale", hexOps: "Operazioni hex", copyOps: "Operazioni copy", hexBytes: "Byte hex", copyBytes: "Byte copiati", regions: "Regioni", appended: "Byte sopra l'immagine ufficiale", bootOps: "Operazioni bootstrap", bootHex: "Byte hex bootstrap", bootCopy: "Byte copiati bootstrap", bootRegions: "Regioni bootstrap" },
    sharedTitle: "Operazioni identiche tra patch della stessa radio",
    sharedHead: ["Patch A", "Patch B", "Operazioni identiche", "Operazioni di A", "Operazioni di B", "Identiche nel bootstrap", "Bootstrap di A", "Bootstrap di B"],
    layoutTitle: "Fonti della mappa di memoria", layoutHead: ["Dato", "Valore", "Fonte"],
    layoutRows: { loader: "Loader copiato in RAM (offset nel bootstrap)", loaderRam: "Indirizzo RAM del loader", bootstrap: "Dimensione del bootstrap", tag: "Tag del bootloader", mainRam: "Indirizzo RAM dell'immagine principale", entry: "Punto di ingresso", stock705: "Dimensione dell'immagine ufficiale IC-705", stock9700: "Dimensione dell'immagine ufficiale IC-9700" }
  },
  fr: {
    generated: "Document généré par `scripts/icom-patch-report.cjs` ; ne pas le modifier à la main.",
    title: "Analyse des correctifs du firmware Icom",
    intro: "Ce rapport est calculé à partir des correctifs JSON intégrés dans `third_party/icom-custom-firmware/docs/patches/` et `third_party/icom-byof/patches/`. Il indique, adresse par adresse, quels octets chaque correctif modifie. Le contexte (format, mécanisme et fonctions) se trouve dans [ICOM-FIRMWARE-INTERNALS.md](ICOM-FIRMWARE-INTERNALS.md) et l'utilisation dans [ICOM-CUSTOM-FIRMWARE.md](ICOM-CUSTOM-FIRMWARE.md).",
    howTitle: "Comment lire ce rapport",
    how: [
      "Les opérations `hex` écrivent des octets propres au projet (code ou données nouveaux). Les opérations `copy_from` copient des octets de l'image officielle vers une autre adresse (code officiel déplacé). Aucun octet d'Icom n'est distribué.",
      "Les adresses de l'image principale sont des adresses RAM absolues (`load_address`, normalement `0x20005000`). Celles du bootstrap sont des décalages dans les 64 premiers Kio du conteneur.",
      "Une région regroupe des opérations séparées de moins de 32 octets ; sa taille est l'intervalle complet, trous compris.",
      "Type : propre = uniquement des octets `hex` ; déplacé = uniquement des octets `copy_from` ; mixte = les deux.",
      "Chaque bloc de l'histogramme couvre 64 Kio (`0x10000`) ; la couverture compte les octets distincts touchés, sans répéter ceux qui se chevauchent."
    ],
    summaryTitle: "Résumé par correctif",
    summaryHead: ["Correctif", "Radio", "Release", "Adresse de chargement", "Taille de l'image", "MD5 d'entrée", "MD5 de sortie", "Opérations hex", "Opérations copy", "Octets hex", "Octets copiés", "Régions", "Opérations bootstrap", "Octets bootstrap", "Régions bootstrap"],
    general: "Données générales", generalHead: ["Champ", "Valeur"],
    fields: { source: "Fichier du correctif", description: "Description", radio: "Radio et version officielle", file: "Fichier officiel", release: "Release", load: "Adresse de chargement", size: "Taille de l'image", stock: "Taille de l'image officielle (documentée)", growth: "Croissance par rapport à l'image officielle", inMd5: "MD5 d'entrée", inMain: "MD5 de l'image principale d'entrée", outMd5: "MD5 de sortie", outMain: "MD5 de l'image principale de sortie",
      hexOps: "Opérations hex", copyOps: "Opérations copy", hexBytes: "Octets écrits par les opérations hex", copyBytes: "Octets copiés depuis l'image officielle", regions: "Régions distinctes (trou inférieur à 32 octets)", covered: "Octets distincts touchés", appended: "Octets des régions au-dessus de l'image officielle" },
    notAvailable: "non documenté",
    largestTitle: "Les 40 plus grandes régions de l'image principale", largestNote: "Au maximum 40 régions sont affichées, triées de la plus grande à la plus petite.",
    regionHead: ["Début", "Fin", "Taille", "Type", "Opérations", "Octets hex", "Octets copiés"],
    kinds: { own: "propre (code ou données nouveaux)", relocated: "déplacé (octets officiels)", mixed: "mixte" },
    histTitle: "Histogramme par bloc de 64 Kio", histHead: ["Bloc", "Octets touchés", "Couverture", "Régions"],
    crossTitle: "Recoupement avec la carte mémoire documentée", crossHead: ["Zone", "Début", "Fin", "Source", "Régions", "Octets à l'intérieur"],
    crossNone: "Aucune région ne correspond à une plage documentée dans `IC705_FLASH_LAYOUT.md` ou `IC9700_FLASH_LAYOUT.md`.",
    crossNoLayout: "Les documents de carte mémoire ne donnent pas de plages exploitables pour cette radio.",
    areas: { mainHead: "En-tête de l'image (vecteurs et littéraux) jusqu'au point d'entrée", mainStock: "Corps de l'image officielle", mainAppended: "Ajouté au-dessus de l'image officielle (code propre)",
      bootEarly: "Bootstrap avant le chargeur (vecteurs de démarrage)", bootLoader: "Chargeur d'origine (copié en RAM)", bootBeyond: "Au-dessus du chargeur d'origine, avant l'étiquette", bootTag: "Étiquette du bootloader (conservée)", bootAfter: "Reste du bootstrap", bootLoaderOpen: "Chargeur (depuis son début ; longueur non documentée) jusqu'à l'étiquette" },
    bootTitle: "Bootstrap et bootloader", bootNone: "Ce correctif n'a pas de section bootstrap.", bootNote: "Les adresses sont des décalages dans les 64 Kio du bootstrap (chargeur en RAM à `0x20004000`).",
    bootFields: { inMd5: "MD5 du bootstrap d'entrée", outMd5: "MD5 du bootstrap de sortie" },
    compareTitle: "Comparaison entre les releases", compareHead: ["Mesure"],
    compare: { radio: "Radio", file: "Fichier officiel", inMd5: "MD5 d'entrée", outMd5: "MD5 de sortie", size: "Taille de l'image", growth: "Croissance par rapport à l'image officielle", hexOps: "Opérations hex", copyOps: "Opérations copy", hexBytes: "Octets hex", copyBytes: "Octets copiés", regions: "Régions", appended: "Octets au-dessus de l'image officielle", bootOps: "Opérations bootstrap", bootHex: "Octets hex bootstrap", bootCopy: "Octets copiés bootstrap", bootRegions: "Régions bootstrap" },
    sharedTitle: "Opérations identiques entre correctifs de la même radio",
    sharedHead: ["Correctif A", "Correctif B", "Opérations identiques", "Opérations de A", "Opérations de B", "Identiques dans le bootstrap", "Bootstrap de A", "Bootstrap de B"],
    layoutTitle: "Sources de la carte mémoire", layoutHead: ["Donnée", "Valeur", "Source"],
    layoutRows: { loader: "Chargeur copié en RAM (décalage dans le bootstrap)", loaderRam: "Adresse RAM du chargeur", bootstrap: "Taille du bootstrap", tag: "Étiquette du bootloader", mainRam: "Adresse RAM de l'image principale", entry: "Point d'entrée", stock705: "Taille de l'image officielle IC-705", stock9700: "Taille de l'image officielle IC-9700" }
  }
};

const code = value => `\`${value}\``;
const row = cells => `| ${cells.join(" | ")} |`;
const table = (head, rows) => [row(head), row(head.map(() => "---")), ...rows.map(row)];
const percent = (bytes, total) => `${(bytes * 100 / total).toFixed(2)}%`;

function render(lang, { layout, reports }) {
  const T = STRINGS[lang];
  const out = [T.generated, "", `# ${T.title}`, "", T.intro, "", `## ${T.howTitle}`, "", ...T.how.map(line => `- ${line}`), ""];
  const na = T.notAvailable;
  const growth = report => report.stockSize === null ? na : code(report.imageSize - report.stockSize);
  const radioLabel = report => `${report.radio} ${report.region} ${report.version}`.replace(/\s+/g, " ").trim();
  const section = (title, level, lines) => out.push(`${"#".repeat(level)} ${title}`, "", ...lines, "");

  section(T.summaryTitle, 2, table(T.summaryHead, reports.map(report => [
    code(report.name), radioLabel(report), code(report.release), code(hex(report.loadAddress)), code(report.imageSize), code(report.inputMd5), code(report.outputMd5),
    report.main.hexOps, report.main.copyOps, report.main.hexBytes, report.main.copyBytes, report.main.regions.length,
    report.bootstrap ? report.bootstrap.ops : 0, report.bootstrap ? report.bootstrap.hexBytes + report.bootstrap.copyBytes : 0, report.bootstrap ? report.bootstrap.regions.length : 0
  ])));

  for (const report of reports) {
    out.push(`## ${report.name}`, "");
    const F = T.fields;
    section(T.general, 3, table(T.generalHead, [
      [F.source, code(report.source)], [F.description, report.description ? code(report.description) : na], [F.radio, radioLabel(report)], [F.file, code(report.file)], [F.release, code(report.release)],
      [F.load, code(hex(report.loadAddress))], [F.size, code(report.imageSize)], [F.stock, report.stockSize === null ? na : code(report.stockSize)], [F.growth, growth(report)],
      [F.inMd5, code(report.inputMd5)], [F.inMain, code(report.inputMainMd5)], [F.outMd5, code(report.outputMd5)], [F.outMain, code(report.outputMainMd5)],
      [F.hexOps, report.main.hexOps], [F.copyOps, report.main.copyOps], [F.hexBytes, report.main.hexBytes], [F.copyBytes, report.main.copyBytes],
      [F.regions, report.main.regions.length], [F.covered, report.main.covered], [F.appended, report.appendedBytes.bytes]
    ]));
    const regionRows = list => list.map(region => [code(hex(region.start)), code(hex(region.end)), region.size, T.kinds[region.kind], region.ops, region.hexBytes, region.copyBytes]);
    section(T.largestTitle, 3, [T.largestNote, "", ...table(T.regionHead, regionRows(report.main.largest))]);
    section(T.histTitle, 3, table(T.histHead, report.main.blocks.map(block => [code(hex(block.start)), block.bytes, percent(block.bytes, BLOCK), block.regions])));
    const crossRows = areas => areas.map(area => [T.areas[area.id], code(hex(area.start)), code(hex(area.end)), area.sources.map(code).join(", "), area.count, area.bytes]);
    const matched = report.mainAreas.some(area => area.count > 0);
    section(T.crossTitle, 3, report.mainAreas.length
      ? [...(matched ? [] : [T.crossNone, ""]), ...table(T.crossHead, crossRows(report.mainAreas))]
      : [T.crossNoLayout]);
    if (!report.bootstrap) { section(T.bootTitle, 3, [T.bootNone]); continue; }
    const boot = report.bootstrap;
    out.push(`### ${T.bootTitle}`, "", T.bootNote, "");
    out.push(...table(T.generalHead, [
      [T.bootFields.inMd5, code(report.bootstrapInputMd5)], [T.bootFields.outMd5, code(report.bootstrapOutputMd5)],
      [F.hexOps, boot.hexOps], [F.copyOps, boot.copyOps], [F.hexBytes, boot.hexBytes], [F.copyBytes, boot.copyBytes], [F.regions, boot.regions.length], [F.covered, boot.covered]
    ]), "");
    out.push(...table(T.regionHead, regionRows(boot.largest)), "");
    const bootMatched = report.bootstrapAreas.some(area => area.count > 0);
    out.push(...(report.bootstrapAreas.length
      ? [...(bootMatched ? [] : [T.crossNone, ""]), ...table(T.crossHead, crossRows(report.bootstrapAreas))]
      : [T.crossNoLayout]), "");
  }

  const releases = reports.filter(report => report.source.startsWith("third_party/icom-custom-firmware/"));
  const C = T.compare;
  const compareRows = [
    [C.radio, report => radioLabel(report)], [C.file, report => code(report.file)], [C.inMd5, report => code(report.inputMd5)], [C.outMd5, report => code(report.outputMd5)],
    [C.size, report => code(report.imageSize)], [C.growth, growth], [C.hexOps, report => report.main.hexOps], [C.copyOps, report => report.main.copyOps],
    [C.hexBytes, report => report.main.hexBytes], [C.copyBytes, report => report.main.copyBytes], [C.regions, report => report.main.regions.length],
    [C.appended, report => report.appendedBytes.bytes],
    [C.bootOps, report => report.bootstrap ? report.bootstrap.ops : 0], [C.bootHex, report => report.bootstrap ? report.bootstrap.hexBytes : 0],
    [C.bootCopy, report => report.bootstrap ? report.bootstrap.copyBytes : 0], [C.bootRegions, report => report.bootstrap ? report.bootstrap.regions.length : 0]
  ];
  section(T.compareTitle, 2, table([...T.compareHead, ...releases.map(report => code(report.name))],
    compareRows.map(([label, value]) => [label, ...releases.map(value)])));

  const shared = [];
  for (let i = 0; i < reports.length; i++) for (let j = i + 1; j < reports.length; j++) {
    const a = reports[i];
    const b = reports[j];
    if (a.radio !== b.radio) continue;
    const common = (x, y) => x && y ? [...x.keys].filter(key => y.keys.has(key)).length : 0;
    shared.push([code(a.name), code(b.name), common(a.main, b.main), a.main.ops, b.main.ops, common(a.bootstrap, b.bootstrap), a.bootstrap ? a.bootstrap.ops : 0, b.bootstrap ? b.bootstrap.ops : 0]);
  }
  section(T.sharedTitle, 2, table(T.sharedHead, shared));

  const L = T.layoutRows;
  const value = (item, format) => item ? format(item) : na;
  const hexRange = item => `${code(hex(item.start))} - ${code(hex(item.end))}`;
  const src = item => item ? code(item.source) : "-";
  section(T.layoutTitle, 2, table(T.layoutHead, [
    [L.loader, value(layout.loader, hexRange), src(layout.loader)],
    [L.loaderRam, value(layout.loaderRam, item => code(hex(item.start))), src(layout.loaderRam)],
    [L.bootstrap, value(layout.bootstrap, item => code(hex(item.size))), src(layout.bootstrap)],
    [L.tag, value(layout.tag, hexRange), src(layout.tag)],
    [L.mainRam, value(layout.mainRam, item => code(hex(item.start))), src(layout.mainRam)],
    [L.entry, value(layout.entry, item => code(hex(item.start))), src(layout.entry)],
    [L.stock705, value(layout.stock["IC-705"], item => code(hex(item.size))), src(layout.stock["IC-705"])],
    [L.stock9700, value(layout.stock["IC-9700"], item => code(hex(item.size))), src(layout.stock["IC-9700"])]
  ]));
  return `${out.join("\n").replace(/\n+$/, "")}\n`;
}

function generate(base = root) {
  const analysis = analyzeAll(base);
  return Object.fromEntries(LANGS.map(lang => [outputPath(lang), render(lang, analysis)]));
}

function main(argv) {
  const files = generate();
  const check = argv.includes("--check");
  let stale = 0;
  for (const [relative, text] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    if (check) {
      const current = fs.existsSync(absolute) ? fs.readFileSync(absolute, "utf8").replace(/\r\n/g, "\n") : null;
      if (current !== text) { stale++; console.error(`Out of date: ${relative}`); }
    } else {
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, text);
      console.log(`wrote ${relative}`);
    }
  }
  if (stale) process.exitCode = 1;
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { analyze, analyzeAll, analyzeSection, parseOps, mergeRegions, parseLayout, loadPatches, render, generate, outputPath, LANGS, MERGE_GAP, LARGEST };
