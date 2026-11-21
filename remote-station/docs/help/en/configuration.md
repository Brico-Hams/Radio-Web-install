# Agent, host and USB/CAT configuration

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

[Technical reference (ES)](../../despliegue-seguro.md)
