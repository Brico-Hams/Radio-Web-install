(function (root) {
  "use strict";
  const R = root.RadioWorkspace;
  const $ = id => document.getElementById(id);
  function download(name, data, type = "application/octet-stream") {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function saveLocalFile(name, data, type = "application/octet-stream") {
    if (typeof root.showSaveFilePicker !== "function") {
      download(name, data, type);
      return "download-requested";
    }
    const handle = await root.showSaveFilePicker({ suggestedName: name });
    const writer = await handle.createWritable();
    try {
      await writer.write(new Blob([data], { type }));
      await writer.close();
    } catch (error) {
      try { await writer.abort(); }
      catch (cleanup) { throw new AggregateError([error, cleanup], "Error al guardar y cerrar el archivo local."); }
      throw error;
    }
    return "saved";
  }
  function mountRadioUI(page) {
    const store = new R.BackupStore();
    let connector = null;
    let permit = null;
    let busy = false;
    let catTracking = false;
    let image = null;
    let originalConfiguration = null;
    let slotImage = null;
    let editNumber = null;
    let planning = null;
    let renderCodeplug = null;
    let live = null;
    let autoLivePending = false;
    let rfRows = [];
    let factoryControls = null;
    let useApp = null;
    const model = $("model");
    const confirmation = $("confirmed");
    const pro = $("pro-mode");
    const consent = (message, word) => pro.checked ||
      root.prompt(`${message}\nEl respaldo ya esta guardado. Esta accion modifica la radio. Escribe ${word} para confirmar.`) === word;
    const status = $("radio-status");
    const log = message => {
      $("radio-log").textContent += `${new Date().toLocaleTimeString()} ${message}\n`;
      $("radio-log").scrollTop = $("radio-log").scrollHeight;
    };
    const fail = error => {
      const message = error instanceof AggregateError ? `${error.message}: ${error.errors.map(item => item.message).join("; ")}` : error.message;
      status.textContent = `ERROR: ${message}`;
      status.dataset.error = "true";
      log(`ERROR: ${message}`);
    };
    const stored = () => store.db ? Promise.resolve() : store.open();
    const state = () => {
      const connected = Boolean(connector?.connected && !connector.transport.error);
      if (permit && !R.hasBackup(connector, permit)) {
        permit = null;
        $("backup-status").textContent = "Escritura bloqueada: respaldo o conexion invalidados. Reconecta para crear una nueva copia.";
      }
      const api = page === "quansheng" || model.value === "SERIAL" ? "serial" : "usb";
      $("radio-connect").disabled = busy || Boolean(connector) || !model.value || !(confirmation.checked || pro.checked) || !(api in navigator) || !root.isSecureContext;
      if ($("qs-connect-readonly")) $("qs-connect-readonly").disabled = $("radio-connect").disabled;
      $("radio-disconnect").disabled = busy || catTracking || !connector;
      model.disabled = busy || Boolean(connector);
      confirmation.disabled = busy || Boolean(connector);
      pro.disabled = busy || Boolean(connector);
      $("launch").disabled = busy || Boolean(connector) || !model.value || !(confirmation.checked || pro.checked);
      document.querySelectorAll("[data-connected]").forEach(button => { button.disabled = busy || catTracking || !connected || page === "opengd77" && !permit; });
      document.querySelectorAll("[data-write]").forEach(button => { button.disabled = busy || catTracking || !connected || !permit; });
      if ($("write-codeplug")) $("write-codeplug").disabled = busy || !connected || !permit || !image;
      if ($("qs-write")) $("qs-write").disabled = busy || !connected || !permit || !image || !originalConfiguration;
      if ($("slot-install")) $("slot-install").disabled = busy || !connected || !permit || !slotImage;
      document.querySelectorAll("#radio-operations input, #radio-operations select").forEach(input => { input.disabled = busy; });
      $("backup-status").dataset.ready = Boolean(permit);
      planning?.setBusy(busy);
      $("radio-operations").inert = catTracking;
      if ($("qs-live-start")) $("qs-live-start").disabled = busy || catTracking || !connected || Boolean(live);
      if ($("qs-live-stop")) $("qs-live-stop").disabled = busy || !live;
      if ($("qs-keyboard-enabled")) {
        const enabled = !busy && !catTracking && !factoryControls?.pending() && connected && Boolean(permit) && Boolean(live);
        $("qs-keyboard-enabled").disabled = !enabled;
        if (!enabled) $("qs-keyboard-enabled").checked = false;
        document.querySelectorAll("[data-qs-key]").forEach(button => {
          button.disabled = !enabled || !$("qs-keyboard-enabled").checked;
        });
      }
      if (factoryControls?.pending()) {
        $("radio-connect").disabled = true;
        $("qs-connect-readonly").disabled = true;
        $("qs-live-start").disabled = true;
        model.disabled = true;
        document.querySelectorAll("[data-connected], [data-write]").forEach(button => { button.disabled = true; });
      }
    };
    async function action(label, operation) {
      if (busy) return;
      if (factoryControls?.pending() && !["Desconectar", "DFU firmware"].includes(label)) {
        fail(new Error("Completa el DFU pendiente; no ejecutes otras operaciones entre la preparacion y la programacion."));
        return;
      }
      if (catTracking) {
        fail(new Error("Deten primero el seguimiento CAT con Detener seguimiento CAT."));
        return;
      }
      busy = true;
      state();
      delete status.dataset.error;
      status.textContent = label;
      $("radio-progress").value = 0;
      log(label);
      try {
        if (live) {
          $("qs-live-status").textContent = "Pausando visor antes de la operacion...";
          await live.stop();
          $("qs-live-status").textContent = "Visor pausado. La ultima captura no es una imagen en directo.";
        }
        await operation();
        status.textContent = `${label}: finalizado.`;
        log(`${label}: finalizado.`);
      } catch (error) {
        if (connector && (!connector.connected || connector.transport.error)) {
          R.revokeBackup(connector);
          permit = null;
          originalConfiguration = null;
          try {
            await connector.disconnect();
            connector = null;
          } catch (cleanup) {
            error = new AggregateError([error, cleanup], "Error de operacion y de liberacion del puerto. Pulsa Desconectar antes de reintentar.");
          }
        }
        fail(error);
      } finally {
        busy = false;
        state();
        if (autoLivePending) {
          autoLivePending = false;
          startLive();
        }
      }
    }
    function attach(id, label, callback) {
      $(id).addEventListener("click", () => action(label, callback));
    }
    async function history() {
      await stored();
      const records = (await store.list()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      $("backup-list").replaceChildren();
      if (!records.length) {
        const li = document.createElement("li");
        li.textContent = "Todavia no hay copias.";
        $("backup-list").append(li);
      }
      for (const record of records) {
        const li = document.createElement("li");
        const text = document.createElement("span");
        text.textContent = `${new Date(record.createdAt).toLocaleString()} | ${record.device.model} | ${record.status} | ${record.files.map(file => file.name).join(", ")}`;
        li.append(text);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button secondary";
        button.textContent = "Exportar copia + manifiesto";
        button.addEventListener("click", () => action("Exportar copia", async () => {
          const latest = await store.get(record.id);
          R.assert(latest, "La copia ya no existe.");
          download(`radio-backup-${record.id}.rwb.json`, await R.exportBackup(latest), "application/json");
        }));
        li.append(button);
        for (const file of record.files) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "button secondary";
          button.textContent = `${file.name} (${file.bytes.length} B)`;
          button.addEventListener("click", () => action("Exportar archivo", async () => {
            const latest = await store.get(record.id);
            const saved = latest?.files.find(item => item.name === file.name);
            R.assert(saved && await R.sha256(saved.bytes) === saved.sha256, "Archivo ausente o corrupto.");
            download(`${record.id}-${file.name}.bin`, saved.bytes);
          }));
          li.append(button);
        }
        $("backup-list").append(li);
      }
    }
    const operations = $("radio-operations");
    function startLive() {
      if (page !== "quansheng" || busy || catTracking || live || factoryControls?.pending() || !connector?.connected || connector.transport.error) return;
      const session = new R.QuanshengLiveSession(connector, event => {
        if (event.type === "screen") {
          const context = $("qs-live-screen").getContext("2d");
          const pixels = context.createImageData(128, 64);
          for (let bit = 0; bit < 8192; bit++) {
            const on = (event.screen[bit >> 3] >> (bit & 7)) & 1;
            const color = on ? [22, 43, 31] : [178, 209, 151];
            pixels.data.set([...color, 255], bit * 4);
          }
          context.putImageData(pixels, 0, 0);
          $("qs-live-status").textContent = `LCD en directo · ${new Date().toLocaleTimeString()} · LED RX ${event.flags & 4 ? "encendido" : "apagado"} · LED TX ${event.flags & 2 ? "encendido" : "apagado"}`;
        } else if (event.type === "rf") {
          rfRows = event.rows;
          $("qs-rf-status").textContent = `${rfRows.length} registros recibidos (maximo 512). ${event.status === null ? "Historial recibido." : event.status & 8 ? "Registro deshabilitado en la radio." : event.status & 1 ? "Recepcion/transmision activa." : "Sin actividad actual."} Sin fecha UTC: la radio no la proporciona.`;
          $("qs-rf-body").replaceChildren();
          for (const entry of rfRows) {
            const row = document.createElement("tr");
            for (const value of [entry.sequence, entry.flags & 8 ? "ENCENDIDO" : entry.flags & 1 ? "TX" : "RX",
              entry.frequency10Hz ? (entry.frequency10Hz / 100000).toFixed(5) : "-", entry.name || "-",
              entry.durationSeconds, entry.channel === 65535 ? "-" : entry.channel + 1]) {
              const cell = document.createElement("td");
              cell.textContent = String(value);
              row.append(cell);
            }
            $("qs-rf-body").append(row);
          }
          $("qs-rf-export").disabled = !rfRows.length;
          $("qs-rf-body").dispatchEvent(new Event("rf-rows-updated"));
        } else if (event.type === "unavailable") $("qs-live-status").textContent = event.message;
      });
      live = session;
      $("qs-live-status").textContent = "Esperando LCD y registro RF del firmware...";
      session.start().catch(error => {
        $("qs-live-status").textContent = `ERROR: ${error.message}`;
        fail(error);
      }).finally(() => {
        if (live === session) live = null;
        state();
      });
      state();
    }
    if (page === "quansheng") {
      const viewer = document.createElement("section");
      viewer.className = "panel";
      viewer.id = "qs-live-panel";
      viewer.innerHTML = `<h2>Visor en directo Quansheng</h2>
        <canvas id="qs-live-screen" class="qs-live-screen" width="128" height="64" role="img" aria-label="Pantalla LCD de la radio, 128 por 64 pixels"></canvas>
        <p id="qs-live-status" role="status">Conecta la radio para iniciar el visor. Requiere K5Viewer habilitado en el firmware.</p>
        <div class="operation-buttons"><button id="qs-live-start" type="button" class="button secondary" disabled>Iniciar visor y registro RF</button><button id="qs-live-stop" type="button" class="button secondary" disabled>Pausar visor</button><button id="qs-live-capture" type="button" class="button secondary">Guardar captura PNG</button><button id="qs-reboot" data-write type="button" class="button secondary" disabled>Solicitar reinicio y desconectar</button></div>
        <p>Se inicia tras conectar y completar el respaldo, o inmediatamente en conexion de solo lectura. Comparte el puerto: cualquier operacion pausa el visor antes de enviar comandos. El visor por si solo no transmite ni pulsa teclas.</p>
        <h3>Teclado remoto</h3>
        <p>Solo con respaldo completo y visor activo. Las teclas pueden cambiar ajustes persistentes; F1/F2 dependen de su asignacion en la radio y pueden activar funciones de emision. No se ofrece PTT. Cada envio requiere confirmacion y no acredita ejecucion por la radio.</p>
        <label><input id="qs-keyboard-enabled" type="checkbox" disabled> Habilitar teclado remoto conscientemente</label>
        <label><input id="qs-keyboard-long" type="checkbox"> Pulsacion larga</label>
        <div id="qs-keyboard" class="operation-buttons"></div>
        <p id="qs-keyboard-status" role="status">Teclado bloqueado. No se envian teclas automaticamente.</p>`;
      $("main").prepend(viewer);
      for (const [label, code] of [["MENU", 10], ["Arriba", 11], ["Abajo", 12], ["EXIT", 13],
        ...Array.from({ length: 10 }, (_, code) => [String(code), code]), ["*", 14], ["#", 15], ["F1", 18], ["F2", 17]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "button secondary";
        button.textContent = label;
        button.dataset.qsKey = String(code);
        button.disabled = true;
        button.addEventListener("click", async () => {
          if (busy) return;
          try {
            R.assert(!catTracking && !factoryControls?.pending() && live && $("qs-keyboard-enabled").checked,
              "Habilita el teclado con visor activo; no puede compartir CAT ni recuperacion de fabrica.");
            R.assertBackup(connector, permit);
            const longPress = $("qs-keyboard-long").checked;
            if (!root.confirm(`Enviar ${label}, pulsacion ${longPress ? "larga" : "corta"}? Puede modificar ajustes o activar la funcion asignada. No se garantiza solo recepcion.`)) return;
            busy = true;
            state();
            await live.sendKey(code, longPress, permit);
            $("qs-keyboard-status").textContent = `${label} (${longPress ? "larga" : "corta"}) enviada; sin confirmacion de ejecucion. Comprueba LCD. Habilita de nuevo para otra tecla.`;
            log(`Teclado remoto: ${label} ${longPress ? "larga" : "corta"} enviada, sin ACK.`);
          } catch (error) {
            $("qs-keyboard-status").textContent = `ERROR: ${error.message}`;
            fail(error);
          } finally { busy = false; state(); }
        });
        $("qs-keyboard").append(button);
      }
      $("qs-keyboard-enabled").addEventListener("change", state);
      $("qs-live-start").addEventListener("click", startLive);
      attach("qs-reboot", "Solicitar reinicio", async () => {
        if (root.prompt("Se perdera el estado transitorio no guardado. No cambia de slot ni de banco CFG. Escribe REINICIAR RADIO.") !== "REINICIAR RADIO") {
          log("Reinicio cancelado.");
          return;
        }
        await connector.requestReboot(permit, "REINICIAR RADIO");
        await connector.disconnect();
        connector = null;
        permit = null;
        originalConfiguration = null;
        $("qs-live-status").textContent = "Orden de reinicio enviada, sin ACK. Puerto cerrado; verifica el arranque y reconecta para respaldar.";
        log("Reinicio solicitado una sola vez; sin confirmacion de arranque.");
      });
      attach("qs-live-stop", "Pausar visor", async () => {
        $("qs-live-status").textContent = "Visor pausado. La ultima captura no es una imagen en directo.";
      });
      $("qs-live-capture").addEventListener("click", () => {
        $("qs-live-screen").toBlob(blob => {
          if (!blob) { fail(new Error("No se pudo crear la captura LCD.")); return; }
          download(`quansheng-lcd-${Date.now()}.png`, blob, "image/png");
        });
      });
      const rfPanel = document.createElement("section");
      rfPanel.className = "panel";
      rfPanel.id = "qs-rf-panel";
      rfPanel.innerHTML = `<h2>Registro RF de la radio</h2>
        <p id="qs-rf-status" role="status">Sin datos. Inicia el visor; requiere RF Log v2 habilitado en el firmware. No se inventan registros a partir del escaneo web.</p>
        <button id="qs-rf-export" type="button" class="button secondary" disabled>Exportar registro RF CSV</button>
        <div class="table-scroll"><table><thead><tr><th>Secuencia</th><th>Evento</th><th>MHz</th><th>Nombre</th><th>Duracion (s)</th><th>Memoria</th></tr></thead><tbody id="qs-rf-body"></tbody></table></div>
        <label for="qs-rf-filter">Filtrar nombre de memoria o frecuencia MHz</label><input id="qs-rf-filter" type="search" maxlength="80">
        <label for="qs-rf-event">Evento</label><select id="qs-rf-event"><option value="all">Todos</option><option value="rx">RX</option><option value="tx">TX</option><option value="session">Encendido</option></select>
        <div class="operation-buttons"><button id="qs-rf-filter-export" type="button" class="button secondary">Exportar seleccion CSV</button><button id="qs-rf-json" type="button" class="button secondary">Exportar registro JSON</button></div>
        <p id="qs-rf-filter-status" role="status">Sin seleccion. Los filtros no borran el historial recibido.</p>`;
      $("main").append(rfPanel);
      const toolMenu = document.createElement("section");
      toolMenu.id = "qs-native-menu";
      toolMenu.className = "panel";
      toolMenu.innerHTML = `<h2>Herramientas propias Bricohams</h2>
        <p>Operaciones locales con implementacion independiente. Estos accesos no abren UV Studio ni entregan el puerto a otra web. Cada escritura conserva sus requisitos de respaldo, confirmacion y verificacion.</p>
        <div class="operation-buttons">${[
          ["qs-factory-native", "Restablecer de fabrica"],
          ["qs-live-panel", "Teclado remoto y reinicio"],
          ["qs-main-firmware-file", "Firmware principal / DFU v6-v7"],
          ["qs-assets-file", "Recursos externos v7"],
          ["qs-calibration-file", "Backup / Restore calibracion"],
          ["qs-logo-file", "Descargar / Instalar logo"],
          ["qs-flash-file", "Backup / Restore Flash externa"],
          ["precompiled-apps-panel", "Catalogo de apps"],
          ["app-slot", "Orden y gestion de apps"],
          ["slot-number", "Slots y bancos CFG"],
          ["qs-rf-panel", "Registro RF, filtros y exportacion"]
        ].map(([id, label]) => `<a class="button secondary" href="#${id}">${label}</a>`).join("")}</div>
        <p>DFU acepta BIN v6 y paquetes v7 FWAT/FWA1. Los recursos v7 se instalan despues, con respaldo nuevo y Build ID igual al firmware activo; no se cargan automaticamente ni en otros slots. No hay validacion fisica v7 en esta unidad. Stock requiere dos archivos originales: no se sustituyen por copias inventadas.</p>
        <p>El codigo propio no elimina las licencias de firmware, apps, fuentes o recursos de terceros. Se conservan sus atribuciones y avisos; no se ofrece garantia juridica ni se atribuyen esas obras a Bricohams.</p>`;
      rfPanel.before(toolMenu);
      $("qs-rf-export").addEventListener("click", () => {
        download(`quansheng-rf-${Date.now()}.csv`, R.rfLogCSV(rfRows), "text/csv;charset=utf-8");
      });
      const filteredRF = () => R.filterRFLog(rfRows, $("qs-rf-filter").value, $("qs-rf-event").value);
      const updateRFFilter = () => {
        const selected = filteredRF();
        const sequences = new Set(selected.map(row => row.sequence));
        [...$("qs-rf-body").rows].forEach(row => { row.hidden = !sequences.has(Number(row.cells[0].textContent)); });
        $("qs-rf-filter-status").textContent = `${selected.length} de ${rfRows.length} registros recibidos. Sin fechas UTC ni valores RF calibrados.`;
        $("qs-rf-filter-export").disabled = !selected.length;
        $("qs-rf-json").disabled = !rfRows.length;
      };
      $("qs-rf-filter").addEventListener("input", updateRFFilter);
      $("qs-rf-event").addEventListener("change", updateRFFilter);
      $("qs-rf-filter-export").addEventListener("click", () => download(`quansheng-rf-selection-${Date.now()}.csv`, R.rfLogCSV(filteredRF()), "text/csv;charset=utf-8"));
      $("qs-rf-json").addEventListener("click", () => download(`quansheng-rf-${Date.now()}.json`,
        JSON.stringify({ format: "bricohams-rf-log", version: 1, exportedAt: new Date().toISOString(),
          eventUTCProvided: false, calibratedRF: false, rows: rfRows }, null, 2), "application/json"));
      updateRFFilter();
      $("qs-rf-body").addEventListener("rf-rows-updated", updateRFFilter);
      operations.innerHTML = `<h2>CAT RX Bricohams Beta</h2>
        <button id="qs-connect-readonly" class="button secondary" type="button">Conectar solo lectura / CAT (sin escritura persistente)</button>
        <p>Selecciona y confirma el modelo arriba. Esta conexion permite leer canales y usar CAT sin esperar una copia Flash completa; no habilita ninguna escritura persistente. Para escribir, desconecta y usa Conectar y crear respaldo automatico.</p>
        <p>Solo para la imagen Bricohams Satelites con CAT v1: entra en SAT RX y pulsa 8 en la radio para habilitarlo. No compatible con F4HWN original, ARDF o Espectro. No transmite ni guarda VFO/canales/calibracion. No requiere respaldo para esta sintonia temporal; las escrituras persistentes conservan sus protecciones.</p>
        <p>Una orden sintoniza RX durante un maximo de 3 segundos sin renovacion. Despues vuelve a la frecuencia nominal de entrada. El seguimiento continuo de un pase visible se inicia desde SAT / pases. Las teclas 4/5/6, 8 o el bloqueo del teclado cancelan CAT; salir restaura el VFO.</p>
        <label class="check"><input id="cat-firmware-confirmed" type="checkbox"> He arrancado la imagen Bricohams Satelites con CAT v1 y he habilitado SAT RX con 8 (no F4HWN original).</label>
        <label for="cat-rx-frequency">Frecuencia RX en MHz (136-174 o 400-470, resolucion 10 Hz)</label>
        <input id="cat-rx-frequency" type="number" min="136" max="470" step="0.00001" value="145.80000">
        <div class="operation-buttons"><button id="cat-rx-query" data-connected class="button secondary" type="button" disabled>Consultar CAT</button><button id="cat-rx-set" data-connected class="button primary" type="button" disabled>Sintonizar RX (3 s)</button><button id="cat-rx-stop" data-connected class="button secondary" type="button" disabled>Volver a RX nominal</button></div>
        <p id="cat-rx-status" role="status">CAT no consultado. La confirmacion es software, no una medida de frecuencia RF.</p>
        <h2>Estadisticas ARDF Bricohams Beta</h2>
        <p>Solo imagen ARDF con estadisticas v1. La tecla 8 guarda una observacion manual y el indice de atenuacion para la baliza del turno sincronizado. No detecta ni localiza balizas. Los datos se reinician al entrar de nuevo o cambiar numero/duracion; quedan consultables al salir mientras no reinicies la radio.</p>
        <div class="operation-buttons"><button id="ardf-stats-read" data-connected class="button secondary" type="button" disabled>Consultar y descargar estadisticas ARDF</button></div>
        <p id="ardf-stats-status" role="status">Sin consulta. Tiempos relativos de la radio, no GPS/UTC. Exporta antes de reiniciar la sesion; indice de ganancia no equivale a dB.</p>
        <h2>Presets de Espectro Bricohams Beta</h2>
        <p>Solo imagen Espectro con transferencia BHSP v1. Guarda presets con 8 en la radio; pausa el barrido con 4 (HOLD), desactiva MULTI y desbloquea el teclado. Exportar/importar conserva los ocho presets en un archivo local, no escribe EEPROM ni calibracion. La importacion reemplaza la tabla RAM completa; exporta antes para conservarla. Cualquier tecla durante la transferencia la interrumpe.</p>
        <label for="spectrum-presets-file">Archivo de presets BHSP v1 (208 bytes)</label><input id="spectrum-presets-file" type="file" accept=".bhsp,.bin">
        <div class="operation-buttons"><button id="spectrum-presets-export" data-connected class="button secondary" type="button" disabled>Exportar presets RAM a archivo</button><button id="spectrum-presets-import" data-connected class="button secondary" type="button" disabled>Importar archivo a RAM (reemplaza tabla)</button></div>
        <p id="spectrum-presets-status" role="status">Sin transferencia. Al salir/apagar se pierde la tabla RAM; conserva el archivo para recuperarla. Importar no sintoniza ni reanuda el barrido: 9 recupera un preset y 4 reanuda.</p>
        <h2>Firmware Slots / Multiconfig</h2>
        <p class="muted">Escrituras solo tras respaldo completo. La copia Flash requiere Labs v6.1+ con comandos de lectura fisica; otras ediciones quedan en solo lectura. Main es la aplicacion base inicializada por el firmware, no el bootloader.</p>
        <div class="operation-buttons"><button id="slots-refresh" data-connected class="button secondary" type="button" disabled>Consultar slots</button></div>
        <div class="table-scroll"><table><thead><tr><th>Slot</th><th>Nombre</th><th>Version</th><th>Bytes</th><th>Estado</th><th>CRC</th></tr></thead><tbody id="slots-body"></tbody></table></div>
        <label for="slot-number">Slot / banco de destino (Main protegido)</label><select id="slot-number"><option value="1">1 / CFG 1</option><option value="2">2 / CFG 2</option><option value="3">3 / CFG 3</option><option value="4">4 / CFG 4</option></select>
        <label for="slot-file">Imagen F4HWN estable v6.x (maximo 118 KiB)</label><input id="slot-file" type="file" accept=".bin">
        <label for="slot-library-folder">Biblioteca local: selecciona tu carpeta Multiboot (no se sube a ningun servidor)</label><input id="slot-library-folder" type="file" webkitdirectory multiple>
        <label for="slot-library-entry">Imagen de la biblioteca</label><select id="slot-library-entry"><option value="">Selecciona primero una carpeta</option></select>
        <p id="slot-library-info" class="card-note" role="status">Solo se preparan imagenes F4HWN v6.x con vectores PY32 validos. Karina V1, ARDF sin compatibilidad verificada, stock y versiones antiguas no se habilitan para slots. La validacion estructural no acredita autenticidad ni compatibilidad fisica.</p>
        <button id="slot-library-use" class="button secondary" type="button">Preparar imagen local (sin escribir)</button>
        <label for="slot-name">Nombre (ASCII, maximo 15 caracteres)</label><input id="slot-name" maxlength="15" value="F4HWN">
        <div class="operation-buttons"><button id="slot-install" data-write class="button primary" type="button" disabled>Instalar y verificar CRC</button><button id="slot-erase" data-write class="button secondary" type="button" disabled>Borrar firmware del slot</button><button id="bank-reset" data-write class="button secondary" type="button" disabled>Restablecer banco CFG</button></div>
        <p class="card-note">Cambiar firmware: MENU al encender y seleccion en la radio. Cambiar solo banco: SetCfg en la radio. No se inventa un comando remoto para estas acciones. No se implementa flash DFU ni restauracion de calibracion.</p>
        <h2 id="apps">Apps de F4HWN Labs</h2>
        <p class="muted">Apps (APRS, SSTV, sondas, CW, caza del zorro...) en los huecos de la Flash externa. Solo las ejecuta la edicion Labs y cada una exige un nivel de API minimo: usa las de la misma version que el firmware arrancado. Una app es codigo nativo con acceso total a la radio; instala solo las que conozcas. No toca canales, ajustes, calibracion ni firmware.</p>
        <p class="muted">Descarga los <code>.app</code> de tu version en <a href="https://github.com/armel/uv-k1-k5v3-firmware-custom/tree/main/archive/apps" target="_blank" rel="noopener noreferrer">archive/apps de F4HWN &nearr;</a> o de una compilacion a medida.</p>
        <div class="operation-buttons"><button id="apps-refresh" data-connected class="button secondary" type="button" disabled>Consultar apps</button></div>
        <div class="table-scroll"><table><thead><tr><th>Hueco</th><th>App</th><th>Version</th><th>API min.</th><th>Bytes</th><th>Estado</th></tr></thead><tbody id="apps-body"></tbody></table></div>
        <label for="app-file">Archivo .app (cabecera FAP1, codigo maximo 4 KiB)</label><input id="app-file" type="file" accept=".app">
        <p id="app-file-info" class="card-note" role="status">Ningun archivo cargado.</p>
        <label for="app-slot">Hueco de destino</label><select id="app-slot"><option value="">Consulta las apps primero</option></select>
        <div class="operation-buttons"><button id="app-install" data-write class="button primary" type="button" disabled>Instalar app y verificar</button><button id="app-delete" data-write class="button secondary" type="button" disabled>Borrar app del hueco</button><button id="app-export" data-connected class="button secondary" type="button" disabled>Exportar app del hueco</button></div>
        <label for="app-move-target">Destino vacio para mover / reordenar</label><select id="app-move-target"><option value="">Consulta las apps primero</option></select>
        <p>Se copia y verifica el destino antes de borrar el origen. No se intercambian huecos ocupados: usa un hueco vacio intermedio. Una interrupcion puede dejar dos copias; consulta los huecos antes de reintentar.</p>
        <div class="operation-buttons"><button id="app-move" data-write class="button secondary" type="button" disabled>Mover app al hueco vacio</button><button id="apps-delete-all" data-write class="button secondary" type="button" disabled>Borrar todas las apps</button></div>`;
      const slot = () => Number($("slot-number").value);
      const showCat = result => {
        $("cat-rx-status").textContent = result.active ?
          `Ultima respuesta CAT v${result.version}: RX ${(result.appliedFrequency10Hz / 100000).toFixed(5)} MHz; ${result.pending ? "pendiente" : result.remote ? "remoto, lease 3 s" : "habilitado localmente"}. Confirmacion software, sin medida RF ni consulta continua.` :
          "CAT v1 disponible pero deshabilitado. Entra en SAT RX y pulsa 8 en la radio.";
      };
      const catAction = (label, operation) => action(label, async () => {
        R.assert($("cat-firmware-confirmed").checked, "Confirma primero la imagen Satelites CAT v1 y habilita SAT RX con 8. F4HWN original no admite CAT.");
        $("cat-rx-status").textContent = "Esperando respuesta CAT...";
        try { showCat(await operation()); }
        catch (error) {
          $("cat-rx-status").textContent = `ERROR: ${error.message}. Sin confirmacion de sintonia; si habia control remoto, el firmware debe volver a nominal al caducar el lease de 3 s.`;
          throw error;
        }
      });
      $("cat-rx-query").addEventListener("click", () => catAction("Consultar CAT RX", () => connector.getCatStatus()));
      $("cat-rx-set").addEventListener("click", () => catAction("Sintonizar CAT RX", () => {
        const input = $("cat-rx-frequency").value.trim();
        R.assert(/^\d{3}(?:\.\d{1,5})?$/.test(input), "Introduce MHz con hasta cinco decimales.");
        return connector.setCatReceive(Math.round(Number(input) * 100000));
      }));
      $("cat-rx-stop").addEventListener("click", () => catAction("Restaurar RX nominal CAT", () => connector.stopCatReceive()));
      $("ardf-stats-read").addEventListener("click", () => action("Consultar estadisticas ARDF", async () => {
        $("ardf-stats-status").textContent = "Consultando instantanea ARDF...";
        try {
          const result = await connector.readArdfStatistics();
          const total = result.observations.reduce((sum, item) => sum + item.count, 0);
          download(`bricohams-ardf-session-${result.session}.json`, JSON.stringify(result, null, 2), "application/json");
          $("ardf-stats-status").textContent = `Sesion ${result.session}, ${result.active ? "activa" : "finalizada"}, ${total} observaciones manuales en ${result.observations.length}/${result.foxCount} balizas. ${result.countsSaturated ? "AVISO: contador saturado; los totales son un minimo. " : ""}${result.firmwareError ? "ERROR de modulo indicado por firmware. " : ""}Descarga solicitada; confirma que se ha guardado. Sin posicion ni detecciones automaticas.`;
        } catch (error) {
          $("ardf-stats-status").textContent = `ERROR: ${error.message}. No se han obtenido estadisticas verificadas.`;
          throw error;
        }
      }));
      const presetAction = (label, operation) => action(label, async () => {
        $("spectrum-presets-status").textContent = "Transferencia en curso; no pulses teclas en la radio.";
        try { await operation(); }
        catch (error) {
          $("spectrum-presets-status").textContent = `ERROR: ${error.message}. No se confirma la transferencia; consulta/exporta de nuevo la tabla. No se ha escrito EEPROM.`;
          throw error;
        }
      });
      $("spectrum-presets-export").addEventListener("click", () => presetAction("Exportar presets Espectro", async () => {
        const bytes = await connector.readSpectrumPresets();
        const info = R.inspectSpectrumPresets(bytes);
        download("bricohams-spectrum-presets.bhsp", bytes);
        $("spectrum-presets-status").textContent = `${info.entries.length} presets leidos y validados; descarga solicitada. Comprueba que el archivo se ha guardado.`;
      }));
      $("spectrum-presets-import").addEventListener("click", () => presetAction("Importar presets Espectro a RAM", async () => {
        const file = $("spectrum-presets-file").files[0];
        R.assert(file && file.size === 208, "Selecciona un archivo BHSP de exactamente 208 bytes.");
        const result = await connector.writeSpectrumPresets(new Uint8Array(await file.arrayBuffer()));
        $("spectrum-presets-status").textContent = `${result.entries.length} presets importados y releidos en RAM. Sin EEPROM ni cambio de sintonia; 9 recupera un preset, 4 reanuda. Conserva el archivo para la proxima sesion.`;
      }));
      async function refreshSlots() {
        const slots = await connector.listSlots();
        $("slots-body").replaceChildren();
        const statuses = ["Cabecera valida", "Vacio / magic invalido", "Formato desconocido", "Incompleto", "Tamano invalido", "CRC invalido", "Error SPI", "Slot invalido", "Sin autorizacion", "Error RAM", "Protegido"];
        for (const item of slots) {
          const row = document.createElement("tr");
          for (const text of [item.slot === 0 ? "M (protegido)" : item.slot, item.name, item.firmware, item.size, statuses[item.status] || `Error ${item.status}`]) {
            const cell = document.createElement("td");
            cell.textContent = String(text);
            row.append(cell);
          }
          const cell = document.createElement("td");
          const button = document.createElement("button");
          button.type = "button";
          button.className = "guide-tab";
          button.dataset.connected = "";
          button.textContent = "Verificar";
          button.addEventListener("click", () => action(`Verificar slot ${item.slot}`, async () => {
            const crc = await connector.validateSlot(item.slot);
            cell.textContent = `CRC correcto: ${crc.toString(16).padStart(8, "0")}`;
          }));
          cell.append(button);
          row.append(cell);
          $("slots-body").append(row);
        }
      }
      attach("slots-refresh", "Consultar slots", refreshSlots);
      $("slot-file").addEventListener("change", () => action("Cargar firmware local", async () => {
        slotImage = null;
        const file = $("slot-file").files[0];
        R.assert(file && file.size >= 256 && file.size <= 0x1d800, "Selecciona una imagen de 256 bytes a 118 KiB.");
        const bytes = new Uint8Array(await file.arrayBuffer());
        R.inspectQuanshengSlotImage(bytes, file.name);
        slotImage = bytes;
        log(`Archivo local: ${file.name}; SHA-256 ${await R.sha256(slotImage)}. Aun no escrito.`);
      }));
      let library = [];
      $("slot-library-folder").addEventListener("change", () => action("Examinar biblioteca Multiboot local", async () => {
        library = [];
        slotImage = null;
        $("slot-library-entry").replaceChildren(new Option("Sin imagenes", ""));
        $("slot-library-info").textContent = "Examinando imagenes locales...";
        try {
          const files = [...$("slot-library-folder").files].filter(file => /\.bin$/i.test(file.name));
          R.assert(files.length > 0 && files.length <= 256, "Selecciona una carpeta con entre 1 y 256 archivos .bin.");
          for (const file of files) {
            const entry = { name: file.webkitRelativePath || file.name, bytes: null, reason: "" };
            if (file.size < 256 || file.size > 0x1d800) {
              entry.reason = "Tamano fuera de los limites para slots.";
            } else {
              const bytes = new Uint8Array(await file.arrayBuffer());
              try { entry.info = R.inspectQuanshengSlotImage(bytes, file.name); }
              catch (error) { entry.reason = error.message; }
              if (!entry.reason) {
                entry.bytes = bytes;
                entry.sha256 = await R.sha256(bytes);
              }
            }
            library.push(entry);
          }
          $("slot-library-entry").replaceChildren(new Option("Selecciona una imagen para ver su estado", ""),
            ...library.map((entry, index) => new Option(`${entry.bytes ? "Preparar" : "Bloqueada"}: ${entry.name}`, index)));
          const accepted = library.filter(entry => entry.bytes).length;
          $("slot-library-info").textContent = `${library.length} imagenes; ${accepted} cumplen las comprobaciones de slots; ${library.length - accepted} bloqueadas. No se ha escrito nada.`;
          log($("slot-library-info").textContent);
        } catch (error) {
          library = [];
          $("slot-library-entry").replaceChildren(new Option("Sin imagenes", ""));
          $("slot-library-info").textContent = `Biblioteca no disponible: ${error.message}`;
          throw error;
        }
      }));
      $("slot-library-entry").addEventListener("change", () => {
        const entry = library[$("slot-library-entry").value];
        $("slot-library-info").textContent = entry
          ? `${entry.name}: ${entry.reason || `F4HWN v${entry.info.version}, ${entry.info.size} bytes. SHA-256 local ${entry.sha256}. No acredita autenticidad ni compatibilidad fisica.`}`
          : "Selecciona una imagen.";
      });
      attach("slot-library-use", "Preparar imagen de la biblioteca", async () => {
        const entry = library[$("slot-library-entry").value];
        R.assert(entry?.bytes, entry?.reason || "Selecciona una imagen local admitida.");
        R.inspectQuanshengSlotImage(entry.bytes, entry.name.split(/[\\/]/).pop());
        slotImage = entry.bytes.slice();
        $("slot-file").value = "";
        $("slot-name").value = "F4HWN";
        log(`Imagen local preparada: ${entry.name}; SHA-256 ${entry.sha256}. Sin escritura; exige respaldo completo y confirmacion para instalar.`);
      });
      attach("slot-install", "Instalar firmware", async () => {
        if (!consent(`Se reemplazara el firmware externo del slot ${slot()}. No apagues ni desconectes.`, `SLOT ${slot()}`)) { log("Instalacion cancelada."); return; }
        await connector.writeSlot(slot(), slotImage, $("slot-name").value, permit);
        await refreshSlots();
      });
      attach("slot-erase", "Borrar firmware del slot", async () => {
        if (!consent(`Se borrara el firmware del slot ${slot()}, NO sus ajustes.`, `BORRAR ${slot()}`)) { log("Borrado cancelado."); return; }
        await connector.eraseSlot(slot(), permit);
        await refreshSlots();
      });
      attach("bank-reset", "Restablecer banco", async () => {
        if (!consent(`Se eliminaran canales y ajustes del banco CFG ${slot()}. No es borrar firmware.`, `CFG ${slot()}`)) { log("Restablecimiento cancelado."); return; }
        await connector.resetBank(slot(), permit);
      });
      let appFile = null;
      useApp = bytes => {
        const app = R.parseQuanshengApp(bytes);
        appFile = bytes.slice();
        $("app-file-info").textContent = `${app.header.name} ${app.header.appVersion} · ABI ${app.header.abi} · API minima ${app.header.apiMin} · ${bytes.length} bytes · CRC correcto. Preparada, sin instalar.`;
      };
      const appSlot = () => Number($("app-slot").value);
      async function refreshApps() {
        const apps = await connector.listApps();
        $("apps-body").replaceChildren();
        const previous = $("app-slot").value;
        $("app-slot").replaceChildren(...apps.map(item => new Option(`${item.slot + 1} · ${item.status === 2 ? "vacio" : item.name}`, item.slot)));
        $("app-slot").value = previous || String(apps.find(item => item.status === 2)?.slot ?? 0);
        $("app-move-target").replaceChildren(new Option("Selecciona hueco vacio", ""),
          ...apps.filter(item => item.status === 2).map(item => new Option(String(item.slot + 1), item.slot)));
        for (const item of apps) {
          const row = document.createElement("tr");
          const filled = item.status !== 2;
          for (const text of [item.slot + 1, filled ? item.name : "-", filled ? item.appVersion : "-", filled ? item.apiMin : "-",
            filled ? item.codeSize + item.assetSize : "-", item.statusText]) {
            const cell = document.createElement("td");
            cell.textContent = String(text);
            row.append(cell);
          }
          $("apps-body").append(row);
        }
        log(`${apps.length} huecos de apps; ${apps.filter(item => item.status !== 2).length} ocupados.`);
      }
      attach("apps-refresh", "Consultar apps", refreshApps);
      attach("app-export", "Exportar app", async () => {
        R.assert($("app-slot").value !== "", "Consulta las apps y selecciona el origen.");
        const bytes = await connector.readApp(appSlot());
        const app = R.parseQuanshengApp(bytes);
        download(`quansheng-slot-${appSlot() + 1}.app`, bytes);
        log(`App ${app.header.name}: exportacion solicitada, SHA-256 ${await R.sha256(bytes)}. Comprueba Descargas.`);
      });
      attach("app-move", "Mover app", async () => {
        R.assert($("app-slot").value !== "" && $("app-move-target").value !== "", "Selecciona origen y destino vacio.");
        const source = appSlot();
        const destination = Number($("app-move-target").value);
        const word = `MOVER APP ${source + 1} A ${destination + 1}`;
        if (root.prompt(`Se instalara y verificara una copia en destino y despues se borrara el origen. No es una transaccion atomica. Escribe ${word}.`) !== word) {
          log("Movimiento cancelado.");
          return;
        }
        const result = await connector.moveApp(source, destination, permit, word);
        log(`App ${result.name} movida y verificada. Estado de compatibilidad: ${result.statusText}. No ejecutada.`);
        await refreshApps();
      });
      attach("apps-delete-all", "Borrar todas las apps", async () => {
        const word = "BORRAR TODAS LAS APPS";
        if (root.prompt(`Se borraran todas las apps Labs, sin modificar firmware, canales ni calibracion. No se puede deshacer sin respaldo. Escribe ${word}.`) !== word) {
          log("Borrado global cancelado.");
          return;
        }
        const result = await connector.deleteAllApps(permit, word);
        log(`${result.deleted} apps borradas; todos los huecos verificados vacios.`);
        await refreshApps();
      });
      $("app-file").addEventListener("change", () => action("Cargar app local", async () => {
        appFile = null;
        const file = $("app-file").files[0];
        R.assert(file && file.size <= 64 + 0x1000 + 0xf00, "Selecciona un archivo .app de hasta 7,8 KiB.");
        const bytes = new Uint8Array(await file.arrayBuffer());
        const app = R.parseQuanshengApp(bytes);
        appFile = bytes;
        $("app-file-info").textContent = `${app.header.name} ${app.header.appVersion} · API minima ${app.header.apiMin} · ${bytes.length} bytes · CRC correcto · SHA-256 ${await R.sha256(bytes)}`;
        log(`App local: ${file.name} (${app.header.name}). Aun no escrita.`);
      }));
      attach("app-install", "Instalar app", async () => {
        R.assert(appFile, "Carga primero un archivo .app valido.");
        R.assert($("app-slot").value !== "", "Consulta las apps y elige un hueco.");
        if (!consent(`Se instalara la app en el hueco ${appSlot() + 1}, reemplazando lo que haya. Se ejecutara con acceso total a la radio.`, `APP ${appSlot() + 1}`)) { log("Instalacion cancelada."); return; }
        const result = await connector.installApp(appSlot(), appFile, permit);
        log(result.status === 0 ? `App ${result.name} instalada y verificada.` : `App ${result.name} instalada, pero este firmware no la puede ejecutar: ${result.statusText}.`);
        await refreshApps();
      });
      attach("app-delete", "Borrar app", async () => {
        R.assert($("app-slot").value !== "", "Consulta las apps y elige un hueco.");
        if (!consent(`Se borrara la app del hueco ${appSlot() + 1}. No afecta a canales ni firmware.`, `BORRAR APP ${appSlot() + 1}`)) { log("Borrado cancelado."); return; }
        await connector.deleteApp(appSlot(), permit);
        await refreshApps();
      });
      operations.insertAdjacentHTML("beforeend", `<hr><h2>Canales Quansheng - Beta</h2>
        <p>Configuracion F4HWN v6 de 41344 bytes del banco activo (1024 memorias). Importa PMR, repetidores y memorias SAT FM desde el panel de preparacion usando una plantilla FM. Todo se anade solo RX, sin tonos ni senalizacion DTMF heredados; nombres limitados a 10 caracteres.</p>
        <p class="card-note">La lectura y la edicion local no necesitan permiso de escritura. Escribir exige respaldo Flash completo verificado; en v6.0 queda bloqueado. No cambia de banco, no borra slots y no modifica calibracion. No equivale a seguimiento SAT nativo.</p>
        <div class="operation-buttons"><button id="qs-read" data-connected class="button secondary" type="button" disabled>Leer canales del banco activo</button><button id="qs-save" class="button secondary" type="button">Guardar configuracion local</button><button id="qs-write" data-write class="button primary" type="button" disabled>Escribir y releer canales (Beta)</button></div>
        <h3>Backup / Restore de canales</h3>
        <p>Backup lee de nuevo el banco activo y guarda una copia original, sin reemplazar tu edicion local. No es una copia Flash completa. Restore prepara las memorias del archivo sobre el banco leido, conserva sus ajustes y exige la misma version. Puede recuperar canales con TX habilitada: revisalos antes de escribir. No cambia slots, apps ni calibracion.</p>
        <div class="operation-buttons"><button id="qs-backup" data-connected class="button secondary" type="button" disabled>Backup del banco activo</button><button id="qs-restore" class="button secondary" type="button">Restore: abrir copia de canales</button></div>
        <input id="qs-restore-file" type="file" accept=".bin" hidden>
        <p id="qs-backup-result" role="status">Sin backup de canales en esta vista.</p>
        <label for="qs-file">Abrir configuracion logica F4HWN v6 de 41344 bytes (no firmware, Flash completa ni calibracion)</label><input id="qs-file" type="file" accept=".bin">
        <form id="qs-channel-form" hidden><h3>Editar canal Quansheng</h3>
        <label for="qs-channel-name">Nombre ASCII (maximo 10 caracteres)</label><input id="qs-channel-name" maxlength="10" required pattern="[ -~]{1,10}">
        <label for="qs-channel-rx">RX MHz</label><input id="qs-channel-rx" inputmode="decimal" required>
        <label for="qs-channel-tx">TX nominal MHz (editar activa el bloqueo TX)</label><input id="qs-channel-tx" inputmode="decimal" required>
        <label for="qs-channel-scan">Lista de escaneo (0 ninguna, 1-24, 25 todas)</label><input id="qs-channel-scan" type="number" min="0" max="25" required>
        <div class="operation-buttons"><button class="button primary" type="submit">Aplicar al archivo local</button><button id="qs-channel-cancel" class="button secondary" type="button">Cancelar</button></div></form>
        <p id="qs-count" role="status">Lee o abre una configuracion para ver los canales.</p>
        <label class="check"><input id="qs-select-all" type="checkbox"> Seleccionar todos los canales del archivo</label>
        <label for="qs-scan-list">Asignar seleccion a lista (0 ninguna, 1-24, 25 todas)</label><input id="qs-scan-list" type="number" min="0" max="25" value="1">
        <button id="qs-scan-apply" class="button secondary" type="button">Aplicar lista al archivo local</button>
        <p>Las listas son numeros nativos del firmware, no zonas DMR. Cada memoria pertenece a una lista; 25 participa en todas. Los nombres de zona/geografia se muestran en el informe de importacion, no se escriben como nombres de lista.</p>
        <div class="table-scroll"><table><thead><tr><th>Elegir</th><th>Canal</th><th>Nombre</th><th>RX MHz</th><th>TX nominal MHz</th><th>Modo</th><th>TX bloqueada</th><th>Escaneo</th><th>Archivo local</th></tr></thead><tbody id="qs-channels"></tbody></table></div>`);
      function renderQuansheng() {
        const channels = R.readQuanshengChannels(image);
        $("qs-select-all").checked = false;
        $("qs-channels").replaceChildren();
        for (const channel of channels) {
          const row = document.createElement("tr");
          const selected = document.createElement("input");
          selected.type = "checkbox";
          selected.dataset.qsChannel = channel.number;
          selected.setAttribute("aria-label", `Seleccionar canal ${channel.number}`);
          const selection = document.createElement("td");
          selection.append(selected);
          row.append(selection);
          for (const value of [channel.number, channel.name, channel.rx, channel.tx,
            channel.mode === 0 ? "FM" : `Modulacion ${channel.mode}`, channel.rxOnly ? "Si" : "No",
            `${channel.scanList === 25 ? "Todas" : channel.scanList}${channel.scanExcluded ? " (excluido)" : ""}`]) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.append(cell);
          }
          const cell = document.createElement("td");
          const edit = document.createElement("button");
          edit.type = "button";
          edit.className = "guide-tab";
          edit.textContent = "Editar";
          edit.disabled = channel.mode !== 0;
          edit.addEventListener("click", () => {
            if (busy || catTracking) return;
            editNumber = channel.number;
            $("qs-channel-name").value = channel.name;
            $("qs-channel-rx").value = channel.rx;
            $("qs-channel-tx").value = channel.tx;
            $("qs-channel-scan").value = channel.scanList;
            $("qs-channel-form").hidden = false;
            $("qs-channel-name").focus();
          });
          cell.append(edit);
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "guide-tab";
          remove.textContent = "Borrar del archivo";
          remove.addEventListener("click", () => action("Borrar canal local Quansheng", async () => {
            if (!pro.checked && !root.confirm(`Quitar canal ${channel.number} del archivo local? La radio no se modifica.`)) return;
            image = R.deleteQuanshengChannel(image, channel.number);
            editNumber = null;
            $("qs-channel-form").hidden = true;
            renderQuansheng();
          }));
          cell.append(remove);
          row.append(cell);
          $("qs-channels").append(row);
        }
        $("qs-count").textContent = `${channels.length} canales en el archivo local; los cambios no se escriben automaticamente en la radio.`;
        planning?.refreshTemplates();
      }
      renderCodeplug = renderQuansheng;
      $("qs-select-all").addEventListener("change", () => {
        document.querySelectorAll("[data-qs-channel]").forEach(input => { input.checked = $("qs-select-all").checked; });
      });
      attach("qs-scan-apply", "Asignar lista de escaneo Quansheng", async () => {
        R.assert(image, "Abre o lee primero una configuracion Quansheng.");
        R.assert($("qs-scan-list").value !== "", "Introduce una lista de escaneo entre 0 y 25.");
        const numbers = [...document.querySelectorAll("[data-qs-channel]:checked")].map(input => Number(input.dataset.qsChannel));
        image = R.assignQuanshengScanList(image, numbers, Number($("qs-scan-list").value));
        renderQuansheng();
        log(`${numbers.length} canales asignados a la lista ${$("qs-scan-list").value}. Guarda la configuracion local.`);
      });
      attach("qs-read", "Leer configuracion Quansheng", async () => {
        image = await connector.readConfiguration();
        originalConfiguration = image.slice();
        renderQuansheng();
      });
      attach("qs-save", "Guardar configuracion Quansheng", async () => {
        R.assert(image, "Lee o abre primero una configuracion Quansheng.");
        const result = await saveLocalFile("quansheng-f4hwn-v6-config-41344.bin", image);
        log(result === "saved" ? "Configuracion escrita y archivo cerrado en el destino elegido." :
          "Descarga de configuracion solicitada. Comprueba Descargas; este navegador no confirma que se haya guardado.");
      });
      attach("qs-backup", "Backup de canales del banco activo", async () => {
        const snapshot = await connector.readConfiguration();
        R.readQuanshengChannels(snapshot);
        const sha256 = await R.sha256(snapshot);
        const name = `quansheng-backup-banco-activo-${new Date().toISOString().replace(/[:.]/g, "-")}.bin`;
        const result = await saveLocalFile(name, snapshot);
        $("qs-backup-result").textContent = `${snapshot.length} bytes; SHA-256 ${sha256}. ${result === "saved" ?
          "Archivo escrito y cerrado." : "Descarga solicitada; comprueba Descargas."} No es Flash completa.`;
        log($("qs-backup-result").textContent);
      });
      $("qs-restore").addEventListener("click", () => {
        if (!busy && !catTracking) $("qs-restore-file").click();
      });
      $("qs-restore-file").addEventListener("change", () => action("Preparar Restore de canales", async () => {
        try {
          const file = $("qs-restore-file").files[0];
          R.assert(file?.size === R.QUANSHENG_CONFIG_SIZE, "Restore requiere un binario de configuracion de 41344 bytes.");
          R.assert(originalConfiguration && connector?.connected, "Conecta y lee primero el banco activo de destino.");
          const backup = new Uint8Array(await file.arrayBuffer());
          const restored = R.restoreQuanshengChannels(backup, originalConfiguration);
          if (!root.confirm("Reemplazar los canales de la edicion local por esta copia? Los ajustes del banco leido se conservan. Todavia no se escribe en la radio.")) {
            log("Restore local cancelado.");
            return;
          }
          image = restored;
          editNumber = null;
          $("qs-channel-form").hidden = true;
          renderQuansheng();
          log("Restore preparado solo en memoria. Revisa canales y usa Escribir y releer canales con respaldo completo y confirmacion.");
        } finally { $("qs-restore-file").value = ""; }
      }));
      attach("qs-write", "Escribir canales Quansheng Beta", async () => {
        R.assertBackup(connector, permit);
        R.assert(image && originalConfiguration, "Lee primero la configuracion de esta radio.");
        if (!consent("Se modificaran memorias del banco activo. No apagues la radio durante la escritura.", "ESCRIBIR")) { log("Escritura cancelada."); return; }
        await connector.writeConfiguration(image, originalConfiguration, permit);
        originalConfiguration = image.slice();
        log("Canales releidos byte a byte. Reinicia la radio manualmente para recargar sus caches.");
      });
      $("qs-file").addEventListener("change", () => action("Abrir configuracion Quansheng", async () => {
        const file = $("qs-file").files[0];
        R.assert(file?.size === R.QUANSHENG_CONFIG_SIZE, "La configuracion debe tener exactamente 41344 bytes.");
        const next = new Uint8Array(await file.arrayBuffer());
        R.readQuanshengChannels(next);
        image = next;
        editNumber = null;
        $("qs-channel-form").hidden = true;
        renderQuansheng();
      }));
      $("qs-channel-cancel").addEventListener("click", () => {
        editNumber = null;
        $("qs-channel-form").reset();
        $("qs-channel-form").hidden = true;
      });
      $("qs-channel-form").addEventListener("submit", event => {
        event.preventDefault();
        action("Actualizar canal Quansheng local", async () => {
          R.assert(image && editNumber !== null, "Selecciona primero un canal Quansheng.");
          image = R.updateQuanshengChannel(image, {
            number: editNumber, name: $("qs-channel-name").value,
            rx: $("qs-channel-rx").value, tx: $("qs-channel-tx").value,
            scanList: Number($("qs-channel-scan").value)
          });
          editNumber = null;
          $("qs-channel-form").reset();
          $("qs-channel-form").hidden = true;
          renderQuansheng();
        });
      });
    } else {
      operations.innerHTML = `<h2>Codeplug OpenGD77</h2><p class="muted">Al conectar se inicia automaticamente la copia de calibracion y codeplug estandar de 128 KiB. El firmware MCU original no se puede respaldar de forma integral con el protocolo verificado actual: la copia es parcial y bloquea posteriores operaciones de radio, incluso lecturas adicionales. El archivo de la copia se abre para edicion offline. No incluye canales extendidos 1025+.</p>
        <div class="operation-buttons"><button id="read-codeplug" data-connected class="button secondary" type="button" disabled>Leer codeplug</button><button id="write-codeplug" data-write class="button primary" type="button" disabled>Escribir codeplug</button><button id="save-codeplug" class="button secondary" type="button">Guardar binario 128 KiB</button></div>
        <label for="codeplug-file">Abrir codeplug binario de 128 KiB (no JSON del CPS ni firmware)</label><input id="codeplug-file" type="file" accept=".bin,.g77">
        <div class="table-scroll"><table><thead><tr><th>Canal</th><th>Nombre</th><th>RX MHz</th><th>TX MHz</th><th>Modo</th><th>Editar</th></tr></thead><tbody id="channels-body"></tbody></table></div>
        <form id="channel-form" hidden><h3>Editar canal existente</h3>
        <label for="channel-name">Nombre ASCII</label><input id="channel-name" maxlength="16" required>
        <label for="channel-rx">RX MHz</label><input id="channel-rx" inputmode="decimal" required>
        <label for="channel-tx">TX MHz</label><input id="channel-tx" inputmode="decimal" required>
        <label for="channel-mode">Modo</label><select id="channel-mode"><option value="0">FM</option><option value="1">DMR</option></select>
        <label for="channel-color">Color Code</label><input id="channel-color" type="number" min="0" max="15" required>
        <label for="channel-slot">Time Slot</label><select id="channel-slot"><option value="1">1</option><option value="2">2</option></select>
        <label class="check"><input id="channel-rxonly" type="checkbox"> Solo recepcion (TX deshabilitada)</label>
        <button class="button primary" type="submit">Aplicar al archivo local</button></form>
        <p class="card-note">Se preservan los campos no editados. No se crean canales con valores arbitrarios. Las frecuencias se validan como BCD, no como autorizacion legal para transmitir.</p>`;
      function renderChannels() {
        const channels = R.readChannels(image);
        $("channel-form").hidden = true;
        editNumber = null;
        $("channels-body").replaceChildren();
        for (const channel of channels) {
          const row = document.createElement("tr");
          for (const value of [channel.number, channel.name, channel.rx, channel.tx, ["FM", "DMR", "FM+", "AM"][channel.mode] || "Desconocido"]) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.append(cell);
          }
          const cell = document.createElement("td");
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "Editar";
          button.className = "guide-tab";
          button.disabled = ![0, 1].includes(channel.mode);
          button.addEventListener("click", () => {
            if (busy) return;
            editNumber = channel.number;
            for (const [id, key] of [["name", "name"], ["rx", "rx"], ["tx", "tx"], ["mode", "mode"], ["color", "colorCode"], ["slot", "timeslot"]]) $(`channel-${id}`).value = channel[key];
            $("channel-rxonly").checked = channel.rxOnly;
            $("channel-form").hidden = false;
            $("channel-name").focus();
          });
          cell.append(button);
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "guide-tab";
          remove.textContent = "Borrar del archivo";
          remove.addEventListener("click", () => action("Borrar canal local OpenGD77", async () => {
            if (!pro.checked && !root.confirm(`Quitar canal ${channel.number} del archivo y sus referencias en zonas/listas? La radio no se modifica.`)) return;
            image = R.deleteChannel(image, channel.number);
            renderChannels();
          }));
          cell.append(remove);
          row.append(cell);
          $("channels-body").append(row);
        }
        log(`${channels.length} canales estandar cargados.`);
        planning?.refreshTemplates();
      }
      renderCodeplug = renderChannels;
      attach("read-codeplug", "Leer codeplug", async () => { image = await connector.readCodeplug(permit); renderChannels(); });
      attach("save-codeplug", "Guardar codeplug", async () => { R.assert(image, "No hay codeplug cargado."); download("codeplug-128k.bin", image); });
      attach("write-codeplug", "Escribir codeplug", async () => {
        R.assertBackup(connector, permit);
        if (!consent("Se modificara el codeplug de la radio.", "ESCRIBIR")) { log("Escritura cancelada."); return; }
        await connector.writeCodeplug(image, permit);
      });
      $("codeplug-file").addEventListener("change", () => action("Abrir codeplug", async () => {
        const file = $("codeplug-file").files[0];
        R.assert(file && file.size === 0x20000, "El archivo debe tener exactamente 131072 bytes.");
        const next = new Uint8Array(await file.arrayBuffer());
        R.readChannels(next);
        image = next;
        renderChannels();
      }));
      $("channel-form").addEventListener("submit", event => {
        event.preventDefault();
        action("Editar canal local", async () => {
          image = R.updateChannel(image, {
            number: editNumber, name: $("channel-name").value, rx: $("channel-rx").value, tx: $("channel-tx").value,
            mode: Number($("channel-mode").value), colorCode: Number($("channel-color").value), timeslot: Number($("channel-slot").value),
            rxOnly: $("channel-rxonly").checked
          });
          renderChannels();
        });
      });
    }
    planning = R.mountPlanningUI({
      page, model, action, download, saveFile: saveLocalFile, log,
      cat: page === "quansheng" ? {
        connector: () => {
          R.assert(!factoryControls?.pending(), "Completa la recuperacion de fabrica antes de iniciar CAT.");
          R.assert(!live, "Pausa el visor LCD antes de iniciar el seguimiento CAT; comparten el puerto.");
          R.assert($("cat-firmware-confirmed").checked, "Confirma la imagen Satelites CAT v1 en el panel CAT antes de seguir el pase.");
          R.assert(connector?.connected && !connector.transport.error && !connector.busy,
            "Conecta primero la radio con firmware Bricohams CAT y habilita SAT RX con 8.");
          return connector;
        },
        setTracking(value) { catTracking = value; state(); },
        error: fail
      } : null,
      templates: () => image ? page === "quansheng" ? R.readQuanshengChannels(image).filter(channel => channel.mode === 0) : R.readChannels(image) : [],
      importChannels(channels, template, options = {}) {
        R.assert(image, page === "quansheng" ? "Abre o lee primero una configuracion Quansheng F4HWN v6." : "Abre o lee primero un codeplug estandar OpenGD77 de 128 KiB.");
        const grouped = page === "quansheng" ? R.groupQuanshengChannels(image, channels, options.groupBy || "none", options.scanList ?? 25) : { channels, groups: [] };
        const result = page === "quansheng" ? R.appendQuanshengChannels(image, grouped.channels, template, options) : R.appendChannels(image, channels, template);
        const decoded = page === "quansheng" ? R.readQuanshengChannels(result.image) : R.readChannels(result.image);
        for (const entry of channels) {
          const storedName = entry.name.slice(0, page === "quansheng" ? 10 : 16);
          R.assert(decoded.some(channel => channel.name === storedName && channel.rx === entry.rx &&
            channel.tx === entry.tx && channel.mode === entry.mode && channel.rxOnly),
          `El parser no puede volver a leer el canal ${entry.name}; se conserva el archivo anterior.`);
        }
        image = result.image;
        renderCodeplug();
        return { ...result, verified: channels.length, groups: grouped.groups };
      },
      importContacts(contacts) {
        R.assert(page === "opengd77" && image, "Abre o lee primero un codeplug estandar OpenGD77 de 128 KiB.");
        const result = R.appendContacts(image, contacts);
        image = result.image;
        renderCodeplug();
        return result;
      },
      importSatellites(satellites) {
        R.assert(page === "opengd77" && image, "Abre o lee primero un codeplug estandar OpenGD77 de 128 KiB.");
        const result = R.writeSatellites(image, satellites);
        image = result.image;
        renderCodeplug();
        return { ...result, satellites: R.readSatellites(image) };
      },
      readSatellites() {
        R.assert(page === "opengd77" && image, "Abre o lee primero un codeplug estandar OpenGD77 de 128 KiB.");
        return R.readSatellites(image);
      }
    });
    const useImage = (data, edition) => {
      if (data && page === "quansheng") R.inspectQuanshengSlotImage(data);
      slotImage = data;
      $("slot-file").value = "";
      $("slot-name").value = edition;
      log(data ? "Imagen preparada para slot; no se ha modificado la radio." : "Modelo cambiado: imagen de slot eliminada de la seleccion.");
      state();
    };
    R.mountFirmwareCatalog({ page, model, action, download, log, useImage })
      .catch(error => log(`ERROR: catalogo de firmware no disponible: ${error.message}`));
    R.mountCustomFirmware?.({ page, action, log, useImage });
    if (page === "quansheng") R.mountPrecompiledApps({ model, action, log, useApp, download })
      .catch(error => {
        $("precompiled-app-info").textContent = `ERROR: ${error.message}`;
        log(`ERROR: catalogo apps: ${error.message}`);
      });
    if (page === "quansheng") R.mountQuanshengTools({
      action, download, log, getConnector: () => connector, getPermit: () => permit
    });
    if (page === "quansheng") factoryControls = R.mountFactoryRestore({
      model, action, log, getConnector: () => connector, getPermit: () => permit,
      onProgress: ({ value, message }) => { $("radio-progress").value = value; status.textContent = message; }
    });
    if (page === "quansheng") R.mountPrecompiledCatalog({ model, action, log, useImage, download })
      .catch(error => {
        $("precompiled-info").textContent = `ERROR: ${error.message}`;
        log(`ERROR: catalogo precompilado: ${error.message}`);
      });
    async function connectRadio(withBackup) {
      permit = null;
      originalConfiguration = null;
      if (withBackup) await stored();
      connector = page === "quansheng" ? new R.QuanshengConnector() : new R.GD77Connector(model.value);
      const activeConnector = connector;
      connector.onProgress = ({ value, message }) => { $("radio-progress").value = value; status.textContent = `${message} (${Math.round(value * 100)}%)`; };
      connector.transport.onDisconnect = error => {
        if (connector !== activeConnector) return;
        R.revokeBackup(connector);
        permit = null;
        connector.connected = false;
        $("backup-status").textContent = "Conexion perdida: permiso de escritura revocado. Se requiere nuevo respaldo.";
        fail(error);
        state();
      };
      const info = await connector.connect(model.value);
      log(`Radio: ${info.model}; firmware: ${info.firmware}.`);
      if (page === "quansheng") {
        rfRows = [];
        $("qs-rf-body").replaceChildren();
        $("qs-rf-export").disabled = true;
        $("qs-rf-status").textContent = "Nueva conexion: esperando registros de esta radio.";
        $("qs-rf-body").dispatchEvent(new Event("rf-rows-updated"));
      }
      if (!withBackup) {
        $("backup-status").textContent = "Sesion solo lectura / CAT: sin respaldo ni permiso de escritura persistente.";
        log("Conexion solo lectura / CAT. No se ha creado respaldo; escrituras persistentes bloqueadas.");
        autoLivePending = page === "quansheng";
        return;
      }
      if (navigator.storage?.persist) {
        const persistent = await navigator.storage.persist();
        log(persistent ? "Almacenamiento persistente concedido." : "Persistencia no garantizada por el navegador: exporta las copias.");
      }
      const result = await new R.BackupManager(store).create(connector, record => {
        $("backup-status").textContent = `${record.status}: ${record.files.map(file => file.name).join(", ") || "iniciando"} ${record.scope}`;
      });
      log(result.record.scope);
      download(`radio-backup-${result.record.id}.rwb.json`, await R.exportBackup(result.record), "application/json");
      permit = result.permit;
      log("Exportacion automatica solicitada al navegador. Comprueba Descargas; el historial permite repetirla.");
      if (page === "quansheng") {
        image = result.record.files.find(file => file.name === "configuration")?.bytes.slice() || await connector.readConfiguration();
        if (image) {
          originalConfiguration = image.slice();
          renderCodeplug();
        }
      } else {
        image = result.record.files.find(file => file.name === "codeplug")?.bytes.slice() || null;
        if (image) {
          renderCodeplug();
          log("Codeplug de la copia parcial abierto para edicion offline. Firmware original no respaldado: operaciones adicionales de radio bloqueadas.");
        }
      }
      await history();
      autoLivePending = page === "quansheng";
    }
    attach("radio-connect", "Conectar y crear respaldo automatico", () => connectRadio(true));
    if ($("qs-connect-readonly")) attach("qs-connect-readonly", "Conectar Quansheng solo lectura / CAT", () => connectRadio(false));
    attach("radio-disconnect", "Desconectar", async () => {
      permit = null;
      R.revokeBackup(connector);
      await connector.disconnect();
      connector = null;
      $("backup-status").textContent = "Escrituras bloqueadas: nueva sesion requiere nuevo respaldo.";
    });
    attach("refresh-backups", "Consultar historial local", history);
    model.addEventListener("change", state);
    confirmation.addEventListener("change", state);
    pro.addEventListener("change", () => {
      log(pro.checked ? "Modo PRO activo para esta sesion: sin confirmaciones repetitivas; protecciones de escritura intactas." : "Modo normal: confirmaciones activas.");
      state();
    });
    root.addEventListener("beforeunload", event => {
      if (busy || connector && !pro.checked) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
    document.querySelectorAll('a[href$=".html"]').forEach(link => link.addEventListener("click", event => {
      if (busy || connector) {
        event.preventDefault();
        status.textContent = busy ? "No navegues durante una operacion." : "Desconecta la radio antes de cambiar de pagina.";
      }
    }));
    if (!root.isSecureContext) status.textContent = "Se requiere localhost o HTTPS para los conectores.";
    else status.textContent = "Sin conexion. Al conectar comenzara el respaldo automatico.";
    state();
  }
  Object.assign(R, { mountRadioUI });
})(globalThis);
