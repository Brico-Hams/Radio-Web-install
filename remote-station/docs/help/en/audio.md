# RX audio and remote microphone

RX uses an explicit agent input and client AudioWorklet. TX uses a real microphone, mono PCM16LE at 48 kHz and authenticated host→agent WebSocket. This is neither WebRTC nor WSJT-X digital audio.

For TX select the DAC index, exact name and channel, configure the radio USB input locally and disable VOX. The DAC stays muted until confirmed PTT. There is no fallback to the radio local microphone when an audio session is required.

1. Select Listen RX to receive and grant only necessary permissions.
2. For voice, inspect PTT, confirm RX and select Prepare remote microphone.
3. Wait for the prepared channel, enable the session checkbox and hold PTT.
4. Release requests RX; Disconnect microphone releases tracks. Focus/channel loss, stale audio or congestion end the session.
5. Levels, USB routes and native mobile capture/playback require physical acceptance.

[Technical reference (ES)](../../audio-tx.md)
