"use strict";

// Clickjacking guard: a meta CSP cannot set frame-ancestors, so refuse to run framed.
if (window.top !== window.self) {
  const notice = document.createElement("p");
  notice.append("Esta herramienta no puede ejecutarse dentro de un marco. ");
  const link = document.createElement("a");
  link.href = location.href;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "Abrir en una pestana nueva";
  notice.append(link);
  document.getElementById("app").replaceChildren(notice);
  throw new Error("Bricohams: framed context, initialization stopped");
}

const tools = {
  opengd77: {
    name: "OpenGD77",
    subtitle: "Codeplug y canales",
    tag: "DMR + FM",
    icon: "GD",
    description: "Lee el codeplug y la calibracion de radios compatibles. Edita canales FM y DMR localmente; las escrituras quedan bloqueadas sin respaldo completo del firmware.",
    url: "https://grid.radio/opengd77/",
    action: "Abrir OpenGD77 CPS",
    firmware: "El equipo debe tener instalado el firmware OpenGD77 correspondiente a su modelo.",
    models: [
      ["MK22", "GD-77 / DM-1801 / RD-5R", "WebUSB. En Windows, comprueba el controlador WinUSB indicado por el CPS."],
      ["STM32", "MD-UV380 / MD-9600 / MD-2017 / DM-1701", "WebUSB. En Windows, comprueba el controlador WinUSB indicado por el CPS."],
      ["SERIAL", "Baofeng DM-32 / UV008", "Web Serial. Utiliza el puerto serie USB; no necesita el controlador WinUSB del grupo anterior."]
    ],
    features: ["Conexion USB / Serial", "Copia automatica de calibracion", "Editor de canales existentes", "Lectura del codeplug estandar"],
    guides: [
      ["Preparar y conectar", [
        "Comprueba el modelo y el firmware instalado. No instales una imagen destinada a otro equipo.",
        "Conecta el cable de datos y enciende la radio normalmente.",
        "Abre el CPS y selecciona el mismo grupo de radio elegido aqui.",
        "Pulsa Connect y elige tu dispositivo en el permiso del navegador.",
        "Utiliza Read antes de editar y guarda una copia del codeplug original."
      ]],
      ["Configurar canales", [
        "En Channels, crea o edita el nombre, la frecuencia RX y la frecuencia TX.",
        "Selecciona FM o DMR. Para DMR, revisa Color Code, Time Slot y el contacto.",
        "Organiza los canales en Zones y comprueba las frecuencias antes de escribir.",
        "Guarda una copia local. Write modifica la radio: confirma el equipo conectado en el CPS."
      ]],
      ["Copias y archivos", [
        "Utiliza Save para guardar el codeplug JSON desde el CPS.",
        "Export permite guardar un archivo binario G77; no es un firmware Quansheng.",
        "Para recuperar una configuracion, abre el archivo en el CPS y revisa su compatibilidad antes de escribir."
      ]]
    ]
  },
  quansheng: {
    name: "Quansheng",
    subtitle: "Multiboot y Multiconfig",
    tag: "F4HWN",
    icon: "UV",
    description: "Consulta y verifica slots de UV-K1 y UV-K5 V3 compatibles. Modifica slots y bancos solo tras respaldar la calibracion, la Flash externa y Main.",
    url: "#qs-native-menu",
    action: "Abrir herramientas Bricohams",
    firmware: "Multiboot requiere F4HWN v6.0.0 o posterior con soporte Multiboot. No es compatible con cualquier UV-K5.",
    models: [
      ["UV-K1", "Quansheng UV-K1 (PY32F071)", "Web Serial. Cable USB-C de datos o cable USB-serie compatible de doble conector."],
      ["UV-K5-V3", "Quansheng UV-K5 V3 (PY32F071)", "Web Serial. Comprueba que sea V3 y que use el MCU PY32F071, no una revision anterior."]
    ],
    features: ["4 slots editables + Main protegido", "Restablecer bancos CFG 1-4", "CRC despues de instalar", "Backup Flash completo en Labs"],
    guides: [
      ["Multiboot", [
        "Haz una copia de calibracion y de los canales. Para una copia completa de Flash externa se necesita Labs v6.1.0 o posterior.",
        "Inicia normalmente con F4HWN compatible. Usa Consultar slots en esta web; no uses DFU para gestionar slots.",
        "Elige un firmware F4HWN estable v6.x compatible, un slot del 1 al 4 y, opcionalmente, un nombre de hasta 15 caracteres.",
        "Instalar y verificar CRC borra, escribe y verifica el slot. No desconectes el cable. El limite de imagen por slot es 118 KiB.",
        "Para cambiar de firmware, apaga y enciende manteniendo solo MENU (M), no PTT. Selecciona el slot y confirma dos veces con M.",
        "Main (M) esta protegido. No apagues durante Init Main ni durante Writing / Verify."
      ]],
      ["Multiconfig", [
        "Por defecto, Main utiliza CFG M y los slots 1 a 4 utilizan CFG 1 a CFG 4.",
        "Cada banco conserva sus canales, nombres, VFO, listas de escaneo y ajustes. La calibracion y otros recursos son compartidos.",
        "Para cambiar solo de configuracion, abre SetCfg en el menu de la propia radio, elige un banco y confirma con M dos veces.",
        "SetCfg carga el banco sin cambiar de firmware ni reiniciar. Comprueba las etiquetas SLOT y CFG en SysInf.",
        "El cambio persiste al apagar, pero seleccionar un firmware desde Multiboot vuelve a asociarlo con su banco predeterminado.",
        "Erase FW no elimina el banco de configuracion. No confundas borrar firmware con restablecer ajustes."
      ]],
      ["Copias y recuperacion", [
        "Calibration guarda datos especificos de tu unidad. No restaures la calibracion de otra radio.",
        "Una imagen CHIRP guarda los canales y ajustes que entiende su driver; no sustituye la copia de calibracion.",
        "External Flash requiere Labs v6.1.0 o posterior. Su restauracion preserva la calibracion ya presente en el equipo de destino.",
        "DFU se utiliza para Flash Firmware: radio apagada, manten PTT al encender y sueltalo antes de conectar el cable.",
        "Nunca coloques firmware stock o v5.x en slots Multiboot: puede impedir volver al selector."
      ]]
    ]
  }
};

