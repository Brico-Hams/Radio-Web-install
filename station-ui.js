(function (root) {
  "use strict";
  function stationURL(value) {
    if (typeof value !== "string" || value !== value.trim() || value.length > 2048) {
      throw new Error("Introduce una URL HTTPS del host sin credenciales, ruta ni parametros.");
    }
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
      throw new Error("Introduce una URL HTTPS del host sin credenciales, ruta ni parametros.");
    }
    return url.origin + "/";
  }
  function mountStationUI() {
    const form = root.document.getElementById("station-connect");
    const input = root.document.getElementById("station-host");
    const status = root.document.getElementById("station-status");
    const open = root.document.getElementById("station-open");
    input.addEventListener("input", () => { open.hidden = true; open.removeAttribute("href"); status.textContent = ""; });
    form.addEventListener("submit", event => {
      event.preventDefault();
      open.hidden = true;
      open.removeAttribute("href");
      try {
        open.href = stationURL(input.value);
        open.hidden = false;
        status.textContent = "Direccion preparada; inicia sesion solo en tu host HTTPS.";
      } catch {
        status.textContent = "Introduce una URL HTTPS del host sin credenciales, ruta ni parametros.";
      }
    });
  }
  root.RadioWorkspace = root.RadioWorkspace || {};
  Object.assign(root.RadioWorkspace, { stationURL, mountStationUI });
  if (typeof module !== "undefined") module.exports = { stationURL };
})(globalThis);
