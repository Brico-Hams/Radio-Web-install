(function () {
  // Installable shell: caches static assets only (remote-sw.js never touches /api or tokens).
  if (typeof navigator !== "undefined" && navigator.serviceWorker && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("remote-sw.js", { scope: "./remoto.html" }).catch(() => {});
  }
  "use strict";
  const EMPTY = "—";
  const show = value => (value === null || value === undefined || value === "" ? EMPTY : String(value));

  // Remote features per radio from data/remote-feature-parity.json: every control is listed, unsupported ones are greyed out with the reason.
  const FEATURE_LABELS = {
    freqMode: "Frecuencia y modo", vfoSplit: "VFO / split", ptt: "PTT (explicito, con limite de tiempo)", smeter: "S-metro",
    txMeters: "Medidores TX (PO / ROE / ALC)", tune: "Tune (portadora explicita)", audioRx: "Audio RX", audioTx: "Audio TX",
    waterfall: "Cascada de audio", rotor: "Rotor", accessories: "Sintonizador y amplificador", settings: "Ajustes remotos"
  };
  const STATUS_TEXT = { ok: "disponible", partial: "parcial", pendiente: "pendiente de fuente", na: "no aplica" };

  function parityView(parity, radioId) {
    const row = parity && Array.isArray(parity.rows) ? parity.rows.find(item => item.id === radioId) : null;
    const family = row && parity.families ? parity.families[row.family] || {} : {};
    const statuses = row ? row.features || family.features : null;
    if (!statuses) return [];
    return parity.featureOrder.map((feature, index) => {
      const status = statuses[index];
      return {
        feature, label: FEATURE_LABELS[feature] || feature, status, statusText: STATUS_TEXT[status] || status,
        enabled: status === "ok" || status === "partial",
        reason: (row.reasons && row.reasons[feature]) || (family.reasons && family.reasons[feature]) || ""
      };
    });
  }

  // Maps a catalog entry to the form defaults (link options and baud).
  function radioDefaults(radio) {
    const links = Array.isArray(radio && radio.links) ? radio.links : [];
    const options = [];
    if (links.includes("usb")) options.push({ value: "usb", text: "USB / serie" });
    if (links.some(link => link === "lan" || link === "wifi")) options.push({ value: "lan", text: "Red (LAN / WiFi)" });
    const baud = links.includes("usb") && radio.serial && Number(radio.serial.baud) > 0 ? Number(radio.serial.baud) : null;
    return { links: options, link: options[0] ? options[0].value : "usb", baud };
  }

  // Builds the API client; mutating methods must be POST, reads are GET.
  function createApi(getPin) {
    return async function api(path, method, body) {
      const options = { method: method || "GET", headers: {}, cache: "no-store" };
      const pin = getPin();
      if (pin) options.headers["X-Setup-Pin"] = pin;
      if (options.method !== "GET") {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body === undefined ? {} : body);
      }
      const response = await fetch(`api/remote/${path}`, options);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error || `Error ${response.status}`);
        error.pinRequired = Boolean(data.pinRequired);
        throw error;
      }
      return data;
    };
  }

  const saveConfig = (api, config) => api("config", "POST", config);
  const startStation = async (api, config) => { await saveConfig(api, config); return api("start", "POST", {}); };
  const stopStation = api => api("stop", "POST", {});

  // Device names for a select; the saved name stays selectable even when the device is not plugged in.
  function deviceNames(list, current) {
    const names = (Array.isArray(list) ? list : []).map(item => (typeof item === "string" ? item : item && item.name)).filter(name => typeof name === "string" && name);
    const unique = [...new Set(names)];
    if (current && !unique.includes(current)) unique.push(current);
    return unique;
  }

  if (typeof document === "undefined") {
    if (typeof module !== "undefined") module.exports = { radioDefaults, parityView, show, createApi, saveConfig, startStation, stopStation, deviceNames };
    return;
  }
  const main = document.getElementById("rm-main");
  const state = { catalog: null, status: null, ports: [], devices: null, audio: { input: "", output: "" }, pin: sessionStorage.getItem("radicodex-setup-pin") || "", timer: null };
  const $ = {};

  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (key === "text") node.textContent = value;
      else if (key === "class") node.className = value;
      else if (key === "on") for (const [type, handler] of Object.entries(value)) node.addEventListener(type, handler);
      else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, value === true ? "" : String(value));
    }
    for (const child of children.flat()) if (child) node.append(child);
    return node;
  }

  const api = createApi(() => state.pin);

  function say(kind, text) {
    $.msg.dataset.kind = kind;
    $.msg.textContent = text;
  }

  function field(id, label, control, hint) {
    return el("div", { class: "rm-field", id: `f-${id}` }, el("label", { for: id, text: label }), control, hint ? el("p", { class: "rm-hint", text: hint }) : null);
  }

  function pinView() {
    main.replaceChildren();
    const input = el("input", { id: "rm-pin", type: "password", inputmode: "numeric", autocomplete: "off", maxlength: 16 });
    const msg = el("p", { class: "rm-msg", role: "alert" });
    const submit = async () => {
      state.pin = input.value.trim();
      try {
        await api("status");
        sessionStorage.setItem("radicodex-setup-pin", state.pin);
        await load();
      } catch (error) {
        state.pin = "";
        msg.dataset.kind = "error";
        msg.textContent = error.message;
      }
    };
    main.append(el("section", { class: "rm-card" },
      el("h2", { text: "PIN de configuracion" }),
      el("p", { text: "Escribe el PIN de configuracion que aparece en la consola de la estacion." }),
      field("rm-pin", "PIN de configuracion", input),
      el("div", { class: "rm-row" }, el("button", { class: "rm-btn rm-btn-primary", type: "button", text: "Entrar", on: { click: submit } })),
      msg));
    input.addEventListener("keydown", event => { if (event.key === "Enter") submit(); });
  }

  function radioLabel(radio) {
    return `${radio.maker} ${radio.model}`;
  }

  function fillRadios() {
    const query = $.search.value.trim().toLowerCase();
    const current = $.radio.value;
    $.radio.replaceChildren();
    for (const radio of state.catalog.radios) {
      if (query && !`${radio.maker} ${radio.model}`.toLowerCase().includes(query) && radio.id !== current) continue;
      $.radio.append(el("option", { value: radio.id, text: `${radioLabel(radio)}${radio.status === "tested" ? " ✔" : ""}` }));
    }
    if (current) $.radio.value = current;
    syncRadio();
  }

  const selectedRadio = () => state.catalog.radios.find(radio => radio.id === $.radio.value) || null;

  function syncRadio(fromUser) {
    const radio = selectedRadio();
    $.notes.textContent = radio ? radio.notes_es : "";
    renderParity(radio);
    if (!radio) return;
    if ($.fTuner) $.fTuner.hidden = !radio.cat?.tuner;
    const defaults = radioDefaults(radio);
    $.link.replaceChildren(...defaults.links.map(option => el("option", { value: option.value, text: option.text })));
    if (!$.link.querySelector(`[value="${$.link.value}"]`)) $.link.value = defaults.link;
    if (defaults.baud !== null && (fromUser === true || !$.baud.value)) $.baud.value = String(defaults.baud);
    syncLink();
  }

  function renderParity(radio) {
    if (!$.parity) return;
    const items = radio ? parityView(state.catalog.parity, radio.id) : [];
    $.parity.replaceChildren(...items.map(item => el("li", { class: item.enabled ? "rm-feature" : "rm-feature rm-off", title: item.reason, "aria-disabled": String(!item.enabled) },
      // Separate nodes so ui-i18n translates the label and the status; the reason comes from the matrix.
      el("span", { text: item.label }), el("span", { text: ": " }), el("span", { text: item.statusText }),
      ...(item.enabled || !item.reason ? [] : [el("span", { text: " — " }), el("span", { text: item.reason })]))));
  }

  function syncLink() {
    const usb = $.link.value === "usb";
    $.fPort.hidden = !usb;
    $.fBaud.hidden = !usb;
    $.fNet.hidden = usb;
    renderPorts();
  }

  function renderPorts() {
    const radio = selectedRadio();
    $.ports.replaceChildren();
    if (!state.ports.length) $.ports.append(el("li", { text: "No se detecto ninguna radio USB." }));
    for (const port of state.ports) {
      const matches = radio && (port.radios || []).includes(radio.id);
      const label = `${port.port} - ${port.name || ""} (${port.vid}:${port.pid})${port.nonCat ? " - no CAT" : ""}${matches ? " ★" : ""}`;
      $.ports.append(el("li", {},
        el("span", { text: label }),
        port.nonCat ? null : el("button", { class: "rm-btn", type: "button", text: "Usar", on: { click: () => { $.port.value = port.port; const baud = radioDefaults(radio).baud; if (baud !== null) $.baud.value = String(baud); } } })));
    }
  }

  function fillRotors() {
    $.rotor.replaceChildren(el("option", { value: "", text: "Sin rotor" }));
    for (const rotor of state.catalog.rotors) $.rotor.append(el("option", { value: rotor.id, text: `${rotor.maker} ${rotor.model}` }));
    syncRotor();
  }

  function collect() {
    const radio = selectedRadio();
    const config = { radio: radio.id, link: $.link.value, listen: $.listen.value };
    if (radio.cat?.tuner) config.tunerKind = $.tunerKind.value;
    if (config.link === "usb") {
      config.port = $.port.value.trim();
      if ($.baud.value.trim()) config.baud = Number($.baud.value);
    } else {
      config.netAddress = $.net.value.trim();
    }
    if ($.rotor.value) {
      config.rotor = { id: $.rotor.value, port: $.rotorPort.value.trim(), motion: $.rotorMotion.checked };
      if ($.rotorParkAz.value.trim() && $.rotorParkEl.value.trim()) config.rotor.park = { azimuth: Number($.rotorParkAz.value), elevation: Number($.rotorParkEl.value) };
      if ($.rotorOffAz.value.trim()) config.rotor.azimuthOffset = Number($.rotorOffAz.value);
      if ($.rotorOffEl.value.trim()) config.rotor.elevationOffset = Number($.rotorOffEl.value);
    }
    if ($.relayUrl.value.trim()) {
      config.relay = { url: $.relayUrl.value.trim(), station: $.relayStation.value.trim() };
      if ($.relaySecret.value) config.relay.secret = $.relaySecret.value;
    }
    config.audio = { input: $.audioIn.value.trim(), output: $.audioOut.value.trim() };
    return config;
  }

  function audioControl(id, list, current) {
    const names = deviceNames(list, current);
    if (!names.length && state.devices && (state.devices.inputs?.length || state.devices.outputs?.length)) {
      return el("select", { id }, el("option", { value: "", text: "Sin audio" }));
    }
    if (!names.length) return el("input", { id, type: "text", autocomplete: "off", spellcheck: "false", value: current || "" });
    const select = el("select", { id }, el("option", { value: "", text: "Sin audio" }), names.map(name => el("option", { value: name, text: name })));
    select.value = current || "";
    return select;
  }

  function renderAudio() {
    const devices = state.devices || {};
    $.audioIn = audioControl("rm-audio-in", devices.inputs, state.audio.input);
    $.audioOut = audioControl("rm-audio-out", devices.outputs, state.audio.output);
    $.audioGrid.replaceChildren(field("rm-audio-in", "Entrada de audio de la radio (códec USB)", $.audioIn), field("rm-audio-out", "Salida de audio hacia la radio (códec USB)", $.audioOut));
  }

  async function loadDevices() {
    if ($.audioIn) state.audio = { input: $.audioIn.value.trim(), output: $.audioOut.value.trim() };
    try { state.devices = await api("devices"); } catch (error) { if (error.pinRequired) return pinView(); state.devices = null; }
    if ($.audioGrid) renderAudio();
  }

  function applyConfig(config) {
    if (!config) return;
    $.radio.value = config.radio;
    syncRadio();
    $.link.value = config.link;
    syncLink();
    $.port.value = config.port || "";
    $.baud.value = config.baud ? String(config.baud) : $.baud.value;
    $.net.value = config.netAddress || "";
    $.rotor.value = config.rotor ? config.rotor.id : "";
    $.rotorPort.value = config.rotor ? config.rotor.port : "";
    $.rotorMotion.checked = config.rotor?.motion === true;
    $.rotorParkAz.value = config.rotor?.park ? String(config.rotor.park.azimuth) : "";
    $.rotorParkEl.value = config.rotor?.park ? String(config.rotor.park.elevation) : "";
    $.rotorOffAz.value = config.rotor?.azimuthOffset !== undefined ? String(config.rotor.azimuthOffset) : "";
    $.rotorOffEl.value = config.rotor?.elevationOffset !== undefined ? String(config.rotor.elevationOffset) : "";
    syncRotor();
    $.relayUrl.value = config.relay ? config.relay.url : "";
    $.relayStation.value = config.relay ? config.relay.station : "";
    $.relaySecret.value = "";
    $.listen.value = config.listen || "local";
    $.tunerKind.value = config.tunerKind || "internal";
    state.audio = { input: config.audio?.input || "", output: config.audio?.output || "" };
    renderAudio();
  }

  async function run(action, success) {
    for (const button of main.querySelectorAll("button")) button.disabled = true;
    try {
      const result = await action();
      if (result && result.mode) state.status = result;
      say("ok", success);
      renderStatus();
    } catch (error) {
      if (error.pinRequired) return pinView();
      say("error", error.message);
    } finally {
      for (const button of main.querySelectorAll("button")) button.disabled = false;
    }
  }

  const flag = (on, yes, no) => el("span", { class: on ? "rm-on" : "rm-off", text: on ? yes : no });

  function statusRow(label, value) {
    return el("div", {}, el("dt", { text: label }), el("dd", {}, typeof value === "object" && value !== null ? value : el("span", { text: show(value) })));
  }

  function linkList(title, list) {
    const items = (list || []).filter(item => typeof item === "string" && item);
    if (!items.length) return null;
    return el("div", {}, el("h3", { text: title }), el("ul", { class: "rm-links" }, items.map(item => el("li", { text: item }))));
  }

  const onOff = (value, yes, no) => (value === null || value === undefined ? EMPTY : flag(Boolean(value), yes, no));

  function renderStatus() {
    const status = state.status;
    $.status.replaceChildren();
    if (!status) return;
    const relay = status.agent?.relay;
    $.status.append(el("dl", { class: "rm-status" },
      statusRow("Estacion", onOff(status.running, "Activo", "Parado")),
      statusRow("rigctld", onOff(status.rigctld?.running, "Activo", "Parado")),
      statusRow("Agente remoto", onOff(status.agent?.running, "Activo", "Parado")),
      statusRow("Radio", onOff(status.agent?.rigConnected, "Conectado", "Desconectado")),
      statusRow("Rele", !relay ? EMPTY : relay.configured ? onOff(relay.connected, "Conectado", "Desconectado") : el("span", { class: "rm-off", text: "Sin rele" }))));
    if (status.error) $.status.append(el("p", { class: "rm-msg", "data-kind": "error", text: show(status.error) }));
    const links = status.links || {};
    const relayLinks = links.relay && typeof links.relay === "object" ? [links.relay.console, links.relay.android] : [];
    const sections = [linkList("Consola web", links.console), linkList("Enlaces de emparejamiento", [...(links.android || []), ...relayLinks])].filter(Boolean);
    if (sections.length) $.status.append(...sections);
    $.start.hidden = Boolean(status.running);
    $.stop.hidden = !status.running;
  }

  function build() {
    main.replaceChildren();
    $.search = el("input", { id: "rm-search", type: "search", autocomplete: "off", on: { input: fillRadios } });
    $.radio = el("select", { id: "rm-radio", on: { change: () => syncRadio(true) } });
    $.notes = el("p", { class: "rm-hint" });
    $.link = el("select", { id: "rm-link", on: { change: syncLink } });
    $.port = el("input", { id: "rm-port", type: "text", autocomplete: "off", spellcheck: "false" });
    $.baud = el("input", { id: "rm-baud", type: "number", min: 300, max: 4000000 });
    $.net = el("input", { id: "rm-net", type: "text", autocomplete: "off", spellcheck: "false" });
    $.tunerKind = el("select", { id: "rm-tuner" }, el("option", { value: "internal", text: "interno" }), el("option", { value: "atas", text: "ATAS" }));
    $.ports = el("ul", { class: "rm-list" });
    $.parity = el("ul", { class: "rm-list" });
    $.rotorMotion = el("input", { id: "rm-rotor-motion", type: "checkbox" });
    $.rotorParkAz = el("input", { id: "rm-rotor-park-az", type: "number", step: "any" });
    $.rotorParkEl = el("input", { id: "rm-rotor-park-el", type: "number", step: "any" });
    $.rotorOffAz = el("input", { id: "rm-rotor-off-az", type: "number", step: "any", min: -180, max: 180 });
    $.rotorOffEl = el("input", { id: "rm-rotor-off-el", type: "number", step: "any", min: -180, max: 180 });
    $.rotor = el("select", { id: "rm-rotor", on: { change: syncRotor } });
    $.rotorPort = el("input", { id: "rm-rotor-port", type: "text", autocomplete: "off", spellcheck: "false" });
    $.relayUrl = el("input", { id: "rm-relay-url", type: "url", autocomplete: "off" });
    $.relayStation = el("input", { id: "rm-relay-station", type: "text", autocomplete: "off" });
    $.relaySecret = el("input", { id: "rm-relay-secret", type: "password", autocomplete: "new-password" });
    $.listen = el("select", { id: "rm-listen" }, el("option", { value: "local", text: "Solo este equipo" }), el("option", { value: "lan", text: "Red local (LAN)" }));
    $.msg = el("p", { class: "rm-msg", role: "status" });
    $.save = el("button", { class: "rm-btn", type: "button", text: "Guardar configuracion", on: { click: () => run(() => saveConfig(api, collect()).then(() => api("status")), "Configuracion guardada.") } });
    $.start = el("button", { class: "rm-btn rm-btn-primary", type: "button", text: "Iniciar estacion", on: { click: () => run(() => startStation(api, collect()), "Estacion en marcha.") } });
    $.stop = el("button", { class: "rm-btn rm-btn-danger", type: "button", text: "Detener estacion", on: { click: () => run(() => stopStation(api), "Estacion detenida.") } });
    $.status = el("div", {});
    $.audioGrid = el("div", { class: "rm-grid" });
    renderAudio();

    const refresh = el("button", { class: "rm-btn", type: "button", text: "Buscar de nuevo", on: { click: loadPorts } });
    main.append(
      el("section", { class: "rm-card" }, el("h2", { text: "Radio de la estacion" }),
        el("div", { class: "rm-grid" },
          field("rm-search", "Buscar radio", $.search),
          field("rm-radio", "Radio", $.radio),
          field("rm-link", "Enlace", $.link),
          field("rm-port", "Puerto serie", $.port),
          field("rm-baud", "Velocidad (baudios)", $.baud),
          field("rm-net", "Direccion de red (equipo:puerto)", $.net),
          field("rm-tuner", "Sintonizador", $.tunerKind)),
        $.notes),
      el("section", { class: "rm-card" }, el("h2", { text: "Funciones remotas de esta radio" }), $.parity,
        el("p", { class: "rm-hint", text: "Advertencia: no transmitas sin carga adaptada o antena. PTT, tune y amplificador son siempre acciones explicitas del operador." })),
      el("section", { class: "rm-card" }, el("h2", { text: "Radios USB detectadas" }), $.ports, el("div", { class: "rm-row" }, refresh)),
      el("section", { class: "rm-card" }, el("h2", { text: "Rotor (opcional)" }),
        el("div", { class: "rm-grid" }, field("rm-rotor", "Rotor", $.rotor), field("rm-rotor-port", "Puerto del rotor", $.rotorPort),
          field("rm-rotor-motion", "Permitir mover el rotor", $.rotorMotion, "Desactivado por defecto: sin esto el rotor solo se lee."),
          field("rm-rotor-park-az", "Aparcado: azimut", $.rotorParkAz), field("rm-rotor-park-el", "Aparcado: elevacion", $.rotorParkEl),
          field("rm-rotor-off-az", "Calibracion: azimut", $.rotorOffAz), field("rm-rotor-off-el", "Calibracion: elevacion", $.rotorOffEl))),
      el("section", { class: "rm-card" }, el("h2", { text: "Rele (opcional)" }),
        el("div", { class: "rm-grid" }, field("rm-relay-url", "URL del rele", $.relayUrl), field("rm-relay-station", "Nombre de la estacion", $.relayStation),
          field("rm-relay-secret", "Secreto del rele", $.relaySecret, "Deja vacio para conservar el secreto guardado."))),
      el("section", { class: "rm-card" }, el("h2", { text: "Audio de la radio" }),
        $.audioGrid,
        el("p", { class: "rm-hint", text: "En el Yaesu FTX-1 el códec USB aparece como \"USB Audio Device\" (C-Media 0D8C:0016). Ajusta el origen de modulación USB de la radio según su manual para voz o datos por USB." }),
        el("div", { class: "rm-row" }, el("button", { class: "rm-btn", type: "button", text: "Buscar de nuevo", on: { click: loadDevices } }))),
      el("section", { class: "rm-card" }, el("h2", { text: "Escucha del agente" }),
        el("div", { class: "rm-grid" }, field("rm-listen", "Escucha del agente", $.listen)),
        el("div", { class: "rm-row" }, $.save, $.start, $.stop), $.msg),
      el("section", { class: "rm-card" }, el("h2", { text: "Estado" }), $.status));
    for (const id of ["port", "baud", "net", "tuner"]) $[`f${id[0].toUpperCase()}${id.slice(1)}`] = document.getElementById(`f-rm-${id}`);
    $.fRotorPort = document.getElementById("f-rm-rotor-port");
    $.fRotorExtra = ["motion", "park-az", "park-el", "off-az", "off-el"].map(id => document.getElementById(`f-rm-rotor-${id}`));
  }

  function syncRotor() {
    $.fRotorPort.hidden = !$.rotor.value;
    for (const node of $.fRotorExtra) node.hidden = !$.rotor.value;
  }

  async function loadPorts() {
    try { state.ports = (await api("ports")).ports || []; } catch (error) { if (error.pinRequired) return pinView(); state.ports = []; }
    if ($.ports) renderPorts();
  }

  async function load() {
    try {
      [state.catalog, state.status] = await Promise.all([api("catalog"), api("status")]);
    } catch (error) {
      if (error.pinRequired) return pinView();
      main.replaceChildren(el("p", { class: "rm-msg", "data-kind": "error", text: error.message }));
      return;
    }
    document.getElementById("rm-back").hidden = state.status.mode !== "desktop";
    build();
    fillRotors();
    fillRadios();
    applyConfig(state.status.config);
    if (!state.status.config && state.status.mode === "setup") $.listen.value = "lan";
    renderStatus();
    await loadPorts();
    await loadDevices();
    clearInterval(state.timer);
    state.timer = setInterval(async () => {
      try { state.status = await api("status"); renderStatus(); } catch { /* next tick */ }
    }, 4000);
  }

  load();
})();
