# Logbook y digitales WSJT-X

El logbook local usa SQLite, alta de QSO por rol y exportación ADIF. No hay sincronización ni importación automática. Revisa indicativo, hora, frecuencia y modo antes de guardar.

El agente recibe estado/decodes UDP pasivos de una instancia WSJT-X identificada. El UDP local no está autenticado ni es apto para autorizar control. WSJT-X se instala aparte; no se ha integrado su motor TX ni audio digital.

1. Configura el puerto UDP e ID exactos de WSJT-X en el agente.
2. No expongas UDP a Internet ni uses una decodificación como permiso para transmitir.
3. Guarda el QSO de forma explícita y exporta ADIF para tu registro externo.
4. La descarga de archivos en cada cliente móvil requiere aceptación nativa.

[Referencia técnica (ES)](../../logbook.md)
