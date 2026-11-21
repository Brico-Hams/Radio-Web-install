import { useEffect, useSyncExternalStore } from 'react'
import { sendDiagnosticReport } from './api'
import {
  automaticDiagnostics, diagnosticBuffer, setAutomaticDiagnostics,
  setDiagnosticUploadState, subscribeDiagnostics,
} from './diagnosticBuffer'

export function useDiagnosticReporting(token: string | null) {
  const automatic = useSyncExternalStore(subscribeDiagnostics, automaticDiagnostics)
  useEffect(() => {
    if (!token) {
      setAutomaticDiagnostics(false)
      return
    }
    if (!automatic) return
    const accessToken = token
    const controller = new AbortController()
    let sentRevision = diagnosticBuffer.revision
    let delay = 60_000
    let timer: ReturnType<typeof setTimeout>
    async function tick() {
      if (controller.signal.aborted) return
      if (document.visibilityState === 'visible' && sentRevision !== diagnosticBuffer.revision) {
        const revision = diagnosticBuffer.revision
        const report = diagnosticBuffer.report()
        if (report) {
          setDiagnosticUploadState('sending')
          const request = new AbortController()
          const abort = () => request.abort()
          controller.signal.addEventListener('abort', abort, { once: true })
          const deadline = setTimeout(abort, 10_000)
          try {
            await sendDiagnosticReport(accessToken, report, request.signal)
            if (controller.signal.aborted) return
            sentRevision = revision
            delay = 60_000
            setDiagnosticUploadState('sent')
          } catch (error) {
            if (controller.signal.aborted) return
            if (!(error instanceof Error)) throw error
            setDiagnosticUploadState('error')
            delay = Math.min(delay * 2, 600_000)
          } finally {
            clearTimeout(deadline)
            controller.signal.removeEventListener('abort', abort)
          }
        }
      }
      timer = setTimeout(() => { void tick() }, delay)
    }
    timer = setTimeout(() => { void tick() }, delay)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [automatic, token])
}
