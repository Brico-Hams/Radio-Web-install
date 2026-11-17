# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Unreleased]

### Adicionado
- Executável portátil `dist/FTX1CAT.exe` para Windows 10/11 x64, com instruções
  de instalação, compatibilidade e verificação SHA-256 no README.
- Menu de contexto na aba Memories com Cut, Copy, Paste e Clear para mover ou
  copiar dados entre linhas localmente. Clear confirma a ação e informa que o
  rádio não oferece um comando CAT de apagamento de memória.
- Botão **SET TO VFO** na aba Memories: aplica ao VFO a frequência e o modo
  do canal selecionado, incluindo edições locais ainda não gravadas.

## [0.3.0] — 2026-10-28

Baseado no "FTX-1 CAT Operation Reference Manual" rev. 2507-B (texto em
`docs/manuals/`). Testado contra o simulador; validar com o rádio antes de
publicar.

### Adicionado
- **Auto Information (`AI1;`)**: o rádio passa a avisar sozinho quando
  frequência, modo ou estado mudam; o display acompanha o dial físico na hora
  e o log não é mais inundado por `FA;`. Se o rádio recusar, o app volta ao
  polling (indicador LIVE/POLL na faixa de status).
- **Faixa de status** com indicadores do quadro `RI` (RX/TX/TX INHIBIT,
  HI-SWR, BUSY, TUNE, SCAN), **S-meter** em recepção e **PO/SWR/ALC** em
  transmissão (`SM`/`RM`, valores brutos 0-255).
- **RF POWER respeita o hardware**: lê o P1 do comando `PC` (1 = field head
  5-10 W, 2 = SPA-1 5-100 W) e ajusta a faixa do slider e o comando de
  escrita; antes era fixo em `PC2`.
- **Aba Memories**: lê uma faixa de canais (`MR`/`MT`), edita frequência,
  modo, etiqueta, shift e tipo de SQL, grava com diff e confirmação
  (`MW`/`MT`), chama o canal (`VM`/`MC`), "Store VFO here", exporta e
  importa **CSV**.
- Identificação mostra a versão de todos os CPUs (`VE0..5`).
- `IF;` substitui `FA;` + `MD0;` nas leituras de sintonia; o display indica
  o canal de memória quando o rádio está em modo memória.
- Simulador: `turn_dial()`, `change_mode()`, `set_tx()`, `set_smeter()`,
  memórias e `head` (field head / SPA-1) para testar sem rádio.
- 17 testes novos (71 no total): quadros espontâneos, fallback de polling,
  medidores, potência por hardware, memórias e CSV.

### Alterado
- Leitura periódica virou um "tick" de 250 ms que recolhe quadros AI e lê
  `RI` + medidores (sem AI, também `IF` a cada 600 ms).

## [0.2.0] — 2026-10-28

The v0.2 refactor included contributions from [@machadouglas](https://github.com/machadouglas).

### Adicionado
- **Modo simulador** (`python -m ftx1cat --simulate`): rádio falso embutido
  (`ftx1cat/cat/simulator.py`) que responde a todos os comandos usados pelo app.
- **Testes automatizados** (`pytest`, 54 testes): tabela do menu, comandos CAT,
  transporte serial, fila de trabalhos e um smoke test completo da interface
  rodando contra o simulador (conectar, banda, modo, sliders, dial, menu,
  backup/restore). Rodam sem rádio, inclusive na CI (GitHub Actions, Windows e
  Linux, Python 3.8 e 3.12).
- **Configurações persistentes**: última porta, taxa, tamanho da janela,
  "Read when opening a group", "Show commands" e o parâmetro FUNC selecionado
  (`%APPDATA%\FTX1CAT\settings.json`).
- **Arquivo de log rotativo** (`ftx1cat.log`, na mesma pasta); `--debug` inclui
  o tráfego CAT. Botões **Copy** e **Clear** no log da interface.
- Opções de linha de comando `--port`, `--baud`, `--debug`, `--version`.
- Detecção de comandos **recusados pelo rádio** (`?;`): leitura mostra
  "Rejected (?)" na hora; escrita recusada vira erro em vez de passar
  despercebida.
- Itens do menu editados e ainda não gravados ficam marcados como
  **"Changed (not written)"**.
- Botão **Stop** sempre visível na barra superior (habilitado só enquanto há
  trabalho em andamento).
- `AGENTS.md` / `CLAUDE.md` com as regras do projeto para assistentes de IA e
  contribuidores; `pyproject.toml`, `ruff`, `.editorconfig`.
- `docs/AVALIACAO.md`: avaliação técnica da v0.1 e roteiro de evolução.

### Alterado
- Código reorganizado no pacote `ftx1cat/`: protocolo CAT em `ftx1cat/cat`
  (menu, comandos, transporte, simulador) e interface em `ftx1cat/ui`
  (janela, abas, worker, settings, widgets). `ftx1_cat_menu.py` virou só um
  atalho de compatibilidade.
- Toda a comunicação serial passou para **uma fila com thread única**
  (`ui/worker.py`), substituindo a flag `busy` e as cinco listas de pendências.
  Jobs com a mesma chave (ex.: o mesmo slider) são agrupados: só o último
  valor é enviado.
- Tabela de modos, bandas, controles rápidos e parâmetros FUNC centralizada em
  `ftx1cat/cat/commands.py` (antes duplicada em três pontos da interface).
- Layout da aba Quick Controls: botões de modo em uma linha própria (antes
  eram cortados à direita), página rolável em telas pequenas, divisor
  arrastável entre as abas e o log.
- A leitura periódica da frequência não polui mais o log de TX/RX.
- Busca no menu: limpar o campo volta a mostrar a lista vazia em vez de manter
  o último resultado.

### Corrigido
- Indicador de progresso do **Restore** só era atualizado no fim da comparação
  (chamada fora do laço).
- Variável Tk (`Show commands`) era lida a partir da thread serial.
- Resposta `?;` do rádio era descartada até o timeout (0,8 s por item) em vez
  de ser tratada como erro.
- Função `_quick_popup` e a tabela de modos duplicada (código morto) removidas.

## [0.1.0] — versão Alpha original

- Aplicativo inicial: conexão CAT, sintonia, bandas, modos, CH-STEP, controles
  rápidos, parâmetros FUNC, menu CAT completo com backup/restore e log.
