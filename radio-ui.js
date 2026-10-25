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
  function mountRadioUI(page) {
    const store = new R.BackupStore();
    let connector = null;
    let permit = null;
    let busy = false;
    let image = null;
    let originalConfiguration = null;
    let slotImage = null;
    let editNumber = null;
    let planning = null;
    let renderCodeplug = null;
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
      $("radio-disconnect").disabled = busy || !connector;
      model.disabled = busy || Boolean(connector);
      confirmation.disabled = busy || Boolean(connector);
      pro.disabled = busy || Boolean(connector);
      $("launch").disabled = busy || Boolean(connector) || !model.value || !(confirmation.checked || pro.checked);
      document.querySelectorAll("[data-connected]").forEach(button => { button.disabled = busy || !connected || page === "opengd77" && !permit; });
      document.querySelectorAll("[data-write]").forEach(button => { button.disabled = busy || !connected || !permit; });
      if ($("write-codeplug")) $("write-codeplug").disabled = busy || !connected || !permit || !image;
      if ($("qs-write")) $("qs-write").disabled = busy || !connected || !permit || !image || !originalConfiguration;
      if ($("slot-install")) $("slot-install").disabled = busy || !connected || !permit || !slotImage;
      document.querySelectorAll("#radio-operations input, #radio-operations select").forEach(input => { input.disabled = busy; });
      $("backup-status").dataset.ready = Boolean(permit);
      planning?.setBusy(busy);
    };
    async function action(label, operation) {
      if (busy) return;
      busy = true;
      state();
      delete status.dataset.error;
      status.textContent = label;
      $("radio-progress").value = 0;
      log(label);
      try {
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
    if (page === "quansheng") {
      operations.innerHTML = `<h2>Firmware Slots / Multiconfig</h2>
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
        <div class="operation-buttons"><button id="app-install" data-write class="button primary" type="button" disabled>Instalar app y verificar</button><button id="app-delete" data-write class="button secondary" type="button" disabled>Borrar app del hueco</button></div>`;
      const slot = () => Number($("slot-number").value);
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
      const appSlot = () => Number($("app-slot").value);
      async function refreshApps() {
        const apps = await connector.listApps();
        $("apps-body").replaceChildren();
        const previous = $("app-slot").value;
        $("app-slot").replaceChildren(...apps.map(item => new Option(`${item.slot + 1} · ${item.status === 2 ? "vacio" : item.name}`, item.slot)));
        $("app-slot").value = previous || String(apps.find(item => item.status === 2)?.slot ?? 0);
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
        <label for="qs-file">Abrir configuracion logica F4HWN v6 de 41344 bytes (no firmware, Flash completa ni calibracion)</label><input id="qs-file" type="file" accept=".bin">
        <p id="qs-count" role="status">Lee o abre una configuracion para ver los canales.</p>
        <div class="table-scroll"><table><thead><tr><th>Canal</th><th>Nombre</th><th>RX MHz</th><th>TX nominal MHz</th><th>Modo</th><th>TX bloqueada</th><th>Archivo local</th></tr></thead><tbody id="qs-channels"></tbody></table></div>`);
      function renderQuansheng() {
        const channels = R.readQuanshengChannels(image);
        $("qs-channels").replaceChildren();
        for (const channel of channels) {
          const row = document.createElement("tr");
          for (const value of [channel.number, channel.name, channel.rx, channel.tx,
            channel.mode === 0 ? "FM" : `Modulacion ${channel.mode}`, channel.rxOnly ? "Si" : "No"]) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.append(cell);
          }
          const cell = document.createElement("td");
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "guide-tab";
          remove.textContent = "Borrar del archivo";
          remove.addEventListener("click", () => action("Borrar canal local Quansheng", async () => {
            if (!pro.checked && !root.confirm(`Quitar canal ${channel.number} del archivo local? La radio no se modifica.`)) return;
            image = R.deleteQuanshengChannel(image, channel.number);
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
      attach("qs-read", "Leer configuracion Quansheng", async () => {
        image = await connector.readConfiguration();
        originalConfiguration = image.slice();
        renderQuansheng();
      });
      attach("qs-save", "Guardar configuracion Quansheng", async () => {
        R.assert(image, "Lee o abre primero una configuracion Quansheng.");
        download("quansheng-f4hwn-v6-config-41344.bin", image);
      });
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
        renderQuansheng();
      }));
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
      page, model, action, download, log,
      templates: () => image ? page === "quansheng" ? R.readQuanshengChannels(image).filter(channel => channel.mode === 0) : R.readChannels(image) : [],
      importChannels(channels, template) {
        R.assert(image, page === "quansheng" ? "Abre o lee primero una configuracion Quansheng F4HWN v6." : "Abre o lee primero un codeplug estandar OpenGD77 de 128 KiB.");
        const result = page === "quansheng" ? R.appendQuanshengChannels(image, channels, template) : R.appendChannels(image, channels, template);
        image = result.image;
        renderCodeplug();
        return result;
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
    attach("radio-connect", "Conectar y crear respaldo automatico", async () => {
      permit = null;
      originalConfiguration = null;
      await stored();
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
        image = result.record.files.find(file => file.name === "configuration")?.bytes.slice() || null;
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
    });
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
