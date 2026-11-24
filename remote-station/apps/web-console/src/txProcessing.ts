// Typed access to the shared TX capture modules of the repository root (also used by the Node UI). They are classic
// scripts that register themselves on `self`; importing them here bundles them with the console.
import '../../../../remote-speech-proc.js'
import '../../../../remote-vox.js'

export type SpeechSettings = {
  enabled: boolean; hpHz: number; presenceHz: number; presenceDb: number; lpHz: number
  thresholdDb: number; ratio: number; makeupDb: number
}
export type SpeechProcessor = {
  configure(next: Partial<SpeechSettings>): void
  processInt16(pcm: Int16Array): Int16Array
  isEnabled(): boolean
  settings(): SpeechSettings
  gainReductionDb(): number
}
export type VoxContext = {
  guest: boolean; transmit: boolean; linkUp: boolean; controlLost: boolean; locked: boolean; hidden: boolean
}
export type VoxStatus = { armed: boolean; keyed: boolean; pending: boolean; reason: string }
export type Vox = {
  arm(ctx: VoxContext): boolean
  disarm(reason?: string): void
  processLevel(level: number): number
  buttonPressed(): boolean
  agentCut(): void
  check(ctx: VoxContext): void
  configure(next: { threshold?: number; holdMs?: number }): void
  settings(): { threshold: number; holdMs: number }
  isArmed(): boolean
  isKeyed(): boolean
  isPending(): boolean
  lastReason(): string
}
type SpeechModule = {
  STORAGE_KEY: string
  RANGES: Record<string, [number, number, number]>
  parseStored(text: string | null): SpeechSettings
  serialize(settings: SpeechSettings): string
  createSpeechProcessor(initial?: Partial<SpeechSettings>): SpeechProcessor
}
type VoxModule = {
  RANGES: { threshold: [number, number, number]; holdMs: [number, number, number] }
  createVox(options: {
    now?: () => number; settings?: { threshold?: number; holdMs?: number }
    ptt: { down(): Promise<boolean>; up(): void }
    onChange?: (status: VoxStatus) => void
  }): Vox
}

const scope = globalThis as unknown as { RadicodexSpeechProc: SpeechModule; RadicodexVox: VoxModule }
export const speechModule = scope.RadicodexSpeechProc
export const voxModule = scope.RadicodexVox

// Local UI preference only: bounded numbers and the on/off flag, never credentials.
export function loadSpeechProcessor(storage: Pick<Storage, 'getItem'> = localStorage): SpeechProcessor {
  let stored: string | null = null
  try { stored = storage.getItem(speechModule.STORAGE_KEY) } catch { /* storage may be denied */ }
  return speechModule.createSpeechProcessor(speechModule.parseStored(stored))
}

export function saveSpeechSettings(settings: SpeechSettings, storage: Pick<Storage, 'setItem'> = localStorage) {
  try { storage.setItem(speechModule.STORAGE_KEY, speechModule.serialize(settings)) } catch { /* storage may be denied */ }
}

export function int16Level(samples: Int16Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (const sample of samples) sum += (sample / 32768) ** 2
  return Math.sqrt(sum / samples.length)
}
