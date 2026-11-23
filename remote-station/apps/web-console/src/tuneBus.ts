// Tiny bridge between the waterfall (emits clicks) and the CAT operating panel (owns the set_frequency path).
// The waterfall never talks to the radio: the operating panel decides whether the click may be applied.
type Listener = (audioHz: number) => void
type ScopeListener = (rfHz: number) => void

let listener: Listener | null = null
let scopeListener: ScopeListener | null = null

export function onScopeClick(next: ScopeListener | null): () => void {
  scopeListener = next
  return () => { if (scopeListener === next) scopeListener = null }
}

// The radio's own RF scope gives an absolute frequency; the operating panel still applies the same checks as for audio clicks.
export function emitScopeClick(rfHz: number): boolean {
  if (!scopeListener || !Number.isFinite(rfHz) || rfHz <= 0) return false
  scopeListener(rfHz)
  return true
}

export function onWaterfallClick(next: Listener | null): () => void {
  listener = next
  return () => { if (listener === next) listener = null }
}

export function emitWaterfallClick(audioHz: number): boolean {
  if (!listener || !Number.isFinite(audioHz) || audioHz < 0) return false
  listener(audioHz)
  return true
}