const BRAND = { name: "Bricohams", product: "Radio Workspace", repository: "https://github.com/Brico-Hams/Radio-Web-install" };
const page = document.body.dataset.page;
const current = tools[page];
const helpTemplate = document.getElementById("help-content");
const anytoneTemplate = document.getElementById("anytone-content");
const external = 'target="_blank" rel="noopener noreferrer"';
// Quansheng shows one view at a time (no in-page anchors); the other pages keep scrolling to the step.
const steps = page === "quansheng"
  ? [["Copias y conexión", "conexion"], ["Canales", "canales"], ["Satélites", "satelites"], ["Firmware", "firmware"], ["Herramientas", "herramientas"]]
  : [["Copias y conexión", "#connection"], ["Codeplug", "#radio-operations"], ["Canales y contactos", "#planning-panel"], ["Satélites", "#planning-panel", "sat"], ["Firmware", ".firmware-panel"]];
// Blocks of each Quansheng view; [data-group] are the h2 sections of #radio-operations, grouped at start-up.
const VIEWS = {
  conexion: [".detail-grid", ".backups-panel", "#log-panel", "#main > .notice", "#main > .sources"],
  canales: ["#radio-operations", '[data-group="canales"]', "#planning-panel"],
  satelites: ["#radio-operations", '[data-group="cat"]', "#planning-panel"],
  firmware: ["#official-firmware", "#precompiled-panel", "#precompiled-apps-panel", "#radio-operations", '[data-group="slots"]', '[data-group="apps"]', "#custom-firmware"],
  herramientas: ["#qs-native-menu", "#qs-native-tools", "#qs-factory-native", "#qs-live-panel", "#qs-rf-panel", "#radio-operations", '[data-group="ardf"]', '[data-group="espectro"]']
};
const VIEW_TABS = { canales: "repeaters", satelites: "sat" };
let currentView = null;
const nav = (key, label, mark) => `<a href="${key === "home" ? "index" : key}.html" ${page === key ? 'aria-current="page"' : ""}><span class="nav-icon" aria-hidden="true">${mark}</span>${label}</a>`;

