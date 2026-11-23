"use strict";
// Renders the per-radio parity table of data/remote-feature-parity.json into docs/REMOTE_STATION.md and its translations.
// Usage: node scripts/remote-parity-docs.cjs        (rewrites the docs)
const fs = require("node:fs");
const path = require("node:path");
const { loadCatalog } = require("../remote-catalog.cjs");
const { FEATURES, loadParity, resolveRows } = require("../remote-parity.cjs");

const root = path.join(__dirname, "..");
const START = "<!-- remote-parity:start -->";
const END = "<!-- remote-parity:end -->";
const SYMBOL = { ok: "✔", partial: "◐", pendiente: "✖", na: "–" };

const TEXT = {
  es: {
    file: "docs/REMOTE_STATION.md", title: "Paridad de funciones remotas por radio",
    intro: "La matriz `data/remote-feature-parity.json` lista cada radio del catalogo remoto y cada perfil Android contra las funciones base. Una funcion marcada ✔ o ◐ cita archivos fuente existentes; ✖ es «pendiente de fuente» y las consolas la muestran deshabilitada con su motivo. Nunca se transmite sin accion explicita del operador, con limite de tiempo, parada de emergencia y corte por ROE alta; no transmitas sin carga adaptada o antena.",
    legend: "✔ disponible · ◐ parcial · ✖ pendiente de fuente · – no aplica",
    radio: "Radio", link: "Enlace",
    features: { freqMode: "Frec./modo", vfoSplit: "VFO/split", ptt: "PTT", smeter: "S-metro", txMeters: "Medidores TX", tune: "Tune", audioRx: "Audio RX", audioTx: "Audio TX", waterfall: "Cascada", rotor: "Rotor", accessories: "Sint./amp.", settings: "Ajustes" }
  },
  en: {
    file: "docs/i18n/en/REMOTE_STATION.md", title: "Remote feature parity per radio",
    intro: "The matrix `data/remote-feature-parity.json` lists every radio of the remote catalogue and every Android profile against the baseline features. A feature marked ✔ or ◐ cites existing source files; ✖ means \"pendiente de fuente\" (no source) and the consoles show it disabled with the reason. The software never transmits without an explicit operator action, with a time cap, emergency stop and high-SWR trip; never transmit without a matched load or antenna.",
    legend: "✔ available · ◐ partial · ✖ pendiente de fuente (no source) · – not applicable",
    radio: "Radio", link: "Link",
    features: { freqMode: "Freq./mode", vfoSplit: "VFO/split", ptt: "PTT", smeter: "S-meter", txMeters: "TX meters", tune: "Tune", audioRx: "RX audio", audioTx: "TX audio", waterfall: "Waterfall", rotor: "Rotor", accessories: "Tuner/amp.", settings: "Settings" }
  },
  fr: {
    file: "docs/i18n/fr/REMOTE_STATION.md", title: "Parité des fonctions distantes par radio",
    intro: "La matrice `data/remote-feature-parity.json` liste chaque radio du catalogue distant et chaque profil Android face aux fonctions de base. Une fonction marquée ✔ ou ◐ cite des fichiers source existants ; ✖ signifie « pendiente de fuente » (sans source) et les consoles l'affichent désactivée avec son motif. Le logiciel n'émet jamais sans action explicite de l'opérateur, avec limite de durée, arrêt d'urgence et coupure sur ROS élevé ; n'émettez jamais sans charge adaptée ou antenne.",
    legend: "✔ disponible · ◐ partiel · ✖ pendiente de fuente (sans source) · – non applicable",
    radio: "Radio", link: "Liaison",
    features: { freqMode: "Fréq./mode", vfoSplit: "VFO/split", ptt: "PTT", smeter: "S-mètre", txMeters: "Mesures TX", tune: "Tune", audioRx: "Audio RX", audioTx: "Audio TX", waterfall: "Cascade", rotor: "Rotor", accessories: "Boîte/ampli", settings: "Réglages" }
  },
  de: {
    file: "docs/i18n/de/REMOTE_STATION.md", title: "Funktionsparität der Fernsteuerung je Funkgerät",
    intro: "Die Matrix `data/remote-feature-parity.json` führt jedes Funkgerät des Remote-Katalogs und jedes Android-Profil gegen die Basisfunktionen auf. Eine mit ✔ oder ◐ markierte Funktion nennt vorhandene Quelldateien; ✖ bedeutet „pendiente de fuente“ (keine Quelle) und die Konsolen zeigen sie deaktiviert mit Begründung. Die Software sendet nie ohne ausdrückliche Bedienhandlung, mit Zeitlimit, Notaus und Abschaltung bei hohem SWR; niemals ohne angepasste Last oder Antenne senden.",
    legend: "✔ verfügbar · ◐ teilweise · ✖ pendiente de fuente (keine Quelle) · – nicht zutreffend",
    radio: "Funkgerät", link: "Anbindung",
    features: { freqMode: "Freq./Modus", vfoSplit: "VFO/Split", ptt: "PTT", smeter: "S-Meter", txMeters: "TX-Messwerte", tune: "Tune", audioRx: "RX-Audio", audioTx: "TX-Audio", waterfall: "Wasserfall", rotor: "Rotor", accessories: "Tuner/PA", settings: "Einstellungen" }
  },
  it: {
    file: "docs/i18n/it/REMOTE_STATION.md", title: "Parità delle funzioni remote per radio",
    intro: "La matrice `data/remote-feature-parity.json` elenca ogni radio del catalogo remoto e ogni profilo Android rispetto alle funzioni di base. Una funzione contrassegnata ✔ o ◐ cita file sorgente esistenti; ✖ significa «pendiente de fuente» (senza fonte) e le console la mostrano disattivata con il motivo. Il software non trasmette mai senza un'azione esplicita dell'operatore, con limite di tempo, arresto di emergenza e interruzione per ROS alto; non trasmettere mai senza carico adattato o antenna.",
    legend: "✔ disponibile · ◐ parziale · ✖ pendiente de fuente (senza fonte) · – non applicabile",
    radio: "Radio", link: "Collegamento",
    features: { freqMode: "Freq./modo", vfoSplit: "VFO/split", ptt: "PTT", smeter: "S-meter", txMeters: "Misure TX", tune: "Tune", audioRx: "Audio RX", audioTx: "Audio TX", waterfall: "Waterfall", rotor: "Rotore", accessories: "Accord./ampl.", settings: "Impostazioni" }
  }
};

