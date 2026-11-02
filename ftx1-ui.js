(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  R.mountFtx1UI = function () {
    const $ = id => document.getElementById(`ftx-${id}`);
    let transport = null;
    let cat = null;
    let busy = false;
    let memOriginal = null;
    let memEdit = null;
    let memBackup = false;
    let memSimulated = null;
    let memChanged = 0;
    let menuOriginal = {};
    let menuEdit = {};
    let menuShown = [];
    let menuUnavailable = new Set();
    let menuBackup = false;
    let menuSimulated = null;
    let menuChanged = 0;
    const status = text => { $("status").textContent = text; };
    const progress = (done, total) => { $("progress").value = total ? done / total : 0; };
    const clone = value => JSON.parse(JSON.stringify(value));
    const channelNumber = id => {
      const value = Number($(id).value);
      R.assert(Number.isInteger(value) && value >= 1 && value <= 999, "Canal fuera de rango 1-999.");
      return value;
    };
    const mhz = hz => (hz / 1e6).toFixed(6);
    const cell = (text, translated = false) => {
      const td = document.createElement("td");
      if (translated) {
        const span = document.createElement("span");
        span.setAttribute("translate", "yes");
        span.textContent = text;
        td.append(span);
      } else td.textContent = text;
      return td;
    };
    function refresh() {
      const on = Boolean(cat);
      $("connect").disabled = on;
      $("baud").disabled = on;
      $("disconnect").disabled = !on;
      $("mem-read").disabled = !on;
      $("menu-read").disabled = !on;
      for (const id of ["mem-backup", "mem-restore", "csv-export", "csv-import", "copy", "mem-simulate"]) $(id).disabled = !memOriginal;
      $("mem-write").disabled = !(on && memOriginal && memBackup && memChanged > 0 && memSimulated === JSON.stringify(memEdit));
      const haveMenu = Object.keys(menuOriginal).length > 0;
      for (const id of ["menu-backup", "menu-restore", "menu-simulate"]) $(id).disabled = !haveMenu;
      $("menu-write").disabled = !(on && haveMenu && menuBackup && menuChanged > 0 && menuSimulated === JSON.stringify(menuEdit));
    }
    async function radioTask(action) {
      R.assert(!busy, "Hay otra operacion en curso.");
      R.assert(cat, "No hay conexion con la radio.");
      busy = true;
      try { return await action(); }
      finally { busy = false; progress(0, 0); }
    }
    function bind(id, event, action) {
      $(id).addEventListener(event, async e => {
        if (event !== "change") e.preventDefault();
        try { await action(e); }
        catch (error) { status(`Error: ${error.message}`); }
        finally { refresh(); }
      });
    }
    async function readFile(id) {
      const selected = $(id).files[0];
      $(id).value = "";
      R.assert(selected && selected.size > 0 && selected.size <= 8 * 1024 * 1024, "Selecciona un archivo de hasta 8 MiB.");
      return selected.text();
    }
    function download(content, name, type) {
      const url = URL.createObjectURL(new Blob([content], { type }));
      const link = document.createElement("a"); link.href = url; link.download = name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status(`Descarga solicitada: ${name}.`);
    }

    // Memories
    function selectOf(entries, value, label) {
      const select = document.createElement("select");
      select.setAttribute("aria-label", label);
      for (const [key, text] of entries) {
        const option = document.createElement("option");
        option.value = key; option.textContent = text;
        select.append(option);
      }
      select.value = value;
      return select;
    }
    function slotFromRow(channel, controls) {
      const text = controls.freq.value.trim().replace(",", ".");
      if (!text) return { channel, empty: true, memory: null, name: "" };
      const match = /^(\d{1,3})(?:\.(\d{1,6}))?$/.exec(text);
      R.assert(match, "Frecuencia MHz no valida: usa hasta 6 decimales.");
      const old = memEdit.find(slot => slot.channel === channel);
      const base = old && !old.empty ? old.memory
        : { clarDirection: "+", clarOffsetHz: 0, rxClar: false, txClar: false, channelType: "1" };
      return { channel, empty: false, name: controls.name.value, memory: { ...base, channel,
        frequencyHz: Number(match[1]) * 1e6 + Number((match[2] || "").padEnd(6, "0")),
        mode: controls.mode.value, toneMode: controls.tone.value, shift: controls.shift.value } };
    }
    function renderMemories() {
      $("mem-rows").replaceChildren(...memEdit.map(slot => {
        const row = document.createElement("tr");
        const m = slot.memory;
        const freq = document.createElement("input");
        freq.type = "text"; freq.inputMode = "decimal"; freq.value = slot.empty ? "" : mhz(m.frequencyHz);
        freq.setAttribute("aria-label", `Frecuencia MHz canal ${slot.channel}`);
        const mode = selectOf(Object.entries(R.FTX1_MODES), slot.empty ? "4" : m.mode, `Modo canal ${slot.channel}`);
        const name = document.createElement("input");
        name.type = "text"; name.maxLength = 12; name.value = slot.name;
        name.setAttribute("aria-label", `Nombre canal ${slot.channel}`);
        const tone = selectOf(Object.entries(R.FTX1_TONE_MODES), slot.empty ? "0" : m.toneMode, `Tono canal ${slot.channel}`);
        const shift = selectOf(Object.entries(R.FTX1_SHIFTS), slot.empty ? "0" : m.shift, `Desplazamiento canal ${slot.channel}`);
        const controls = { freq, mode, name, tone, shift };
        for (const control of Object.values(controls)) {
          control.addEventListener("change", () => {
            try { memEdit = memEdit.map(item => item.channel === slot.channel ? slotFromRow(slot.channel, controls) : item); }
            catch (error) { status(`Error: ${error.message}`); renderMemories(); }
            refresh();
          });
        }
        const clar = slot.empty ? "-" : `${m.clarDirection}${m.clarOffsetHz} Hz (RX ${m.rxClar ? "ON" : "OFF"}, TX ${m.txClar ? "ON" : "OFF"})`;
        row.append(cell(String(slot.channel)));
        for (const control of [freq, mode, name, tone, shift]) { const td = document.createElement("td"); td.append(control); row.append(td); }
        row.append(cell(clar));
        return row;
      }));
    }
    const FIELD_LABELS = { frequencyHz: "Frecuencia", mode: "Modo", name: "Nombre", toneMode: "Tono", shift: "Desplazamiento",
      clarDirection: "Direccion del clarificador", clarOffsetHz: "Offset del clarificador", rxClar: "Clarificador RX",
      txClar: "Clarificador TX", empty: "Canal vacio" };
    const show = (field, value) => value === null || value === undefined ? "-"
      : field === "frequencyHz" ? `${mhz(value)} MHz`
        : field === "mode" ? R.FTX1_MODES[value] : field === "toneMode" ? R.FTX1_TONE_MODES[value]
          : field === "shift" ? R.FTX1_SHIFTS[value] : String(value);
    function validateEdits() {
      for (const slot of memEdit) {
        if (slot.empty) continue;
        R.ftx1MemoryWriteCommand(slot.memory);
        R.ftx1TagWriteCommand(slot.channel, slot.name);
      }
    }
    function memoryDiff() {
      validateEdits();
      return R.diffFtx1Memories(memOriginal, memEdit);
    }

    // Menu
    function renderMenu() {
      $("menu-rows").replaceChildren(...menuShown.map(item => {
        const key = R.ftx1MenuKey(item);
        const row = document.createElement("tr");
        const name = cell(`${item.name} (${key})`);
        const desc = cell(item.desc);
        const holder = document.createElement("td");
        if (!Object.hasOwn(menuEdit, key)) {
          const span = document.createElement("span");
          span.setAttribute("translate", "yes");
          span.textContent = menuUnavailable.has(key) ? "No disponible" : "Sin leer";
          holder.append(span);
        } else {
          let control;
          if (item.options) {
            control = selectOf(item.options, menuEdit[key], item.name);
          } else {
            control = document.createElement("input");
            control.type = "text"; control.value = menuEdit[key];
            control.setAttribute("aria-label", item.name);
            // The radio's answer may be longer than the manual's digit count (DCS CODE answers 3 digits).
            const length = Math.max(item.digits ?? 0, String(menuOriginal[key] ?? "").length);
            if (length) control.maxLength = length;
          }
          control.disabled = item.readOnly;
          if (!item.readOnly) control.addEventListener("change", () => { menuEdit = { ...menuEdit, [key]: control.value }; refresh(); });
          holder.append(control);
          if (item.readOnly) {
            const note = document.createElement("span");
            note.setAttribute("translate", "yes");
            note.textContent = " Solo lectura";
            holder.append(note);
          }
        }
        row.append(name, desc, holder);
        return row;
      }));
    }
    function menuDiff() {
      const normalized = { ...menuEdit };
      for (const [key, value] of Object.entries(menuEdit)) {
        const item = R.FTX1_MENU.find(entry => R.ftx1MenuKey(entry) === key);
        if (!item || item.readOnly || value === menuOriginal[key]) continue;
        try { normalized[key] = R.validateFtx1MenuValue(item, value, menuOriginal[key]); }
        catch (error) { throw new Error(`${item.name}: ${error.message}`); }
      }
      menuEdit = normalized;
      return R.diffFtx1Menu(menuOriginal, menuEdit);
    }

    // Setup
    const groups = [...new Set(R.FTX1_MENU.map(item => item.group))];
    const all = document.createElement("option");
    all.value = ""; all.textContent = "Todos los grupos";
    $("menu-group").append(all);
    for (const group of groups) {
      const option = document.createElement("option");
      option.value = group; option.textContent = group;
      $("menu-group").append(option);
    }

    bind("connect", "click", async () => {
      R.assert(!cat && !transport, "Ya hay una conexion abierta.");
      status("Conectando con el FTX-1...");
      const port = new R.SerialTransport();
      try {
        await port.open(Number($("baud").value), [{ usbVendorId: 0x10c4 }]);
        const session = new R.Ftx1Cat(port);
        await session.connect();
        port.onDisconnect = error => {
          if (transport !== port) return;
          cat = null; transport = null;
          status(`Conexion perdida: ${error.message}`);
          refresh();
        };
        transport = port; cat = session;
      } catch (error) {
        try { await port.close(); } catch { /* the original error is the useful one */ }
        throw error;
      }
      status("Conectado al FTX-1.");
    });
    bind("disconnect", "click", async () => {
      const port = transport;
      cat = null; transport = null;
      if (port) await port.close();
      status("Desconectado.");
    });

    bind("mem-read", "click", async () => {
      const from = channelNumber("mem-from");
      const to = channelNumber("mem-to");
      R.assert(from <= to, "Rango de canales no valido (1-999).");
      const slots = await radioTask(() => {
        status("Leyendo memorias...");
        return cat.readMemories(from, to, progress);
      });
      memOriginal = slots; memEdit = clone(slots); memBackup = false; memSimulated = null; memChanged = 0;
      $("mem-diff").replaceChildren();
      renderMemories();
      status(`Memorias leidas: ${slots.length} canales, ${slots.filter(slot => slot.empty).length} vacios. Descarga la copia antes de escribir.`);
    });
    bind("copy", "click", () => {
      memEdit = R.ftx1CopySlot(memEdit, channelNumber("copy-from"), channelNumber("copy-to"));
      renderMemories();
      status(`Canal ${$("copy-from").value} copiado al canal ${$("copy-to").value}. La radio no se modifica hasta escribir.`);
    });
    bind("mem-backup", "click", () => {
      download(JSON.stringify(R.ftx1Backup("memories", memOriginal), null, 2), "Bricohams-FTX1-memorias.copia.json", "application/json");
      memBackup = true;
    });
    bind("mem-restore", "change", async () => {
      const backup = R.readFtx1Backup(await readFile("mem-restore"));
      R.assert(backup.kind === "memories", "La copia no es de memorias.");
      memEdit = backup.data;
      renderMemories();
      status("Copia cargada en la tabla (la radio no se modifica).");
    });
    bind("csv-export", "click", () => download(R.ftx1MemoriesCSV(memEdit), "Bricohams-FTX1-memorias.csv", "text/csv"));
    bind("csv-import", "change", async () => {
      const text = await readFile("csv-import");
      const result = R.ftx1ImportCSV(text, channelNumber("csv-start"), memEdit);
      memEdit = result.slots;
      renderMemories();
      status(`${result.imported} canales importados, ${result.rejected.length} rechazados. La radio no se modifica hasta escribir.`);
    });
    bind("mem-simulate", "click", () => {
      const diff = memoryDiff();
      const rows = [];
      for (const { channel, changes } of diff) {
        for (const change of changes) {
          const row = document.createElement("tr");
          row.append(cell(String(channel)), cell(FIELD_LABELS[change.field], true),
            cell(show(change.field, change.from)), cell(show(change.field, change.to)));
          rows.push(row);
        }
      }
      $("mem-diff").replaceChildren(...rows);
      memChanged = diff.length;
      memSimulated = JSON.stringify(memEdit);
      $("mem-summary").textContent = diff.length ? `${diff.length} canales con cambios. Revisa las diferencias antes de escribir.`
        : "Sin diferencias: nada que escribir.";
    });
    bind("mem-write", "click", async () => {
      R.assert(memOriginal, "Lee primero las memorias.");
      R.assert(memBackup, "Descarga primero la copia de las memorias leidas.");
      R.assert(memSimulated === JSON.stringify(memEdit), "Simula primero las diferencias actuales.");
      const diff = memoryDiff();
      R.assert(diff.length > 0, "Sin diferencias: nada que escribir.");
      if (!root.confirm(`Se van a escribir ${diff.length} canales en la radio. Cada canal se verifica releyendolo. Continuar?`)) {
        status("Escritura cancelada.");
        return;
      }
      const changed = memEdit.filter(slot => diff.some(entry => entry.channel === slot.channel));
      try {
        const verified = await radioTask(() => cat.writeMemories(changed, (done, total) => {
          progress(done, total); status(`Escribiendo ${done} de ${total}...`);
        }, memOriginal));
        const merged = clone(memOriginal);
        for (const slot of verified) {
          const position = merged.findIndex(item => item.channel === slot.channel);
          if (position < 0) merged.push(slot); else merged[position] = slot;
        }
        memOriginal = merged.sort((a, b) => a.channel - b.channel);
        memEdit = clone(memOriginal);
        memBackup = false; memSimulated = null; memChanged = 0;
        $("mem-diff").replaceChildren();
        $("mem-summary").textContent = "";
        renderMemories();
        status(`Escritura verificada: ${verified.length} canales. Descarga una copia nueva antes de volver a escribir.`);
      } catch (error) {
        memSimulated = null;
        throw error;
      }
    });

    bind("menu-read", "click", async () => {
      const group = $("menu-group").value;
      const items = R.FTX1_MENU.filter(item => !group || item.group === group);
      const result = await radioTask(() => {
        status("Leyendo configuracion...");
        return cat.readMenu(items, progress);
      });
      menuOriginal = { ...menuOriginal, ...result.values };
      menuEdit = { ...menuEdit, ...result.values };
      for (const key of result.unavailable) { delete menuOriginal[key]; delete menuEdit[key]; }
      menuUnavailable = new Set(result.unavailable);
      menuShown = items;
      menuBackup = false; menuSimulated = null; menuChanged = 0;
      $("menu-diff").replaceChildren();
      renderMenu();
      status(`Configuracion leida: ${Object.keys(result.values).length} elementos, ${result.unavailable.length} no disponibles. Descarga la copia antes de escribir.`);
    });
    bind("menu-backup", "click", () => {
      download(JSON.stringify(R.ftx1Backup("menu", menuOriginal), null, 2), "Bricohams-FTX1-configuracion.copia.json", "application/json");
      menuBackup = true;
    });
    bind("menu-restore", "change", async () => {
      const backup = R.readFtx1Backup(await readFile("menu-restore"));
      R.assert(backup.kind === "menu", "La copia no es de configuracion.");
      const applicable = Object.entries(backup.data).filter(([key]) => Object.hasOwn(menuOriginal, key));
      menuEdit = { ...menuEdit, ...Object.fromEntries(applicable) };
      renderMenu();
      status(`Copia de configuracion cargada: ${applicable.length} ajustes (la radio no se modifica).`);
    });
    bind("menu-simulate", "click", () => {
      const diff = menuDiff();
      $("menu-diff").replaceChildren(...diff.map(change => {
        const row = document.createElement("tr");
        row.append(cell(`${change.item.name} (${change.key})`), cell(change.from), cell(change.to));
        return row;
      }));
      menuChanged = diff.length;
      menuSimulated = JSON.stringify(menuEdit);
      renderMenu();
      $("menu-summary").textContent = diff.length ? `${diff.length} ajustes con cambios. Revisa las diferencias antes de escribir.`
        : "Sin diferencias: nada que escribir.";
    });
    bind("menu-write", "click", async () => {
      R.assert(Object.keys(menuOriginal).length > 0, "Lee primero la configuracion.");
      R.assert(menuBackup, "Descarga primero la copia de la configuracion leida.");
      R.assert(menuSimulated === JSON.stringify(menuEdit), "Simula primero las diferencias actuales.");
      const diff = menuDiff();
      R.assert(diff.length > 0, "Sin diferencias: nada que escribir.");
      if (!root.confirm(`Se van a escribir ${diff.length} ajustes en la radio. Cada ajuste se verifica releyendolo. Continuar?`)) {
        status("Escritura cancelada.");
        return;
      }
      try {
        const values = await radioTask(() => cat.writeMenu(diff, (done, total) => {
          progress(done, total); status(`Escribiendo ${done} de ${total}...`);
        }));
        menuOriginal = { ...menuOriginal, ...values };
        menuEdit = { ...menuOriginal };
        menuBackup = false; menuSimulated = null; menuChanged = 0;
        $("menu-diff").replaceChildren();
        $("menu-summary").textContent = "";
        renderMenu();
        status(`Escritura de configuracion verificada: ${diff.length} ajustes. Descarga una copia nueva antes de volver a escribir.`);
      } catch (error) {
        menuSimulated = null;
        throw error;
      }
    });
    refresh();
  };
})(globalThis);
