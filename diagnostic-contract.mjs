export const contract = {
  "schema_version": 1,
  "components": [
    "radicodex",
    "station-agent",
    "station-android",
    "station-host",
    "station-ios",
    "station-web",
    "workspace-host",
    "workspace-web"
  ],
  "platforms": [
    "android",
    "ios",
    "linux",
    "macos",
    "unknown",
    "web",
    "windows"
  ],
  "sources": [
    "api",
    "audio",
    "cat",
    "digital",
    "http",
    "native",
    "ptt",
    "rotor",
    "server",
    "settings",
    "ui",
    "unknown",
    "usb"
  ],
  "codes": [
    "connection_failed",
    "operation_failed",
    "runtime_log",
    "started",
    "uncaught_error",
    "upload_failed",
    "usb_failed"
  ],
  "error_types": [
    "connection",
    "exception",
    "input",
    "io",
    "none",
    "permission",
    "protocol",
    "timeout",
    "tls"
  ],
  "severities": [
    "error",
    "info",
    "warning"
  ],
  "max_events": 16,
  "max_report_bytes": 4096,
  "retention_seconds": 604800,
  "report_fields": [
    "schema_version",
    "component",
    "version",
    "platform",
    "events"
  ],
  "event_fields": [
    "code",
    "source",
    "severity",
    "error_type",
    "line"
  ]
};
