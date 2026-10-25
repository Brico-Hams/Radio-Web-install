"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const assert = require("node:assert/strict");
const repository = "armel/uv-k1-k5v3-firmware-custom";
const tags = ["v4.3.0", "v4.3.1", "v4.3.2", "v5.1.0", "v5.2.0", "v5.3.0",
  "v5.3.1", "v5.4.0", "v5.5.0", "v5.6.0", "v5.6.1", "v5.7.0", "v5.8.0",
  "v5.9.0", "v6.0.0", "v6.1.0", "v6.2.0", "v6.3.0"];

async function get(url, allowMissing = false) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Bricohams-documentation", Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(30000)
  });
  if (allowMissing && response.status === 404) return null;
  assert(response.ok, `No se pudo consultar ${url}: HTTP ${response.status}`);
  return response.text();
}
async function snapshot() {
  const versions = [];
  for (const tag of tags) {
    const commit = JSON.parse(await get(`https://api.github.com/repos/${repository}/commits/${tag}`)).sha;
    assert(/^[a-f0-9]{40}$/.test(commit), `Commit no valido: ${tag}`);
    const source = `https://raw.githubusercontent.com/${repository}/${commit}/CMakePresets.json`;
    const text = await get(source, true);
    if (text === null) {
      versions.push({ tag, commit, source, status: "no-cmake-presets" });
      console.warn(`${tag}: no publica CMakePresets.json; no se infieren valores.`);
      continue;
    }
    const presets = JSON.parse(text);
    assert(Array.isArray(presets.configurePresets), `Presets no validos: ${tag}`);
    versions.push({ tag, commit, source, status: "verified", sha256: createHash("sha256").update(text).digest("hex"), presets });
    console.log(`${tag}: ${commit}, ${presets.configurePresets.length} presets.`);
  }
  const result = { format: "bricohams-help-history", inspectedAt: new Date().toISOString().slice(0, 10), repository, versions };
  const output = path.join(__dirname, "..", "docs", "f4hwn-history-presets.json");
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Instantanea completa guardada: ${versions.length} versiones.`);
}
if (require.main === module) snapshot().catch(error => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
module.exports = { tags, snapshot };