function renderBlock(lang, catalog = loadCatalog(), parity = loadParity()) {
  const text = TEXT[lang];
  const radios = new Map(catalog.radios.map(radio => [radio.id, radio]));
  const rows = resolveRows(parity);
  const lines = [START, `## ${text.title}`, "", text.intro, "", text.legend, ""];
  lines.push(`| ${[text.radio, text.link, ...FEATURES.map(feature => text.features[feature])].join(" | ")} |`);
  lines.push(`| ${["---", "---", ...FEATURES.map(() => ":-:")].join(" | ")} |`);
  for (const row of rows) {
    const radio = radios.get(row.id);
    const name = radio ? `${radio.maker} ${radio.model}` : `\`${row.id}\``;
    const link = radio ? radio.links.join("/") : "Android";
    lines.push(`| ${[name, link, ...row.features.map(status => SYMBOL[status])].join(" | ")} |`);
  }
  lines.push(END);
  return lines.join("\n");
}

function applyBlock(content, block) {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const text = block.replace(/\n/g, eol);
  const start = content.indexOf(START);
  const end = content.indexOf(END);
  if (start >= 0 && end > start) return content.slice(0, start) + text + content.slice(end + END.length);
  return content.replace(/\s*$/, "") + eol + eol + text + eol;
}

if (require.main === module) {
  for (const lang of Object.keys(TEXT)) {
    const file = path.join(root, TEXT[lang].file);
    fs.writeFileSync(file, applyBlock(fs.readFileSync(file, "utf8"), renderBlock(lang)));
  }
}

module.exports = { TEXT, START, END, renderBlock, applyBlock };
