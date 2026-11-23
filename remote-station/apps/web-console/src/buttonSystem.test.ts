import { describe, expect, it } from 'vitest'
// @ts-ignore tsconfig.app.json only loads vite/client types, not node
import { readFileSync } from 'node:fs'
import pttSource from './PttPanel.tsx?raw'
import accessoriesSource from './AccessoriesPanel.tsx?raw'
import rotorSource from './RotorPanel.tsx?raw'
import flexSource from './FlexPanel.tsx?raw'

// Deterministic audit of the shared button system: parses the real stylesheets
// and checks WCAG 2.2 contrast per state and theme plus the 48px touch target.

// Read from disk: vitest may stub CSS modules, which would hide the real rules.
// import.meta.url is not a file: URL under this runner, so resolve from cwd (web-console).
const readSrc = (name: string): string => readFileSync(`src/${name}`, 'utf8')
const indexCss = readSrc('index.css')
const appCss = readSrc('App.css')

const sources: Record<string, string> = {
  'PttPanel.tsx': pttSource,
  'AccessoriesPanel.tsx': accessoriesSource,
  'RotorPanel.tsx': rotorSource,
  'FlexPanel.tsx': flexSource,
}
const read = (name: string) => sources[name]

interface Rule { selector: string, decls: Record<string, string>, media: string }

function splitTop(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of text) {
    if (char === '(' || char === '[') depth += 1
    if (char === ')' || char === ']') depth -= 1
    if (char === ',' && depth === 0) { parts.push(current.trim()); current = '' } else current += char
  }
  if (current.trim()) parts.push(current.trim())
  return parts
}

function parseRules(source: string, media = ''): Rule[] {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const rules: Rule[] = []
  let index = 0
  while (index < css.length) {
    const open = css.indexOf('{', index)
    if (open < 0) break
    const selector = css.slice(index, open).trim().replace(/\s+/g, ' ')
    let depth = 1
    let end = open + 1
    while (depth > 0 && end < css.length) {
      if (css[end] === '{') depth += 1
      if (css[end] === '}') depth -= 1
      end += 1
    }
    const body = css.slice(open + 1, end - 1)
    if (selector.startsWith('@media')) rules.push(...parseRules(body, selector))
    else if (!selector.startsWith('@')) {
      const decls: Record<string, string> = {}
      for (const declaration of body.split(';')) {
        const colon = declaration.indexOf(':')
        if (colon > 0) decls[declaration.slice(0, colon).trim()] = declaration.slice(colon + 1).trim()
      }
      rules.push({ selector, decls, media })
    }
    index = end
  }
  return rules
}

const rules = parseRules(indexCss)
const appRules = parseRules(appCss)

function declsFor(selector: string): Record<string, string> {
  const merged: Record<string, string> = {}
  for (const rule of rules.filter((candidate) => !candidate.media)) {
    if (splitTop(rule.selector).includes(selector)) Object.assign(merged, rule.decls)
  }
  return merged
}

const rootTokens = declsFor(':root')
const darkTokens = { ...rootTokens, ...declsFor(':root[data-theme="dark"]') }
const themes = { light: rootTokens, dark: darkTokens }

function resolve(value: string, tokens: Record<string, string>): string {
  let result = value
  for (let pass = 0; pass < 10 && result.includes('var('); pass += 1) {
    result = result.replace(/var\((--[\w-]+)\)/g, (_match, name: string) => tokens[name] ?? `MISSING(${name})`)
  }
  return result
}

