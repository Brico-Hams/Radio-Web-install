# PTT, límites y seguridad RF

PTT FTX-1 es experimental, desactivado por defecto y puede emitir RF real. Solo MAIN VFO simplex LSB/USB, sin split ni clarificador TX, con límites locales de frecuencia, consigna PC y tiempo. La potencia CAT es consigna, no potencia RF medida.

La sesión exclusiva CAT dura dos segundos, se renueva mientras se pulsa y tiene un techo absoluto. STOP incierto bloquea nuevos START y reintenta RX. La pérdida de USB, proceso, VOX o PTT local no queda resuelta por un watchdog de software. No existe garantía de invulnerabilidad.

1. Utiliza PARAR TX / confirmar RX antes del primer START.
2. Nunca operes sin autorización, límites de banda y protecciones RF locales.
3. Mantén una parada física independiente del USB y acceso al operador de estación.
4. No publiques puertos CAT, rotctld ni UDP WSJT-X; usa TLS, cortafuegos y secretos separados.
5. CW virtual y TX digital activo no están implementados; no son botones de demostración.

[Referencia técnica (ES)](../../ptt-ftx1.md)
