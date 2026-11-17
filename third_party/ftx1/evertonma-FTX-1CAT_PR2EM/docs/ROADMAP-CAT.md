# Cobertura dos comandos CAT e roteiro de implementação

Fonte: `docs/manuals/FTX-1_CAT_OM_ENG_2507-B.md` (CAT Operation Reference
Manual, rev. 2507-B — lista de comandos na p. 5, detalhes nas pp. 6-27) e
`docs/manuals/FTX-1_OM_ENG_EH084M201_2506E-DS.md` (Operation Manual, tabelas
de menu nas pp. 68-73). Todas as referências de página abaixo são do manual CAT.

## 1. Confirmações obtidas nos manuais (dúvidas da v0.2 resolvidas)

| Dúvida | Resposta do manual | Ação |
| --- | --- | --- |
| Formato do quadro `DA` | p. 9: `DA P1P1 P2P2 P3P3 P4P4;` — P1 = 00 fixo, P2 = contraste TFT 00-20, P3 = brilho TFT 00-20, P4 = brilho dos LEDs 00-20 | Código da v0.1/v0.2 está correto (`raw[2:4]` contraste, `raw[4:6]` dimmer). Dá para expor também o LED (`raw[6:8]`). |
| `PC1` vs `PC2` | p. 21: P1 = 1 → FTX-1 field head (005-010 W); P1 = 2 → SPA-1 (005-100 W). A resposta do rádio traz o P1 em uso | Em vez de fixar `PC2`, reaproveitar o P1 que o rádio devolve na leitura e limitar o slider à faixa correspondente (10 W ou 100 W). |
| `RPT SHIFT (144/430 MHz)` | CAT: "0 - 100 MHz (P4 = 0000 - 0100, 50 kHz/step)"; Operation Manual p. 71: "0.00 - 100 (MHz) (50kHz/step)" | Continua contraditório (100 MHz / 50 kHz = 2000 passos ≠ 0100). Manter somente leitura. |
| Defaults de fábrica | Operation Manual pp. 68-73 traz o default de cada item ("0 - **50** - 100") | Possível coluna "default" na tabela do menu → botão "Reset to default" e diff contra o padrão de fábrica. |

## 2. Comandos já usados pelo app (v0.3)

`ID`, `VE0..5`, `AI`, `IF`, `FA`, `MD0`, `BS0`, `EX` (menu), `RI`, `SM`,
`RM`, `PC` (com P1), `SS01/03/04` (peak, color, level do scope), `NL0`, `RL0`,
`MG`, `PL`, `AO`, `VG`, `VD`, `ML1`, `KS`, `KP`, `SD`, `DA`, `MR`, `MW`,
`MT`, `MC`, `VM`.

Feitos na v0.3: itens 1, 2, 3, 4, 5, 6 e 22 (memórias, sem PMS/QMB/split
memory). O MCP e o servidor rigctld (25) ficaram de fora por decisão do
projeto.

## 3. O que já dá para implementar (tudo documentado no manual)

Ordenado por valor para o operador ÷ esforço. "Infra" = mudança de base que
melhora o que já existe; os demais são funcionalidades novas.

### Nível 1 — pequenos, alto valor

| # | Funcionalidade | Comandos (página) | Observações |
| --- | --- | --- | --- |
| 1 | **Auto Information** no lugar do polling de `FA;` a cada 0,6 s | `AI1;` / `AI0;` (p. 6) | Rádio envia sozinho `FA`, `MD`, `IF`, `RM`... quando algo muda. O transporte precisa de um leitor contínuo que separe quadros espontâneos das respostas (hoje `query()` descarta quadros inesperados). Volta a `AI0;` ao desconectar; o rádio já zera ao desligar. **Infra.** |
| 2 | **`IF;` como leitura única de estado** | `IF` (p. 17) | Um quadro traz canal de memória, frequência, clarifier, modo, VFO/MEM/QMB, tipo de SQL e shift. Substitui `FA;` + `MD0;` nos jobs de sintonia; é o quadro que `AI` manda. **Infra.** |
| 3 | **Potência correta para field head / SPA-1** | `PC` (p. 21) | Decodificar P1 da resposta; slider 5-10 W ou 5-100 W. Mostrar qual está ativo. |
| 4 | **Medidores** (S-meter, PO, SWR, ALC, COMP, IDD, VDD) | `SM0;` (p. 24), `RM1..8;` (p. 23), `MS` (p. 20) para escolher o medidor do display | Barra na aba Quick Controls, atualizada por `AI` (RM é AI-capable) ou polling leve. Valores 000-255 brutos; a escala em S-units/W precisa de calibração empírica. |
| 5 | **Indicadores de estado**: TX/RX, Hi-SWR, SQL aberto, tuner sintonizando, scan, gravando | `RI0;` (p. 22) | Rótulos coloridos na barra superior. AI-capable. |
| 6 | **Versões de todos os CPUs** | `VE0..5;` (p. 26) | MAIN, DISPLAY, SDR, DSP, SPA-1, FC-80 — mostrar na identificação; "?;" ou vazio quando o opcional não existe. |
| 7 | **Sincronizar relógio do rádio com o PC** | `DT0yyyymmdd;` `DT1hhmmss;` (p. 9) | Botão "Set radio clock". Útil para FT8/APRS. |
| 8 | **Dial por `EO` (encoder offset)** | `EO` (p. 9) | `EO P1 P2 P3 P4 P5P5P5;` — lado, dial (MAIN/FUNC), ±, unidade (Hz/kHz/MHz), quantidade 000-999. Pode substituir o ler-somar-gravar do dial na tela e respeitar o passo do rádio. Testar no rádio primeiro. |
| 9 | **Band Up/Down, Mic Up/Down, canal Up/Down** | `BU0;` `BD0;` (p. 7), `UP;` `DN;` (pp. 9, 26), `CH0/1;` (p. 8) | Botões simples. |
| 10 | **Lock, Fine tuning, Zero-in** | `LK` (p. 18), `FN` (p. 16), `ZI0;` (p. 27) | Toggles. |