function card(key, tool) {
  return `<article class="tool-card ${key}">
    <div class="card-top"><span class="device-icon" aria-hidden="true">${tool.icon}</span><span class="pill">${tool.tag}</span></div>
    <p class="eyebrow">${tool.subtitle}</p><h2>${tool.name}</h2>
    <p class="card-description">${tool.description}</p>
    <ul class="feature-list">${tool.features.map(item => `<li>${item}</li>`).join("")}</ul>
    <a class="button ${key === "opengd77" ? "primary" : "secondary"}" href="${key}.html">Entrar al espacio <span aria-hidden="true">&rarr;</span></a>
    <p class="card-note">${key === "opengd77" ? "Radios compatibles con OpenGD77" : "Solo UV-K1 / UV-K5 V3 compatibles"}</p>
  </article>`;
}

function home() {
  return `<section class="hero"><span class="eyebrow accent">RADIOAFICIÓN · HAZLO TÚ MISMO</span>
    <h1>Tus radios.<br><span>Un punto de partida.</span></h1>
    <p>Elige tu familia y conecta desde este navegador.<br class="desktop"> Copias automaticas antes de escribir, sin mezclar compatibilidades.</p><a class="button secondary help-link" href="ayuda.html">Primeros pasos, controladores y preguntas frecuentes</a>
    <p class="card-note"><a href="ayuda-quansheng.html#puesta-en-marcha-de-0-a-100">Quansheng de 0 a 100 %</a> &middot; <a href="ayuda-atlas-uv-k5-v3.html">Atlas tecnico UV-K5 V3</a> &middot; <a href="ayuda-firmwares.html">Biblioteca de firmware</a></p>
  </section>
  <section class="cards" aria-label="Familias de radio">${Object.entries(tools).map(([key, tool]) => card(key, tool)).join("")}
    <article class="tool-card"><h2>AnyTone Beta</h2><p>Preparador web de canales FM/DMR de Espana y AM aerea con capacidades confirmadas. Reutiliza archivos de las otras familias. Sin USB ni RDT nativo.</p><a class="button secondary" href="anytone.html">Entrar al editor AnyTone</a></article></section>
  <aside class="notice"><span class="notice-icon" aria-hidden="true">!</span><div><h2>Parecidas por fuera. Diferentes por dentro.</h2><p>OpenGD77 y F4HWN no son firmware intercambiables. Confirma el modelo, la revision de hardware y el firmware antes de conectar o escribir.</p></div></aside>
  <section class="steps-summary" aria-label="Como empezar"><div><span>01</span><h3>Identifica tu equipo</h3><p>Modelo, revision y firmware.</p></div><div><span>02</span><h3>Copia automatica</h3><p>Persistida y verificada con SHA-256.</p></div><div><span>03</span><h3>Opera con proteccion</h3><p>Sin respaldo suficiente, no se escribe.</p></div></section>`;
}