function channel(value: number): number {
  const scaled = value / 255
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  expect(hex, `colour ${hex}`).toMatch(/^#[0-9a-f]{6}$/i)
  const [red, green, blue] = [1, 3, 5].map((start) => channel(parseInt(hex.slice(start, start + 2), 16)))
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrast(first: string, second: string): number {
  const [high, low] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return (high + 0.05) / (low + 0.05)
}

const BASE = ':where(button, .button, .text-button, .operation-shortcuts a, .help-toc a)'
const SELECTED = '.button[aria-current="page"]'
const SELECTED_PRESSED = 'button[aria-pressed="true"]'

const variants: Record<string, Record<string, string[]>> = {
  secondary: {
    rest: [BASE],
    hover: [BASE, `${BASE}:where(:hover:not(:disabled))`],
    active: [BASE, `${BASE}:where(:active:not(:disabled))`],
    disabled: [BASE, 'button:disabled'],
  },
  primary: {
    rest: [BASE, '.button-primary'],
    hover: [BASE, '.button-primary', '.button-primary:hover:not(:disabled)'],
    active: [BASE, '.button-primary', '.button-primary:active:not(:disabled)'],
    disabled: [BASE, '.button-primary', '.button-primary:disabled'],
  },
  danger: {
    rest: [BASE, '.button-danger'],
    hover: [BASE, '.button-danger', '.button-danger:hover:not(:disabled)'],
    active: [BASE, '.button-danger', '.button-danger:active:not(:disabled)'],
    disabled: [BASE, '.button-danger', '.button-danger:disabled'],
  },
  selected: {
    rest: [BASE, SELECTED],
    hover: [BASE, SELECTED, `${SELECTED}:hover:not(:disabled)`],
    active: [BASE, SELECTED, `${SELECTED}:active:not(:disabled)`],
    disabled: [BASE, SELECTED, 'button:disabled'],
  },
  pressed: {
    rest: [BASE, SELECTED_PRESSED],
    hover: [BASE, SELECTED_PRESSED, `${SELECTED_PRESSED}:hover:not(:disabled)`],
    active: [BASE, SELECTED_PRESSED, `${SELECTED_PRESSED}:active:not(:disabled)`],
    disabled: [BASE, SELECTED_PRESSED, 'button:disabled'],
  },
}

function stateColours(layers: string[], theme: Record<string, string>) {
  const merged: Record<string, string> = {}
  for (const layer of layers) {
    const found = declsFor(layer)
    expect(Object.keys(found).length, `rule ${layer} must exist`).toBeGreaterThan(0)
    Object.assign(merged, found)
  }
  const tokens = { ...theme, ...merged }
  return {
    fg: resolve(tokens['--btn-fg'], tokens),
    bg: resolve(tokens['--btn-bg'], tokens),
    border: resolve(tokens['--btn-border'], tokens),
  }
}

describe('theme tokens (colour manual v1.1)', () => {
  it('uses the official brand and theme values', () => {
    expect(rootTokens['--brand-ink']).toBe('#23272B')
    expect(rootTokens['--brand-orange']).toBe('#F26B1D')
    expect(rootTokens['--on-accent']).toBe('#23272B')
    expect(['--bg', '--surface', '--text', '--text-muted', '--border', '--link', '--focus'].map((key) => darkTokens[key]))
      .toEqual(['#111518', '#1C2329', '#F6F8FA', '#BAC4CC', '#38434C', '#FFA06A', '#FFC18F'])
    expect(['--bg', '--surface', '--text', '--text-muted', '--border', '--link', '--focus'].map((key) => rootTokens[key]))
      .toEqual(['#FFFFFF', '#F6F7F8', '#23272B', '#59636B', '#DCE1E5', '#AA410B', '#F26B1D'])
  })

  it('keeps the prefers-color-scheme dark block identical to the explicit dark theme', () => {
    const explicit = declsFor(':root[data-theme="dark"]')
    const media = rules.find((rule) => rule.media.includes('prefers-color-scheme: dark'))
    expect(media?.decls).toEqual(explicit)
  })

  for (const [name, tokens] of Object.entries(themes)) {
    it(`meets text and focus contrast in the ${name} theme`, () => {
      const resolved = (key: string) => resolve(`var(${key})`, tokens)
      for (const ground of ['--bg', '--surface']) {
        expect(contrast(resolved('--text'), resolved(ground))).toBeGreaterThanOrEqual(4.5)
        expect(contrast(resolved('--text-muted'), resolved(ground))).toBeGreaterThanOrEqual(4.5)
        expect(contrast(resolved('--link'), resolved(ground))).toBeGreaterThanOrEqual(4.5)
        expect(contrast(resolved('--control-border'), resolved(ground))).toBeGreaterThanOrEqual(3)
      }
      expect(contrast(resolved('--focus'), resolved('--bg'))).toBeGreaterThanOrEqual(3)
      expect(contrast(resolved('--danger-fg'), resolved('--danger-bg'))).toBeGreaterThanOrEqual(4.5)
      expect(contrast(resolved('--warn-fg'), resolved('--warn-bg'))).toBeGreaterThanOrEqual(4.5)
    })
  }
})

describe('button states', () => {
  for (const [themeName, theme] of Object.entries(themes)) {
    for (const [variant, states] of Object.entries(variants)) {
      for (const [state, layers] of Object.entries(states)) {
        it(`${variant} ${state} in ${themeName} is legible and visible`, () => {
          const { fg, bg, border } = stateColours(layers, theme)
          const page = resolve('var(--bg)', theme)
          const surface = resolve('var(--surface)', theme)
          // Disabled text must stay readable (3:1); every enabled state needs 4.5:1.
          expect(contrast(fg, bg)).toBeGreaterThanOrEqual(state === 'disabled' ? 3 : 4.5)
          // The control edge is its border or, failing that, its solid fill.
          for (const ground of [page, surface]) {
            expect(Math.max(contrast(border, ground), contrast(bg, ground))).toBeGreaterThanOrEqual(3)
          }
        })
      }
    }
  }

  it('keeps white text on the danger button and graphite text on orange', () => {
    for (const theme of Object.values(themes)) {
      expect(stateColours(variants.danger.rest, theme).fg.toUpperCase()).toBe('#FFFFFF')
      expect(stateColours(variants.primary.rest, theme).fg.toUpperCase()).toBe('#23272B')
      expect(stateColours(variants.primary.rest, theme).bg.toUpperCase()).toBe('#F26B1D')
    }
  })

  it('marks selected buttons with a non-colour cue', () => {
    expect(declsFor(SELECTED)['box-shadow']).toContain('inset')
    expect(declsFor(SELECTED)['font-weight']).toBe('800')
    expect(declsFor(`${SELECTED}::before`).content).toBe('"\\2713"')
    expect(declsFor(`${SELECTED_PRESSED}::before`).content).toBe('"\\2713"')
  })
})

describe('touch targets and typography', () => {
  const base = declsFor(BASE)

  it('has a 48px minimum target, 16px label and weight 600', () => {
    expect(resolve(base['min-height'], rootTokens)).toBe('48px')
    expect(resolve(base['min-width'], rootTokens)).toBe('48px')
    expect(parseInt(base['font-size'], 10)).toBeGreaterThanOrEqual(16)
    expect(parseInt(base['font-weight'], 10)).toBeGreaterThanOrEqual(600)
    expect(base['white-space']).toBe('normal')
    expect(declsFor('summary')['min-height']).toBe('var(--touch-target)')
    expect(declsFor('input:not([type="checkbox"]):not([type="range"])')['min-height']).toBe('var(--touch-target)')
  })

  it('keeps an 8px or larger gap between targets on the spacing scale', () => {
    expect(resolve('var(--space-2)', rootTokens)).toBe('8px')
    for (const key of ['--space-1', '--space-2', '--space-3', '--space-4', '--space-6', '--space-8']) {
      expect([4, 8, 12, 16, 24, 32]).toContain(parseInt(rootTokens[key], 10))
    }
    expect(parseInt(resolve(declsFor('.session-actions')['gap'], rootTokens), 10)).toBeGreaterThanOrEqual(8)
    expect(appRules.find((rule) => rule.selector === '.operation-panel .session-actions')?.decls.gap).toBe('16px')
  })

  it('never lets App.css shrink buttons below the system', () => {
    for (const rule of appRules.filter((candidate) => /\.button|\.text-button/.test(candidate.selector))) {
      if (rule.decls['min-height']) expect(parseInt(rule.decls['min-height'], 10)).toBeGreaterThanOrEqual(48)
      if (rule.decls['font-size']) expect(parseInt(rule.decls['font-size'], 10)).toBeGreaterThanOrEqual(16)
      expect(rule.decls['opacity']).toBeUndefined()
    }
  })

  it('draws a 3px focus-visible outline in the focus token and a not-allowed disabled cursor', () => {
    const focus = declsFor('button:focus-visible')
    expect(focus.outline).toBe('3px solid var(--focus)')
    expect(declsFor('button:disabled').cursor).toBe('not-allowed')
    expect(declsFor('button:disabled')['border-style']).toBe('dashed')
  })

  it('makes PTT the largest control and every stop control danger-styled', () => {
    expect(parseInt(declsFor('.button-ptt')['min-height'], 10)).toBeGreaterThan(48)
    expect(declsFor('.button-ptt')['width']).toBe('100%')
    expect(declsFor('.button-ptt.is-transmitting::before').content).toContain('TX')
    expect(read('PttPanel.tsx')).toContain('button-danger button-ptt')
    expect(read('PttPanel.tsx')).toMatch(/button-danger" onClick=\{\(\) => void stop\(\)\}/)
    expect(read('AccessoriesPanel.tsx')).toMatch(/button-danger" onClick=\{\(\) => void operate\('emergency_stop'\)\}/)
    expect(read('RotorPanel.tsx')).toMatch(/button-danger" onClick=\{\(\) => \{/)
    expect(read('FlexPanel.tsx')).toMatch(/button-danger" disabled=\{!data \|\| busy\}/)
  })
})
