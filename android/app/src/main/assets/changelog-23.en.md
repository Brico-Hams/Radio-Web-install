# What's new in 1.6.0

- Remote audio: a single talker at a time; speech processor and VOX are off by default.
- Transmit safety: orphan TX is stopped, the out-of-band inhibit is off by default and shutdown waits for the stop.
- ATAS tune: an unverified result is reported as such and the SWR trip also applies after the tuner ends.
- FlexRadio integration: items without a source stay disabled ("pendiente de fuente").
- Fixed the mTLS pairing status.
- Hardware results are limited to what docs/PRUEBAS-Y-RESULTADOS.md records.
