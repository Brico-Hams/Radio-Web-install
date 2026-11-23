"use strict";
// Desktop workspace button system: WCAG contrast of every button state in both themes, 48px targets and shared tokens.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
const strip = css => css.replace(/\/\*[\s\S]*?\*\//g, "");

function luminance(hex) {
  const parts = hex.slice(1).match(/../g).map(value => {
    const channel = parseInt(value, 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return parts[0] * .2126 + parts[1] * .7152 + parts[2] * .0722;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + .05) / (lo + .05);
}
const hexTokens = text => Object.fromEntries([...text.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map(([, name, value]) => [name, value.toUpperCase()]));
const blocks = css => [...strip(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim().replace(/\s+/g, " "), body }));
const rulesFor = (css, selector) => blocks(css).filter(rule => rule.selector.endsWith(selector));
const declaration = (rules, property) => {
  let value = null;
  for (const rule of rules) for (const [, name, text] of rule.body.matchAll(/([\w-]+)\s*:\s*([^;]+);?/g)) if (name === property) value = text.trim();
  return value;
};

const styles = read("styles.css");
const sources = { "styles.css": styles, "tools.css": read("tools.css"), "antenna.css": read("antenna.css"), "remoto.css": read("remoto.css"), "help-docs.css": read("help-docs.css") };

function palettes(css, rootFirst) {
  const flat = strip(css);
  const base = hexTokens(rootFirst ? flat.match(/^:root\s*\{([^}]*)\}/m)[1] : flat.match(/:root\s*\{([^}]*--btn-primary-bg[^}]*)\}/)[1]);
  const buttonLight = hexTokens(flat.match(/:root\s*\{([^}]*--btn-primary-bg[^}]*)\}/)[1]);
  const mediaDark = flat.match(/@media \(prefers-color-scheme: dark\) \{\s*:root(?::not\(\[data-theme="light"\]\))? \{([^}]*)\}/)[1];
  const explicit = flat.match(/:root\[data-theme="dark"\] \{([^}]*)\}/);
  const light = { ...base, ...buttonLight };
  const dark = { ...light, ...hexTokens(mediaDark) };
  return { light, dark, mediaDark: hexTokens(mediaDark), explicit: explicit ? hexTokens(explicit[1]) : null, flat };
}
const workspace = (() => {
  const flat = strip(styles);
  const light = { ...hexTokens(flat.match(/^:root\{([^}]*)\}/m)[1]), ...hexTokens(flat.match(/:root \{\s*--btn-primary-bg[^}]*\}/)[0]) };
  const baseDark = hexTokens(flat.match(/:root\[data-theme="dark"\]\{([^}]*)\}/)[1]);
  const btnDark = hexTokens(flat.match(/:root\[data-theme="dark"\] \{([^}]*)\}/)[1]);
  const btnSystemDark = hexTokens(flat.match(/:root:not\(\[data-theme="light"\]\) \{([^}]*--btn[^}]*)\}/)[1]);
  return { light, dark: { ...light, ...baseDark, ...btnDark }, btnDark, btnSystemDark };
})();
const remoto = palettes(sources["remoto.css"], true);

const VARIANTS = ["primary", "secondary", "danger", "selected"];
const BUTTON_RULES = [
  ["styles.css", ":is(.button, .guide-tab, .quick-action, .back, .task-list a, .step-view, .sidebar nav a, .backups-panel button)"],
  ["tools.css", ".tl-btn, .tl-btn-primary"],
  ["antenna.css", ".ant-btn"],
  ["remoto.css", ".rm-btn"]
];

test("system dark and data-theme dark share the same button tokens", () => {
  assert.deepEqual(workspace.btnSystemDark, workspace.btnDark);
  assert.deepEqual(remoto.mediaDark && Object.fromEntries(Object.entries(remoto.mediaDark).filter(([name]) => name.startsWith("btn-"))),
    Object.fromEntries(Object.entries(workspace.btnDark).filter(([name]) => name !== "btn-selected-bg")));
});

test("remoto.css button tokens are identical to styles.css in both themes", () => {
  for (const [mode, own, shared] of [["light", remoto.light, workspace.light], ["dark", remoto.dark, workspace.dark]]) {
    for (const name of Object.keys(shared).filter(key => key.startsWith("btn-"))) assert.equal(own[name], shared[name], `${mode} ${name}`);
    for (const name of ["bg", "surface", "text", "focus"]) {
      assert.equal(own[name], shared[name], `${mode} ${name}`);
    }
  }
});

