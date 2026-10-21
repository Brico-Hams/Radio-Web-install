(function (root) {
  "use strict";
  const R = root.RadioWorkspace = root.RadioWorkspace || {};
  const REPO = "armel/uv-k1-k5v3-firmware-custom";
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
  function parseF4Release(release, target) {
    need(release && !release.draft && !release.prerelease &&
      /^v6\.\d+\.\d+$/.test(release.tag_name), "La publicacion no es una version estable F4HWN v6.x.");
    const releaseURL = `https://github.com/${REPO}/releases/tag/${release.tag_name}`;
    need(release.html_url === releaseURL && Array.isArray(release.assets), "Publicacion fuera del repositorio autorizado.");
    const entries = [];
    for (const asset of release.assets) {
      const match = typeof asset.name === "string" && asset.name.match(/^f4hwn\.(fusion|fieldops|transfer|labs)\.v(6\.\d+\.\d+)\.bin$/);
      if (!match || `v${match[2]}` !== release.tag_name) continue;
      const url = `https://github.com/${REPO}/releases/download/${release.tag_name}/${asset.name}`;
      need(asset.browser_download_url === url && asset.state === "uploaded" &&
        Number.isSafeInteger(asset.size) && asset.size >= 256 && asset.size <= 0x1d800 &&
        /^sha256:[a-f0-9]{64}$/.test(asset.digest || ""), "Activo F4HWN sin tamano o SHA-256 oficial valido.");
      entries.push({
        target, family: "quansheng", name: asset.name, version: release.tag_name, edition: match[1],
        size: asset.size, url, source: releaseURL, publisher: "Armel F4HWN",
        expectedSHA256: asset.digest.slice(7), verification: "publisher-sha256",
        format: "bin", slotCompatible: true
      });
    }
    need(entries.length > 0, "No hay imagenes estables con SHA-256 publicado.");
    return entries;
  }
  R.firmwareCore = Object.freeze({ TARGETS, REPO, parseF4Release });
  if (typeof module !== "undefined") module.exports = R;
})(globalThis);
