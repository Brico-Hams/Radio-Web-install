# Diagnostics and troubleshooting

401 means missing/invalid token; 403 forbidden role/origin; 409 busy resource or unconfirmed session; 503/502 unavailable agent, configuration or link. Inspect the specific code and logs without sharing secrets.

CAT busy during PTT is deliberate. Use the physical stop if RX is unconfirmed. A renamed DAC, stale audio, unsupported sample rate or denied permission blocks audio instead of silently selecting another device.

1. Inspect host/agent /healthz and certificates, hostname and clock.
2. Check USB cable/driver, explicit port, baud and whether another application owns CAT.
3. Review tokens, roles and origins without placing secrets in URLs, screenshots or tickets.
4. Check PortAudio/sounddevice, DAC name/channel, VOX off and microphone permission.
5. Distinguish demonstration from real telemetry and preserve original errors; never report success after uncertain STOP.

[Technical reference (ES)](../../diagnostico.md)