for (const [mode, palette] of [["light", workspace.light], ["dark", workspace.dark]]) {
  test(`${mode}: every button variant and state meets WCAG 2.2 AA`, () => {
    const page = [palette.bg, palette.surface];
    for (const variant of VARIANTS) {
      const bg = palette[`btn-${variant}-bg`], fg = palette[`btn-${variant}-fg`], border = palette[`btn-${variant}-border`];
      const hover = palette[`btn-${variant}-hover`], active = palette[`btn-${variant}-active`];
      const states = { rest: bg, hover, active: variant === "selected" ? palette["btn-primary-active"] : active };
      for (const [state, fill] of Object.entries(states)) {
        assert.ok(fill, `${variant} ${state} token`);
        assert.ok(contrast(fg, fill) >= 4.5, `${mode} ${variant} ${state} text ${contrast(fg, fill).toFixed(2)}`);
      }
      assert.notEqual(hover, bg, `${variant} hover differs from rest`);
      assert.notEqual(states.active, hover, `${variant} active differs from hover`);
      for (const surface of page) assert.ok(contrast(border, surface) >= 3, `${mode} ${variant} border on ${surface}`);
    }
    // Secondary needs a visible 2px border against its own fill as well as the page.
    assert.ok(contrast(palette["btn-secondary-border"], palette["btn-secondary-bg"]) >= 3);
    assert.ok(contrast(palette["btn-selected-bar"], palette["btn-selected-bg"]) >= 3, "selected inset bar");
    assert.ok(contrast(palette["btn-danger-bg"], palette["btn-danger-fg"]) >= 4.5);
    assert.equal(palette["btn-primary-fg"], "#23272B", "graphite text on orange");
    assert.equal(palette["btn-primary-bg"], "#F26B1D");
    assert.equal(palette["btn-danger-fg"], "#FFFFFF");
    assert.notEqual(palette["btn-selected-fg"], "#FFFFFF", "never white on orange");
    // Disabled stays readable (3:1) and differs from the secondary fill.
    assert.ok(contrast(palette["btn-disabled-fg"], palette["btn-disabled-bg"]) >= 3, "disabled text");
    assert.notEqual(palette["btn-disabled-bg"], palette["btn-secondary-bg"]);
    // Focus ring: the 3px outline sits on a ring painted with --bg.
    assert.ok(contrast(palette.focus, palette.bg) >= 3, "focus on page background");
    // Link colour used for small text keeps 4.5:1 (never orange on white).
    for (const surface of page) assert.ok(contrast(palette.link, surface) >= 4.5, `link on ${surface}`);
  });
}

test("every surface button rule enforces 48px targets, 16px/600 labels and no truncation", () => {
  for (const [file, selector] of BUTTON_RULES) {
    const rules = rulesFor(sources[file], selector).filter(rule => !/:(hover|active|focus-visible|disabled)/.test(rule.selector));
    assert.ok(rules.length > 0, `${file} base rule ${selector}`);
    assert.equal(declaration(rules, "min-height"), "48px", `${file} min-height`);
    assert.equal(declaration(rules, "min-width"), "48px", `${file} min-width`);
    assert.equal(declaration(rules, "font-size"), "16px", `${file} font-size`);
    assert.equal(declaration(rules, "font-weight"), "600", `${file} font-weight`);
    assert.match(declaration(rules, "border"), /^2px solid var\(--b-bd\)$/, `${file} border`);
    assert.equal(declaration(rules, "white-space"), "normal", `${file} wraps long labels`);
    assert.ok(!/text-overflow:\s*ellipsis/.test(rules.map(rule => rule.body).join("")), `${file} no ellipsis`);
  }
  const big = rulesFor(styles, ":root .button.big");
  assert.ok(parseInt(declaration(big, "min-height"), 10) >= 48);
});

