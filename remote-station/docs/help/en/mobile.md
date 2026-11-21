# Android, tablet, iPhone and iPad

Clients share the responsive console and implemented controls. Android requests microphone permission when preparing audio, not on entry. iOS includes a microphone usage description.

The debug APK is built, not production-signed or tablet-tested. iPhone/iPad projects are prepared without a verified IPA. The standalone Android USB OTG station agent is not implemented yet.

1. Use a device-trusted certificate and allow the native client origin on the host.
2. Keep the app foregrounded during PTT; hiding/closing requests RX and releases the microphone.
3. If a permission dialog cancels preparation, repeat the gesture after granting permission; TX is never retried.
4. Validate lifecycle, audio and ADIF download before final acceptance.

[Technical reference (ES)](../../clientes-moviles.md)
