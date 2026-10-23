"use strict";
const { createHash } = require("node:crypto");
const hash = data => createHash("sha256").update(data).digest("hex");
const core = require("./firmware-core.js").firmwareCore;
const { TARGETS, SOURCES } = core;
const MAX_FILE = 4 * 1024 * 1024;
const TTL = 10 * 60 * 1000;
class FirmwareError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}
function requireCondition(value, message, status) {
  if (!value) throw new FirmwareError(message, status);
}
function safeURL(value) {
  const url = new URL(value);
  requireCondition(url.protocol === "https:" && !url.username && !url.password &&
    !url.hash && (!url.port || url.port === "443"), "URL de firmware insegura.");
  return url;
}
function validateHop(value, initial) {
  const url = safeURL(value);
  const source = safeURL(initial);
  if (source.hostname === "www.opengd77.com") {
    requireCondition(url.origin === source.origin && url.pathname === source.pathname && !url.search,
      "Redireccion OpenGD77 fuera de la ruta oficial autorizada.");
  } else if (source.hostname === "api.github.com") {
    requireCondition(url.href === source.href, "Redireccion del catalogo GitHub no autorizada.");
  } else {
    requireCondition(source.hostname === "github.com" &&
      SOURCES.some(item => source.pathname.startsWith(`/${item.repo}/releases/download/`)), "Origen GitHub no autorizado.");
    requireCondition((url.origin === source.origin && url.pathname === source.pathname && !url.search) ||
      (["release-assets.githubusercontent.com", "objects.githubusercontent.com"].includes(url.hostname) && url.pathname.startsWith("/")),
    "Redireccion de activo GitHub fuera de la CDN autorizada.");
  }
  return url;
}
async function fetchLimited(url, limit, fetcher = fetch) {
  let next = url;
  const signal = AbortSignal.timeout(45000);
  for (let count = 0; count < 5; count++) {
    const safe = validateHop(next, url);
    const response = await fetcher(safe.href, {
      redirect: "manual", signal,
      headers: { "User-Agent": "BricohamsRadioWorkspace/0.3 (+https://github.com/anatolbricoham/Radio-Web-install)", Accept: safe.hostname === "api.github.com" ? "application/vnd.github+json" : "*/*" }
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (response.body) await response.body.cancel();
      requireCondition(location, "Redireccion sin destino.");
      next = new URL(location, safe).href;
      continue;
    }
    if (!response.ok) {
      if (response.body) await response.body.cancel();
      throw new FirmwareError(`La fuente oficial respondio HTTP ${response.status}. Reintenta mas tarde; no se usara un mirror.`);
    }
    const declared = response.headers.get("content-length");
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) {
      if (response.body) await response.body.cancel();
      throw new FirmwareError("La descarga supera el limite permitido.");
    }
    requireCondition(response.body, "Respuesta de firmware vacia.");
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > limit) {
          await reader.cancel();
          throw new FirmwareError("La descarga supera el limite permitido.");
        }
        chunks.push(Buffer.from(value));
      }
    } finally { reader.releaseLock(); }
    return Buffer.concat(chunks, length);
  }
  throw new FirmwareError("Demasiadas redirecciones de la fuente oficial.");
}
function directoryLinks(html, base) {
  const links = [];
  for (const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const href = match[1].match(/<a\b[^>]*href="([^"]+)"/i)?.[1];
    if (!href || /[&?#%\\]/.test(href)) continue;
    const url = new URL(href, base);
    const origin = new URL(base);
    if (url.origin !== origin.origin || !url.pathname.startsWith(origin.pathname) || url.pathname === origin.pathname) continue;
    const suffix = url.pathname.slice(origin.pathname.length);
    if (!/^[A-Za-z0-9_.-]+\/?$/.test(suffix)) continue;
    const sorts = [...match[1].matchAll(/<td\b[^>]*data-sort="(-?\d+)"[^>]*>/gi)];
    const size = sorts.length ? Number(sorts.at(-1)[1]) : null;
    links.push({ url: url.href, name: suffix, size });
  }
  return links;
}
function parseF4Release(release, target) {
  try { return core.parseF4Release(release, target); }
  catch (error) { throw new FirmwareError(error.message, error.status); }
}
function verifyDownload(entry, data) {
  requireCondition(data.length === entry.size, "Tamano descargado distinto al publicado. Archivo rechazado.");
  const sha256 = hash(data);
  if (entry.expectedSHA256) requireCondition(sha256 === entry.expectedSHA256, "SHA-256 distinto al publicado por el editor. Archivo rechazado.");
  if (entry.format === "zip") {
    requireCondition(data[0] === 0x50 && data[1] === 0x4b && data[2] === 3 && data[3] === 4,
      "La respuesta no es el ZIP oficial esperado.");
  } else {
    requireCondition(data.length >= 256 && data.length <= 0x1d800, "Imagen F4HWN fuera de limites.");
    const stack = data.readUInt32LE(0);
    const reset = data.readUInt32LE(4);
    requireCondition(stack >= 0x20000000 && stack <= 0x20004000 && (stack & 3) === 0 &&
      (reset & 1) === 1 && reset >= 0x08002801 && reset < 0x08002800 + data.length,
    "Vectores de imagen F4HWN invalidos.");
  }
  return sha256;
}
class FirmwareService {
  constructor(fetcher = fetch, clock = Date.now) {
    this.fetcher = fetcher;
    this.clock = clock;
    this.cache = new Map();
    this.entries = new Map();
    this.pending = new Map();
    this.activeDownloads = 0;
  }
  async catalog(target) {
    requireCondition(Object.hasOwn(TARGETS, target), "Modelo sin fuente oficial confirmada.", 400);
    const cached = this.cache.get(target);
    if (cached && cached.expires > this.clock()) return cached.result;
    if (this.pending.has(target)) return this.pending.get(target);
    const pending = this.loadCatalog(target);
    this.pending.set(target, pending);
    try { return await pending; }
    finally { this.pending.delete(target); }
  }
  async loadCatalog(target) {
    for (const [id, entry] of this.entries) if (entry.expires <= this.clock()) this.entries.delete(id);
    const config = TARGETS[target];
    let files;
    if (config.family === "quansheng") {
      files = await core.loadQuanshengEntries(target, async url => {
        const raw = await fetchLimited(url, 4 * 1024 * 1024, this.fetcher);
        return JSON.parse(raw.toString("utf8"));
      });
    } else {
      const root = `https://www.opengd77.com/downloads/releases/${config.group}/`;
      const raw = await fetchLimited(root, 1024 * 1024, this.fetcher);
      const releases = directoryLinks(raw.toString("utf8"), root)
        .filter(item => /^R\d{8}\/$/.test(item.name))
        .sort((a, b) => b.name.localeCompare(a.name));
      requireCondition(releases.length > 0, "No se encontro una version estable oficial.");
      const release = releases[0];
      const folder = `${release.url}firmware/`;
      const listing = await fetchLimited(folder, 1024 * 1024, this.fetcher);
      files = directoryLinks(listing.toString("utf8"), folder).filter(file => config.pattern.test(file.name))
        .map(file => {
          requireCondition(Number.isSafeInteger(file.size) && file.size > 0 && file.size <= MAX_FILE,
            "El servidor oficial no publica un tamano valido.");
          return {
            target, family: config.family, name: file.name, version: release.name.slice(0, -1),
            edition: /Japanese/.test(file.name) ? "Japanese" : /NMEA/.test(file.name) ? "NMEA" : "Standard",
            size: file.size, url: file.url, source: folder, publisher: "OpenGD77 / VK3KYY",
            expectedSHA256: null, verification: "official-https-no-published-hash",
            format: "zip", slotCompatible: false
          };
        });
      requireCondition(files.length > 0, "No hay activos oficiales reconocidos para este modelo. No se asumira compatibilidad.");
    }
    const expires = this.clock() + TTL;
    const result = {
      target, label: config.label, fetchedAt: new Date(this.clock()).toISOString(),
      expiresAt: new Date(expires).toISOString(),
      entries: files.map(file => {
        const id = hash(JSON.stringify([file.target, file.url, file.size, file.expectedSHA256]));
        const entry = Object.freeze({ ...file, id, expires });
        this.entries.set(id, entry);
        return entry;
      })
    };
    this.cache.set(target, { expires, result });
    return result;
  }
  async download(id) {
    requireCondition(typeof id === "string" && /^[a-f0-9]{64}$/.test(id), "Identificador de firmware invalido.", 400);
    const entry = this.entries.get(id);
    requireCondition(entry && entry.expires > this.clock(), "Catalogo caducado. Actualiza antes de descargar.", 409);
    requireCondition(this.activeDownloads < 2, "Hay otras descargas en curso. Reintenta al terminar.", 429);
    this.activeDownloads++;
    try {
      const data = await fetchLimited(entry.url, Math.min(entry.size, MAX_FILE), this.fetcher);
      const sha256 = verifyDownload(entry, data);
      return {
        data, entry, sha256,
        manifest: {
          manifestFormat: "radio-workspace-firmware-download", manifestVersion: 1,
          downloadedAt: new Date(this.clock()).toISOString(), ...entry, sha256,
          publisherHashVerified: Boolean(entry.expectedSHA256),
          warning: entry.expectedSHA256
            ? "SHA-256 coincide con GitHub Releases del editor; no es una firma digital ni una garantia de compatibilidad."
            : "Descargado por HTTPS del servidor oficial. SHA-256 calculado localmente; el editor no publica un hash en este indice. No acredita autenticidad criptografica.",
          backupSubstitute: false
        }
      };
    } finally { this.activeDownloads--; }
  }
}
module.exports = { FirmwareService, FirmwareError, TARGETS, fetchLimited, validateHop, directoryLinks, parseF4Release, verifyDownload };
