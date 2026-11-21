import { isDiagnosticReport, type DiagnosticReport } from '../../../../diagnostics-core.mjs'
import { diagnosticBuffer, setAutomaticDiagnostics } from './diagnosticBuffer'

export type Capability = {
  function: string
  status: string
  source_document: string | null
  implementation: string
  limitations: string[]
}

export type CapabilityModel = {
  manufacturer: string
  model: string
  connection: string
  capabilities: Capability[]
}

export type CapabilityCatalog = {
  api_version: string
  hardware_validation_complete: boolean
  models: CapabilityModel[]
}

export type RadioCandidate = {
  manufacturer: string
  model: string
  connection_claim: string
  bands_claim: string
  third_party_scope_claim: 'yes' | 'no' | 'not_stated' | 'not_in_source'
  third_party_tested: 'yes' | 'not_stated' | 'not_in_source'
  third_party_support_status: 'beta' | 'not_stated' | 'not_in_source'
  evidence_source: 'third_party_listing' | 'manufacturer_project_docs'
  source_url: string
  bricoham_status: 'candidate'
}

export type RadioCandidateCatalog = {
  api_version: string
  schema_version: string
  hardware_validation_complete: false
  notice: string
  candidates: RadioCandidate[]
}

export type StationSnapshot = {
  api_version: string
  name: string
  callsign: string
  data_is_simulated: boolean
  hardware_connected: boolean
  radio_profile: {
    manufacturer: string
    model: string
  }
  frequency_hz: number
  vfo: string
  mode: string
  band: string
  tx: {
    enabled: false
    ptt_available: false
    state: 'blocked'
    reason: string
  }
  spectrum: {
    status: string
    message: string
  }
  waterfall: {
    status: string
    message: string
  }
}

export type Diagnostics = {
  api_version: string
  simulator: boolean
  hardware_discovered: boolean
  cat_operations_enabled: boolean
  tx_enabled: boolean
}

export type StationDevice = {
  port: string
  description: string | null
  hwid: null
  vid: string | null
  pid: string | null
  manufacturer: string | null
  product: string | null
  interface: string | null
  classification: 'unknown'
}

export type DeviceInventory = {
  api_version: string
  schema_version: string
  devices: StationDevice[]
}

export type ProtocolCatalog = {
  api_version: 'v1'
  schema_version: '1.0'
  transport_enabled: false
  hardware_validation_complete: false
  candidates: {
    manufacturer: string
    model: string
    protocol: string | null
    hardware_status: 'unsupported'
    binding_status: 'model_profile' | 'family_syntax_only' | 'unimplemented'
    queries: { command: string; reply_decoder: boolean }[]
  }[]
}

export type Qso = {
  call: string
  started_at: string
  frequency_hz: number
  mode: string
}

export type LogbookPage = {
  api_version: 'v1'
  qsos: Qso[]
  offset: number
  has_more: boolean
  can_write: boolean
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    diagnosticBuffer.record('operation_failed', 'api', 'error', 'exception')
  }
}

let coordinatorUrl = ''

export function setCoordinatorUrl(input: string): void {
  if (!input.trim()) {
    if (coordinatorUrl) setAutomaticDiagnostics(false)
    coordinatorUrl = ''
    return
  }
  const url = new URL(input.trim())
  if (url.protocol !== 'https:' || url.username || url.password ||
    url.search || url.hash || url.pathname !== '/') {
    throw new Error('El host debe ser una URL HTTPS sin credenciales, ruta ni parámetros.')
  }
  if (coordinatorUrl !== url.origin) setAutomaticDiagnostics(false)
  coordinatorUrl = url.origin
}

function apiUrl(path: string): string {
  return `${coordinatorUrl}/api/v1${path}`
}

async function fetchApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try { return await fetch(input, init) }
  catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      diagnosticBuffer.record('connection_failed', 'api', 'error', 'connection')
    }
    throw error
  }
}