test("button rules use only tokens (no raw colours) and define all states", () => {
  for (const [file, selector] of BUTTON_RULES) {
    const flat = strip(sources[file]);
    const related = blocks(flat).filter(rule => /\.(button|tl-btn|ant-btn|rm-btn|guide-tab)\b/.test(rule.selector) && !/\.skip/.test(rule.selector));
    for (const rule of related) assert.doesNotMatch(rule.body, /#[0-9a-f]{3,8}\b/i, `${file}: ${rule.selector}`);
    for (const state of [":hover", ":active", ":disabled", ":focus-visible"]) {
      assert.ok(blocks(flat).some(rule => rule.selector.includes(state) && /\.(button|tl-btn|ant-btn|rm-btn|tl-page|ant-page)|:is\(\.rm-btn/.test(rule.selector) || (state === ":focus-visible" && rule.selector.includes(".rm-btn"))), `${file} ${state}`);
    }
  }
  const disabled = blocks(strip(styles)).find(rule => rule.selector.includes(":is(:disabled, [aria-disabled=true])"));
  assert.match(disabled.body, /cursor:\s*not-allowed/);
  for (const file of ["tools.css", "antenna.css", "remoto.css"]) assert.match(sources[file], /cursor:\s*not-allowed/, file);
  for (const file of ["styles.css", "tools.css", "antenna.css", "remoto.css"]) {
    assert.match(sources[file], /outline:\s*3px solid var\(--focus\)/, `${file} focus ring`);
    assert.match(sources[file], /content:\s*"\\2713"/, `${file} selected check mark`);
  }
  assert.match(sources["help-docs.css"], /min-height:\s*48px/);
});

test("inputs, selects and gaps follow the spacing scale", () => {
  assert.match(sources["tools.css"], /\.tl-field input, \.tl-field select \{ min-height: 48px/);
  assert.match(sources["antenna.css"], /\.ant-field input[^{]*\{[^}]*min-height: 48px/);
  assert.match(sources["remoto.css"], /\.rm-field input, \.rm-field select \{ min-height: 48px/);
  assert.match(strip(styles), /:root select, :root textarea[^{]*\{ min-height: 48px; font-size: 16px; \}/);
  for (const [file, selector] of [["tools.css", ".tl-row"], ["antenna.css", ".ant-row"], ["remoto.css", ".rm-row"]]) {
    const gap = declaration(rulesFor(sources[file], selector), "gap");
    assert.ok(parseInt(gap, 10) >= 8, `${file} ${selector} gap ${gap}`);
  }
  const gaps = blocks(strip(styles)).filter(rule => rule.selector.startsWith(":root .sidebar nav, :root .sidebar nav ul"));
  assert.ok(gaps.length && parseInt(declaration(gaps, "gap"), 10) >= 8);
});

test("destructive and stop actions use the danger variant, writes to the radio included", () => {
  assert.ok(blocks(strip(styles)).some(rule => rule.selector.includes(":root #main .button[data-op=write]") && /--btn-danger-bg/.test(rule.body)));
  assert.match(read("remoto-ui.js"), /rm-btn rm-btn-danger", type: "button", text: "Detener estacion"/);
  assert.match(read("antenna-ui.js"), /id="ant-swr-stop" class="ant-btn ant-btn-danger"/);
  assert.match(read("antenna-ui.js"), /id="ant-swr-clear" class="ant-btn ant-btn-danger"/);
});

test("no CDN fonts or remote assets and no unconditional horizontal overflow in the stylesheets", () => {
  for (const [file, css] of Object.entries(sources)) {
    assert.doesNotMatch(css, /url\(\s*["']?https?:|@import/i, file);
    for (const rule of blocks(css)) {
      const match = rule.body.match(/(?:^|[;\s])min-width:\s*(\d+)px/);
      if (match && Number(match[1]) > 320) assert.match(rule.selector, /\.firmware-help table/, `${file}: ${rule.selector}`);
    }
  }
  assert.match(strip(styles), /\.table-scroll\s*\{[^}]*overflow:\s*auto/);
});

test("every button in the desktop pages and their scripts carries a styled class", () => {
  const styled = /\b(button|guide-tab|quick-action|step-view|tl-btn|ant-btn|rm-btn)\b/;
  const files = fs.readdirSync(path.join(__dirname, ".."))
    .filter(name => /\.html$/.test(name) && !/^ayuda/.test(name) && !["remote.html", "ota.html", "satelites.html"].includes(name))
    .concat(["app.js", "antenna-ui.js", "remoto-ui.js", "tools-ui.js"]);
  const unstyled = [];
  for (const file of files) {
    const text = read(file);
    for (const [tag] of text.matchAll(/<button\b[^>]*>/g)) if (!styled.test(tag)) unstyled.push(`${file}: ${tag.slice(0, 90)}`);
    for (const [call] of text.matchAll(/el\("button",\s*\{[^}]*\}/g)) if (!styled.test(call)) unstyled.push(`${file}: ${call.slice(0, 90)}`);
  }
  assert.deepEqual(unstyled, []);
});

// Navigation polish: no mid-word breaks, list look, scroll offset and the 900px collapse.
const flatStyles = strip(styles);
const navRules = blocks(flatStyles).filter(rule => /\.sidebar nav|\.steps button\.step-view|\.step-view/.test(rule.selector));

test("sidebar labels never break inside a word", () => {
  for (const rule of navRules) {
    if (/\.step-view|\.sidebar nav a/.test(rule.selector) && /:is\(\.button/.test(rule.selector)) continue;
    assert.doesNotMatch(rule.body, /overflow-wrap:\s*anywhere|word-break:\s*(break-all|break-word)/, rule.selector);
  }
  const own = navRules.filter(rule => rule.selector === ":root .sidebar nav a, :root .steps button.step-view");
  assert.equal(own.length, 1);
  assert.equal(declaration(own, "overflow-wrap"), "normal");
  assert.equal(declaration(own, "word-break"), "normal");
  assert.equal(declaration(own, "hyphens"), "manual");
  assert.match(declaration(rulesFor(styles, ".sidebar"), "width") || "", /./);
});

test("sidebar is wider on desktop through a clamp shared with the workspace offset", () => {
  const wide = flatStyles.match(/@media \(min-width: 901px\) \{\s*:root \{ --sidebar-w: clamp\((\d+)px, (\d+)vw, (\d+)px\); \}\s*\.sidebar \{ width: var\(--sidebar-w\); \}\s*\.workspace \{ margin-left: var\(--sidebar-w\); \}/);
  assert.ok(wide, "sidebar width clamp");
  assert.ok(Number(wide[1]) >= 256 && Number(wide[3]) >= Number(wide[1]));
});

test("navigation is a clean list: borderless rows, subtle hover, selected item and a thin guide line", () => {
  const own = navRules.find(rule => rule.selector === ":root .sidebar nav a, :root .steps button.step-view");
  assert.match(own.body, /--b-bg:\s*transparent/);
  assert.match(own.body, /--b-bd:\s*transparent/);
  const base = blocks(flatStyles).find(rule => rule.selector.startsWith(":root :is(.button, .guide-tab") && /min-height: 48px/.test(rule.body));
  assert.ok(base, "48px rows from the shared button rule");
  assert.match(flatStyles, /:root \.sidebar nav \.nav-sub \{[^}]*border-left: 1px solid var\(--border\)/);
  assert.match(flatStyles, /\[aria-current\]:not\(\[aria-current=false\]\)::after \{ content: "\\2713"/);
  assert.match(flatStyles, /box-shadow: inset 8px 0 0 var\(--btn-selected-bar\)/);
  assert.match(flatStyles, /\.step-view, \.sidebar nav a, \.backups-panel button, \.icom-drop, \.skip, summary, select, input, textarea\):focus-visible/);
});

test("the sticky top bar wraps and never covers anchors: scroll offset follows its real height", () => {
  assert.match(flatStyles, /html \{ scroll-padding-top: calc\(var\(--topbar-h, (\d+)px\) \+ 16px\); \}/);
  assert.ok(Number(flatStyles.match(/--topbar-h, (\d+)px/)[1]) >= 96);
  assert.match(flatStyles, /\.topbar \{ flex-wrap: wrap; align-items: center; \}/);
  assert.match(flatStyles, /\.topbar-right \{[^}]*flex-wrap: wrap/);
  const narrow = flatStyles.match(/@media \(max-width: 900px\) \{([\s\S]*?)\r?\n\}\r?\n/)[1];
  assert.match(narrow, /\.topbar \{ position: static; \}/, "non-sticky bar at narrow widths");
  assert.match(narrow, /html \{ scroll-padding-top: 16px; \}/);
  const app = read("app.js");
  assert.match(app, /setProperty\("--topbar-h", `\$\{topbar\.offsetHeight\}px`\)/);
  assert.match(app, /new ResizeObserver\(syncTopbar\)/);
});

test("below 900px the sidebar collapses into an accessible drawer opened by a menu button", () => {
  const narrow = flatStyles.match(/@media \(max-width: 900px\) \{([\s\S]*?)\r?\n\}\r?\n/)[1];
  assert.match(narrow, /\.sidebar \{[^}]*visibility: hidden; transform: translateX\(-100%\)/);
  assert.match(narrow, /\.sidebar\[data-open\] \{ visibility: visible; transform: none; \}/);
  assert.match(narrow, /\.workspace \{ margin-left: 0; \}/);
  assert.match(narrow, /:root \.button\.nav-toggle \{ display: inline-flex; \}/);
  assert.match(flatStyles, /:root \.button\.nav-toggle, :root \.sidebar \.button\.nav-close \{ display: none; \}/);
  assert.doesNotMatch(flatStyles, /@media \(max-width: 900px\)[^}]*\{[^}]*\.sidebar nav a[^}]*white-space: nowrap/);
  const app = read("app.js");
  assert.match(app, /<button id="nav-toggle" class="button secondary nav-toggle" type="button" aria-controls="sidebar" aria-expanded="false">/);
  assert.match(app, /<aside class="sidebar" id="sidebar">/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(app, /toggle\.setAttribute\("aria-expanded", String\(open\)\)/);
  const translations = read("ui-translations.js");
  for (const label of ["Cerrar menu"]) assert.match(translations, new RegExp(`\\["${label}", "[^"]+", "[^"]+", "[^"]+"\\]`), label);
  assert.match(translations, /^Menú\|Menu\|Menu\|Menü$/m);
});
