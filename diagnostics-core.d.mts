export type DiagnosticEvent = {
  code: string
  source: string
  severity: string
  error_type: string
  line: number
}
export type DiagnosticReport = {
  schema_version: 1
  component: string
  platform: string
  version: string
  events: DiagnosticEvent[]
}
export function isDiagnosticReport(value: unknown): value is DiagnosticReport
export function errorCategory(error: unknown): string
export class DiagnosticBuffer {
  constructor(options: {
    component: string
    platform: string
    version: string
    storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
    onChange?: () => void
  })
  storageError: boolean
  revision: number
  record(code: string, source?: string, severity?: string, errorType?: string, line?: number): void
  report(): DiagnosticReport | null
  clear(): void
}
