(function (root) {
  "use strict";
  // Verifies the detached Ed25519 signatures that scripts/sign-firmware.cjs writes next to every firmware (.bin):
  // <name>.sig over the raw bytes, SHA256SUMS and SHA256SUMS.sig. Public key only; the private key never reaches the web.
  const FirmwareSignature = {
    // Raw 32-byte Ed25519 public key as 64 hex digits (`node scripts/sign-firmware.cjs keygen`). Empty = signatures not enforced yet.
    PUBLIC_KEY_HEX: "f8129e54dc0e7d800efa6321c782dfff7482af10eb961c98f01eb127555bba8f",
    VERIFIED: "Firma verificada",
  };
  const fail = message => { throw new Error(message); };
  const hexToBytes = hex => Uint8Array.from(hex.match(/../g), pair => parseInt(pair, 16));
  const base64ToBytes = text => {
    const clean = String(text).trim();
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) fail("Firma con formato no valido.");
    if (typeof atob === "function") return Uint8Array.from(atob(clean), char => char.charCodeAt(0));
    return new Uint8Array(Buffer.from(clean, "base64"));
  };
  const hex = buffer => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, "0")).join("");
  const sha256 = async (data, subtle) => hex(await subtle.digest("SHA-256", data));

  function parseSums(text) {
    const sums = new Map();
    for (const line of text.split("\n")) {
      if (!line) continue;
      const match = /^([0-9a-f]{64}) {2}([^/\\\s][^/\\]*)$/.exec(line);
      if (!match) fail("SHA256SUMS con formato no valido.");
      sums.set(match[2], match[1]);
    }
    return sums;
  }

  async function importKey(publicKeyHex, subtle) {
    if (!/^[0-9a-f]{64}$/i.test(publicKeyHex || "")) fail("Clave publica de firmware no valida.");
    try {
      return await subtle.importKey("raw", hexToBytes(publicKeyHex), { name: "Ed25519" }, false, ["verify"]);
    } catch (_) {
      return null; // This browser has no Ed25519 in Web Crypto.
    }
  }

  const verifyDetached = (key, signature, data, subtle) => subtle.verify({ name: "Ed25519" }, key, signature, data);

  // files = { sumsText, sumsSig, fileSig } (strings). Resolves to { status, label } or throws: a firmware that does not verify is refused.
  async function verifyFirmware(name, bytes, files, options = {}) {
    const subtle = options.subtle || root.crypto?.subtle;
    const publicKeyHex = options.publicKeyHex ?? FirmwareSignature.PUBLIC_KEY_HEX;
    if (!publicKeyHex) return { status: "unconfigured", label: "Sin comprobacion de firma: clave publica no configurada." };
    if (!(bytes instanceof Uint8Array)) fail("Firmware no valido.");
    if (!subtle) fail("Este navegador no puede verificar firmas: firmware rechazado.");
    if (!files?.sumsText || !files.sumsSig || !files.fileSig) fail("Faltan las firmas del firmware (SHA256SUMS o .sig): firmware rechazado.");
    const key = await importKey(publicKeyHex, subtle);
    const expected = parseSums(files.sumsText).get(name);
    if (!expected) fail(`${name} no figura en SHA256SUMS: firmware rechazado.`);
    if (await sha256(bytes, subtle) !== expected) fail("SHA-256 distinto al de SHA256SUMS: firmware rechazado.");
    if (!key) return { status: "hash-only", label: "SHA-256 coincide con SHA256SUMS; este navegador no puede comprobar la firma Ed25519." };
    const sumsOk = await verifyDetached(key, base64ToBytes(files.sumsSig), new TextEncoder().encode(files.sumsText), subtle);
    if (!sumsOk) fail("Firma de SHA256SUMS no valida: firmware rechazado.");
    if (!await verifyDetached(key, base64ToBytes(files.fileSig), bytes, subtle)) fail("Firma del firmware no valida: firmware rechazado.");
    return { status: "verified", label: FirmwareSignature.VERIFIED };
  }

  // Fetches SHA256SUMS, SHA256SUMS.sig and <name>.sig from the folder of entry.path and verifies the downloaded bytes.
  async function verifyPrecompiled(entry, bytes, options = {}) {
    const publicKeyHex = options.publicKeyHex ?? FirmwareSignature.PUBLIC_KEY_HEX;
    if (!publicKeyHex) return verifyFirmware(entry.name, bytes, null, options);
    const fetchText = options.fetchText || (async url => {
      const response = await root.fetch(url, { cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(15000) });
      if (!response.ok) fail(`Firma no disponible (${url}: HTTP ${response.status}): firmware rechazado.`);
      return response.text();
    });
    const base = entry.path.slice(0, entry.path.lastIndexOf("/") + 1);
    const [sumsText, sumsSig, fileSig] = await Promise.all([
      fetchText(`${base}SHA256SUMS`), fetchText(`${base}SHA256SUMS.sig`), fetchText(`${base}${entry.name}.sig`)]);
    return verifyFirmware(entry.name, bytes, { sumsText, sumsSig, fileSig }, options);
  }

  Object.assign(FirmwareSignature, { parseSums, verifyFirmware, verifyPrecompiled });
  const R = root.RadioWorkspace = root.RadioWorkspace || {};
  R.FirmwareSignature = FirmwareSignature;
  if (typeof module !== "undefined") module.exports = FirmwareSignature;
})(globalThis);
