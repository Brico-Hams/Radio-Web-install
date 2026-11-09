// TK-11 panel: settings, channels and memory backup/restore. There is deliberately no firmware flashing here.
(function (root) {
  const R = root.RadioWorkspace;
  const T = R.TK11;
  const el = (tag, props = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === "text") node.textContent = value;
      else if (key === "translate" || key.includes("-")) node.setAttribute(key, value);
      else if (key in node) node[key] = value;
      else node.setAttribute(key, value);
    }
    node.append(...children);
    return node;
  };
  const button = (text, onclick) => el("button", { type: "button", className: "button", text, onclick });
  const download = (name, data, type) => {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const link = el("a", { href: url, download: name });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  function mountTK11UI(main) {
    if (!main || main.querySelector("#tk11-panel")) return;
    const store = new R.BackupStore();
    let connector = null;
    let permit = null;
    let memory = null;
    let channels = [];
    let busy = false;
    const status = el("p", { id: "tk11-status", role: "status", text: "TK-11 sin conexion." });
    const firmware = el("span", { id: "tk11-firmware", translate: "no" });
    const settingsBody = el("tbody", { id: "tk11-settings-body" });
    const channelsBody = el("tbody", { id: "tk11-channels-body" });
    const hexView = el("pre", { id: "tk11-hex", translate: "no", tabIndex: 0 });
    const fileInput = el("input", { type: "file", accept: ".bin", id: "tk11-restore-file", hidden: true });
    const csvInput = el("input", { type: "file", accept: ".csv,text/csv", id: "tk11-import-csv-file", hidden: true });
    const templateSelect = el("select", { id: "tk11-template-country", "aria-label": "Pais de la plantilla" },
      el("option", { value: "", text: "Selecciona un pais" }),
      ...R.TEMPLATE_COUNTRIES.map(country => el("option", { value: country.code, text: country.name })));
    const hexOffset = el("input", { type: "text", id: "tk11-hex-offset", value: "0", size: 8, translate: "no", "aria-label": "Desplazamiento hexadecimal" });
    const buttons = {};
    const refresh = () => {
      const connected = Boolean(connector?.connected && !connector.transport.error);
      if (permit && !R.hasBackup(connector, permit)) permit = null;
      for (const [key, node] of Object.entries(buttons)) {
        if (key === "connect") node.disabled = busy || Boolean(connector) || !("serial" in navigator);
        else if (key === "disconnect") node.disabled = busy || !connector;
        else if (["write-settings", "write-channels", "restore"].includes(key)) node.disabled = busy || !connected || !permit || !memory;
        else if (key === "csv" || key === "csv-tk11") node.disabled = !channels.some(Boolean);
        else if (key === "import-csv") node.disabled = busy;
        else if (key === "download") node.disabled = !memory;
        else if (key === "hex") node.disabled = !memory;
        else if (key === "template") node.disabled = busy || !templateSelect.value;
        else node.disabled = busy || !connected;
      }
    };
    const fail = error => { status.textContent = `ERROR: ${error.message}`; status.dataset.error = "true"; };
    async function action(label, operation) {
      if (busy) return;
      busy = true;
      delete status.dataset.error;
      status.textContent = label;
      refresh();
      try { await operation(); }
      catch (error) { fail(error); }
      finally { busy = false; refresh(); }
    }
    function renderSettings() {
      const values = T.decodeSettings(memory);
      settingsBody.replaceChildren(...T.SETTINGS.map(item => {
        let control;
        if (!item.editable) control = el("span", { text: String(values[item.key]), translate: "no" });
        else if (item.kind === "option") {
          control = el("select", { "aria-label": item.label }, ...item.options.map((label, index) => el("option", { value: String(index), text: label, translate: "no" })));
          control.value = String(values[item.key]);
        } else if (item.kind === "range") {
          control = el("input", { type: "number", min: item.min, max: item.max, step: item.step, value: String(values[item.key]), "aria-label": item.label });
        } else control = el("input", { type: "text", maxLength: item.max, value: values[item.key], "aria-label": item.label });
        control.dataset.key = item.key;
        return el("tr", {}, el("td", { text: item.label }), el("td", {}, control), el("td", { text: item.editable ? "" : "Solo lectura" }));
      }));
    }
    function collectSettings() {
      const changes = {};
      const values = T.decodeSettings(memory);
      for (const control of settingsBody.querySelectorAll("[data-key]")) {
        const item = T.SETTINGS.find(entry => entry.key === control.dataset.key);
        const value = item.kind === "text" ? control.value : Number(control.value);
        if (value !== values[item.key]) changes[item.key] = value;
      }
      return changes;
    }
    function renderChannels() {
      const rows = [];
      channels.forEach((channel, index) => {
        if (!channel) return;
        const name = el("input", { type: "text", maxLength: 16, value: channel.name, "aria-label": `Nombre del canal ${index + 1}`, translate: "no" });
        const frequency = el("input", { type: "number", step: "0.00001", value: (channel.rxHz / 1e6).toFixed(5), "aria-label": `Frecuencia RX del canal ${index + 1}` });
        name.oninput = () => { channel.name = name.value; };
        frequency.onchange = () => { channel.rxHz = Math.round(Number(frequency.value) * 1e6 / 10) * 10; };
        rows.push(el("tr", {},
          el("td", { text: String(index + 1) }), el("td", {}, name), el("td", {}, frequency),
          el("td", { text: (channel.offsetHz / 1e6).toFixed(5), translate: "no" }), el("td", { text: channel.direction || "-", translate: "no" }),
          el("td", { text: channel.mode, translate: "no" }), el("td", { text: channel.power, translate: "no" })));
      });
      channelsBody.replaceChildren(...rows);
      refresh();
    }
    function showHex() {
      const start = Math.min(parseInt(hexOffset.value, 16) || 0, T.MEMORY_SIZE - 1) & ~15;
      hexView.textContent = T.hexDump(memory, start, Math.min(0x400, T.MEMORY_SIZE - start));
    }
    async function load() {
      memory = await connector.readMemory();
      channels = T.decodeChannels(memory);
      renderSettings();
      renderChannels();
      showHex();
    }
    buttons.connect = button("Conectar TK-11 y crear respaldo", () => action("Conectando con el TK-11 y creando la copia completa (varios minutos)", async () => {
      await (store.db ? Promise.resolve() : store.open());
      connector = new R.TK11Connector();
      const active = connector;
      connector.onProgress = ({ value, message }) => { status.textContent = `${message} (${Math.round(value * 100)}%)`; };
      connector.transport.onDisconnect = error => {
        if (connector !== active) return;
        R.revokeBackup(connector);
        permit = null;
        connector.connected = false;
        fail(error);
        refresh();
      };
      const info = await connector.connect("TK-11");
      firmware.textContent = info.firmware;
      const result = await new R.BackupManager(store).create(connector);
      permit = result.permit;
      const files = Object.fromEntries(result.record.files.map(file => [file.name, file.bytes]));
      download(`tk11-memory-${result.record.id}.bin`, files.memory, "application/octet-stream");
      download(`tk11-manifest-${result.record.id}.json`, files.manifest, "application/json");
      await load();
      status.textContent = "Copia verificada y descargada. Escritura habilitada en esta sesion.";
    }));
    buttons.disconnect = button("Desconectar TK-11", () => action("Desconectando", async () => {
      R.revokeBackup(connector);
      permit = null;
      await connector.disconnect();
      connector = null;
      status.textContent = "TK-11 sin conexion.";
    }));
    buttons.reload = button("Releer ajustes y canales", () => action("Leyendo el TK-11", async () => {
      await load();
      status.textContent = "Lectura completada.";
    }));
    buttons["write-settings"] = button("Escribir ajustes", () => action("Escribiendo ajustes", async () => {
      const changes = collectSettings();
      if (!Object.keys(changes).length) { status.textContent = "No hay cambios en los ajustes."; return; }
      await connector.writeSettings(changes, permit);
      await load();
      status.textContent = "Ajustes escritos y verificados.";
    }));
    buttons["write-channels"] = button("Escribir canales", () => action("Escribiendo canales", async () => {
      await connector.writeChannels(channels, permit);
      await load();
      status.textContent = "Canales escritos y verificados.";
    }));
    buttons.restore = button("Restaurar copia de memoria", () => fileInput.click());
    fileInput.onchange = () => action("Restaurando la copia de memoria", async () => {
      const file = fileInput.files[0];
      fileInput.value = "";
      R.assert(file && file.size === T.MEMORY_SIZE, "La copia debe ser un archivo .bin de memoria TK-11 completo.");
      const report = await connector.restore(new Uint8Array(await file.arrayBuffer()), permit);
      await load();
      status.textContent = report.written ? "Copia restaurada y verificada. La calibracion y las zonas desconocidas no se tocan." : "La radio ya coincide con la copia.";
    });
    buttons.download = button("Descargar memoria leida", () => download("tk11-memory.bin", memory, "application/octet-stream"));
    buttons.csv = button("Exportar canales (CSV)", () => download("tk11-channels.csv", T.channelsToCsv(channels), "text/csv"));
    buttons["csv-tk11"] = button("Exportar CSV TK-11 Manager", () => download("tk11-manager-channels.csv", T.channelsToTk11Csv(channels), "text/csv"));
    buttons["import-csv"] = button("Importar CSV (TK-11 o CHIRP)", () => csvInput.click());
    csvInput.onchange = () => action("Leyendo el CSV", async () => {
      const file = csvInput.files[0];
      csvInput.value = "";
      R.assert(file && file.size <= 2 * 1024 * 1024, "Selecciona un archivo CSV de menos de 2 MB.");
      const result = T.channelsFromCsv(await file.text());
      R.assert(result.channels.some(Boolean), "El CSV no contiene ningun canal valido.");
      channels = result.channels;
      renderChannels();
      status.textContent = `${channels.filter(Boolean).length} canales importados del CSV; ${result.skipped.length} filas omitidas. La radio no se modifica hasta pulsar Escribir canales.`;
    });
    buttons.template = button("Importar plantilla de pais", () => action("Cargando plantilla", async () => {
      const code = templateSelect.value;
      const response = await fetch(`data/channel-templates/${code}.json`);
      R.assert(response.ok, "No se pudo descargar la plantilla.");
      const entries = R.countryTemplateChannels(await response.json(), {});
      channels = T.channelsFromTemplate(entries.slice(0, T.CHANNELS));
      renderChannels();
      status.textContent = "Plantilla cargada en la tabla. La radio no se modifica hasta pulsar Escribir canales.";
    }));
    buttons.hex = button("Ver memoria en hexadecimal", () => { if (memory) showHex(); });
    templateSelect.onchange = refresh;
    main.append(el("section", { id: "tk11-panel", className: "panel" },
      el("h2", { text: "TK-11 (Quansheng)" }),
      el("p", { className: "notice", text: "Sin flasheo de firmware para el TK-11: no existe un protocolo de actualizacion publico y el riesgo de dejar la radio inservible es alto. Este panel solo lee y escribe ajustes, canales y copia de memoria." }),
      el("p", { text: "Solo se escribe en zonas confirmadas por el driver CHIRP; la calibracion y las zonas desconocidas nunca se modifican. Toda escritura exige antes una copia completa verificada con dos lecturas identicas." }),
      el("p", {}, el("span", { text: "Firmware de la radio:" }), " ", firmware),
      el("div", { className: "actions" }, buttons.connect, buttons.disconnect, buttons.reload, buttons.download, buttons.restore, fileInput),
      status,
      el("h3", { text: "Ajustes" }),
      el("table", {}, el("thead", {}, el("tr", {}, el("th", { text: "Ajuste" }), el("th", { text: "Valor" }), el("th", { text: "Estado" }))), settingsBody),
      el("div", { className: "actions" }, buttons["write-settings"]),
      el("h3", { text: "Canales (999)" }),
      el("div", { className: "actions" }, templateSelect, buttons.template, buttons["import-csv"], csvInput, buttons.csv, buttons["csv-tk11"], buttons["write-channels"]),
      el("table", {}, el("thead", {}, el("tr", {}, el("th", { text: "Canal" }), el("th", { text: "Nombre" }), el("th", { text: "RX MHz" }),
        el("th", { text: "Desplazamiento MHz" }), el("th", { text: "Direccion" }), el("th", { text: "Modo" }), el("th", { text: "Potencia" }))), channelsBody),
      el("h3", { text: "Memoria" }),
      el("div", { className: "actions" }, hexOffset, buttons.hex),
      hexView));
    refresh();
  }
  Object.assign(R, { mountTK11UI });
})(globalThis);
