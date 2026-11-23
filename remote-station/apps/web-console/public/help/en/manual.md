# Bricohams Radio Workspace - Remote Station help

User guide for available software. Experimental does not mean hardware validated. The radio physically connects to the agent; the client connects to the host.


<a id="installation"></a>

## Installation and architecture

The coordinator host serves the HTML5/JavaScript console and authorizes access. The headless agent runs beside the radio on Windows, Linux, macOS or Raspberry Pi with compatible Python. Its ZIPAPP has no graphical interface and does not need Node.js at runtime.

Install Python 3.12 or later and the released agent/host. Audio requires the sounddevice extra and PortAudio where applicable. The APK is debug; iOS requires macOS/Xcode. Physical and multiplatform acceptance is not claimed.

1. Connect the radio by USB or its documented serial interface to the agent computer.
2. Configure distinct role tokens and a separate host→remote-agent link secret.
3. Start the explicitly configured agent, then the host, and open the console.
4. Keep the agent, operating system and dependencies updated.

<a id="connection"></a>

## Connection and authentication

The web console uses its own host. Android/iOS require the host HTTPS URL without credentials, path or query parameters. The access token stays only in memory; it is not saved to files, cookies or local storage.

Admin and operator can use authorized controls; listeners receive RX audio and permitted data, not PTT. Guests have restricted access. A connected session does not prove a physical radio is connected.

1. Enter the HTTPS host when requested and paste your role token.
2. Select Connect and review permission and agent-availability notices.
3. Configure trusted CA/hostname and allowed client origins; never ignore a certificate error.
4. Disconnect before changing the host or credentials.

<a id="configuration"></a>

## Agent, host and USB/CAT configuration

The Configuration screen prepares local commands; it does not execute them, install drivers or open ports. Choose model, port and baud explicitly. Inventory does not automatically identify the CAT port.

Without CAT opt-in, the agent only enumerates devices. The wizard does not enable PTT, ATU, VOX, RTS or DTR. USB drivers may pulse control lines when opening: validate the physical installation and retain a local stop.

Host setup requires a TLS certificate/key, agent HTTPS URL and trusted CA. The mTLS client certificate/key are an optional pair; allowed origins are explicit. Set distinct BRICOHAM_ADMIN_TOKEN and BRICOHAM_STATION_AGENT_TOKEN in the local environment, never URLs or shared commands. Configure the same link secret in the agent as described in the deployment guide.

1. Choose the agent operating system and a serial model profile, not a network family primitive.
2. Identify the port using interface/manufacturer and documentation; never automatically select the first COM or ttyUSB.
3. Enter baud and stop bits matching the radio configuration.
4. Copy the generated command to the agent machine. Remote listening additionally requires TLS certificate/key and host configuration.
5. Install the host wheel; prepare and copy its command to the coordinator machine. Verify certificates, hostname and secrets before connecting.
6. For mobile clients allow only their exact origins, for example https://localhost and capacitor://localhost, comma separated.
7. Power/PTT/audio limits and opt-ins require the documented local administrative files.

<a id="cat"></a>

## Radios, features and compatibility

The catalogue distinguishes candidates, query profiles, family syntax and hardware verification. A CAT profile does not establish every feature, firmware, USB interface or amplifier. No radios are tested in this environment.

FTX-1 has experimental FA/FB MAIN/SUB, MD0/MD1 and PC setpoint controls with opt-ins/readback. MAIN/SUB does not automatically select the transmitter. No separate SPA-1 interface is invented. Native spectrum/waterfall remains unsupported, not replaced by an SDR or hidden simulation.

1. Inspect Protocols and candidate radios for the exact profile and queries.
2. Read state before changing frequency, mode or power.
3. On errors, TX/ATU or unconfirmed responses, request RX and read again; never retry TX.
4. Consult the technical matrix and manufacturer documentation for the model and firmware.

<a id="audio"></a>

## RX audio and remote microphone

RX uses an explicit agent input and client AudioWorklet. TX uses a real microphone, mono PCM16LE at 48 kHz and authenticated host→agent WebSocket. This is neither WebRTC nor WSJT-X digital audio.

For TX select the DAC index, exact name and channel, configure the radio USB input locally and disable VOX. The DAC stays muted until confirmed PTT. There is no fallback to the radio local microphone when an audio session is required.

