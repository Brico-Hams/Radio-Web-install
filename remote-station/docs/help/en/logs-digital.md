# Logbook and WSJT-X digital modes

The local logbook uses SQLite, role-authorized QSO creation and ADIF export. Synchronization and automatic import are not implemented. Check callsign, time, frequency and mode before saving.

The agent receives passive UDP status/decodes from an identified WSJT-X instance. Local UDP is unauthenticated and unsuitable for authorizing control. WSJT-X is installed separately; its TX engine and digital audio are not integrated.

1. Configure the exact WSJT-X UDP port and instance ID in the agent.
2. Never expose UDP to the Internet or treat a decode as permission to transmit.
3. Save the QSO explicitly and export ADIF for an external log.
4. Mobile file downloads require native acceptance.

[Technical reference (ES)](../../logbook.md)