function detail(tool) {
  return `<a class="back" href="index.html">&larr; Todos los espacios</a>
    <section class="detail-hero"><p class="eyebrow accent">RADIOAFICIÓN · HAZLO TÚ MISMO <span class="pill">${tool.tag}</span></p><h1>${tool.name}<span>${tool.subtitle}</span></h1><p>${tool.description}</p></section>
    <div class="detail-grid">
      <section id="connection" class="panel connection"><div class="section-heading"><span class="step-badge">01</span><h2>Prepara tu equipo</h2></div>
        <p class="muted">Conexion real desde este navegador. Al conectar se inicia una copia automatica local. Ninguna escritura se habilita antes de verificar el respaldo requerido.</p>
        <label for="model">Modelo / familia de hardware</label>
        <select id="model"><option value="">Selecciona tu equipo</option>${tool.models.map(([id, name]) => `<option value="${id}">${name}</option>`).join("")}</select>
        <p id="model-help" class="model-help" role="status">Selecciona un modelo para consultar su conexion.</p>
        <div class="firmware-note"><strong>Firmware necesario</strong><p>${tool.firmware}</p></div>
        <label class="check"><input id="confirmed" type="checkbox"><span>He comprobado el modelo y el firmware. Autorizo leer la radio y guardar automaticamente copias locales.</span></label>
        <label class="check"><input id="pro-mode" type="checkbox"><span><strong>Modo PRO (esta sesion)</strong>: autorizo la lectura y las acciones que pulse sin confirmaciones adicionales. Debo seleccionar el modelo correcto. No desactiva respaldos, CRC, permisos USB ni la proteccion de Main.</span></label>
        <button id="radio-connect" class="button primary" type="button" disabled>Conectar y respaldar</button>
        <button id="radio-disconnect" class="button secondary" type="button" disabled>Desconectar</button>
        <p id="radio-status" class="model-help" role="status">Sin conexion.</p>
        <label for="radio-progress">Progreso de la operacion</label>
        <progress id="radio-progress" max="1" value="0"></progress>
        <p id="backup-status" class="card-note" role="status">Escrituras bloqueadas: sin copia verificada.</p>
        <hr>
        <button id="launch" class="button primary" type="button" disabled>${tool.action} <span aria-hidden="true">&nearr;</span></button>
        <p class="card-note">Alternativa externa. Desconecta aqui antes de abrir otra herramienta; esta no hereda la proteccion de nuestras copias.</p>
        <p id="launch-status" role="status" class="muted"></p>
      </section>
      <section class="panel guide"><div class="section-heading"><span class="step-badge">02</span><h2>Guias de las referencias</h2></div>
        <div class="guide-tabs" role="group" aria-label="Seleccionar guia">${tool.guides.map(([title], index) => `<button type="button" class="guide-tab" data-guide="${index}" aria-pressed="${index === 0}">${title}</button>`).join("")}</div>
        <h3 id="guide-title"></h3><ol id="guide-steps" class="guide-steps"></ol>
        ${page === "quansheng" ? '<div class="bank-map" aria-label="Asociacion predeterminada de slots y bancos"><span>M &rarr; CFG M</span><span>1 &rarr; CFG 1</span><span>2 &rarr; CFG 2</span><span>3 &rarr; CFG 3</span><span>4 &rarr; CFG 4</span></div><p class="card-note">Esquema de referencia; no representa el estado de una radio conectada.</p>' : ""}
      </section>
    </div>
    ${page === "opengd77" ? `<section class="panel" id="cps-web-capabilities"><h2>OpenGD77 CPS: disponibilidad real en web</h2>
      <p>Esta web funciona en HTTPS sin instalar el servidor Node. No equivale al CPS completo. Chrome/Edge de escritorio y permiso USB/Serial son necesarios para acceder a una radio; algunos sistemas necesitan un controlador. Abrir el CPS externo no comparte nuestras protecciones.</p>
      <div class="table-scroll"><table><thead><tr><th>Funcion</th><th>Estado en esta web</th></tr></thead><tbody>
        <tr><td>Abrir, guardar y editar codeplug estandar 128 KiB</td><td>Disponible en navegador: canales FM/DMR, borrado y referencias de zonas/listas</td></tr>
        <tr><td>Contactos privados RadioID</td><td>Importar user.csv en navegador. Consulta directa bloqueada por CORS del proveedor; descarga e importacion por API solo en servidor local</td></tr>
        <tr><td>Salas / grupos BrandMeister</td><td>Consulta e importacion directa en web por prefijo TG. No activa salas ni configura el hotspot</td></tr>
        <tr><td>Repetidores RepeaterBook</td><td>Importar JSON autorizado en web. Consulta API autenticada necesita servidor; no se exponen tokens en Pages</td></tr>
        <tr><td>Satelites / TLE / pases / Doppler</td><td>Disponible en navegador con lista publicada, calculo local y edicion de lista SAT o memorias RX</td></tr>
        <tr><td>Identificacion y respaldo automatico</td><td>Antes de otras operaciones de radio: identificacion, calibracion y codeplug. La copia es parcial: falta firmware MCU original</td></tr>
        <tr><td>Respaldo del firmware MCU instalado</td><td>NO disponible con protocolo integral verificado por modelo. No se sustituye por firmware descargado ni por el codeplug</td></tr>
        <tr><td>Leer nuevamente, capturar pantalla, escribir, borrar o restaurar en radio</td><td>Bloqueado sin respaldo integral persistido y verificado, tambien en PRO</td></tr>
        <tr><td>Flasheo, calibrar/restaurar, voces, base masiva DMR, ajustes generales, editor de zonas completo y canales extendidos</td><td>No implementado aqui; consultar CPS compatible. No se afirma paridad total</td></tr>
      </tbody></table></div>
      <p>El firmware comercial de fabrica ya sustituido por OpenGD77 no puede recuperarse leyendo el firmware actualmente instalado. Conserva una copia previa de tu unidad. No se ha validado hardware OpenGD77 en esta sesion.</p>
    </section>` : ""}
    <section id="radio-operations" class="panel operations" aria-label="Operaciones reales"></section>
    <section class="panel backups-panel"><h2>Copias locales de esta web</h2><p class="muted">Se guardan en IndexedDB en este navegador y origen. Exportalas: borrar datos del navegador elimina las copias locales. Incluyen canales y otros datos privados; no las publiques.</p><button id="refresh-backups" class="button secondary" type="button">Actualizar historial</button><ul id="backup-list"></ul></section>
    <section id="log-panel" class="panel"><h2>Registro de operaciones</h2><pre id="radio-log" role="log" aria-label="Registro local"></pre></section>
    <aside class="notice"><span class="notice-icon" aria-hidden="true">!</span><div><h2>Beta: antes de escribir, verifica.</h2><p>En fase de validacion: lectura USB probada en una unidad declarada UV-K5 V3 con F4HWN v6.0.0; no se han probado escrituras fisicas ni radios OpenGD77. No es una certificacion de todos los modelos. La seleccion de modelo Quansheng es manual. No cierres ni desconectes durante una operacion.</p></div></aside>
    <section class="sources"><h2>Documentacion de referencia</h2><a href="ayuda.html#drivers">Controladores USB y solucion de errores</a><a href="${tool.url}" ${external}>${tool.action} &nearr;</a>${page === "quansheng" ? `<a href="ayuda-quansheng.html#puesta-en-marcha-de-0-a-100">Puesta en marcha de 0 a 100 %</a><a href="ayuda-atlas-uv-k5-v3.html">Atlas tecnico UV-K5 V3: hardware, protocolos y esquemas</a><a href="https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki/Multiboot-and-Multiconfig" ${external}>Multiboot y Multiconfig &nearr;</a><a href="https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki/UV-Studio" ${external}>Guia de UV Studio &nearr;</a><a id="studio-link" href="https://brico-hams.github.io/Bricohams-Studio/" ${external}>Bricohams Quansheng Studio (UV-K1 / UV-K5 V3) &nearr;</a>` : ""}</section>`;
}

