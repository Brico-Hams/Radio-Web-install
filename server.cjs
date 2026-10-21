const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { FirmwareService, TARGETS } = require("./firmware-service.cjs");
const { DataService } = require("./data-service.cjs");
const ALLOWED_FILES = Object.freeze([
  "index.html", "opengd77.html", "quansheng.html", "ayuda.html", "bricohams-logo.svg", "styles.css", "app.js", "radio-core.js",
  "transports.js", "quansheng-connector.js", "gd77-connector.js", "backup-store.js",
  "codeplug-editor.js", "radio-ui.js", "firmware-core.js", "firmware-catalog.js", "planning-core.js", "radioid-csv.js", "planning-ui.js", "satellite.min.js", "runtime-mode.js"
]);
const allowed = new Set(ALLOWED_FILES);
function createServer(firmware = new FirmwareService(), providers = new DataService()) {
return http.createServer(async (request, response) => {
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  response.setHeader("Permissions-Policy", "usb=(self), serial=(self), camera=(), microphone=(), geolocation=(self)");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Cache-Control", "no-store");
  if (!/^127\.0\.0\.1(?::\d+)?$/.test(request.headers.host || "") ||
    (request.headers.origin && request.headers.origin !== `http://${request.headers.host}`)) {
    response.writeHead(403);
    response.end("Solo se permite el origen local.");
    return;
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Metodo no permitido.");
    return;
  }
  let url;
  try {
    if (!request.url.startsWith("/") || request.url.startsWith("//")) throw new Error("Ruta invalida.");
    url = new URL(request.url, "http://127.0.0.1");
  } catch {
    response.writeHead(400);
    response.end("Ruta invalida.");
    return;
  }
  if (url.pathname.startsWith("/api/data/")) {
    if (request.method !== "GET") {
      response.writeHead(405, { Allow: "GET" });
      response.end("Solo GET.");
      return;
    }
    const routes = {
      "/api/data/status": { method: "status", keys: [] },
      "/api/data/contacts": { method: "contacts", keys: ["country", "region", "page"] },
      "/api/data/repeaters": { method: "repeaters", keys: ["country", "region", "stateId", "mode"] },
      "/api/data/satellite": { method: "satellite", keys: ["norad", "provider"] },
      "/api/data/transmitters": { method: "transmitters", keys: ["norad"] }
    };
    try {
      const route = routes[url.pathname];
      const keys = [...url.searchParams.keys()];
      if (!route || keys.some(key => !route.keys.includes(key)) || new Set(keys).size !== keys.length) {
        response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "Ruta o parametros de proveedor no permitidos." }));
        return;
      }
      const result = await providers[route.method](Object.fromEntries(url.searchParams));
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(result));
    } catch (error) {
      console.error(`Proveedor: ${error.message}`);
      response.writeHead(error.status || 502, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  if (url.pathname.startsWith("/api/firmware/")) {
    if (request.method !== "GET") {
      response.writeHead(405, { Allow: "GET" });
      response.end("Usa GET para consultar firmware.");
      return;
    }
    try {
      let result;
      if (url.pathname === "/api/firmware/targets" && !url.search) {
        result = Object.entries(TARGETS).map(([id, target]) => ({ id, family: target.family, label: target.label }));
      } else if (url.pathname === "/api/firmware/catalog" && [...url.searchParams.keys()].join() === "target") {
        result = await firmware.catalog(url.searchParams.get("target"));
      } else if (url.pathname === "/api/firmware/file" && [...url.searchParams.keys()].join() === "id") {
        const file = await firmware.download(url.searchParams.get("id"));
        result = { manifest: file.manifest, data: file.data.toString("base64") };
      } else {
        response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "Ruta o parametros de firmware no permitidos." }));
        return;
      }
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(result));
    } catch (error) {
      console.error(`Firmware: ${error.message}`);
      response.writeHead(error.status || 502, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  if (url.pathname === "/runtime.json") {
    const body = Buffer.from(JSON.stringify({ mode: "local" }));
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Content-Length": body.length });
    response.end(request.method === "HEAD" ? undefined : body);
    return;
  }
  const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  if (!allowed.has(name)) {
    response.writeHead(404);
    response.end("No encontrado.");
    return;
  }
  try {
    const filename = name === "satellite.min.js"
      ? path.join(path.dirname(require.resolve("satellite.js/package.json")), "dist", "satellite.min.js")
      : path.join(__dirname, name);
    const body = await fs.readFile(filename);
    const type = name.endsWith(".html") ? "text/html" : name.endsWith(".css") ? "text/css" : name.endsWith(".svg") ? "image/svg+xml" : "text/javascript";
    response.writeHead(200, { "Content-Type": `${type}; charset=utf-8`, "Content-Length": body.length });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    console.error(`No se pudo servir ${name}: ${error.message}`);
    response.writeHead(500);
    response.end("No se pudo leer el archivo.");
  }
});
}
if (require.main === module) {
const server = createServer();
server.on("error", error => {
  console.error(`Error de servidor: ${error.message}`);
  process.exitCode = 1;
});
server.listen(8787, "127.0.0.1", () => console.log("Bricohams Radio Workspace: http://127.0.0.1:8787 (solo equipo local)"));
}
module.exports = { createServer, ALLOWED_FILES };
