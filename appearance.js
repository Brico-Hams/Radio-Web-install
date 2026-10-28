(function (root) {
  "use strict";
  const key = "bricohams.appearance";
  const choices = ["system", "light", "dark"];
  const labels = {
    es: ["Apariencia", "Sistema", "Claro", "Oscuro"],
    en: ["Appearance", "System", "Light", "Dark"],
    fr: ["Apparence", "Système", "Clair", "Sombre"],
    de: ["Darstellung", "System", "Hell", "Dunkel"],
    it: ["Aspetto", "Sistema", "Chiaro", "Scuro"]
  };
  function readPreference(storage) {
    try {
      const value = storage?.getItem(key);
      return choices.includes(value) ? value : "system";
    } catch { return "system"; }
  }
  function resolvedTheme(preference, darkSystem) {
    return preference === "light" || preference === "dark" ? preference : darkSystem ? "dark" : "light";
  }
  function mount(document, storage, media) {
    let preference = readPreference(storage);
    const control = document.createElement("label");
    control.className = "appearance-control";
    control.setAttribute("translate", "no");
    const caption = document.createElement("span");
    const select = document.createElement("select");
    select.id = "ui-appearance";
    for (const value of choices) {
      const option = document.createElement("option");
      option.value = value;
      select.append(option);
    }
    control.append(caption, select);
    function localize() {
      const text = labels[document.documentElement.lang.split("-")[0]] || labels.en;
      caption.textContent = text[0];
      select.setAttribute("aria-label", text[0]);
      [...select.options].forEach((option, index) => { option.textContent = text[index + 1]; });
    }
    function apply() {
      document.documentElement.dataset.theme = resolvedTheme(preference, media?.matches);
      select.value = preference;
    }
    function change(value) {
      preference = choices.includes(value) ? value : "system";
      try { storage?.setItem(key, preference); } catch { /* The preference still applies for this page when storage is denied. */ }
      apply();
    }
    select.addEventListener("change", () => change(select.value));
    media?.addEventListener("change", apply);
    const languageObserver = new root.MutationObserver(localize);
    languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    const storageListener = event => {
      if (event.key === key || event.key === null) { preference = readPreference(storage); apply(); }
    };
    root.addEventListener("storage", storageListener);
    (document.querySelector(".topbar-right") || document.querySelector(".firmware-help header") || document.body).append(control);
    localize(); apply();
    return {
      change,
      disconnect() {
        languageObserver.disconnect();
        media?.removeEventListener("change", apply);
        root.removeEventListener("storage", storageListener);
      }
    };
  }
  const api = { readPreference, resolvedTheme, mount };
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root.document) {
    let storage;
    try { storage = root.localStorage; } catch { /* Private sessions can deny storage access. */ }
    const media = root.matchMedia?.("(prefers-color-scheme: dark)");
    root.document.documentElement.dataset.theme = resolvedTheme(readPreference(storage), media?.matches);
    root.document.addEventListener("DOMContentLoaded", () => mount(root.document, storage, media), { once: true });
  }
})(typeof globalThis === "object" ? globalThis : this);