document.getElementById("app").innerHTML = `
  <aside class="sidebar">
    <a class="brand" href="index.html" aria-label="Bricohams Radio Workspace: inicio"><img class="brand-logo" src="bricohams-logo.png" alt="Bricohams" width="1200" height="446"><span class="brand-product">${BRAND.product.toUpperCase()}</span></a>
    <p class="nav-label">TU ESTACION</p><nav aria-label="Navegacion principal">${nav("home", "Vista general", "&#9638;")}${nav("opengd77", "OpenGD77", "GD")}${nav("quansheng", "Quansheng", "UV")}${nav("anytone", "AnyTone Beta", "AT")}${nav("ayuda", "Ayuda y soporte", "?")}</nav>
    ${current ? `<p class="nav-label">PASOS</p><nav class="steps" aria-label="Pasos de este espacio">${steps.map(([label, target, tab], index) => page === "quansheng"
      ? `<button type="button" class="step-view" data-view="${target}"><span class="step-num" aria-hidden="true">${index}</span>${label}</button>`
      : `<a href="${target.startsWith("#") ? target : "#radio-operations"}" data-step="${target}"${tab ? ` data-tab="${tab}"` : ""}><span class="step-num" aria-hidden="true">${index}</span>${label}</a>`).join("")}</nav>` : ""}
    <div class="sidebar-bottom"><span class="local-dot"></span> USB / Serial local<p>Sin envio de datos a servidores.<br>Copias antes de escribir.</p></div>
  </aside>
  <div class="workspace"><header class="topbar">
    <div class="topbar-left"><span class="crumb">${BRAND.name} <span class="breadcrumb">/ ${current ? current.name : anytoneTemplate ? "AnyTone Beta" : helpTemplate ? "Ayuda y soporte" : "Vista general"}</span></span>${current ? '<span class="topbar-status"><span class="status-dot" aria-hidden="true"></span><span id="topbar-status">Sin conexion.</span></span>' : ""}</div>
    <div class="topbar-right"><span class="pill">BETA - EN VALIDACION</span><span id="mode-badge" class="mode-badge"></span><span class="local-badge">SIN CUENTA &middot; SIN SUBIDAS</span>${current ? '<button id="topbar-connect" class="button primary topbar-connect" type="button" disabled><span aria-hidden="true">⌁</span> Conectar</button>' : ""}</div></header>
  <main id="main">${current ? detail(current) : helpTemplate || anytoneTemplate ? "" : home()}</main>
  <footer><span>&copy; 2026 ${BRAND.name} ${BRAND.product} <span class="muted">/ GPL-3.0-or-later / Sin garantia</span></span><span><a href="ayuda-referencias.html">Documentacion de referencia</a> &middot; <a href="ayuda.html#inicio">Instalar en local</a> &middot; <a href="ayuda.html">Ayuda y soporte</a> &middot; <a href="${BRAND.repository}" target="_blank" rel="noopener noreferrer">Codigo fuente</a> &middot; No afiliado a OpenGD77, grid.radio, F4HWN ni Quansheng.</span></footer></div>`;

