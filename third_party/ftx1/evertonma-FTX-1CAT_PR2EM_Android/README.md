# FTX-1 CAT Mobile — PR2EM

![Status: 0.1a Alpha](https://img.shields.io/badge/status-0.1a%20alpha-orange)
![Platform: Android](https://img.shields.io/badge/platform-Android-green)
![License: PolyForm Noncommercial](https://img.shields.io/badge/license-PolyForm%20Noncommercial-blueviolet)

[Baixar APK 0.1a](https://github.com/evertonma/FTX-1CAT_PR2EM_Android/releases/download/v0.1a/app-debug.apk)

> Aplicativo Android experimental para controlar algumas funções e parâmetros do transceptor Yaesu FTX-1 pela interface CAT usando USB OTG.
>
> **Versão 0.1a — Alfa, em testes.** Esta versão é fornecida sem garantias. O uso é por conta e risco do usuário. Leia [Aviso e limitações](DISCLAIMER.md) antes de conectar o aparelho ao rádio.

## Idiomas

- [Português](#português)
- [English](#english)

## Português

### Estado do projeto

Esta é uma versão alfa destinada a testes. O app foi instalado e iniciado em um Samsung Galaxy A36; a validação completa de todos os comandos, combinações de firmware, interfaces USB e efeitos de cada parâmetro no rádio ainda está em andamento. Não use este programa como ferramenta de operação crítica.

### Funcionalidades disponíveis

- Comunicação serial USB Host/OTG, com solicitação da permissão USB pelo Android.
- Comunicação CAT-1 a 38400 bps, formato 8N1.
- Leitura e acompanhamento da frequência e do modo MAIN.
- Entrada direta de frequência e sintonia pelo dial na tela, com seleção de CH-STEP.
- Botões de seleção de banda; preset de 11 m em **27,555 MHz USB**.
- Seleção dos modos MAIN implementados pelo FTX-1.
- Ajustes rápidos de RF POWER (SPA-1), D-LEVEL, NB e DNR.
- Leitura e gravação manual de parâmetros EX pelo código CAT.
- Compilação Android Debug automatizada pelo GitHub Actions; o APK fica disponível como artefato da execução e, nas versões marcadas com tag `v*`, como download na aba **Releases**.

### Requisitos

- Android 8.0 (API 26) ou mais recente, com USB Host/OTG.
- Yaesu FTX-1 ligado e conectado por cabo USB de dados/OTG.
- CAT-1 do rádio configurado para 38400 bps.
- Android Studio com JDK 17 para compilar o projeto.

O Galaxy A36 foi usado no desenvolvimento. Outros aparelhos Android com USB Host podem funcionar, mas não foram todos testados.

### Instalação e execução

Para compilar no Android Studio:

1. Clone ou baixe este repositório e abra a pasta do projeto no Android Studio.
2. Aguarde a sincronização do Gradle.
3. Para instalar diretamente, conecte o aparelho Android com depuração USB autorizada, selecione-o no menu de dispositivos e use **Run > Run 'app'**.
4. Para criar um APK de depuração, use **Build > Generate App Bundles or APKs > Build APK(s)**. O arquivo será criado em `app/build/outputs/apk/debug/app-debug.apk`.

Também é possível compilar pelo terminal, com JDK 17:

```powershell
.\gradlew assembleDebug
```

### Conexão com o FTX-1

1. Ligue o rádio e conecte-o ao aparelho com um cabo USB de dados compatível com OTG.
2. Abra o aplicativo, escolha a interface serial CAT-1 correspondente e toque em **CONECTAR**.
3. Autorize o acesso USB quando o Android solicitar.

O FTX-1 apresenta mais de uma interface serial USB. A enumeração, a descrição e a ordem podem variar; confirme a interface CAT-1 antes de operar. Feche outros programas que possam estar usando a conexão serial.

### Ajustes do menu CAT avançado

O menu avançado permite informar um código EX, ler o valor atual e enviar um valor no formato descrito no manual CAT. Os códigos, comprimentos e formatos variam por item. Consulte o [manual CAT do FTX-1](https://www.yaesu.com/Files/4CB1CAF6-1018-01AF-FABABCA11697FC7F/FTX-1_CAT_OM_ENG_2507-B.pdf) antes de gravar parâmetros.

### Limitações conhecidas

- Não implementa PTT nem comandos de transmissão.
- RF POWER controla o SPA-1.
- A compatibilidade CAT pode variar conforme firmware, cabo, adaptador e aparelho Android.
- Parâmetros EX exigem conhecimento do código e formato indicados no manual; ainda não há catálogo pesquisável integrado.
- Esta versão não substitui os controles físicos nem os procedimentos do manual do fabricante.

### Compilação automatizada

O GitHub Actions executa `assembleDebug` em pushes para `main`, pull requests e execuções manuais. O APK de depuração fica como artefato da execução. Ao enviar uma tag no formato `v*` (por exemplo, `v0.1a`), o workflow também cria uma GitHub Release e anexa `app-debug.apk`. É uma build de depuração para testes, não um APK assinado para distribuição de produção.

### Licença

O código deste projeto é disponibilizado sob a **PolyForm Noncommercial License 1.0.0**. O uso comercial não é permitido sem autorização separada do titular. Veja [LICENSE](LICENSE). A dependência USB serial tem licença própria, indicada em [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

### Créditos

Desenvolvido por **Everton Machado — PR2EM**, com assistência de **OpenAI Codex**. O aplicativo não chama serviços de IA em tempo de execução.

## English

### Project status

This is an experimental alpha release for testing. The app has been installed and launched on a Samsung Galaxy A36; complete validation of every CAT command, firmware combination, USB interface, and radio parameter effect is still in progress. Do not rely on this software for safety-critical operation.

### Features

- Android USB Host/OTG serial communication with Android USB permission handling.
- CAT-1 communication at 38400 bps, 8N1.
- MAIN frequency and mode reading and tracking.
- Direct frequency entry and on-screen tuning dial with CH-STEP selection.
- Band selection buttons, including an 11 m preset at **27.555 MHz USB**.
- Available FTX-1 MAIN operating modes.
- Quick controls for RF POWER (SPA-1), D-LEVEL, NB, and DNR.
- Manual reading and writing of EX parameters by CAT code.
- GitHub Actions builds a debug APK and uploads it as a workflow artifact. Version tags matching `v*` also create a GitHub Release with the APK attached.

### Requirements and installation

Requires Android 8.0 (API 26) or later with USB Host/OTG, a powered Yaesu FTX-1, a USB data/OTG cable, and CAT-1 set to 38400 bps. JDK 17 and Android Studio are required to build from source.

Open this project in Android Studio, wait for Gradle sync, select an authorized Android device, and choose **Run > Run 'app'**. To build a debug APK, choose **Build > Generate App Bundles or APKs > Build APK(s)**. The APK path is `app/build/outputs/apk/debug/app-debug.apk`. From PowerShell, run `.\gradlew assembleDebug`.

The Galaxy A36 was used during development. Other USB Host capable Android devices may work but have not all been tested. See the Portuguese instructions above for connection details and known limitations.

### License and disclaimer

The app is licensed under the **PolyForm Noncommercial License 1.0.0**. Commercial use requires separate permission. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). This alpha software is provided **AS IS**, without warranties or guarantees; use is at your own risk. See [DISCLAIMER.md](DISCLAIMER.md).

### Credits

Developed by **Everton Machado — PR2EM**, with assistance from **OpenAI Codex**. The app does not call AI services at runtime.
