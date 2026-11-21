import { contract } from "./diagnostic-contract.mjs";

const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const fields = (value, names) => record(value) && Object.keys(value).length === names.length &&
  names.every(name => Object.hasOwn(value, name));
const member = (value, names) => typeof value === "string" && names.includes(value);
const copy = value => JSON.parse(JSON.stringify(value));

export function isDiagnosticReport(value) {
  return fields(value, contract.report_fields) &&
    value.schema_version === 1 &&
    member(value.component, contract.components) && member(value.platform, contract.platforms) &&
    typeof value.version === "string" && /^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(value.version) &&
    Array.isArray(value.events) && value.events.length > 0 && value.events.length <= contract.max_events &&
    value.events.every(event => fields(event, contract.event_fields) &&
      member(event.code, contract.codes) && member(event.source, contract.sources) &&
      member(event.severity, contract.severities) && member(event.error_type, contract.error_types) &&
      Number.isInteger(event.line) && event.line >= 0 && event.line <= 100000) &&
    new TextEncoder().encode(JSON.stringify(value)).byteLength <= contract.max_report_bytes;
}

export function errorCategory(error) {
  if (error instanceof TypeError || error instanceof RangeError || error instanceof SyntaxError) return "input";
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") return "permission";
    if (error.name === "TimeoutError") return "timeout";
  }
  return "exception";
}

function expectedCacheError(error) {
  return error instanceof SyntaxError || error instanceof TypeError ||
    (typeof DOMException !== "undefined" && error instanceof DOMException);
}

export class DiagnosticBuffer {
  constructor({ component, platform, version, storage = null, onChange = () => {} }) {
    this.metadata = { schema_version: 1, component, platform, version };
    this.storage = storage;
    this.key = `bricohams.diagnostics.${component}`;
    this.onChange = onChange;
    this.storageError = false;
    this.entries = [];
    this.revision = 0;
    this.persistScheduled = false;
    if (!isDiagnosticReport(this.makeReport([{
      code: "started", source: "ui", severity: "info", error_type: "none", line: 0
    }]))) throw new TypeError("Invalid diagnostic metadata");
    if (storage) {
      try {
        const text = storage.getItem(this.key);
        if (text !== null) {
          if (text.length > 65536) throw new TypeError("Oversized diagnostic cache");
          const saved = JSON.parse(text);
          if (!fields(saved, ["version", "entries"]) || !Array.isArray(saved.entries) ||
            saved.entries.length > 128) throw new TypeError("Invalid diagnostic cache");
          if (saved.version === version) {
            const cutoff = Date.now() - contract.retention_seconds * 1000;
            for (const item of saved.entries) {
              if (!fields(item, ["created", "event"]) || !Number.isFinite(item.created) ||
                item.created > Date.now() || !isDiagnosticReport(this.makeReport([item.event]))) {
                throw new TypeError("Invalid diagnostic cache");
              }
              if (item.created >= cutoff) this.entries.push(copy(item));
            }
          }
        }
      } catch (error) {
        if (!expectedCacheError(error)) throw error;
        this.storageError = true;
        this.entries = [];
        console.warn("Diagnostic local cache unavailable or invalid; no private data imported.");
      }
    }
    this.record("started", "ui", "info");
  }

  makeReport(events) { return { ...this.metadata, events: copy(events) }; }

  record(code, source = "unknown", severity = "error", errorType = "none", line = 0) {
    const event = { code, source, severity, error_type: errorType, line };
    if (!isDiagnosticReport(this.makeReport([event]))) throw new TypeError("Invalid diagnostic event");
    const cutoff = Date.now() - contract.retention_seconds * 1000;
    this.entries = this.entries.filter(entry => entry.created >= cutoff);
    this.entries.push({ created: Date.now(), event });
    this.revision++;
    if (this.entries.length > 128) this.entries.splice(0, this.entries.length - 128);
    if (!this.persistScheduled) {
      this.persistScheduled = true;
      queueMicrotask(() => {
        this.persistScheduled = false;
        if (this.entries.length) this.persist();
      });
    }
    this.onChange();
  }

  persist() {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.key, JSON.stringify({ version: this.metadata.version, entries: this.entries }));
    } catch (error) {
      if (!expectedCacheError(error)) throw error;
      this.storageError = true;
      console.warn("Diagnostic local cache write failed; bounded memory log remains available.");
      this.onChange();
    }
  }

  report() {
    const cutoff = Date.now() - contract.retention_seconds * 1000;
    this.entries = this.entries.filter(entry => entry.created >= cutoff);
    const events = this.entries.slice(-contract.max_events).map(entry => entry.event);
    return events.length ? this.makeReport(events) : null;
  }

  clear() {
    this.entries = [];
    this.revision++;
    if (this.storage) {
      try { this.storage.removeItem(this.key); }
      catch (error) {
        if (!expectedCacheError(error)) throw error;
        this.storageError = true;
        console.warn("Diagnostic local cache could not be cleared.");
      }
    }
    this.onChange();
  }
}