if (anytoneTemplate) {
  document.getElementById("main").append(anytoneTemplate.content.cloneNode(true));
  globalThis.RadioWorkspace.mountAnytoneUI();
}

if (helpTemplate) {
  document.getElementById("main").append(helpTemplate.content.cloneNode(true));
  if (location.hash.length > 1) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  const filter = document.getElementById("help-filter");
  const status = document.getElementById("help-filter-status");
  const fold = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  filter.addEventListener("input", () => {
    const query = fold(filter.value.trim());
    let visible = 0;
    document.querySelectorAll("[data-help]").forEach(section => {
      const items = section.querySelectorAll("details, tbody tr");
      let match = !query || fold(section.querySelector("h2").textContent).includes(query);
      items.forEach(item => {
        const hit = !query || match || fold(item.textContent).includes(query);
        item.hidden = !hit;
        if (hit && query && item.tagName === "DETAILS") item.open = true;
      });
      match = match || !query || fold(section.textContent).includes(query);
      section.hidden = !match;
      if (match) visible++;
    });
    status.textContent = query ? `${visible} secciones coinciden con "${filter.value.trim()}".` : "";
  });
}

if (current) {
  const model = document.getElementById("model");
  const confirmed = document.getElementById("confirmed");
  const pro = document.getElementById("pro-mode");
  const launch = document.getElementById("launch");
  const update = () => {
    const selection = current.models.find(([id]) => id === model.value);
    const api = selection && (page === "quansheng" || selection[0] === "SERIAL") ? "serial" : "usb";
    const available = api in navigator;
    document.getElementById("model-help").textContent = selection
      ? `${selection[2]} ${available ? "Este navegador expone la API requerida; se solicitaran permisos al conectar." : "La API requerida no esta disponible. Utiliza Chrome o Edge de escritorio en localhost o HTTPS."}`
      : "Selecciona un modelo para consultar su conexion.";
    launch.disabled = !selection || !(confirmed.checked || pro.checked);
  };
  model.addEventListener("change", update);
  confirmed.addEventListener("change", update);
  pro.addEventListener("change", update);
  if (globalThis.RadioWorkspace) globalThis.RadioWorkspace.mountRadioUI(page);
  launch.addEventListener("click", () => {
    if (launch.disabled) return;
    if (page === "quansheng") {
      const panel = document.getElementById("qs-native-menu");
      showView("herramientas");
      panel.tabIndex = -1;
      panel.scrollIntoView({ block: "start" });
      panel.focus({ preventScroll: true });
      document.getElementById("launch-status").textContent = "Herramientas propias en esta pagina. No se ha abierto otra web ni conectado la radio.";
      return;
    }
    window.open(current.url, "_blank", "noopener,noreferrer");
    const status = document.getElementById("launch-status");
    status.textContent = "Si el navegador bloqueo la nueva pestana, utiliza este enlace: ";
    const link = document.createElement("a");
    link.href = current.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = current.action;
    status.append(link);
  });
  function showGuide(index) {
    const [title, steps] = current.guides[index];
    document.getElementById("guide-title").textContent = title;
    document.getElementById("guide-steps").replaceChildren(...steps.map(text => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    }));
    document.querySelectorAll("[data-guide]").forEach(button => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.guide) === index));
    });
  }
  document.querySelectorAll("[data-guide]").forEach(button => button.addEventListener("click", () => showGuide(Number(button.dataset.guide))));
  showGuide(0);
  // Topbar mirrors the section's connect button and status; the section stays the source of truth.
  const radioConnect = document.getElementById("radio-connect");
  const radioStatus = document.getElementById("radio-status");
  const topConnect = document.getElementById("topbar-connect");
  const topStatus = document.getElementById("topbar-status");
  const mirror = () => {
    topConnect.disabled = radioConnect.disabled;
    topStatus.textContent = radioStatus.textContent;
    topStatus.dataset.error = radioStatus.dataset.error ?? "";
  };
  new MutationObserver(mirror).observe(radioConnect, { attributes: true, attributeFilter: ["disabled"] });
  new MutationObserver(mirror).observe(radioStatus, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["data-error"] });
  mirror();
  topConnect.addEventListener("click", () => radioConnect.click());
  document.querySelectorAll("[data-step]").forEach(link => link.addEventListener("click", event => {
    const target = document.querySelector(link.dataset.step);
    if (!target) return;
    event.preventDefault();
    if (link.dataset.tab) document.querySelector(`[data-plan-tab="${link.dataset.tab}"]`)?.click();
    target.tabIndex = -1;
    target.scrollIntoView({ block: "start" });
    target.focus({ preventScroll: true });
  }));
  if (page === "quansheng") setupViews();
}