export async function sendDiagnosticReport(
  token: string, report: DiagnosticReport, signal?: AbortSignal,
): Promise<void> {
  const url = new URL(apiUrl('/diagnostic-reports'), window.location.href)
  if (url.protocol !== 'https:' || !isDiagnosticReport(report)) {
    throw new ApiError('Diagnostic reporting requires HTTPS and a validated report.', 0)
  }
  const response = await fetchApi(url.href, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(report), redirect: 'error', credentials: 'omit', cache: 'no-store', signal,
  })
  if (response.status !== 202) {
    await response.body?.cancel()
    throw new ApiError('Diagnostic upload rejected by the configured host.', response.status)
  }
  const reader = response.body?.getReader()
  if (!reader) throw new ApiError('Diagnostic acknowledgement missing.', response.status)
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let text = ''
  let bytes = 0
  while (true) {
    const part = await reader.read()
    if (part.done) break
    bytes += part.value.byteLength
    if (bytes > 256) {
      await reader.cancel()
      throw new ApiError('Diagnostic acknowledgement too large.', response.status)
    }
    text += decoder.decode(part.value, { stream: true })
  }
  text += decoder.decode()
  const payload: unknown = JSON.parse(text)
  if (!isRecord(payload) || Object.keys(payload).length !== 1 || payload.accepted !== true) {
    throw new ApiError('Diagnostic acknowledgement invalid.', response.status)
  }
}

export function getTxAudioUrl(): string {
  const url = new URL(apiUrl('/audio/tx'), window.location.href)
  if (url.protocol === 'https:') url.protocol = 'wss:'
  else if (url.protocol === 'http:') url.protocol = 'ws:'
  return url.href
}

export const YAESU_CONTROL_MODELS = [
  'FT-710', 'FT-991A', 'FTDX10', 'FTDX101D', 'FTDX101MP', 'FTDX3000',
] as const
export type YaesuControlModel = typeof YAESU_CONTROL_MODELS[number]

export function isYaesuControlModel(value: unknown): value is YaesuControlModel {
  return YAESU_CONTROL_MODELS.some((model) => model === value)
}

export type RadioSettings = {
  api_version: 'v1'
  status: 'experimental'
  hardware_validation_complete: false
  data_is_simulated: false
  power_adjustment_enabled: boolean
  power_level_max: number
  tune_enabled: false
} & (
  { model: 'IC-7300'; power_unit: 'cat_position_0_255'; tuner_switching_enabled: boolean } |
  { model: 'FTX-1' | YaesuControlModel; power_unit: 'watts_setpoint'; tuner_switching_enabled: false }
)

type ApiResult<T> = { allowed: true; data: T } | { allowed: false }
type Validator<T> = (payload: unknown) => payload is T

export function isRecord(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload)
}

