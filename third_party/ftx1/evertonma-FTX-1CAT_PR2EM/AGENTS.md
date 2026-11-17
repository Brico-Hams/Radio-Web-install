# Guia para quem (humano ou IA) mexe neste projeto

Este arquivo é lido por assistentes de código (Codex, Claude Code, Copilot...) e
serve de "contrato" do projeto. Mantenha-o curto e atualizado.

## O que é

Aplicativo desktop (Python 3.8+, Tkinter, pyserial) que controla o Yaesu FTX-1
pela interface serial CAT. Público: radioamadores no Windows.

## Mapa do código

```
ftx1cat/
  cat/        protocolo CAT — NÃO depende de Tkinter
    menu.py       tabela do menu EX (dados + validação)
    commands.py   demais comandos CAT (FA, MD, BS, PC, SS...) e tabelas de modos/bandas
    transport.py  Radio: fala com a porta serial (ou com o simulador)
    simulator.py  FakeFTX1: rádio falso para testes e para `--simulate`
  ui/         interface Tkinter
    app.py            janela principal, conexão, log, fila de jobs
    quick_controls.py aba Quick Controls
    menu_page.py      aba CAT Menu + backup/restore
    memory_page.py    aba Memories (MR/MW/MT, CSV)
    status_bar.py     indicadores RI e medidores SM/RM
    worker.py         thread única que executa os jobs seriais
    settings.py       configurações persistentes (JSON)
    widgets.py        ScrollFrame, dial, helpers de Scale
tests/        pytest (roda sem rádio, usando o simulador)
```

## Regras

1. **Protocolo só em `ftx1cat/cat`.** A interface nunca monta strings CAT
   (`"FA...;"`) nem faz parsing de respostas; ela chama `Radio.*` / `commands.*`.
2. **Tudo que toca a serial roda no worker.** Na UI, use `app.run(fn, ...)`;
   `fn(radio)` roda na thread de fundo, `then(result)` roda na thread Tk.
   Nunca chame `radio.*` direto de um handler de botão.
   Quadros espontâneos do rádio (Auto Information) chegam por
   `Radio.on_frame` → `App._handle_frame`; novos tipos de quadro entram ali.
3. **Nunca leia/escreva variáveis Tk fora da thread principal.** Capture o
   valor antes de criar o job.
4. **Todo comando CAT novo precisa de referência ao manual** ("FTX-1 CAT
   Operation Reference Manual", rev. 2507-B — página/tabela) em comentário, e
   de suporte no simulador + teste.
5. **Itens de menu com formato incerto ficam somente leitura** (`kind="ro"`),
   com o texto do manual em `hint`. Não chute formatos.
6. **Gravação no rádio sempre relê e compara** (`write_menu`, `set_control`).
7. Antes de abrir PR: `python -m ruff check ftx1cat tests` e `python -m pytest`
   (no Linux: `xvfb-run -a python -m pytest`). Ambos passam na CI.
8. Textos da interface em inglês; comentários/docstrings em português; README
   bilíngue (inglês primeiro, depois português).
9. Mudanças de comportamento entram no `CHANGELOG.md`.

## Como rodar

```
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m ftx1cat --simulate     # sem rádio
.\.venv\Scripts\python.exe -m ftx1cat                # com rádio
.\.venv\Scripts\python.exe -m pytest
```
