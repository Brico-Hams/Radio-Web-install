# Connection and authentication

The web console uses its own host. Android/iOS require the host HTTPS URL without credentials, path or query parameters. The access token stays only in memory; it is not saved to files, cookies or local storage.

Admin and operator can use authorized controls; listeners receive RX audio and permitted data, not PTT. Guests have restricted access. A connected session does not prove a physical radio is connected.

1. Enter the HTTPS host when requested and paste your role token.
2. Select Connect and review permission and agent-availability notices.
3. Configure trusted CA/hostname and allowed client origins; never ignore a certificate error.
4. Disconnect before changing the host or credentials.

[Technical reference (ES)](../../despliegue-seguro.md)