export function isRadioSettings(value: unknown): value is RadioSettings {
  if (!isRecord(value) || !(value.api_version === 'v1' &&
    value.status === 'experimental' && value.hardware_validation_complete === false &&
    value.data_is_simulated === false &&
    typeof value.power_adjustment_enabled === 'boolean' &&
    typeof value.power_level_max === 'number' && Number.isInteger(value.power_level_max) &&
    typeof value.tuner_switching_enabled === 'boolean' && value.tune_enabled === false)) return false
  return (value.model === 'IC-7300' && value.power_unit === 'cat_position_0_255' &&
    value.power_level_max >= 0 && value.power_level_max <= 255) ||
    ((value.model === 'FTX-1' || isYaesuControlModel(value.model)) && value.power_unit === 'watts_setpoint' &&
      value.power_level_max >= 5 && value.power_level_max <= (value.model === 'FTDX101MP' ? 200 : 100) &&
      value.tuner_switching_enabled === false)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.some((candidate) => candidate === value)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isCapability(payload: unknown): payload is Capability {
  return (
    isRecord(payload) &&
    isString(payload.function) &&
    isString(payload.status) &&
    (payload.source_document === null || isString(payload.source_document)) &&
    isString(payload.implementation) &&
    Array.isArray(payload.limitations) &&
    payload.limitations.every(isString)
  )
}

export function isCapabilityCatalog(payload: unknown): payload is CapabilityCatalog {
  return (
    isRecord(payload) &&
    isString(payload.api_version) &&
    isBoolean(payload.hardware_validation_complete) &&
    Array.isArray(payload.models) &&
    payload.models.every(
      (model: unknown) =>
        isRecord(model) &&
        isString(model.manufacturer) &&
        isString(model.model) &&
        isString(model.connection) &&
        Array.isArray(model.capabilities) &&
        model.capabilities.every(isCapability),
    )
  )
}

function isRadioCandidate(payload: unknown): payload is RadioCandidate {
  return (
    isRecord(payload) &&
    isString(payload.manufacturer) &&
    isString(payload.model) &&
    isString(payload.connection_claim) &&
    isString(payload.bands_claim) &&
    isOneOf(payload.third_party_scope_claim, ['yes', 'no', 'not_stated', 'not_in_source']) &&
    isOneOf(payload.third_party_tested, ['yes', 'not_stated', 'not_in_source']) &&
    isOneOf(payload.third_party_support_status, ['beta', 'not_stated', 'not_in_source']) &&
    isOneOf(payload.evidence_source, ['third_party_listing', 'manufacturer_project_docs']) &&
    isString(payload.source_url) &&
    payload.source_url.startsWith('https://') &&
    payload.bricoham_status === 'candidate'
  )
}

export function isRadioCandidateCatalog(payload: unknown): payload is RadioCandidateCatalog {
  return (
    isRecord(payload) &&
    isString(payload.api_version) &&
    isString(payload.schema_version) &&
    payload.hardware_validation_complete === false &&
    isString(payload.notice) &&
    Array.isArray(payload.candidates) &&
    payload.candidates.every(isRadioCandidate)
  )
}

export function isStationSnapshot(payload: unknown): payload is StationSnapshot {
  return (
    isRecord(payload) &&
    isString(payload.api_version) &&
    isString(payload.name) &&
    isString(payload.callsign) &&
    isBoolean(payload.data_is_simulated) &&
    isBoolean(payload.hardware_connected) &&
    isRecord(payload.radio_profile) &&
    isString(payload.radio_profile.manufacturer) &&
    isString(payload.radio_profile.model) &&
    typeof payload.frequency_hz === 'number' &&
    isString(payload.vfo) &&
    isString(payload.mode) &&
    isString(payload.band) &&
    isRecord(payload.tx) &&
    payload.tx.enabled === false &&
    payload.tx.ptt_available === false &&
    payload.tx.state === 'blocked' &&
    isString(payload.tx.reason) &&
    isRecord(payload.spectrum) &&
    isString(payload.spectrum.status) &&
    isString(payload.spectrum.message) &&
    isRecord(payload.waterfall) &&
    isString(payload.waterfall.status) &&
    isString(payload.waterfall.message)
  )
}

export function isDiagnostics(payload: unknown): payload is Diagnostics {
  return (
    isRecord(payload) &&
    isString(payload.api_version) &&
    isBoolean(payload.simulator) &&
    isBoolean(payload.hardware_discovered) &&
    isBoolean(payload.cat_operations_enabled) &&
    isBoolean(payload.tx_enabled)
  )
}

function isStationDevice(payload: unknown): payload is StationDevice {
  return (
    isRecord(payload) &&
    isString(payload.port) &&
    (payload.description === null || isString(payload.description)) &&
    payload.hwid === null &&
    (payload.vid === null || isString(payload.vid)) &&
    (payload.pid === null || isString(payload.pid)) &&
    (payload.manufacturer === null || isString(payload.manufacturer)) &&
    (payload.product === null || isString(payload.product)) &&
    (payload.interface === null || isString(payload.interface)) &&
    payload.classification === 'unknown' &&
    !('serial_number' in payload)
  )
}

export function isDeviceInventory(payload: unknown): payload is DeviceInventory {
  return (
    isRecord(payload) &&
    isString(payload.api_version) &&
    isString(payload.schema_version) &&
    Array.isArray(payload.devices) &&
    payload.devices.every(isStationDevice)
  )
}

export function isProtocolCatalog(payload: unknown): payload is ProtocolCatalog {
  return (
    isRecord(payload) &&
    payload.api_version === 'v1' &&
    payload.schema_version === '1.0' &&
    payload.transport_enabled === false &&
    payload.hardware_validation_complete === false &&
    Array.isArray(payload.candidates) &&
    payload.candidates.every((candidate: unknown) =>
      isRecord(candidate) &&
      isString(candidate.manufacturer) &&
      isString(candidate.model) &&
      (candidate.protocol === null || isString(candidate.protocol)) &&
      candidate.hardware_status === 'unsupported' &&
      isOneOf(candidate.binding_status, ['model_profile', 'family_syntax_only', 'unimplemented']) &&
      Array.isArray(candidate.queries) &&
      candidate.queries.every((query: unknown) =>
        isRecord(query) && isString(query.command) && isBoolean(query.reply_decoder),
      ),
    )
  )
}

export function isLogbookPage(payload: unknown): payload is LogbookPage {
  return (
    isRecord(payload) && payload.api_version === 'v1' &&
    typeof payload.offset === 'number' && Number.isSafeInteger(payload.offset) &&
    payload.offset >= 0 &&
    isBoolean(payload.has_more) && isBoolean(payload.can_write) &&
    Array.isArray(payload.qsos) &&
    payload.qsos.every((qso: unknown) =>
      isRecord(qso) && isString(qso.call) && isString(qso.started_at) &&
      typeof qso.frequency_hz === 'number' && Number.isSafeInteger(qso.frequency_hz) &&
      qso.frequency_hz > 0 && isString(qso.mode),
    )
  )
}

export async function createQso(token: string, qso: Qso): Promise<void> {
  const response = await fetchApi(apiUrl('/logbook'), {
    method: 'POST',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(qso),
  })
  if (!response.ok) {
    throw new ApiError(
      response.status === 400
        ? 'QSO no válido. Revisa indicativo, fecha con zona horaria, frecuencia y modo.'
        : `No se pudo guardar el QSO (HTTP ${response.status}). No se reintentará automáticamente.`,
      response.status,
    )
  }
  const payload: unknown = await response.json()
  if (!isRecord(payload) || payload.api_version !== 'v1' ||
    typeof payload.qso_id !== 'number' || !Number.isSafeInteger(payload.qso_id) ||
    payload.qso_id <= 0) {
    throw new Error('Respuesta de alta no válida. Comprueba el logbook antes de reintentar.')
  }
}

export async function downloadAdif(token: string): Promise<void> {
  const response = await fetchApi(apiUrl('/logbook/adif'), {
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    cache: 'no-store', credentials: 'omit',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new ApiError(
      response.status === 413
        ? 'La exportación web admite hasta 5000 QSOs. Usa la CLI para exportar el logbook completo.'
        : `No se pudo exportar ADIF (HTTP ${response.status}).`,
      response.status,
    )
  }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = 'bricoham-logbook.adi'
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function responseError(response: Response): Promise<ApiError> {
  let code: string | undefined
  if (response.headers.get('Content-Type')?.includes('application/json')) {
    const payload: unknown = await response.json()
    if (isRecord(payload) && isRecord(payload.error) && isString(payload.error.code)) {
      code = payload.error.code
    }
  }
  return new ApiError(
    response.status === 401
      ? 'Token inválido o sin configurar. Comprueba las variables del coordinador.'
      : `El coordinador respondió con el estado HTTP ${response.status}${code ? ` (${code})` : ''}.`,
    response.status, code,
  )
}

export function createControlRequest(token: string) {
  const origin = coordinatorUrl
  return async function sendControl<T>(
    endpoint: string, body: object, validate: Validator<T>, keepalive = false,
  ): Promise<T> {
    const response = await fetchApi(`${origin}/api/v1${endpoint}`, {
      method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
      referrerPolicy: 'no-referrer', keepalive, signal: AbortSignal.timeout(4500),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw await responseError(response)
    const payload: unknown = await response.json()
    if (!validate(payload)) throw new Error('Respuesta de control no válida; consulta el estado.')
    return payload
  }
}

export function createAudioRequest(token: string) {
  const origin = coordinatorUrl
  return (signal: AbortSignal) => fetchApi(`${origin}/api/v1/audio/stream`, {
    method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error',
    referrerPolicy: 'no-referrer', signal, headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getApiData<T>(
  token: string,
  endpoint: string,
  validate: Validator<T>,
): Promise<ApiResult<T>> {
  const response = await fetchApi(apiUrl(endpoint), {
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
    credentials: 'omit',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (response.status === 403) {
    return { allowed: false }
  }
  if (!response.ok) {
    throw await responseError(response)
  }

  const payload: unknown = await response.json()
  if (!validate(payload)) {
    throw new Error(`La respuesta ${endpoint} no cumple el contrato esperado de la API.`)
  }
  return { allowed: true, data: payload }
}
