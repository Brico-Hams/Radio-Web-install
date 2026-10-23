(function (root) {
  "use strict";
  const R = root.RadioWorkspace = root.RadioWorkspace || {};
  const REPO = "armel/uv-k1-k5v3-firmware-custom";
  const SOURCES = Object.freeze([
    Object.freeze({ repo: REPO, publisher: "Armel F4HWN" }),
    Object.freeze({ repo: "reald/uv-k1-k5v3-firmware-custom", publisher: "reald / ARDF" })
  ]);
  function need(value, message) {
    if (!value) throw Object.assign(new Error(message), { status: 502 });
  }
  const TARGETS = Object.freeze({
    "UV-K1": { family: "quansheng", label: "UV-K1 / PY32F071", group: "F4HWN" },
    "UV-K5-V3": { family: "quansheng", label: "UV-K5 V3 / PY32F071", group: "F4HWN" },
    "GD-77": { family: "MK22", label: "GD-77", group: "MK22", pattern: /^OpenGD77(?:_(?:Japanese|NMEA|NMEA_Japanese))?\.zip$/ },
    "GD-77S": { family: "MK22", label: "GD-77S", group: "MK22", pattern: /^OpenGD77S\.zip$/ },
    "DM-1801": { family: "MK22", label: "DM-1801", group: "MK22", pattern: /^OpenDM1801(?:_(?:Japanese|NMEA|NMEA_Japanese))?\.zip$/ },
    "DM-1801A": { family: "MK22", label: "DM-1801A (no DM-1801)", group: "MK22", pattern: /^OpenDM1801A(?:_(?:Japanese|NMEA|NMEA_Japanese))?\.zip$/ },
    "RD-5R": { family: "MK22", label: "RD-5R", group: "MK22", pattern: /^OpenRD5R(?:_Japanese)?\.zip$/ },
    "MD-UV380": { family: "STM32", label: "MD-UV380 / RT-3S (no 10W PLUS)", group: "MDUV380_DM1701", pattern: /^OpenMDUV380(?:_Japanese)?\.zip$/ },
    "MD-UV380-10W-PLUS": { family: "STM32", label: "MD-UV380 10W PLUS (hardware distinto)", group: "MDUV380_DM1701", pattern: /^OpenMDUV380_10W_PLUS(?:_Japanese)?\.zip$/ },
    "DM-1701": { family: "STM32", label: "DM-1701", group: "MDUV380_DM1701", pattern: /^OpenDM1701(?:_Japanese)?\.zip$/ },
    "RT-84": { family: "STM32", label: "RT-84", group: "MDUV380_DM1701", pattern: /^OpenRT84(?:_Japanese)?\.zip$/ },
    "MD-2017": { family: "STM32", label: "MD-2017", group: "MD2017", pattern: /^OpenMD2017(?:_Japanese)?\.zip$/ },
    ...Object.fromEntries([1, 2, 4, 5].map(version => [`MD-9600-V${version}`, {
      family: "STM32", label: `MD-9600 hardware V${version}`, group: "MD9600",
      pattern: new RegExp(`^(?:Japanese_)?MD9600_firmware_HW_V${version}\\.zip$`)
    }]))
  });
  function parseQuanshengRelease(release, target, repo = REPO) {
    const source = SOURCES.find(item => item.repo === repo);
    need(source && ["UV-K1", "UV-K5-V3"].includes(target), "Fuente o modelo Quansheng no autorizado.");
    const ardf = repo !== REPO;
    need(release && !release.draft && !release.prerelease &&
      (ardf ? /^ARDF-K5v3_K1-v\d+\.\d+(?:\.\d+)?$/ : /^v[456]\.\d+\.\d+$/).test(release.tag_name),
    "La publicacion no es una version estable Quansheng reconocida.");
    const releaseURL = `https://github.com/${repo}/releases/tag/${release.tag_name}`;
    need(release.html_url === releaseURL && Array.isArray(release.assets), "Publicacion fuera del repositorio autorizado.");
    const entries = [];
    for (const asset of release.assets) {
      let edition;
      let slotCompatible = false;
      if (ardf) {
        if (!["f4hwn.ARDF_K5v3_K1.bin", "UV_K5v3_K1_ARDF.bin"].includes(asset.name)) continue;
        edition = "ARDF";
      } else {
        const match = typeof asset.name === "string" &&
          asset.name.match(/^f4hwn\.(?:(k1|k5v3)\.)?(fusion|fieldops|transfer|labs)\.v([456]\.\d+(?:\.\d+)?)(\.sa818)?\.bin$/);
        if (!match) continue;
        const [, hardware, variant, version, sa818] = match;
        const normalized = version.split(".").length === 2 ? `${version}.0` : version;
        if (`v${normalized}` !== release.tag_name) continue;
        if (version.startsWith("4.") ? hardware !== (target === "UV-K1" ? "k1" : "k5v3") :
          hardware || (!version.startsWith("6.") && variant !== "fusion")) continue;
        edition = sa818 ? `${variant} / SA818` : variant;
        slotCompatible = version.startsWith("6.") && !sa818;
      }
      const url = `https://github.com/${repo}/releases/download/${release.tag_name}/${asset.name}`;
      need(asset.browser_download_url === url && asset.state === "uploaded" &&
        Number.isSafeInteger(asset.size) && asset.size >= 256 && asset.size <= 0x1d800 &&
        /^sha256:[a-f0-9]{64}$/.test(asset.digest || ""), "Activo Quansheng sin tamano o SHA-256 oficial valido.");
      entries.push({
        target, family: "quansheng", name: asset.name, version: release.tag_name, edition,
        size: asset.size, url, source: releaseURL, publisher: source.publisher,
        expectedSHA256: asset.digest.slice(7), verification: "publisher-sha256",
        format: "bin", slotCompatible
      });
    }
    return entries;
  }
  function parseF4Release(release, target) {
    const entries = parseQuanshengRelease(release, target);
    need(entries.length > 0, "No hay imagenes estables con SHA-256 publicado.");
    return entries;
  }
  async function loadQuanshengEntries(target, request) {
    const entries = [];
    for (const { repo } of SOURCES) {
      const releases = [];
      for (let page = 1; ; page++) {
        need(page <= 10, "El historial supera el limite de 1000 publicaciones. No se mostrara un catalogo incompleto.");
        const batch = await request(`https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`);
        need(Array.isArray(batch) && batch.length <= 100, "Historial de publicaciones no valido.");
        releases.push(...batch);
        if (batch.length < 100) break;
      }
      releases.sort((a, b) => String(b.tag_name).localeCompare(String(a.tag_name), "en", { numeric: true }));
      for (const release of releases) {
        if (release.draft || release.prerelease) continue;
        const recognized = repo === REPO ? /^v[456]\.\d+\.\d+$/ : /^ARDF-K5v3_K1-v\d+\.\d+(?:\.\d+)?$/;
        if (recognized.test(release.tag_name)) entries.push(...parseQuanshengRelease(release, target, repo));
      }
    }
    need(entries.length > 0, "No hay imagenes estables con SHA-256 publicado.");
    return entries;
  }
  R.firmwareCore = Object.freeze({ TARGETS, REPO, SOURCES, parseF4Release, parseQuanshengRelease, loadQuanshengEntries });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
