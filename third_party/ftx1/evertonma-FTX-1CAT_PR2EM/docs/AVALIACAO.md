# Avaliação técnica do projeto FTX-1 CAT Menu (v0.1 → v0.2)

Avaliação feita em 28/10/2026 sobre o repositório `evertonma/FTX-1CAT_PR2EM`
(commit `fec6fe9`), seguida das mudanças aplicadas na v0.2 e de um roteiro de
evolução.

## 1. O que o projeto faz

Aplicativo desktop em Python/Tkinter que controla o transceptor Yaesu FTX-1
pela porta serial CAT (USB → CP2105 "Enhanced COM Port", 38400 bps):

- **Quick Controls**: frequência MAIN (display, dial por scroll, entrada
  abreviada), 16 botões de banda via Band Stack, 17 modos, CH-STEP por modo,
  sliders de RF POWER, D-LEVEL, D-PEAK, NB, DNR e 13 parâmetros do botão FUNC.
- **CAT Menu**: os ~400 itens do menu `EX` do rádio (Tabela 3 do manual CAT)
  com busca, leitura/gravação individual ou em lote e backup/restore em JSON
  (compara antes de gravar e pula itens que mudam a própria porta CAT).
- Log de operações com opção de mostrar o tráfego TX/RX.

## 2. Pontos fortes da v0.1

Para um primeiro projeto feito por "vibe coding", a base é bem acima da média:

1. **Separação dados/transporte vs. interface** já existia: `ftx1_menu.py`
   tinha a tabela do menu e a classe `Radio`; `ftx1_cat_menu.py` a UI.
2. **A tabela do menu é um mini-DSL muito bom**: `en()/nu()/sg()/ro()/tx()`
   geram `Item`s com `encode/decode/norm/pretty`, validação de faixa, passo e
   dígitos, e blocos repetidos (`_audio()`, `_cuts()`, `_eq()`) evitam copiar
   centenas de linhas. Ambiguidades do manual viraram itens somente leitura
   com o texto original em `hint` — decisão conservadora e correta.
3. **Cuidados de hardware**: DTR/RTS desligados antes de abrir a porta (o
   manual avisa que podem acionar o PTT); itens "arriscados" (CAT RATE, TUN/LIN
   PORT) exigem aviso e são pulados no restore; toda gravação relê e compara.
4. **Threads certas**: serial em thread de fundo, resultados voltam à thread
   Tk por uma `queue` drenada com `after()` — padrão correto para Tkinter.
5. **UX pensada**: entrada abreviada de frequência com máscara, 11 m tratado
   como exceção documentada, slider CH-STEP que muda de escala conforme o
   modo, "Stop" para operações longas, README bilíngue completo.

## 3. Problemas encontrados

### Estrutura
- `App` com ~1.500 linhas misturando protocolo e interface: strings CAT
  (`"FA{...};"`, `"MD0{mode};"`, `"PC2..."`) espalhadas por handlers de botão.
- Tabela de modos duplicada em três lugares (`_mode_name`, `mode_options`,
  `_ch_step_for_mode`); `_vox_delay_label` e `_bk_delay_label` idênticas;
  `_quick_popup` e `_refresh_ch_step_choices` (código morto, e o segundo
  chamava a serial na thread Tk).
- Controle de concorrência por flag `busy` + cinco listas de "pendentes"
  (`pending_tune`, `pending_slider_updates`, `pending_func_parameter_read`,
  `pending_band_selection`, `tune_retry_scheduled`) e retries por `after()`.
  Funciona, mas é frágil e difícil de raciocinar.
- Zero testes e nenhuma forma de rodar sem o rádio — cada mudança exigia
  o FTX-1 ligado para validar.
- Sem `pyproject`, sem lint, sem CI, sem regras para o assistente de IA.

### Bugs
- `restore`: `self.progress(...)` estava fora do laço (indentação) — o
  contador só aparecia no fim.
- Resposta `?;` do rádio (comando/valor recusado) era descartada por não
  começar com o prefixo esperado; cada item inexistente custava o timeout
  inteiro (0,8 s) e aparecia como "No response". Em escritas a recusa sumia.
- `self.cat_var.get()` (variável Tk) lido a partir da thread serial.
- Linha de sintonia mais larga que a janela: os botões de modo à direita
  ficavam cortados (visível no próprio screenshot do README: "RTTY-", "DATA-I").
- Limpar a busca não restaurava a lista.

### Dúvidas que só o rádio responde (não alteradas)
- `PC2xxx` assume o amplificador SPA-1 em RF POWER; sem o SPA-1 o field head
  limita a 10 W (`PC1`). Vale um seletor ou detecção.
