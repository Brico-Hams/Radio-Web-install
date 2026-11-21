import { Capacitor } from '@capacitor/core'
import { DiagnosticBuffer, errorCategory } from '../../../../diagnostics-core.mjs'

const listeners = new Set<() => void>()
let revision = 0
let automatic = false
let uploadState: 'idle' | 'sending' | 'sent' | 'error' = 'idle'

function changed() {
  revision++
  listeners.forEach(listener => listener())
}

function localStorageOrNull() {
  try {
    return window.localStorage
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
    console.warn('Diagnostic local storage unavailable; memory log only.')
    return null
  }
}

const platform = Capacitor.getPlatform()
export const diagnosticBuffer = new DiagnosticBuffer({
  component: platform === 'android' ? 'station-android' : platform === 'ios' ? 'station-ios' : 'station-web',
  platform: platform === 'android' || platform === 'ios' ? platform : 'web',
  version: '0.1.0',
  storage: localStorageOrNull(),
  onChange: changed,
})

export const diagnosticSnapshot = () => revision
export function subscribeDiagnostics(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export const automaticDiagnostics = () => automatic
export function setAutomaticDiagnostics(value: boolean) {
  if (automatic === value) return
  automatic = value
  changed()
}
export const diagnosticUploadState = () => uploadState
export function setDiagnosticUploadState(value: typeof uploadState) {
  uploadState = value
  changed()
}

let hooksInstalled = false
export function installDiagnosticHooks() {
  if (hooksInstalled) return
  hooksInstalled = true
  window.addEventListener('error', event => {
    diagnosticBuffer.record('uncaught_error', 'ui', 'error', errorCategory(event.error),
      Number.isInteger(event.lineno) && event.lineno <= 100000 && event.lineno >= 0 ? event.lineno : 0)
  })
  window.addEventListener('unhandledrejection', event => {
    diagnosticBuffer.record('uncaught_error', 'ui', 'error', errorCategory(event.reason))
  })
}