// Shows only the blocks of one view; everything else in <main> stays in the DOM but is not displayed.
function applyView(name) {
  const main = document.getElementById("main");
  const wanted = new Set(VIEWS[name].flatMap(selector => [...main.querySelectorAll(selector)]));
  for (const block of [...main.children, ...main.querySelectorAll("#radio-operations > .ops-group")]) {
    if (block.matches("a.back, .detail-hero")) continue;
    block.toggleAttribute("data-view-off", !wanted.has(block));
  }
}
function showView(name, focus = null) {
  if (!VIEWS[name]) return;
  currentView = name;
  applyView(name);
  document.querySelectorAll("[data-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.view === name)));
  if (VIEW_TABS[name]) document.querySelector(`[data-plan-tab="${VIEW_TABS[name]}"]`)?.click();
  const target = focus || document.getElementById("main");
  target.tabIndex = -1;
  target.scrollIntoView({ block: "start" });
  target.focus({ preventScroll: true });
}
function setupViews() {
  const operations = document.getElementById("radio-operations");
  const groups = [[/^CAT RX/, "cat"], [/ARDF/, "ardf"], [/Espectro/, "espectro"], [/Slots/, "slots"], [/^Apps/, "apps"], [/^Canales/, "canales"]];
  let group = null;
  for (const node of [...operations.children]) {
    if (node.tagName === "H2" || !group) {
      group = document.createElement("div");
      group.className = "ops-group";
      group.dataset.group = groups.find(([pattern]) => pattern.test(node.textContent.trim()))?.[1] ?? "otros";
      operations.insertBefore(group, node);
    }
    group.append(node);
  }
  document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
  // In-page links (tool menu, help shortcuts) switch to the view that holds their target instead of scrolling the page.
  document.getElementById("main").addEventListener("click", event => {
    const link = event.target.closest('a[href^="#"]');
    const target = link && link.getAttribute("href").length > 1 && document.getElementById(decodeURIComponent(link.getAttribute("href").slice(1)));
    if (!target) return;
    const view = Object.keys(VIEWS).find(name => VIEWS[name].some(selector => target.closest(selector) && selector !== "#radio-operations"));
    if (!view) return;
    event.preventDefault();
    showView(view, target);
  });
  // Panels mounted later (live viewer, RF log) follow the current view.
  new MutationObserver(() => { if (currentView) applyView(currentView); }).observe(document.getElementById("main"), { childList: true });
  showView("conexion");
}

(globalThis.RadioWorkspace?.runtime ?? Promise.resolve({ mode: "web" })).then(({ mode }) => {
  document.body.dataset.mode = mode;
  document.getElementById("mode-badge").textContent = mode === "local" ? "Local · instalado" : "Web · GitHub Pages";
  // The installers ship a pinned copy of Studio; the static site links to its own GitHub Pages origin.
  const studio = document.getElementById("studio-link");
  if (studio && mode === "local") {
    studio.href = "studio.html";
    studio.removeAttribute("target");
    studio.textContent = "Bricohams Quansheng Studio incluido (UV-K1 / UV-K5 V3)";
  }
});