- Formato do quadro `DA` (contraste/dimmer nos dígitos 2-3 e 4-5) foi
  mantido como na v0.1 — confirmar no manual.
- Entrada `14250` vira 142.500.000 Hz (cai na faixa de RX) e não 14.250 MHz;
  talvez preferir bandas de amador quando houver ambiguidade.

## 4. O que mudou na v0.2

| Área | v0.1 | v0.2 |
| --- | --- | --- |
| Organização | 2 arquivos, `App` monolítico | pacote `ftx1cat/` com `cat/` (protocolo) e `ui/` (interface), 11 módulos pequenos |
| Protocolo | strings CAT na UI | `commands.py` concentra modos, bandas, controles, FUNC e builders/parsers; `transport.py` expõe `read_tuning`, `set_control`... |
| Concorrência | flag `busy` + pendências | `SerialWorker`: fila com thread única, coalescência por chave, `stop_event` |
| Sem rádio | impossível | `--simulate` com `FakeFTX1` |
| Testes | nenhum | 54 testes (unitários + smoke test da GUI sob Xvfb), CI Windows/Linux |
| Erros | `?;` ignorado | `CatRejected` imediato em leitura e escrita |
| Persistência | nenhuma | porta, baud, janela, opções (`settings.json`) |
| Log | só na tela | + arquivo rotativo, `--debug`, Copy/Clear |
| Layout | modos cortados, log oculto em 1366×768 | modos em linha própria, página rolável, divisor arrastável |
| Padrões | — | `AGENTS.md`, `pyproject.toml`, `ruff`, `.editorconfig`, `CHANGELOG.md` |

Compatibilidade: `python ftx1_cat_menu.py` continua funcionando; o formato de
backup (`ftx1-menu-backup-1`) é o mesmo. A interface foi mantida em inglês e o
comportamento dos comandos CAT não mudou — o que o Everton validou com o rádio
na v0.1 continua valendo.

**Importante:** a v0.2 foi testada só contra o simulador. Antes de publicar,
rodar com o rádio real os fluxos: conectar, mudar banda/modo, dial, sliders,
ler um grupo do menu, gravar um item, backup e restore.

## 5. Roteiro sugerido (próximas versões)

Ordenado por valor/esforço. Os itens marcados com 📖 dependem de confirmar o
comando no manual CAT antes de implementar (regra do `AGENTS.md`).

### Curto prazo
1. **Validar v0.2 com o rádio** e publicar como release no GitHub (tag `v0.2.0`).
2. **Executável para Windows** (PyInstaller, `--onefile --windowed`) gerado
   pela CI em cada release — a maioria dos radioamadores não quer instalar
   Python. Instalador opcional com Inno Setup.
3. **Seletor SPA-1 / field head** em RF POWER (`PC1` vs `PC2`) 📖.
4. **Interface em português** (opção `--lang pt` ou nas configurações):
   público principal é brasileiro. Centralizar os textos em um dicionário.
5. **Auto Information (`AI1;`)** 📖: em vez de perguntar `FA;` a cada 0,6 s,
   o rádio avisa quando algo muda — menos tráfego e display mais ágil.

### Médio prazo
6. **Medidores**: S-meter / potência / SWR / ALC (`RM`) 📖 numa barra na aba
   Quick Controls.
7. **VFO B / SUB** (`FB`, `MD1`), split, A=B 📖.
8. **Memórias do rádio** (`MC`, `MR`, `MW`) 📖: listar, nomear, exportar/importar.
9. **Backup legível**: exportar o JSON também como texto/CSV com os nomes e
   rótulos, e "Compare backup" sem gravar (diff visual).
10. **Perfis**: salvar/aplicar conjuntos de itens de menu (ex. "contest",
    "FT8", "portátil") — reaproveita o restore.

### Longo prazo
11. **Servidor rigctld-compatível** (Hamlib) ou controle via rede, para
    integrar com WSJT-X, Log4OM etc. sem disputar a porta serial.
12. **Macros / botões programáveis** com sequências CAT.
13. **Empacotar o protocolo** (`ftx1cat.cat`) como biblioteca independente no
    PyPI — outros projetos poderiam usar o simulador e a tabela do menu.

## 6. Como manter o padrão daqui em diante

- Antes de pedir uma funcionalidade à IA, apontar o `AGENTS.md` e dizer em que
  módulo ela entra (protocolo em `cat/`, tela em `ui/`).
- Pedir sempre: "adicione o comando ao simulador e escreva um teste".
- Rodar `ruff check` e `pytest` antes de cada commit; a CI repete isso.
- Uma funcionalidade por branch/PR, com linha no `CHANGELOG.md`.
