"use strict";
require("./radio-core.js");
const { normalizeTalkgroups } = require("./planning-core.js");
class ProviderError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}
function ensure(value, message, status = 400) {
  if (!value) throw new ProviderError(message, status);
}
function text(value, name, required = false) {
  ensure(typeof value === "string" && value.length <= 80 && !/[\x00-\x1f\x7f]/.test(value) &&
    (!required || value.trim().length > 0), `${name} no valido.`);
  return value.trim();
}
function number(value, min, max, name) {
  ensure(/^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) &&
    Number(value) >= min && Number(value) <= max, `${name} fuera de rango.`);
  return Number(value);
}
class DataService {
  constructor(fetcher = fetch, env = process.env, clock = Date.now) {
    this.fetcher = fetcher;
    this.env = env;
    this.clock = clock;
    this.active = 0;
    this.repeaterRetry = 0;
  }
  status() {
    return {
      repeaterbookConfigured: /^rbuapp_[A-Za-z0-9_-]+$/.test(this.env.RB_USER_TOKEN || "") &&
        Boolean(this.env.RB_APPROVED_USER_AGENT) && this.env.RB_APPROVED === "yes",
      notice: "RepeaterBook requiere aprobacion y token individual. La configuracion del formulario se conserva solo en memoria del servidor hasta reiniciarlo; no se devuelve el token."
    };
  }
  configureRepeaterbook(config) {
    // Personal "API Tokens (Auth V2)" are 64 hex characters with scope registered_read: export needs rbuapp_/app_.
    ensure(!/^[0-9a-f]{64}$/i.test(config?.token || ""),
      "Ese token es personal (API Tokens Auth V2, alcance registered_read) y RepeaterBook no lo admite para exportar repetidores. Necesitas un token rbuapp_ generado en API Apps para una aplicacion aprobada. Si lo has mostrado o compartido, revocalo.");
    ensure(config && /^rbuapp_[A-Za-z0-9_-]{1,240}$/.test(config.token || ""), "Token RepeaterBook rbuapp_ invalido.");
    ensure(typeof config.agent === "string" && config.agent.length <= 240 &&
      !/[\r\n\x00]/.test(config.agent) && /[^\s@]+@[^\s@]+\.[^\s@]+/.test(config.agent),
    "User-Agent aprobado debe incluir un contacto real.");
    ensure(config.agent.replace(/[^\s();]+@[^\s();]+/, "").replace(/[\s();+]/g, "").length > 0,
      "User-Agent: RepeaterBook exige identificar la aplicacion ademas del correo, p. ej. \"Aplicacion/1.0 (+https://tu-web; correo)\", tal como se aprobo.");
    ensure(config.approved === true, "Debes disponer de aprobacion RepeaterBook para esta aplicacion.");
    this.env = { ...this.env, RB_USER_TOKEN: config.token, RB_APPROVED_USER_AGENT: config.agent, RB_APPROVED: "yes" };
    return this.status();
  }
  async talkgroups(params) {
    const prefix = String(params.prefix || "");
    ensure(/^\d{1,7}$/.test(prefix), "Prefijo TG: 1-7 digitos.");
    const data = await this.get("https://api.brandmeister.network/v2/talkgroup", 2 * 1024 * 1024);
    try { return normalizeTalkgroups(data, prefix); }
    catch (error) { throw new ProviderError(error.message, 502); }
  }
  async get(url, limit = 1024 * 1024, headers = {}, raw = false) {
    const parsed = new URL(url);
    ensure(parsed.protocol === "https:" && ["radioid.net", "www.repeaterbook.com", "db.satnogs.org", "celestrak.org", "api.brandmeister.network"].includes(parsed.hostname) &&
      !parsed.username && !parsed.password && !parsed.port, "Proveedor no autorizado.");
    ensure(this.active < 4, "Hay consultas en curso. Espera antes de continuar.", 429);
    this.active++;
    try {
      const response = await this.fetcher(url, {
        redirect: "manual", signal: AbortSignal.timeout(30000),
        headers: { Accept: raw ? "text/plain" : "application/json", "User-Agent": "BricohamsRadioWorkspace/0.4 (+https://github.com/anatolbricoham/Radio-Web-install)", ...headers }
      });
      if (!response.ok) {
        if (response.body) await response.body.cancel();
        if (response.status === 429 && parsed.hostname === "www.repeaterbook.com") {
          const retry = Number(response.headers.get("retry-after"));
          this.repeaterRetry = this.clock() + Math.max(900000, Number.isFinite(retry) ? retry * 1000 : 0);
        }
        throw new ProviderError(`El proveedor ${parsed.hostname} respondio HTTP ${response.status}. Sin reintentos automaticos ni mirrors.`, response.status === 429 ? 429 : 502);
      }
      const declared = response.headers.get("content-length");
      if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > limit)) {
        if (response.body) await response.body.cancel();
        throw new ProviderError("Respuesta del proveedor demasiado grande.");
      }
      ensure(response.body, "El proveedor devolvio una respuesta vacia.", 502);
      const reader = response.body.getReader();
      const buffers = [];
      let length = 0;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > limit) {
            await reader.cancel();
            throw new ProviderError("Respuesta del proveedor demasiado grande.");
          }
          buffers.push(Buffer.from(value));
        }
      } finally { reader.releaseLock(); }
      const body = Buffer.concat(buffers).toString("utf8");
      if (raw) return body;
      try { return JSON.parse(body); }
      catch { throw new ProviderError(`Respuesta JSON no valida de ${parsed.hostname}.`); }
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      // Do not expose request options: they may contain the RepeaterBook token.
      throw new ProviderError(`No se pudo consultar ${parsed.hostname}: error de red o tiempo agotado.`);
    } finally { this.active--; }
  }
  async contacts(params) {
    const country = text(params.country, "Pais", true);
    const state = text(params.region || "", "Region");
    const page = number(params.page || "1", 1, 10000, "Pagina");
    const url = new URL("https://radioid.net/api/dmr/user/");
    url.search = new URLSearchParams({ country, ...(state ? { state } : {}), page: String(page) });
    const data = await this.get(url.href);
    ensure(Array.isArray(data.results) && data.results.length <= 1000 &&
      Number.isInteger(data.count) && Number.isInteger(data.pages) && data.page === page,
    "Paginacion RadioID no reconocida.", 502);
    const entries = data.results.map(item => {
      const id = Number(item.radio_id ?? item.id);
      ensure(Number.isInteger(id) && id > 0 && id <= 0xffffff && typeof item.callsign === "string" &&
        item.callsign.length > 0 && item.callsign.length <= 32, "Contacto RadioID invalido.", 502);
      return { id, callsign: item.callsign, name: String(item.fname || item.name || "").slice(0, 80),
        country: String(item.country || ""), region: String(item.state || ""), city: String(item.city || ""),
        source: "https://radioid.net", kind: "private" };
    });
    return { provider: "RadioID", source: url.href, fetchedAt: new Date(this.clock()).toISOString(),
      page, pages: data.pages, total: data.count, entries };
  }
  async repeaters(params) {
    ensure(this.status().repeaterbookConfigured, "RepeaterBook no configurado: se requiere aprobacion y token individual rbuapp_ para esta aplicacion.", 503);
    ensure(this.clock() >= this.repeaterRetry, "RepeaterBook limito el acceso: espera al menos 15 minutos tras el ultimo HTTP 429.", 429);
    const country = text(params.country, "Pais", true);
    const region = text(params.region || "", "Region");
    const northAmerica = ["United States", "Canada", "Mexico"].includes(country);
    const mode = params.mode || "FM";
    ensure(["FM", "DMR"].includes(mode), "Modo no admitido.");
    const url = new URL(`https://www.repeaterbook.com/api/${northAmerica ? "export.php" : "exportROW.php"}`);
    url.searchParams.set("country", country);
    url.searchParams.set("mode", mode === "FM" ? "analog" : "DMR");
    if (northAmerica) url.searchParams.set("state_id", String(number(params.stateId, 1, 9999, "ID estatal/provincial RepeaterBook")));
    else if (region) url.searchParams.set("region", region);
    const agent = this.env.RB_APPROVED_USER_AGENT;
    ensure(agent.length <= 240 && !/[\r\n]/.test(agent) && /[^\s@]+@[^\s@]+\.[^\s@]+/.test(agent), "User-Agent aprobado debe incluir un contacto real.");
    const data = await this.get(url.href, 8 * 1024 * 1024, { "User-Agent": agent, "X-RB-App-Token": this.env.RB_USER_TOKEN });
    ensure(Array.isArray(data.results), "Respuesta RepeaterBook no reconocida.", 502);
    return { provider: "RepeaterBook", attribution: "Data courtesy of RepeaterBook.com.",
      source: "https://www.repeaterbook.com", fetchedAt: new Date(this.clock()).toISOString(),
      results: data.results };
  }
  async satellite(params) {
    const norad = number(params.norad, 1, 99999, "NORAD");
    ensure(["satnogs", "celestrak"].includes(params.provider), "Proveedor orbital no admitido.");
    let lines;
    let source;
    if (params.provider === "celestrak") {
      source = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${norad}&FORMAT=TLE`;
      lines = (await this.get(source, 16384, {}, true)).trim().split(/\r?\n/).filter(Boolean);
      ensure(lines.length === 3, "CelesTrak no devolvio un TLE de tres lineas.", 502);
    } else {
      source = `https://db.satnogs.org/api/tle/?norad_cat_id=${norad}`;
      const data = await this.get(source, 256 * 1024);
      ensure(Array.isArray(data), "Respuesta orbital SatNOGS no reconocida.", 502);
      const item = data.find(entry => entry.norad_cat_id === norad);
      ensure(item && typeof item.tle1 === "string" && typeof item.tle2 === "string", "No hay TLE disponible para ese NORAD.", 502);
      lines = [item.tle0, item.tle1, item.tle2];
    }
    ensure(lines[1].startsWith(`1 ${String(norad).padStart(5, "0")}`) &&
      lines[2].startsWith(`2 ${String(norad).padStart(5, "0")}`), "El NORAD del TLE no coincide.", 502);
    // Fetch separately: frequency lookup failure must not hide valid orbital data.
    return { norad, name: String(lines[0]).replace(/^0 /, ""), tle1: lines[1], tle2: lines[2],
      source, fetchedAt: new Date(this.clock()).toISOString(),
      attribution: params.provider === "satnogs" ? "SatNOGS DB / Libre Space Foundation; TLE de su proveedor orbital indicado en SatNOGS." : "CelesTrak",
      license: params.provider === "satnogs" ? "https://creativecommons.org/licenses/by-sa/4.0/" : null };
  }
  async transmitters(params) {
    const norad = number(params.norad, 1, 99999, "NORAD");
    const source = `https://db.satnogs.org/api/transmitters/?satellite__norad_cat_id=${norad}&format=json`;
    const data = await this.get(source, 4 * 1024 * 1024);
    ensure(Array.isArray(data), "Frecuencias SatNOGS no reconocidas.", 502);
    const entries = data.filter(item => item.norad_cat_id === norad && item.alive === true &&
      item.status === "active" && item.unconfirmed !== true && item.frequency_violation !== true)
      .map(item => ({ id: item.uuid, name: String(item.description || "").slice(0, 100), mode: item.mode,
        downlink: item.downlink_low, downlinkHigh: item.downlink_high, uplink: item.uplink_low,
        source: `https://db.satnogs.org/satellite/${item.sat_id}/`, updated: item.updated,
        attribution: "SatNOGS DB / Libre Space Foundation (CC BY-SA 4.0).",
        license: "https://creativecommons.org/licenses/by-sa/4.0/" }));
    return { norad, source, attribution: "SatNOGS DB / Libre Space Foundation (CC BY-SA).",
      fetchedAt: new Date(this.clock()).toISOString(), entries };
  }
}
module.exports = { DataService, ProviderError };