1. Select Listen RX to receive and grant only necessary permissions.
2. For voice, inspect PTT, confirm RX and select Prepare remote microphone.
3. Wait for the prepared channel, enable the session checkbox and hold PTT.
4. Release requests RX; Disconnect microphone releases tracks. Focus/channel loss, stale audio or congestion end the session.
5. Levels, USB routes and native mobile capture/playback require physical acceptance.

<a id="safety"></a>

## PTT, limits and RF safety

Experimental FTX-1 PTT is off by default and can emit real RF. It requires MAIN simplex VFO LSB/USB, no split or TX clarifier, and local frequency, PC setpoint and duration limits. CAT power is a setpoint, not measured RF.

The exclusive CAT lease lasts two seconds, renews while held and has an absolute ceiling. Unconfirmed STOP blocks new START and retries RX. Software cannot resolve disconnected USB, process failure, local VOX/PTT or every attack.

1. Use STOP TX / confirm RX before the first START.
2. Operate only with authorization, band limits and local RF protections.
3. Keep a physical stop independent of USB and access to the station operator.
4. Do not expose CAT, rotctld or WSJT-X UDP ports; use TLS, firewall and separate secrets.
5. Virtual CW and active digital TX are not implemented; no demonstration buttons substitute for them.

<a id="accessories"></a>

## Rotors, tuners and power

The rotctld rotor uses position, target, mechanical limits, lease and STOP. It connects through loopback and does not authenticate local processes. An unconfirmed stop blocks movement.

IC-7300 provides CAT RF PWR and ATU insert/bypass under local permissions/limits. FTX-1 PC limits field/SPA-1 setpoints. Automatic tuning and generic amplifier/tuner control are not offered. The accessories layer supervises tuner and amplifier: the amplifier starts in STANDBY and returns to STANDBY on disconnect, high SWR, fault or emergency stop; tuning starts only on explicit request at 10 W or less, and devices without a documented protocol are listed as pendiente de fuente.

1. Configure the agent rotor with physical limits and independent stop.
2. Read position before movement and keep STOP accessible.
3. Read power/tuner state before adjustment; respect model-specific units.
4. Do not confuse ATU insertion with TUNE, or power setpoint with a meter.

<a id="logs-digital"></a>

## Logbook and WSJT-X digital modes

The local logbook uses SQLite, role-authorized QSO creation and ADIF export. Synchronization and automatic import are not implemented. Check callsign, time, frequency and mode before saving.

The agent receives passive UDP status/decodes from an identified WSJT-X instance. Local UDP is unauthenticated and unsuitable for authorizing control. WSJT-X is installed separately; its TX engine and digital audio are not integrated.

1. Configure the exact WSJT-X UDP port and instance ID in the agent.
2. Never expose UDP to the Internet or treat a decode as permission to transmit.
3. Save the QSO explicitly and export ADIF for an external log.
4. Mobile file downloads require native acceptance.

<a id="mobile"></a>

## Android, tablet, iPhone and iPad

Clients share the responsive console and implemented controls. Android requests microphone permission when preparing audio, not on entry. iOS includes a microphone usage description.

The debug APK is built, not production-signed or tablet-tested. iPhone/iPad projects are prepared without a verified IPA. The standalone Android USB OTG station agent is not implemented yet.

1. Use a device-trusted certificate and allow the native client origin on the host.
2. Keep the app foregrounded during PTT; hiding/closing requests RX and releases the microphone.
3. If a permission dialog cancels preparation, repeat the gesture after granting permission; TX is never retried.
4. Validate lifecycle, audio and ADIF download before final acceptance.

<a id="troubleshooting"></a>

## Diagnostics and troubleshooting

401 means missing/invalid token; 403 forbidden role/origin; 409 busy resource or unconfirmed session; 503/502 unavailable agent, configuration or link. Inspect the specific code and logs without sharing secrets.

CAT busy during PTT is deliberate. Use the physical stop if RX is unconfirmed. A renamed DAC, stale audio, unsupported sample rate or denied permission blocks audio instead of silently selecting another device.

1. Inspect host/agent /healthz and certificates, hostname and clock.
2. Check USB cable/driver, explicit port, baud and whether another application owns CAT.
3. Review tokens, roles and origins without placing secrets in URLs, screenshots or tickets.
4. Check PortAudio/sounddevice, DAC name/channel, VOX off and microphone permission.
5. Distinguish demonstration from real telemetry and preserve original errors; never report success after uncertain STOP.
