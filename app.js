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
    url: "https://armel.github.io/uvstudio/",
    action: "Abrir UV Studio",
    firmware: "Multiboot requiere F4HWN v6.0.0 o posterior con soporte Multiboot. No es compatible con cualquier UV-K5.",
    models: [
      ["UV-K1", "Quansheng UV-K1 (PY32F071)", "Web Serial. Cable USB-C de datos o cable USB-serie compatible de doble conector."],
      ["UV-K5-V3", "Quansheng UV-K5 V3 (PY32F071)", "Web Serial. Comprueba que sea V3 y que use el MCU PY32F071, no una revision anterior."]
    ],
    features: ["4 slots editables + Main protegido", "Restablecer bancos CFG 1-4", "CRC despues de instalar", "Backup Flash completo en Labs"],
    guides: [
      ["Multiboot", [
        "Haz una copia de calibracion y de los canales. Para una copia completa de Flash externa se necesita Labs v6.1.0 o posterior.",
        "Inicia normalmente con F4HWN compatible. Abre UV Studio y entra en Firmware Slots; no uses DFU para gestionar slots.",
        "Elige un firmware F4HWN estable v6.x compatible, un slot del 1 al 4 y, opcionalmente, un nombre de hasta 15 caracteres.",
        "Write to slot borra, escribe y verifica el CRC. No desconectes el cable. El limite de imagen por slot es 118 KiB.",
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

const BRAND = { name: "Bricohams", product: "Radio Workspace", repository: "https://github.com/anatolbricoham/Radio-Web-install" };
const page = document.body.dataset.page;
const current = tools[page];
const helpTemplate = document.getElementById("help-content");
const external = 'target="_blank" rel="noopener noreferrer"';
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
  return `<section class="hero"><span class="eyebrow accent">TU RADIO. TU CONFIGURACION.</span>
    <h1>Dos ecosistemas.<br><span>Un punto de partida.</span></h1>
    <p>Elige tu familia y conecta desde este navegador.<br class="desktop"> Copias automaticas antes de escribir, sin mezclar compatibilidades.</p><a class="button secondary help-link" href="ayuda.html">Primeros pasos, controladores y preguntas frecuentes</a>
  </section>
  <section class="cards" aria-label="Familias de radio">${Object.entries(tools).map(([key, tool]) => card(key, tool)).join("")}</section>
  <aside class="notice"><span class="notice-icon" aria-hidden="true">!</span><div><h2>Parecidas por fuera. Diferentes por dentro.</h2><p>OpenGD77 y F4HWN no son firmware intercambiables. Confirma el modelo, la revision de hardware y el firmware antes de conectar o escribir.</p></div></aside>
  <section class="steps-summary" aria-label="Como empezar"><div><span>01</span><h3>Identifica tu equipo</h3><p>Modelo, revision y firmware.</p></div><div><span>02</span><h3>Copia automatica</h3><p>Persistida y verificada con SHA-256.</p></div><div><span>03</span><h3>Opera con proteccion</h3><p>Sin respaldo suficiente, no se escribe.</p></div></section>`;
}

function detail(tool) {
  return `<a class="back" href="index.html">&larr; Todos los espacios</a>
    <section class="detail-hero"><span class="eyebrow accent">${tool.tag} / ESPACIO DE RADIO</span><h1>${tool.name}<span>${tool.subtitle}</span></h1><p>${tool.description}</p></section>
    <div class="detail-grid">
      <section class="panel connection"><div class="section-heading"><span class="step-badge">01</span><h2>Prepara tu equipo</h2></div>
        <p class="muted">Conexion real desde este navegador. Al conectar se inicia una copia automatica local. Ninguna escritura se habilita antes de verificar el respaldo requerido.</p>
        <label for="model">Modelo / familia de hardware</label>
        <select id="model"><option value="">Selecciona tu equipo</option>${tool.models.map(([id, name]) => `<option value="${id}">${name}</option>`).join("")}</select>
        <p id="model-help" class="model-help" role="status">Selecciona un modelo para consultar su conexion.</p>
        <div class="firmware-note"><strong>Firmware necesario</strong><p>${tool.firmware}</p></div>
        <label class="check"><input id="confirmed" type="checkbox"><span>He comprobado el modelo y el firmware. Autorizo leer la radio y guardar automaticamente copias locales.</span></label>
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
    <section id="radio-operations" class="panel operations" aria-label="Operaciones reales"></section>
    <section class="panel backups-panel"><h2>Copias locales de esta web</h2><p class="muted">Se guardan en IndexedDB en este navegador y origen. Exportalas: borrar datos del navegador elimina las copias locales. Incluyen canales y otros datos privados; no las publiques.</p><button id="refresh-backups" class="button secondary" type="button">Actualizar historial</button><ul id="backup-list"></ul></section>
    <section class="panel"><h2>Registro de operaciones</h2><pre id="radio-log" role="log" aria-label="Registro local"></pre></section>
    <aside class="notice"><span class="notice-icon" aria-hidden="true">!</span><div><h2>Antes de escribir, verifica.</h2><p>Conectores en validacion: pruebas automatizadas con transportes simulados, sin certificacion con hardware fisico. No se afirma paridad completa con las referencias. La seleccion de modelo Quansheng es manual. No cierres ni desconectes durante una operacion.</p></div></aside>
    <section class="sources"><h2>Documentacion de referencia</h2><a href="ayuda.html#drivers">Controladores USB y solucion de errores</a><a href="${tool.url}" ${external}>${tool.action} &nearr;</a>${page === "quansheng" ? `<a href="https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki/Multiboot-and-Multiconfig" ${external}>Multiboot y Multiconfig &nearr;</a><a href="https://github.com/armel/uv-k1-k5v3-firmware-custom/wiki/UV-Studio" ${external}>Guia de UV Studio &nearr;</a>` : ""}</section>`;
}

document.getElementById("app").innerHTML = `
  <aside class="sidebar">
    <a class="brand" href="index.html"><img class="brand-logo" src="bricohams-logo.svg" alt="" width="40" height="40"><span>${BRAND.name.toUpperCase()}<small>${BRAND.product.toUpperCase()}</small></span></a>
    <p class="nav-label">TU ESTACION</p><nav aria-label="Navegacion principal">${nav("home", "Vista general", "&#9638;")}${nav("opengd77", "OpenGD77", "GD")}${nav("quansheng", "Quansheng", "UV")}${nav("ayuda", "Ayuda y soporte", "?")}</nav>
    <div class="sidebar-bottom"><span class="local-dot"></span> USB / Serial local<p>Sin envio de datos a servidores.<br>Copias antes de escribir.</p></div>
  </aside>
  <div class="workspace"><header class="topbar"><span>${BRAND.name} <span class="breadcrumb">/ ${current ? current.name : helpTemplate ? "Ayuda y soporte" : "Vista general"}</span></span><span class="local-badge">SIN CUENTA &middot; SIN SUBIDAS</span></header>
  <main id="main">${current ? detail(current) : helpTemplate ? "" : home()}</main>
  <footer><span>&copy; 2026 ${BRAND.name} ${BRAND.product} <span class="muted">/ GPL-3.0-or-later / Sin garantia</span></span><span><a href="ayuda.html">Ayuda y soporte</a> &middot; <a href="${BRAND.repository}" target="_blank" rel="noopener noreferrer">Codigo fuente</a> &middot; No afiliado a OpenGD77, grid.radio, F4HWN ni Quansheng.</span></footer></div>`;

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
  const launch = document.getElementById("launch");
  const update = () => {
    const selection = current.models.find(([id]) => id === model.value);
    const api = selection && (page === "quansheng" || selection[0] === "SERIAL") ? "serial" : "usb";
    const available = api in navigator;
    document.getElementById("model-help").textContent = selection
      ? `${selection[2]} ${available ? "Este navegador expone la API requerida en esta pagina; el sitio original comprobara los permisos." : "La API requerida no esta disponible en esta pagina. Utiliza Chrome o Edge de escritorio y comprueba la conexion en el sitio original (HTTPS)."}`
      : "Selecciona un modelo para consultar su conexion.";
    launch.disabled = !selection || !confirmed.checked;
  };
  model.addEventListener("change", update);
  confirmed.addEventListener("change", update);
  if (globalThis.RadioWorkspace) globalThis.RadioWorkspace.mountRadioUI(page);
  launch.addEventListener("click", () => {
    if (launch.disabled) return;
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
}

(globalThis.RadioWorkspace?.runtime ?? Promise.resolve({ mode: "web" })).then(({ mode }) => {
  document.body.dataset.mode = mode;
  const badge = document.createElement("span");
  badge.id = "mode-badge";
  badge.className = "mode-badge";
  badge.textContent = mode === "local" ? "Local · instalado" : "Web · GitHub Pages";
  document.querySelector(".topbar > span").append(badge);
});