### Nível 2 — painéis novos na aba Quick Controls (ou nova aba "Operate")

| # | Painel | Comandos (página) |
| --- | --- | --- |
| 11 | **Receptor**: AF gain, RF gain, squelch, AGC, IPO/AMP1/AMP2, atenuador, pré-amp V/U | `AG0` (p. 6), `RG0` (p. 22), `SQ0` (p. 24), `GT0` (p. 17), `PA` (p. 21), `RA0` (p. 22) |
| 12 | **DSP/filtro**: width (Tabela 5), narrow, IF shift, notch manual, DNF, contour/APF | `SH0` + Tabela 5 (p. 24), `NA0` (p. 20), `IS0` (p. 17), `BP0` (p. 7), `BC0` (p. 7), `CO0` (p. 8) |
| 13 | **TX áudio / VOX / processador**: já há MG, PL, AO, VG, VD, ML; faltam VOX on/off, processador on/off, EQ paramétrico on/off, monitor on/off, medidor do display | `VX` (p. 26), `PR` (p. 22), `ML0` (p. 19), `MS` (p. 20) |
| 14 | **CW**: keyer on/off, break-in, spot, memórias 1-5 (texto até 50 caracteres) e **botões de tocar memória** | `KR` (p. 18), `BI` (p. 7), `CS` (p. 9), `KM1..5` (p. 17), `KY` (p. 18) |
| 15 | **FM/repetidora**: tipo de squelch, tom CTCSS / código DCS, shift ±/ARS | `CT0` (p. 9), `CN0` + Tabelas 1 e 2 (p. 8), `OS0` (p. 21) — OS só em FM |
| 16 | **Voz (DVS)**: tocar/gravar mensagens 1-5 | `LM` (p. 18), `PB` (p. 21) |
| 17 | **Scope**: velocidade, marker, span, modo 3DSS/waterfall, AF-FFT/osciloscópio (já há PEAK, COLOR, LEVEL) | `SS` P2 = 0, 2, 5, 6, 7 (p. 25) |
| 18 | **Sintonizador de antena**: ligar/desligar, iniciar tune, ATAS up/down | `AC` (p. 6) |
| 19 | **Transmissão por CAT**: PTT (`TX1;`/`TX0;`), MOX, TXW | `TX` (p. 25), `MX` (p. 20), `TS` (p. 25) — exige confirmação, timeout de segurança e indicador vermelho; respeitar `TX INHIBIT` (RI P4 = 2) |
| 20 | **GP OUT A-D** | `GP` (p. 17) — só com TUN/LIN PORT SELECT = GPO |

### Nível 3 — funcionalidades maiores

| # | Funcionalidade | Comandos (página) |
| --- | --- | --- |
| 21 | **VFO SUB / dual receive / split**: frequência e modo do SUB, swap, A→B, B→A, split on/off, qual lado transmite, receptor único/duplo | `FB` (p. 16), `MD1` (p. 19), `SV` (p. 25), `AB`/`BA` (p. 6), `ST` (p. 25), `FT` (p. 16), `FR` (p. 16), `VS` (p. 26), `OI` (p. 21) |
| 22 | **Gerenciador de memórias**: listar 001-999 + PMS + 5 MHz + EMG, ler tag, escrever canal, etiquetar, VFO↔MEM, QMB, split memory | `MR` (p. 19), `MT` (p. 20), `MW` (p. 20), `MC` (p. 19), `VM` (p. 26), `MA`/`MB` (pp. 18-19), `AM`/`BM` (pp. 6-7), `QI`/`QR` (p. 22), `MZ` (p. 20). Exportar/importar CSV; aproveita o padrão de backup/restore do menu. Canais vazios devem responder `?;` — o `CatRejected` da v0.2 já trata. |
| 23 | **Scan** | `SC0` (p. 23) + `RI` P7 para o estado |
| 24 | **Desligar o rádio** | `PS0;` (p. 22) — só OFF; ligar por CAT não existe |
| 25 | **Servidor compatível com rigctld / integração WSJT-X** | Em cima da camada `ftx1cat.cat`: traduz os comandos Hamlib para FA/MD/TX/IF. Permite usar o app e o WSJT-X sem brigar pela porta. |

## 4. Ordem sugerida para a v0.3

1. Infra: `AI1;` + leitor contínuo + `IF;` (itens 1-2). Tudo o que vem depois
   fica mais barato e o display responde na hora ao dial físico.
2. `PC` com P1 real (3), medidores (4), indicadores `RI` (5), versões (6),
   relógio (7).
3. Painel Receptor + DSP (11-12) — são só sliders/combos sobre `Control`,
   o padrão já existe.
4. CW com memórias (14) e FM/repetidora (15) — maior ganho prático para
   operar.

Cada item: comando no `commands.py` com referência de página, resposta no
`simulator.py`, teste, e só então a tela (regra 4 do `AGENTS.md`).
