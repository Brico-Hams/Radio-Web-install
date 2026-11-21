# Installation and architecture

The coordinator host serves the HTML5/JavaScript console and authorizes access. The headless agent runs beside the radio on Windows, Linux, macOS or Raspberry Pi with compatible Python. Its ZIPAPP has no graphical interface and does not need Node.js at runtime.

Install Python 3.12 or later and the released agent/host. Audio requires the sounddevice extra and PortAudio where applicable. The APK is debug; iOS requires macOS/Xcode. Physical and multiplatform acceptance is not claimed.

1. Connect the radio by USB or its documented serial interface to the agent computer.
2. Configure distinct role tokens and a separate host→remote-agent link secret.
3. Start the explicitly configured agent, then the host, and open the console.
4. Keep the agent, operating system and dependencies updated.

[Technical reference (ES)](../../instalacion.md)
