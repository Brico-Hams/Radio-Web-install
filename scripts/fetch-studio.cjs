"use strict";
// Bricohams Quansheng Studio is maintained in bricohams/Bricohams-Studio. The installers ship a copy pinned by
// commit and SHA-256 in studio.lock.json; it is never committed here because it embeds firmware binaries.
const fs = require("node:fs");
const path = require("node:path");
const { sha256, scriptHashes, verify } = require("../studio-pin.cjs");

const root = path.join(__dirname, "..");
const LOCK = path.join(root, "studio.lock.json");

async function download(commit) {
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error("El commit de Studio debe ser un SHA-1 completo.");
  const url = `https://raw.githubusercontent.com/bricohams/Bricohams-Studio/${commit}/index.html`;
  const response = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: "error" });
  if (!response.ok) throw new Error(`Descarga de Studio fallida: HTTP ${response.status}.`);
  return Buffer.from(await response.arrayBuffer());
}

async function main(args) {
  if (args[0] === "--update") {
    // Maintainer step: pin a commit that is already pushed to GitHub.
    const commit = args[1];
    const data = await download(commit);
    const lock = { repository: "bricohams/Bricohams-Studio", commit, path: "index.html", bytes: data.length, sha256: sha256(data),
      scriptHashes: scriptHashes(data.toString("utf8")) };
    fs.writeFileSync(LOCK, `${JSON.stringify(lock, null, 2)}\n`);
    console.log(`studio.lock.json -> ${commit} (${lock.sha256})`);
    return;
  }
  const lock = JSON.parse(fs.readFileSync(LOCK, "utf8"));
  const output = args[0] || path.join(root, "studio.html");
  if (fs.existsSync(output)) {
    try { verify(fs.readFileSync(output), lock); console.log(`${output} ya verificado.`); return; }
    catch (error) { console.warn(`Studio local no valido: ${error.message} Se descargara la copia fijada.`); }
  }
  const data = verify(await download(lock.commit), lock);
  if (JSON.stringify(scriptHashes(data.toString("utf8"))) !== JSON.stringify(lock.scriptHashes)) throw new Error("Hashes CSP de Studio distintos del lock.");
  fs.writeFileSync(output, data);
  console.log(`Studio ${lock.commit.slice(0, 7)} verificado (${lock.sha256}) -> ${output}`);
}

if (require.main === module) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exit(1); });
