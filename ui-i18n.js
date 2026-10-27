(function (root) {
  "use strict";
  // Native pages render Spanish templates independently. Translate their text and
  // accessibility attributes without rerendering forms or changing radio state.
  // Cache source text for live switching; unknown diagnostics and raw logs stay
  // verbatim rather than guessing at safety-critical protocol wording.
  const locales = Object.freeze({ es: "Español", "en-US": "English (US)", fr: "Français", de: "Deutsch" });
  const key = "bricohams.ui.locale";
  const normalize = value => value === "en" ? "en-US" : Object.hasOwn(locales, value) ? value : null;
  const canonical = value => value.replace(/\s+/g, " ").trim();
  function resolveLocale(search, storage) {
    const requested = normalize(new URLSearchParams(search).get("lang"));
    if (requested) return requested;
    try { return normalize(storage?.getItem(key)) || "es"; }
    catch { return "es"; }
  }
  let locale = resolveLocale(root.location?.search || "", (() => {
    try { return root.localStorage; } catch { return null; }
  })());
  const helpPage = /\/ayuda(?:\.(en|fr|de))?\.html$/.exec(root.location?.pathname || "");
  if (helpPage && !normalize(new URLSearchParams(root.location.search).get("lang"))) {
    locale = normalize(helpPage[1] || "es");
  }
  const entries = [...(root.BricohamsUITranslations || []),
    ['{0} secciones coinciden con "{1}".', '{0} sections match "{1}".',
      '{0} sections correspondent à « {1} ».', '{0} Abschnitte stimmen mit „{1}“ überein.']];
  const catalog = new Map(entries.map(([source, ...translations]) => [canonical(source), translations]));
  const sourceByTranslation = new Map(entries.flatMap(([source, ...translations]) => translations.map(value => [canonical(value), source])));
  const patterns = entries.filter(([source]) => /\{\d+\}/.test(source)).map(([source, ...translations]) => ({
    expression: new RegExp(`^${canonical(source).split(/(\{\d+\})/).map(part =>
      /^\{\d+\}$/.test(part) ? "(.*?)" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("")}$`),
    translations
  }));
  function translate(source, language = locale) {
    if (language === "es") return source;
    const index = ["en-US", "fr", "de"].indexOf(language);
    if (index < 0) return source;
    let translated = catalog.get(canonical(source))?.[index];
    if (!translated) {
      for (const { expression, translations } of patterns) {
        const match = canonical(source).match(expression);
        if (!match) continue;
        translated = translations[index].replace(/\{(\d+)\}/g, (_, position) => {
          const value = match[Number(position) + 1];
          return /^error:/i.test(canonical(source)) || /: finalizado\.$/.test(canonical(source))
            ? catalog.get(canonical(value))?.[index] || value : value;
        });
        break;
      }
    }
    if (!translated && /[.!?]\s/.test(canonical(source))) {
      for (const [prefix, values] of catalog) {
        if (!/[.!?]$/.test(prefix) || !canonical(source).startsWith(`${prefix} `)) continue;
        const rest = canonical(source).slice(prefix.length + 1);
        const tail = translate(rest, language);
        if (tail !== rest) { translated = `${values[index]} ${tail}`; break; }
      }
    }
    if (!translated) return source;
    return source.replace(/\S(?:[\s\S]*\S)?/, translated);
  }
  function localizedURL(href, base, language = locale) {
    if (!href || href.startsWith("#") || href.startsWith("?")) return href;
    const url = new URL(href, base);
    if (url.origin !== new URL(base).origin) return href;
    const file = href.split(/[?#]/, 1)[0];
    if (/\/(?:index|opengd77|quansheng|anytone)\.html$/.test(url.pathname)) {
      url.searchParams.set("lang", language);
      return `${file}${url.search}${url.hash}`;
    }
    if (/\/ayuda(?:-[^/]+|\.(?:en|fr|de))?\.html$/.test(url.pathname)) {
      const suffix = language === "en-US" ? "en" : language;
      if (url.searchParams.has("lang")) url.searchParams.set("lang", language);
      return `${file.replace(/(?:\.(?:en|fr|de|it))?\.html$/, suffix === "es" ? ".html" : `.${suffix}.html`)}${url.search}${url.hash}`;
    }
    return href;
  }
  function mount(document) {
    const originals = new WeakMap();
    const attributes = new WeakMap();
    const skipped = element => element.closest("script, style, noscript, template, pre, code, textarea, [translate='no'], #ui-language");
    function text(node) {
      if (!node.parentElement || skipped(node.parentElement)) return;
      // Table cell data comes from radios and imported files, not from the UI catalog.
      if (node.parentElement.closest("tbody[id]") && node.parentElement.closest("td") &&
          !node.parentElement.closest("button, a, label, [translate='yes'], td[colspan]")) return;
      const previous = originals.get(node);
      const source = previous && node.data === previous.output ? previous.source : sourceByTranslation.get(canonical(node.data)) || node.data;
      const output = translate(source);
      originals.set(node, { source, output });
      if (node.data !== output) node.data = output;
    }
    function element(node) {
      if (skipped(node)) return;
      let saved = attributes.get(node);
      if (!saved) { saved = {}; attributes.set(node, saved); }
      for (const name of ["aria-label", "title", "placeholder", "alt"]) {
        if (!node.hasAttribute(name)) continue;
        const current = node.getAttribute(name);
        const previous = saved[name];
        const source = previous && current === previous.output ? previous.source : current;
        const output = translate(source);
        saved[name] = { source, output };
        if (output !== current) node.setAttribute(name, output);
      }
      if (node.tagName === "A" && node.hasAttribute("href") &&
          !node.hasAttribute("hreflang") && !node.hasAttribute("lang")) {
        const href = node.getAttribute("href");
        const localized = localizedURL(href, document.baseURI);
        if (href !== localized) node.setAttribute("href", localized);
      }
    }
    function walk(node) {
      if (node.nodeType === 3) { text(node); return; }
      if (node.nodeType !== 1 && node.nodeType !== 9) return;
      if (node.nodeType === 1) {
        if (skipped(node)) return;
        // An option without a value attribute derives its value from its label.
        if (node.tagName === "OPTION" && !node.hasAttribute("value")) node.setAttribute("value", node.value);
        element(node);
      }
      for (const child of node.childNodes) walk(child);
    }
    function apply() {
      document.documentElement.lang = locale;
      walk(document);
      const select = document.getElementById("ui-language");
      if (select) select.value = locale;
    }
    const label = document.createElement("label");
    label.className = "ui-language";
    const caption = document.createElement("span");
    caption.textContent = "Idioma";
    const select = document.createElement("select");
    select.id = "ui-language";
    select.name = "lang";
    for (const [value, name] of Object.entries(locales)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = name;
      option.lang = value;
      select.append(option);
    }
    label.append(caption, select);
    (document.querySelector(".topbar-right") || document.body).append(label);
    function setLocale(value) {
      const next = normalize(value);
      if (!next) return;
      locale = next;
      try { root.localStorage.setItem(key, locale); } catch { /* URL remains available when storage is denied. */ }
      if (helpPage && locale !== document.documentElement.lang) {
        const url = new URL(localizedURL(root.location.href, document.baseURI, locale));
        url.searchParams.set("lang", locale);
        root.location.assign(url.href);
        return;
      }
      try {
        const url = new URL(root.location.href);
        url.searchParams.set("lang", locale);
        root.history.replaceState(root.history.state, "", url);
      } catch { /* file: and restricted frames may not allow history updates. */ }
      apply();
    }
    select.addEventListener("change", () => setLocale(select.value));
    const observer = new root.MutationObserver(records => {
      for (const record of records) {
        if (record.type === "characterData") text(record.target);
        else if (record.type === "attributes") element(record.target);
        else for (const node of record.addedNodes) walk(node);
      }
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ["aria-label", "title", "placeholder", "alt", "href"] });
    // Keep typed confirmation tokens untouched: callers still compare the original literal.
    for (const name of ["prompt", "confirm", "alert"]) {
      if (typeof root[name] !== "function") continue;
      const original = root[name].bind(root);
      root[name] = (message, ...args) => original(String(message).split("\n").map(line => translate(line)).join("\n"), ...args);
    }
    setLocale(locale);
    return { apply, setLocale, disconnect: () => observer.disconnect() };
  }
  const api = { locales, normalize, resolveLocale, translate, localizedURL, mount, get locale() { return locale; } };
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BricohamsUI = api;
  if (root.document) root.document.addEventListener("DOMContentLoaded", () => mount(root.document), { once: true });
})(typeof globalThis === "object" ? globalThis : this);
