(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const HEADER = "RADIO_ID,CALLSIGN,FIRST_NAME,LAST_NAME,CITY,STATE,COUNTRY";
  const MAX_CHARS = 100 * 1024 * 1024;
  const MAX_ENTRIES = 5000;
  const KEY = "radio-workspace-profile";
  function splitLine(line) {
    const fields = [];
    let value = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { value += '"'; i++; }
        else if (ch === '"') quoted = false;
        else value += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") { fields.push(value); value = ""; }
      else value += ch;
    }
    fields.push(value);
    return fields;
  }
  // shortcut: quoted fields with embedded newlines are not supported (user.csv has none); rows that break are skipped.
  function parseRadioIdCSV(text, { country, region = "" } = {}) {
    R.assert(text && text.length <= MAX_CHARS, "El archivo supera 100 MiB o esta vacio: no parece el user.csv de RadioID.");
    R.assert(typeof text === "string", "Contenido de RadioID no valido.");
    R.assert(R.norm(country), "Indica un pais para filtrar el CSV de RadioID.");
    const first = text.indexOf("\n");
    const head = (first < 0 ? text : text.slice(0, first)).replace(/^\uFEFF/, "").trim();
    R.assert(head === HEADER, "El archivo no tiene la cabecera de RadioID (user.csv de radioid.net).");
    const wantCountry = R.norm(country);
    const wantRegion = R.norm(region);
    const entries = [];
    let total = 0;
    let position = first < 0 ? text.length : first + 1;
    while (position < text.length) {
      let end = text.indexOf("\n", position);
      if (end < 0) end = text.length;
      const line = text.slice(position, end).replace(/\r$/, "");
      position = end + 1;
      if (!line) continue;
      const f = splitLine(line);
      if (f.length < 7 || R.norm(f[6]) !== wantCountry) continue;
      if (wantRegion && !R.norm(`${f[5]} ${f[4]}`).includes(wantRegion)) continue;
      const id = Number(f[0]);
      if (!Number.isInteger(id) || id < 1 || id > 0xffffff || f[1].length < 1 || f[1].length > 32) continue;
      total++;
      if (entries.length < MAX_ENTRIES) {
        entries.push({ id, callsign: f[1], name: `${f[2]} ${f[3]}`.trim().slice(0, 80), country: f[6], region: f[5], city: f[4],
          source: "https://radioid.net", kind: "private" });
      }
    }
    return { entries, total, truncated: total > entries.length };
  }
  const profile = {
    get() {
      try {
        const data = JSON.parse(root.localStorage.getItem(KEY));
        return data && typeof data.callsign === "string" && typeof data.dmrId === "string" ? { callsign: data.callsign, dmrId: data.dmrId } : null;
      } catch { return null; }
    },
    set({ callsign, dmrId }) {
      const call = String(callsign || "").trim().toUpperCase();
      const id = String(dmrId || "").trim();
      R.assert(/^[A-Z0-9]{3,10}$/.test(call), "Indicativo no valido: 3 a 10 letras o numeros.");
      R.assert(/^\d{7}$/.test(id), "ID DMR no valido: 7 digitos.");
      try { root.localStorage.setItem(KEY, JSON.stringify({ callsign: call, dmrId: id })); }
      catch { throw new Error("No se pudo guardar el perfil: almacenamiento local no disponible."); }
      return { callsign: call, dmrId: id };
    },
    clear() { try { root.localStorage.removeItem(KEY); } catch { /* storage unavailable: nothing to clear */ } }
  };
  Object.assign(R, { parseRadioIdCSV, profile });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
