# Rotores, acopladores y potencia

El rotor rotctld usa posición, objetivo, límites mecánicos, lease y STOP. Solo se conecta por loopback; no autentica procesos locales. Una parada sin confirmación bloquea movimientos.

IC-7300 permite RF PWR CAT e insertar/bypass ATU con permisos y límites locales. FTX-1 PC limita la consigna field/SPA-1. No se ofrece sintonía automática ni control genérico de cualquier amplificador/acoplador. La capa de accesorios supervisa acoplador y amplificador: el amplificador arranca en STANDBY y vuelve a STANDBY ante desconexión, ROE alta, fallo o parada de emergencia; la sintonía solo se inicia por orden explícita con 10 W o menos, y los dispositivos sin protocolo documentado figuran como pendiente de fuente.

1. Configura el rotor en el agente con límites físicos y parada independiente.
2. Consulta posición antes de mover y conserva STOP disponible.
3. Lee potencia/estado del acoplador antes de ajustar; respeta las unidades por modelo.
4. No confundas insertar ATU con ejecutar TUNE ni consigna de potencia con un medidor.

[Referencia técnica (ES)](../../control-potencia-acoplador.md)
