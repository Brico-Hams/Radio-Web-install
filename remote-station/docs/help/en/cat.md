# Radios, features and compatibility

The catalogue distinguishes candidates, query profiles, family syntax and hardware verification. A CAT profile does not establish every feature, firmware, USB interface or amplifier. No radios are tested in this environment.

FTX-1 has experimental FA/FB MAIN/SUB, MD0/MD1 and PC setpoint controls with opt-ins/readback. MAIN/SUB does not automatically select the transmitter. No separate SPA-1 interface is invented. Native spectrum/waterfall remains unsupported, not replaced by an SDR or hidden simulation.

1. Inspect Protocols and candidate radios for the exact profile and queries.
2. Read state before changing frequency, mode or power.
3. On errors, TX/ATU or unconfirmed responses, request RX and read again; never retry TX.
4. Consult the technical matrix and manufacturer documentation for the model and firmware.

[Technical reference (ES)](../../compatibilidad.md)
