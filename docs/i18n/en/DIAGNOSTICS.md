# Diagnostico remoto / Remote diagnostics / Diagnostic distant / Ferndiagnose

## ES - Privacy and operation

The system records **minimized technical data**, not hidden telemetry. Remote
sending is disabled by default and requires consent and an HTTPS receiver
configured by the administrator. A central BricoHams service is not assumed.

The contract accepts only the software version, component, generic platform and
up to 16 events with code, area, severity, error category and line number. It
does not accept messages, exception values, paths, user names, tokens, callsigns,
QSOs, frequencies, audio, location, ports or device or installation identifiers.
Additional fields are rejected: no attempt is made to clean arbitrary text before
sending it.

**No absolute anonymity is promised.** The receiver, its provider or a proxy may
know the IP, the authorization credential, the time and connection metadata. The
receiver's operator must configure its own logs and retention policy.

### Clients

- Web station console, Android/tablet and iPhone/iPad: Settings lets you review,
  download, import, send once, enable automatic sending in the foreground and
  delete local logs. Automatic consent is not saved; disconnecting or restarting
  disables it. The HTTPS host of that session is used.
- RadiCodex: the diagnostics card lets you review and authorize sending with an
  HTTPS URL and a dedicated token held only in memory. It sends only in the
  foreground; disabling or restarting prevents new sends. A request that has
  already started may have arrived.
- HTML5 Workspace: each tool page offers a JSON view, download, local deletion
  and manual sending through the authorized local server. GitHub Pages does not
  receive reports: download and import them in the HTTPS client.
- The old detailed USB reports are private and are not sent by these mechanisms.
  Review them separately before sharing them manually.

The native log and the HTTPS origin validation reside in the Android library
`station-core`, reusable without dependencies on the RadiCodex interface. Each
application initializes the log with its component from the closed contract and
its public version; that identity cannot change during the same application run.
RadiCodex keeps `radicodex` and its compiled version. The standalone agent will
use `station-agent`, with no USB identifiers in the reports. The JSON contract is
generated from the same Python definition and is packaged with the library. This
extraction does not by itself implement the OTG agent nor change consent, limits,
retention, TLS validation or HTTPS receipt confirmation.

The JS clients keep up to 128 events and RadiCodex up to 500 entries. Logical
expiry is seven days, checked on read/write; a powered-off device does not run a
purge. Deleting here removes only local logs: it does not withdraw reports already
received nor guarantee physical deletion of backup copies. Storage and delivery
errors are shown; allowing sending is not the same as confirmed delivery.

### Receiver and Python agents

The coordinator enables reception with:

```text
bricohams-station-host --diagnostic-report-database <ruta-privada>/reports.sqlite3
```

Add the usual TLS and station arguments; the example does not replace the HTTPS
configuration. When it coexists with local Workspace (port 8787), use a different
port for the coordinator, for example `--port 8443`.

Set `BRICOHAM_DIAGNOSTIC_REPORTER_TOKEN` to a dedicated random credential of at
least 32 characters. The `diagnostic_reporter` role can deliver reports, but it
does not control RF or query reports. Administrator/operator can also deliver;
only the administrator queries `GET /api/v1/diagnostic-reports`. Reception is
disabled if the database is not configured.

Host and agent generate local logs in `~/.bricohams/diagnostics`, configurable
with `--diagnostic-directory`. To authorize sending to a receiver:

```text
--diagnostics-opt-in --diagnostics-url https://diagnostic.example.org
```

The secret is provided through `BRICOHAM_DIAGNOSTICS_TOKEN`, never in a URL,
report arguments or source code. Do not reuse station control credentials; startup
rejects such reuse in the Python agents. `--diagnostics-ca <archivo>` allows
trusting a private CA without skipping TLS. In-memory queues are bounded to 128
events; on saturation, the discarding of the oldest ones is reported. The worker
does no I/O in the RF logging path. Local logs survive a restart; the remote queue
is not a durable outbox and is rebuilt with new events, not with the whole history.

The receiving store limits itself to 500 reports, delivers the latest 50 to the
administrator and applies seven days of logical retention and a SQLite page
limit. It does not store the IP in the report. The API limits reports to 4096
bytes and 60 deliveries per minute. On an HTTPS/confirmation failure, it retries
with a wait between 60 and 600 seconds. Only HTTP 202 with exactly
`{"accepted":true}` confirms receipt.

### Local Node Workspace

