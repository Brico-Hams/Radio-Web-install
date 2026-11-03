(function (root) {
  "use strict";
  // Shows the latest signed RadiCodex release (radicodex-update.json, produced by scripts/ota-manifest.cjs) and re-checks
  // its Ed25519 signature in the browser. The public key below is the one embedded in the app (OtaConfig.PUBLIC_KEY_HEX).
  const PUBLIC_KEY_HEX = "00980a6d0cc6b02e69b24d5d9caf5424bf7a0a4748247f3782f0b91a0134e68d";
  const LANGUAGES = ["es", "en", "fr", "de"];
  const TEXT = {
    es: { title: "RadiCodex: última versión", loading: "Cargando el manifiesto firmado…", version: "Versión", sha: "SHA-256 del APK",
      size: "Tamaño", signature: "Firma del manifiesto", download: "Descargar APK", notes: "Novedades", howto: "Cómo se verifica",
      howtoText: "La app comprueba la firma Ed25519 del manifiesto, el SHA-256 y que el APK esté firmado con el mismo certificado que la instalada. Esta página repite la comprobación de la firma en tu navegador.",
      manifest: "Manifiesto firmado (radicodex-update.json)", valid: "Firma verificada", invalid: "Firma NO válida: no descargues este APK",
      unsupported: "Este navegador no puede comprobar Ed25519; la app sí lo hará antes de instalar.", missing: "Todavía no hay ninguna versión publicada.",
      bytes: "bytes" },
    en: { title: "RadiCodex: latest release", loading: "Loading the signed manifest…", version: "Version", sha: "APK SHA-256",
      size: "Size", signature: "Manifest signature", download: "Download APK", notes: "What's new", howto: "How it is verified",
      howtoText: "The app checks the manifest's Ed25519 signature, the SHA-256 and that the APK is signed with the same certificate as the installed one. This page repeats the signature check in your browser.",
      manifest: "Signed manifest (radicodex-update.json)", valid: "Signature verified", invalid: "Signature NOT valid: do not download this APK",
      unsupported: "This browser cannot check Ed25519; the app will do it before installing.", missing: "No release has been published yet.",
      bytes: "bytes" },
    fr: { title: "RadiCodex : dernière version", loading: "Chargement du manifeste signé…", version: "Version", sha: "SHA-256 de l'APK",
      size: "Taille", signature: "Signature du manifeste", download: "Télécharger l'APK", notes: "Nouveautés", howto: "Comment c'est vérifié",
      howtoText: "L'application vérifie la signature Ed25519 du manifeste, le SHA-256 et que l'APK est signé avec le même certificat que celui installé. Cette page refait la vérification de la signature dans votre navigateur.",
      manifest: "Manifeste signé (radicodex-update.json)", valid: "Signature vérifiée", invalid: "Signature NON valide : ne téléchargez pas cet APK",
      unsupported: "Ce navigateur ne peut pas vérifier Ed25519 ; l'application le fera avant l'installation.", missing: "Aucune version n'est encore publiée.",
      bytes: "octets" },
    de: { title: "RadiCodex: neueste Version", loading: "Signiertes Manifest wird geladen…", version: "Version", sha: "SHA-256 der APK",
      size: "Größe", signature: "Manifest-Signatur", download: "APK herunterladen", notes: "Neuigkeiten", howto: "So wird geprüft",
      howtoText: "Die App prüft die Ed25519-Signatur des Manifests, den SHA-256 und dass die APK mit demselben Zertifikat wie die installierte signiert ist. Diese Seite wiederholt die Signaturprüfung in Ihrem Browser.",
      manifest: "Signiertes Manifest (radicodex-update.json)", valid: "Signatur verifiziert", invalid: "Signatur NICHT gültig: diese APK nicht herunterladen",
      unsupported: "Dieser Browser kann Ed25519 nicht prüfen; die App tut es vor der Installation.", missing: "Es wurde noch keine Version veröffentlicht.",
      bytes: "Bytes" },
  };

  // Must stay identical to canonical() in scripts/ota-manifest.cjs and OtaManifestParser.canonical in the app.
  function canonical(value) {
    if (value === null) return "null";
    if (typeof value === "boolean") return String(value);
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value)) throw new Error("Only integers are allowed in the manifest");
      return String(value);
    }
    if (typeof value === "string") {
      let out = '"';
      for (let index = 0; index < value.length; index++) {
        const code = value.charCodeAt(index);
        const char = value[index];
        if (char === '"') out += '\\"';
        else if (char === "\\") out += "\\\\";
        else if (code < 0x20 || code > 0x7e) out += "\\u" + code.toString(16).padStart(4, "0");
        else out += char;
      }
      return out + '"';
    }
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    return "{" + Object.keys(value).sort().map(key => canonical(key) + ":" + canonical(value[key])).join(",") + "}";
  }

  const hexBytes = hex => Uint8Array.from(hex.match(/../g), pair => parseInt(pair, 16));
  const base64Bytes = text => Uint8Array.from(atob(text), char => char.charCodeAt(0));

  // Resolves to "valid", "invalid" or "unsupported" (no Ed25519 in this browser's Web Crypto).
  async function verifyManifest(signed, publicKeyHex = PUBLIC_KEY_HEX, subtle = root.crypto?.subtle) {
    const { signature, ...manifest } = signed;
    if (typeof signature !== "string" || !subtle) return "unsupported";
    let key;
    try {
      key = await subtle.importKey("raw", hexBytes(publicKeyHex), { name: "Ed25519" }, false, ["verify"]);
    } catch (_) {
      return "unsupported";
    }
    try {
      const ok = await subtle.verify({ name: "Ed25519" }, key, base64Bytes(signature), new TextEncoder().encode(canonical(manifest)));
      return ok ? "valid" : "invalid";
    } catch (_) {
      return "invalid";
    }
  }

  const isDownloadUrl = url => { try { return new URL(url).protocol === "https:"; } catch (_) { return false; } };

  function render(doc, signed, status, lang) {
    const t = TEXT[lang];
    const set = (id, value) => { doc.getElementById(id).textContent = value; };
    set("version", `${signed.versionName} (${signed.versionCode})`);
    set("sha256", signed.apk.sha256);
    set("size", `${signed.apk.size} ${t.bytes}`);
    const signature = doc.getElementById("signature");
    signature.textContent = status === "valid" ? t.valid : status === "invalid" ? t.invalid : t.unsupported;
    signature.className = status === "valid" ? "ok" : status === "invalid" ? "bad" : "";
    const link = doc.getElementById("download");
    if (status !== "invalid" && isDownloadUrl(signed.apk.url)) { link.href = signed.apk.url; link.removeAttribute("aria-disabled"); }
    else { link.removeAttribute("href"); link.setAttribute("aria-disabled", "true"); }
    set("notes", signed.notes?.[lang] || signed.notes?.en || signed.notes?.es || "");
    doc.getElementById("release").hidden = false;
  }

  async function main(doc) {
    let lang = LANGUAGES.find(code => (root.navigator?.language || "").toLowerCase().startsWith(code)) || "es";
    let signed = null;
    let status = "unsupported";
    let statusKey = "loading";
    const apply = () => {
      doc.documentElement.lang = lang;
      for (const element of doc.querySelectorAll("[data-i18n]")) element.textContent = TEXT[lang][element.dataset.i18n];
      for (const button of doc.querySelectorAll("[data-lang]")) button.setAttribute("aria-pressed", String(button.dataset.lang === lang));
      doc.getElementById("status").textContent = statusKey ? TEXT[lang][statusKey] : "";
      if (signed) render(doc, signed, status, lang);
    };
    for (const button of doc.querySelectorAll("[data-lang]")) button.addEventListener("click", () => { lang = button.dataset.lang; apply(); });
    apply();
    try {
      const response = await root.fetch("radicodex-update.json", { cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      if (manifest.package !== "org.bricohams.radicodex" || typeof manifest.apk?.sha256 !== "string") throw new Error("manifest");
      signed = manifest;
      statusKey = null;
      status = await verifyManifest(manifest);
      apply();
    } catch (_) {
      statusKey = "missing";
      apply();
    }
  }

  const api = { canonical, verifyManifest, isDownloadUrl, PUBLIC_KEY_HEX, TEXT };
  if (typeof module !== "undefined") module.exports = api;
  if (typeof document !== "undefined") main(document);
})(globalThis);
