// Build-time snapshot of the GitHub release listings the web catalog needs. It is only a fallback for the
// unauthenticated API rate limit: it lists entries and never replaces SHA-256 / size verification.
const fs = require("node:fs");
const path = require("node:path");
const { firmwareCore } = require("../firmware-core.js");

const output = path.join(__dirname, "..", "data", "firmware-catalog-fallback.json");

async function snapshot(request = fetch) {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "BricohamsRadioWorkspace-build" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const pages = {};
  for (const { repo } of firmwareCore.SOURCES) {
    for (let page = 1; page <= 10; page++) {
      const url = `https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`;
      const response = await request(url, { headers, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error(`${url}: respuesta no valida`);
      pages[url] = batch;
      if (batch.length < 100) break;
    }
  }
  return { version: 1, generatedAt: new Date().toISOString(), pages };
}

// A failed refresh keeps the previous committed snapshot so an offline or rate-limited build still ships one.
async function refresh(file = output) {
  try {
    const data = await snapshot();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(data)}\n`);
    return true;
  } catch (error) {
    console.warn(`Catalogo de respaldo no actualizado: ${error.message}`);
    return false;
  }
}

if (require.main === module) refresh();
module.exports = { snapshot, refresh };
