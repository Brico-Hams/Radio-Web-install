# Analysis of RemoteMyShack public features

Translation of `remote-station/docs/analisis-publico.md` (Spanish source of truth).

## Scope and limits

Reviewed on 20 November 2026 from the public pages linked below and from the
images supplied in context. This analysis records commercial claims and
functional categories; it does not inspect the service's code, bypass controls
or independently validate how it works. No code, brands, texts, graphics or
private protocols will be copied. The BricoHams interface has its own identity
and design.

The vendor's list is not a compatibility specification for BricoHams. The Yaesu
beta shown on the FTX-1 page is declared there as documentation-based, without
manufacturer testing of that product.

## Publicly announced categories

| Category | Announced description | BricoHams status |
|---|---|---|
| Responsive web console/PWA | Browsing from phone, tablet and computer; installation on the home screen | Implemented: `remote.webmanifest`, `remoto.webmanifest`, `remote-sw.js` (static files only, never `/api` or tokens) and `remote-station/apps/web-console/public/sw.js` |
| CAT control | Frequency, VFO/split, bands, modes, filters, RIT/XIT and DSP/gains depending on the radio | Implemented through `rigctld` in `remote-agent.cjs`; per-radio extensions only with a source (`remote-catalog.cjs`) |
| Scope and waterfall | Radio scope, adjustment and signal selection for tuning | Partial: local waterfall in the console; no waterfall in "public listening" (pendiente de fuente) |
| Audio | Low-latency reception and TX audio from mic/headset | Implemented (RX and TX with lease in `remote-agent.cjs`); guest TX requires explicit permission |
| Tuning peripherals | FlexControl, CTR2-MIDI and keyboard/paddle, per the public page | Pending |
| Station accessories | Amplifiers, tuner, switches, relays, PDU and rotators | Partial: rotator (`rotor.py`, Android `Rotor*`); the rest pending |
| Multi-radio | Selecting several radios per station | Partial: radio registry, per-radio lease/PTT and `GET /api/radios` in `remote-ops.cjs`; one agent still drives one `rigctld` |
| Roles/guests | Guests with per-radio permissions, listen-only or transmit, and limits | Implemented in the Node agent: own token per guest, bands and max power enforced in the agent, revocation (`remote-ops.cjs`, `/api/guests`); no invitation UI and no Python/Android |
| Logging and operation | ADIF logbook, maps, awards, DX cluster, alerts, TX history | Partial: TX history with CSV (`/api/txlog.csv`); the rest pending |
| Digital modes | CW, RTTY, PSK, SSTV, FT8/FT4/WSPR and RADE, depending on plan/product | Partial: limited WSJT-X (see `REMOTE_STATION.md`); the rest pending |
| TX safety | Release on link loss, timeout and operator exclusion | Implemented: 1 s heartbeat, time limit, SWR, one operator, release on hide/focus loss/background (web and Android) |
| Remote power on/off | Switch the radio on/off | Partial: FTX-1 power-off `PS0` (`docs/FTX1-KNOWLEDGE.md`) with confirmation in the Node agent; IC-705 `18 00`/`18 01` only as a tested Python builder (`icom_civ.py`), not wired; the rest pendiente de fuente |
| Public listening | Listen-only audio | Implemented, off by default, no control and rate-limited (`listenLive`) |
| Agent update | Notice of new versions | Implemented, opt-in: GitHub releases only, Ed25519 signature + SHA-256, never installs without consent |
| Network | Agent with outbound connection, direct encrypted link or relay | Implemented (`remote-relay.cjs`, TLS) |
| Applications | Mobile web and a listen-only Apple TV app | Web/Android implemented; Apple TV out of scope |

Radio comparison: the 44 models in the third party's list (reviewed on
22 November 2026: 17 Icom, 13 FlexRadio, 4 Kenwood, 7 Yaesu, 2 Elecraft and
Hermes Lite 2) are present in `data/remote-station-catalog.json` (IC-7850 and
IC-7851 share one entry). BricoHams also adds (tr)uSDX, QMX/QMX+ and QCX/QDX.
Remote power has a source only for the FTX-1 power-off (`PS0`) and for the
IC-705 (CI-V `18 00`/`18 01`, IC-705 CI-V guide p. 5 and p. 18; builders in
`remote-station/bricoham_remote_station/drivers/icom_civ.py`); the rest stays
"pendiente de fuente".

The capabilities, plan tiers, price and compatibility described belong to the
analysed product. They are not replicated as a specification nor presented as
BricoHams features.

The third party's list includes 44 Icom, FlexRadio, Kenwood, Yaesu, Elecraft
and Hermes Lite models. The owner added TRuSDX and QMX+ as BricoHams candidates;
support for these two is not attributed to the third party. The 46 candidates
appear in the [connection matrix](../../../remote-station/docs/radio-conexiones-candidatas.md).

## Criteria for our own alternative

1. Prioritise observability, RX control and reproducible documentation.
2. Separate CAT control, audio media, station and console through versioned
   contracts.
3. Implement each family/model only with public references and tests.
4. Keep PTT/TX inactive until explicit authorisation and hardware safety tests.
5. Prioritise a responsive web/PWA for the operator; host a local configuration
   UI in the agent, without letting the browser bypass the agent's limits.
6. Use a separate native Android client if USB Host/OTG becomes an agent route;
   that route is not assumed for every phone.

## Primary sources

- [RemoteMyShack: features, security and radios](https://www.remotemyshack.com/#pricing)
- [RemoteMyShack: public Yaesu FTX-1 page](https://www.remotemyshack.com/radios/yaesu-ftx-1)
- [Hamlib: FTX-1 backend](https://github.com/Hamlib/Hamlib/tree/master/rigs/yaesu/ftx1)
- [Hamlib: 4.7 release notes](https://github.com/Hamlib/Hamlib/blob/master/ReleaseNotes_4.7.md)
- [Hamlib: `rigctld` documentation](https://github.com/Hamlib/Hamlib/blob/master/doc/man1/rigctld.1)
- [DL2MAN: (tr)uSDX, CAT and streaming](https://dl2man.de/5-trusdx-details/)
- [QRP Labs: QMX+ and CAT manual](https://qrp-labs.com/qmxp.html)

The FTX-1/SPA-1 datasheet records which evidence comes from Hamlib and which
primary/hardware check is still pending.
