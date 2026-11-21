# Instalación y arquitectura

El host coordinador sirve la consola HTML5/JavaScript y controla el acceso. El agente headless se ejecuta junto a la radio en Windows, Linux, macOS o Raspberry Pi con Python compatible. El ZIPAPP no incluye una interfaz gráfica ni exige Node.js para ejecutarlo.

Instala Python 3.12 o posterior y el agente/host publicados. El audio necesita el extra sounddevice y PortAudio cuando corresponda. El APK disponible es debug; iOS requiere macOS/Xcode. No se declara aceptación física o multiplataforma.

1. Conecta la radio por USB o su interfaz serie documentada al equipo del agente.
2. Configura tokens distintos para los roles y un secreto distinto para el enlace host→agente remoto.
3. Inicia el agente con la configuración local explícita, después el host, y abre la consola.
4. Mantén el agente, sistema operativo y dependencias actualizados.

[Referencia técnica (ES)](../../instalacion.md)
