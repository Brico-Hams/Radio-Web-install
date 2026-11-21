# Instalação e arquitetura

O host coordenador disponibiliza a consola HTML5/JavaScript e autoriza acessos. O agente sem interface gráfica funciona junto do rádio em Windows, Linux, macOS ou Raspberry Pi com Python compatível. O ZIPAPP não precisa de Node.js para executar.

Instale Python 3.12 ou superior e agente/host distribuídos. Áudio requer sounddevice e PortAudio quando aplicável. O APK é debug; iOS requer macOS/Xcode. Não se declara validação física ou multiplataforma.

1. Ligue o rádio por USB ou interface série documentada ao computador do agente.
2. Configure tokens distintos por função e um segredo separado no enlace host→agente remoto.
3. Inicie o agente explicitamente configurado, depois o host e a consola.
4. Mantenha agente, sistema operativo e dependências atualizados.

[Referência técnica (ES)](../../instalacion.md)