`npm start` generates a local minimized history, separate from the original
console outputs, which may contain detailed diagnostics and remain private. The
JSONL history keeps at most 128 reports and a logical expiry of seven days. It is
not exposed through a public read API.

Configure in the process environment:

```text
BRICOHAM_DIAGNOSTICS_OPT_IN=1
BRICOHAM_DIAGNOSTICS_URL=https://diagnostic.example.org
BRICOHAM_DIAGNOSTICS_TOKEN=<secreto-exclusivo>
BRICOHAM_DIAGNOSTICS_CA=<archivo-CA-opcional>
```

Authorization enables the host's technical logs and the relay of one browser
report when Send is pressed. Without it there is no diagnostic network traffic.
The local POST requires an exact origin, closed JSON and a size limit. The server
stays on loopback; it is not a proxy for CAT, PTT or remote firmware.

## EN - User guide

Remote sending is off by default. Review the JSON before consenting. Only public
software metadata and fixed error categories are allowed; messages, secrets,
callsigns, QSOs, frequencies, audio, location and device/installation IDs are
excluded. HTTPS does not hide your IP or connection metadata from the receiver.

Use Settings in the shared station client, Diagnostics in RadiCodex, or the
technical panel in Workspace. Pages users download and import the JSON into the
HTTPS station client. Automatic client consent is session-only and foreground-only.
Clearing local logs does not recall delivered reports or erase backups physically.
Bounded logs expire logically after seven days, when the application is active.
Legacy detailed USB exports are private and never automatically uploaded.

Deployment uses the exact flags/environment variables above. Configure your own
HTTPS receiver, dedicated diagnostic credential, CA if needed, retention and proxy
logging. The reporter role cannot control radio hardware. No public BricoHams
collector, absolute anonymity, confirmed delivery without acknowledgement or
physical hardware validation is assumed.

## FR - User guide

Remote sending is disabled by default. Review the JSON before consenting. Only
public software metadata and fixed error categories are allowed: no messages,
secrets, callsigns, QSOs, frequencies, audio, location or device/installation
identifiers. HTTPS does not hide your IP or connection metadata from the receiver.

Use Settings in the station client, Diagnostics in RadiCodex or the technical
Workspace panel. On Pages, download and then import the JSON into the HTTPS
client. The clients' automatic consent applies only to the session and the
foreground. Local clearing does not withdraw received reports and does not
physically erase backups. The seven-day logical retention is applied when the
application is active. Old detailed USB exports remain private.

Deployment uses exactly the options and variables above. Configure your own HTTPS
receiver, exclusive diagnostic secret, CA if needed, retention and proxy logs. The
reporter role does not control the radio. No public BricoHams collector, absolute
anonymity or hardware validation is assumed.

## DE - User guide

Remote sending is off by default. Review the JSON before consenting. Only public
software metadata and fixed error categories are allowed: no messages, secrets,
callsigns, QSOs, frequencies, audio data, locations or device and installation
identifiers. HTTPS does not hide the IP or connection metadata from the receiver.

Use the station client settings, the RadiCodex diagnostics or the technical
Workspace panel. On Pages, download the JSON and import it into the HTTPS client.
Automatic client consent applies only to the session in the foreground. Local
deletion does not recall sent reports and does not physically delete backups.
Bounded logs expire logically after seven days while the application is active.
Old detailed USB exports remain private and are never sent automatically.

Deployment uses the options and environment variables given above. Configure your
own HTTPS receiver, exclusive diagnostic secret, CA if applicable, retention and
proxy logs. The reporter may not control radio hardware. No public BricoHams
receiver, absolute anonymity or hardware validation is assumed.

## PT - User guide

Remote sending is disabled by default. Review the JSON before authorizing. Only
public software metadata and fixed error categories are allowed: no messages,
secrets, callsigns, QSOs, frequencies, audio, location or device/installation
identifiers. HTTPS does not hide the IP or connection metadata from the receiver.

Use Settings in the station client, Diagnostics in RadiCodex or the technical
Workspace panel. On Pages, download and import the JSON into the HTTPS client.
The client's automatic consent is valid only during the session in the
foreground. Deleting local logs does not withdraw sent reports nor physically
erase backups. Bounded logs expire logically after seven days when the
application is active. Old detailed USB exports remain private.

Use the options and variables above to configure your own HTTPS receiver,
exclusive secret, optional CA, retention and proxy logs. The reporter role does
not control the radio. No public BricoHams receiver, absolute anonymity or
physical hardware validation is assumed.
