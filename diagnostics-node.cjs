"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const https = require("node:https");

async function createDiagnostics(options = {}) {
  const { DiagnosticBuffer, isDiagnosticReport, errorCategory } = await import("./diagnostics-core.mjs");
  const rawWarn = console.warn.bind(console);
  const directory = options.directory || path.join(os.homedir(), ".bricohams", "diagnostics");
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const filename = path.join(directory, "workspace-host.jsonl");
  const buffer = new DiagnosticBuffer({
    component: "workspace-host", version: "0.8.0",
    platform: { win32: "windows", linux: "linux", darwin: "macos" }[process.platform] || "unknown"
  });
  let closed = false, failed = false, timer = null, writing = null, dirty = false;
  let history = [], active = new Set(), accepted = 0, windowStart = Date.now();
  let target = null, token = null, ca;
  let sentRevision = buffer.revision, delay = 60000;
  const consent = options.optIn === true;
  if (consent) {
    const value = options.url;
    target = new URL(value);
    token = options.token;
    if (typeof value !== "string" || value !== value.trim() || /[?#]/.test(value) ||
      target.protocol !== "https:" || target.username || target.password || target.pathname !== "/" ||
      !target.hostname || typeof token !== "string" || token.length < 32 || /[^\x21-\x7e]/.test(token)) {
      throw new TypeError("HTTPS collector and dedicated diagnostic secret required");
    }
    if (options.ca) ca = await fs.readFile(options.ca);
  }

  function purge() {
    history = history.filter(entry => entry.created >= Date.now() - 7 * 86400000).slice(-128);
  }
  try {
    const stat = await fs.stat(filename);
    if (stat.size > 524288) throw new TypeError("Oversized diagnostic history");
    const text = await fs.readFile(filename, "utf8");
    history = text.trim() ? text.trim().split("\n").map(line => {
      const value = JSON.parse(line);
      if (!value || Object.keys(value).length !== 2 || !Object.hasOwn(value, "created") ||
        !Number.isFinite(value.created) || value.created > Date.now() || !isDiagnosticReport(value.report)) {
        throw new TypeError("Invalid diagnostic history");
      }
      return value;
    }) : [];
    purge();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  function save(report) {
    history.push({ created: Date.now(), report: JSON.parse(JSON.stringify(report)) });
    purge();
    dirty = true;
    if (writing) return;
    writing = (async () => {
      while (dirty) {
        dirty = false;
        await fs.writeFile(filename + ".tmp", history.map(entry => JSON.stringify(entry)).join("\n") + "\n", { mode: 0o600 });
        await fs.rename(filename + ".tmp", filename);
      }
    })().catch(error => {
      failed = true;
      rawWarn("Diagnostic local log write failed; bounded memory report retained.");
      if (!(error instanceof Error)) throw error;
    }).finally(() => { writing = null; });
  }
  function record(code, source = "server", severity = "error", error) {
    if (closed) return;
    buffer.record(code, source, severity, error === undefined ? "none" : errorCategory(error));
    const report = buffer.report();
    if (report) save({ ...report, events: report.events.slice(-1) });
  }
  async function send(report) {
    if (!target || !consent || closed) throw new Error("Diagnostic remote sending disabled");
    if (!isDiagnosticReport(report)) throw new TypeError("Invalid minimized diagnostic report");
    const body = Buffer.from(JSON.stringify(report));
    await new Promise((resolve, reject) => {
      const request = https.request(new URL("api/v1/diagnostic-reports", target.origin + "/"), {
        method: "POST", ca, rejectUnauthorized: true,
        headers: { "Content-Type": "application/json", "Content-Length": body.length, Authorization: `Bearer ${token}` }
      }, response => {
        let bytes = 0, chunks = [];
        response.on("data", chunk => {
          bytes += chunk.length;
          if (bytes > 256) { response.destroy(); reject(new Error("Diagnostic acknowledgement too large")); }
          else chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () => {
          try {
            const ack = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (response.statusCode !== 202 || ack === null || typeof ack !== "object" ||
              Object.keys(ack).length !== 1 || ack.accepted !== true) throw new Error("Diagnostic upload not acknowledged");
            resolve();
          } catch (error) { reject(error); }
        });
      });
      active.add(request);
      const deadline = setTimeout(() => request.destroy(new Error("Diagnostic HTTPS timeout")), 5000);
      request.on("close", () => { clearTimeout(deadline); active.delete(request); });
      request.on("error", reject);
      request.end(body);
    });
  }
  async function tick() {
    if (closed) return;
    if (buffer.revision !== sentRevision) {
      const revision = buffer.revision, report = buffer.report();
      if (report) {
        try { await send(report); sentRevision = revision; failed = false; delay = 60000; }
        catch (error) {
          failed = true;
          delay = Math.min(delay * 2, 600000);
          rawWarn("Diagnostic HTTPS upload failed; retry bounded and delivery unconfirmed.");
          if (!(error instanceof Error)) throw error;
        }
      }
    }
    timer = setTimeout(() => { void tick(); }, delay);
    timer.unref();
  }
  if (consent) { timer = setTimeout(() => { void tick(); }, delay); timer.unref(); }
  record("started", "server", "info");
  return {
    record, report: () => buffer.report(), send,
    status: () => ({ configured: true, remote_enabled: consent && !closed, failed }),
    async accept(report) {
      if (!isDiagnosticReport(report)) throw new TypeError("Invalid minimized diagnostic report");
      if (Date.now() - windowStart >= 60000) { windowStart = Date.now(); accepted = 0; }
      if (accepted >= 60 || active.size >= 8) throw new Error("Diagnostic relay rate limit");
      accepted++;
      await send(report);
      save(report);
    },
    async close() {
      closed = true;
      clearTimeout(timer);
      for (const request of active) request.destroy(new Error("Diagnostic sending disabled"));
      token = null;
      await writing;
    }
  };
}

module.exports = { createDiagnostics };
