"use strict";
// Button system of the remote console: parses the tokens and rules of remote.css and checks WCAG contrast
// for every button variant and state in both themes, the 48 px touch target and the spacing between targets.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
const css = read("remote.css").replace(/\/\*[\s\S]*?\*\//g, "");
const html = read("remote.html");

const rules = [];
for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) rules.push({ selector: match[1].trim(), body: match[2] });
const rulesFor = selector => rules.filter(rule => rule.selector.split(",").map(s => s.trim()).includes(selector));
const tokensOf = selector => {
  const out = {};
  for (const rule of rules.filter(r => r.selector === selector)) {
    for (const m of rule.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)) out[m[1]] = m[2].trim();
  }
  return out;
};
const decl = (selector, prop) => {
  const values = rulesFor(selector).map(rule => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(rule.body)?.[1]?.trim()).filter(Boolean);
  return values.length ? values[values.length - 1] : null;
};

const dark = tokensOf(":root");
const light = { ...dark, ...tokensOf(":root[data-theme=light]") };
const THEMES = { dark, light };

function token(theme, value) {
  const m = /^var\((--[\w-]+)\)$/.exec(value || "");
  const resolved = m ? THEMES[theme][m[1]] : value;
  assert.match(resolved || "", /^#[0-9A-Fa-f]{6}$/, `${theme}: ${value} is not a plain hex colour`);
  return resolved;
}
function luminance(hex) {
  const channel = index => {
    const v = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const px = value => Number(/^(\d+(?:\.\d+)?)px$/.exec(value)?.[1] ?? NaN);
const rem = value => Number(/^(\d+(?:\.\d+)?)rem$/.exec(value)?.[1] ?? NaN) * 16;

test("light and system-light themes use the same official tokens", () => {
  assert.deepEqual(tokensOf(":root:not([data-theme=dark])"), tokensOf(":root[data-theme=light]"));
  assert.match(css, /@media\(prefers-color-scheme:light\)\{\s*:root:not\(\[data-theme=dark\]\)/);
  const official = {
    dark: { "--bg": "#111518", "--surface": "#1C2329", "--text": "#F6F8FA", "--muted": "#BAC4CC", "--border": "#38434C", "--link": "#FFA06A", "--focus": "#FFC18F" },
    light: { "--bg": "#FFFFFF", "--surface": "#F6F7F8", "--text": "#23272B", "--muted": "#59636B", "--border": "#DCE1E5", "--link": "#AA410B", "--focus": "#F26B1D" }
  };
  for (const [theme, expected] of Object.entries(official)) {
    for (const [name, value] of Object.entries(expected)) assert.equal(THEMES[theme][name].toUpperCase(), value, `${theme} ${name}`);
    assert.equal(THEMES[theme]["--on-accent"].toUpperCase(), "#23272B");
    assert.equal(THEMES[theme]["--accent"].toUpperCase(), "#F26B1D");
  }
});

test("text and status colours reach 4.5:1 on page and card backgrounds", () => {
  for (const theme of Object.keys(THEMES)) {
    for (const surface of ["--bg", "--surface"]) {
      const background = token(theme, `var(${surface})`);
      for (const name of ["--text", "--muted", "--link", "--amber", "--ok", "--warn", "--bad", "--error"]) {
        const ratio = contrast(token(theme, `var(${name})`), background);
        assert.ok(ratio >= 4.5, `${theme}: ${name} on ${surface} ${ratio.toFixed(2)}`);
      }
    }
    assert.ok(contrast(token(theme, "var(--on-tx)"), token(theme, "var(--swr-bg)")) >= 4.5, `${theme}: SWR alert`);
  }
});

// Visible fill/border/text of each variant and state, resolved from the stylesheet itself.
const STATES = [
  ["secondary", "button", "--surface-2", "--text", "--control-border"],
  ["secondary hover", "button:hover:not(:disabled)", "--bg", "--text", "--text"],
  ["secondary active", "button:active:not(:disabled)", "--bg", "--text", "--link"],
  ["primary", "button.primary", "--accent", "--on-accent", "--on-accent"],
  ["primary hover", "button.primary:hover:not(:disabled)", "--accent-hover", "--on-accent", "--on-accent"],
  ["primary active", "button.primary:active:not(:disabled)", "--accent-active", "--on-accent", "--on-accent"],
  ["danger", "button.danger", "--tx", "--on-tx", "--on-tx"],
  ["danger hover", "button.danger:hover:not(:disabled)", "--tx-hover", "--on-tx", "--on-tx"],
  ["danger active", "button.danger:active:not(:disabled)", "--tx-active", "--on-tx", "--on-tx"],
  ["selected", "button[aria-pressed=true]", "--accent", "--on-accent", "--on-accent"],
  ["selected hover", "button[aria-pressed=true]:hover:not(:disabled)", "--accent-hover", "--on-accent", "--on-accent"],
  ["selected active", "button[aria-pressed=true]:active:not(:disabled)", "--accent-active", "--on-accent", "--on-accent"],
  ["PTT transmitting", "button.ptt[aria-pressed=true]", "--tx", "--on-tx", "--on-tx"],
  ["disabled", "button:disabled", "--bg", "--muted", "--muted"]
];

function resolveState(theme, selector) {
  const rule = rulesFor(selector).map(r => r.body).join(";");
  const get = prop => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(rule)?.[1]?.trim();
  assert.ok(rule, `${selector} has a rule`);
  const background = get("background") || get("background-color");
  const shorthandBorder = (get("border") || "").split(/\s+/).pop();
  return {
    fill: token(theme, background.split(/\s+/).pop()),
    text: token(theme, get("color") || "var(--text)"),
    border: token(theme, get("border-color") || shorthandBorder)
  };
}

test("every button variant and state keeps 4.5:1 text and a visible 3:1 edge in both themes", () => {
  for (const theme of Object.keys(THEMES)) {
    for (const [name, selector, fill, color, border] of STATES) {
      const state = resolveState(theme, selector);
      assert.equal(state.fill, token(theme, `var(${fill})`), `${theme} ${name}: fill token`);
      assert.equal(state.text, token(theme, `var(${color})`), `${theme} ${name}: text token`);
      assert.equal(state.border, token(theme, `var(${border})`), `${theme} ${name}: border token`);
      const textRatio = contrast(state.text, state.fill);
      assert.ok(textRatio >= (name === "disabled" ? 3 : 4.5), `${theme} ${name}: text ${textRatio.toFixed(2)}`);
      const page = token(theme, "var(--bg)");
      const card = token(theme, "var(--surface)");
      for (const [label, surface] of [["page", page], ["card", card]]) {
        const edge = Math.max(contrast(state.fill, surface), contrast(state.border, surface));
        assert.ok(edge >= 3, `${theme} ${name}: edge on ${label} ${edge.toFixed(2)}`);
      }
    }
  }
});

test("focus ring is 3px in the focus token and reaches 3:1 on the page", () => {
  const rule = decl(":focus-visible", "outline");
  assert.match(rule, /^3px solid var\(--focus\)$/);
  for (const theme of Object.keys(THEMES)) assert.ok(contrast(token(theme, "var(--focus)"), token(theme, "var(--bg)")) >= 3, theme);
});

test("disabled buttons stay readable, dashed and not-allowed instead of faded", () => {
  const body = rulesFor("button:disabled").map(r => r.body).join(";");
  assert.match(body, /cursor:not-allowed/);
  assert.match(body, /dashed/);
  assert.doesNotMatch(body, /opacity/);
  assert.doesNotMatch(css, /button:disabled\{[^}]*opacity/);
});

test("selected state has a non-colour cue: check mark, inset bar and heavier weight", () => {
  assert.match(decl("button[aria-pressed=true]", "box-shadow"), /^inset /);
  assert.equal(Number(decl("button[aria-pressed=true]", "font-weight")), 800);
  assert.ok(Number(decl("button", "font-weight")) >= 600);
  assert.match(css, /button\[aria-pressed=true\]::before,\.tabs button\[aria-selected=true\]::before\{content:"\\2713"/);
  assert.match(decl(".tabs button[aria-selected=true]", "box-shadow"), /^inset /);
});

test("all targets are at least 48px with 16px labels and at least 8px between them", () => {
  assert.ok(px(decl("button", "min-height")) >= 48 || rem(decl("button", "min-height")) >= 48);
  assert.ok(px(decl("select", "min-height")) >= 48);
  assert.ok(px(decl("button", "min-width")) >= 48);
  assert.equal(decl("button", "font-size"), "1rem");
  assert.ok(Number(decl("button", "font-weight")) >= 600);
  assert.equal(decl("button", "white-space"), "normal");
  // No rule may shrink an interactive control below 48px.
  for (const rule of rules) {
    if (/^@media|:root/.test(rule.selector)) continue;
    for (const m of rule.body.matchAll(/(?:^|;)\s*min-(height|width)\s*:\s*(\d+(?:\.\d+)?)px/g)) {
      if (!/button|\.btn|select|input|\.ptt|\.audio|\.lock|\.tune-stop|\.digit|\.tuner|\.dx-spot/.test(rule.selector)) continue;
      if (m[1] === "width" && /^\.(audio|lock|tune-stop)/.test(rule.selector)) continue;
      if (/::file-selector-button/.test(rule.selector)) continue;
      assert.ok(Number(m[2]) >= 48, `${rule.selector} min-${m[1]} ${m[2]}px`);
    }
  }
  assert.ok(px(decl(".audio", "min-height")) >= 48);
  assert.ok(px(decl("input[type=range]", "min-height")) >= 48);
  assert.ok(px(decl(".ui-language select", "min-height")) >= 48);
  assert.ok(px(decl(".freq .digit", "min-height")) >= 48);
  assert.ok(px(decl(".tuner", "height")) >= 48);
  assert.ok(px(decl("input[type=checkbox]", "width")) >= 24 && px(decl("label.check", "min-height")) >= 48);
  for (const selector of [".grid", ".toggles", ".cw-actions", ".tabs", ".rotor-row", ".dock", ".tune-row", ".scope-controls", ".settings-tools"]) {
    const gap = decl(selector, "gap");
    assert.ok(px(gap.split(/\s+/)[0]) >= 8, `${selector} gap ${gap}`);
  }
  assert.ok(px(/(?:^|;)\s*gap\s*:\s*(\d+px)/.exec(rulesFor(".dock")[0].body)[1]) >= 12, "PTT keeps a wider gap to Audio and Lock");
  assert.match(css, /@media\(max-width:400px\)\{[^@]*\.dock\{gap:8px;/);
});

test("PTT stays the largest control, solid red and labelled while transmitting; stop buttons are danger", () => {
  assert.ok(px(decl(".ptt", "min-height")) > px(decl("button", "min-height")));
  assert.ok(rem(decl(".ptt", "font-size")) > 16);
  assert.match(css, /button\.ptt\[aria-pressed=true\][^{]*\{background:var\(--tx\);[^}]*color:var\(--on-tx\)/);
  assert.equal(decl(".dock", "position"), "fixed");
  for (const id of ["cw-stop", "btn-tune", "btn-amp-standby"]) assert.match(html, new RegExp(`id="${id}"[^>]*class="[^"]*danger`));
  assert.match(html, /id="rotor-stop" type="button" class="tune-stop"/);
  assert.match(html, /id="tune-stop" type="button" class="tune-stop"/);
  assert.match(css, /#btn-tune\{margin-top:16px\}/);
  for (const id of ["cw-send", "qso-add", "settings-load", "rotor-go"]) assert.match(html, new RegExp(`id="${id}"[^>]*class="primary"`));
  assert.doesNotMatch(html, /\sstyle=/);
});

test("narrow dock wraps instead of squeezing the PTT button and keeps the tune-live offset in sync", () => {
  assert.match(css, /@media\(max-width:400px\)\{[^@]*\.ptt\{order:-1;flex:1 1 100%\}/);
  const offset = /@media\(max-width:400px\)\{[^@]*--dock-h:(\d+)px/.exec(css);
  assert.ok(offset && Number(offset[1]) >= 8 + 72 + 8 + 48 + 8);
});
