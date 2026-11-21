# PTT, limits and RF safety

Experimental FTX-1 PTT is off by default and can emit real RF. It requires MAIN simplex VFO LSB/USB, no split or TX clarifier, and local frequency, PC setpoint and duration limits. CAT power is a setpoint, not measured RF.

The exclusive CAT lease lasts two seconds, renews while held and has an absolute ceiling. Unconfirmed STOP blocks new START and retries RX. Software cannot resolve disconnected USB, process failure, local VOX/PTT or every attack.

1. Use STOP TX / confirm RX before the first START.
2. Operate only with authorization, band limits and local RF protections.
3. Keep a physical stop independent of USB and access to the station operator.
4. Do not expose CAT, rotctld or WSJT-X UDP ports; use TLS, firewall and separate secrets.
5. Virtual CW and active digital TX are not implemented; no demonstration buttons substitute for them.

[Technical reference (ES)](../../ptt-ftx1.md)
