import { DiagnosticBuffer, errorCategory } from "./diagnostics-core.mjs";

function boot() {
  let storage = null;
  try { storage = localStorage; }
  catch (error) {
    if (!(error instanceof DOMException)) throw error;
    console.warn("Diagnostic storage unavailable; bounded memory log only.");
  }
  const buffer = new DiagnosticBuffer({ component: "workspace-web", platform: "web", version: "0.8.0", storage });
  globalThis.RadioWorkspace = globalThis.RadioWorkspace || {};
  globalThis.RadioWorkspace.recordDiagnostic = (source, error) =>
    buffer.record("operation_failed", source, "error", errorCategory(error));
  window.addEventListener("error", event => buffer.record("uncaught_error", "ui", "error", errorCategory(event.error)));
  window.addEventListener("unhandledrejection", event => buffer.record("uncaught_error", "ui", "error", errorCategory(event.reason)));
  const panel = document.createElement("section");
  panel.className = "panel";
  const title = document.createElement("h2");
  title.textContent = "Diagnostico tecnico sin datos personales";
  const notice = document.createElement("p");
  notice.textContent = "Registro local acotado; sin tokens, indicativos, QSO, frecuencias, audio, ubicacion ni identificadores del dispositivo. Revisa el JSON antes de enviarlo. El receptor HTTPS puede conocer la IP y metadatos de conexion. En Pages descarga el informe e importalo en Configuracion del cliente HTTPS; no se debilita la CSP ni se usa GitHub como receptor.";
  const preview = document.createElement("pre");
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Revisar informe tecnico";
  details.append(summary, preview);
  details.addEventListener("toggle", () => { preview.textContent = JSON.stringify(buffer.report(), null, 2); });
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  function button(label, action) {
    const control = document.createElement("button");
    control.type = "button"; control.className = "button secondary"; control.textContent = label;
    control.addEventListener("click", action);
    return control;
  }
  const download = button("Descargar informe tecnico", () => {
    const report = buffer.report();
    if (!report) { status.textContent = "No hay registros tecnicos."; return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "bricohams-diagnostic-report.json"; link.click();
    URL.revokeObjectURL(url);
  });
  const clear = button("Borrar registros tecnicos locales", () => { buffer.clear(); preview.textContent = ""; });
  const send = button("Enviar una vez mediante el host local autorizado", async () => {
    const report = buffer.report();
    if (!report) { status.textContent = "No hay registros tecnicos."; return; }
    send.disabled = true;
    try {
      const response = await fetch("api/diagnostic-report", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(report),
        credentials: "omit", redirect: "error", signal: AbortSignal.timeout(10000)
      });
      if (response.status !== 202) throw new Error("Diagnostic relay rejected");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Diagnostic acknowledgement missing");
      let text = "", bytes = 0;
      const decoder = new TextDecoder();
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 256) { await reader.cancel(); throw new Error("Diagnostic acknowledgement too large"); }
        text += decoder.decode(part.value, { stream: true });
      }
      text += decoder.decode();
      const acknowledgement = JSON.parse(text);
      if (!acknowledgement || Object.keys(acknowledgement).length !== 1 || acknowledgement.accepted !== true) {
        throw new Error("Diagnostic acknowledgement invalid");
      }
      status.textContent = "El receptor HTTPS ha confirmado la recepcion del informe.";
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      status.textContent = "Entrega no confirmada. Configura el receptor y consentimiento del host local, o descarga e importa el informe en el cliente HTTPS.";
    } finally { send.disabled = false; }
  });
  panel.append(title, notice, details, download, send, clear, status);
  (document.querySelector("main") || document.body).append(panel);
  if (buffer.storageError) status.textContent = "No se pudo guardar el registro local; registro acotado en memoria.";
}

if (document.readyState === "complete") boot();
else document.addEventListener("DOMContentLoaded", boot, { once: true });
