import { act, fireEvent, render as renderComponent, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PttPanel } from './PttPanel'
import { LanguageProvider } from './LanguageProvider'

function render(ui: ReactNode) {
  return renderComponent(<LanguageProvider>{ui}</LanguageProvider>)
}

const mic = vi.hoisted(() => ({ onLevel: undefined as ((level: number) => void) | undefined }))
vi.mock('./RemoteMicrophone', () => ({
  RemoteMicrophone: class {
    sessionId = 'voice-test-session-0001'
    onReady: (id: string) => void
    constructor(_url: string, _token: string, onReady: (id: string) => void,
      _failure: unknown, tap?: { onLevel?: (level: number) => void }) {
      this.onReady = onReady
      mic.onLevel = tap?.onLevel
    }
    async start() { this.onReady(this.sessionId) }
    stop() {}
  },
}))

const config = {
  api_version: 'v1', model: 'FTX-1', status: 'experimental',
  data_is_simulated: false, hardware_validation_complete: false,
  enabled: true, lease_active: false, rx_confirmed: true, stop_failed: false,
  lease_seconds: 2, max_transmit_seconds: 10, tx_audio_required: true,
  frequency_min_hz: 14_200_000, frequency_max_hz: 14_300_000, power_max_watts: 10,
}
const keyed = { ...config, lease_active: true, lease_id: 'a'.repeat(43) }
let operations: string[]
let refuse: boolean

beforeEach(() => {
  localStorage.clear()
  operations = []
  refuse = false
  vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method !== 'POST') return Response.json(config)
    const body = JSON.parse(String(init.body))
    operations.push(body.operation)
    if (body.operation === 'start' && refuse) {
      return Response.json({ api_version: 'v1', error: { code: 'ptt_refused' } }, { status: 409 })
    }
    return Response.json(body.operation === 'stop' ? config : keyed)
  }))
})
afterEach(() => vi.unstubAllGlobals())

async function arm() {
  render(<PttPanel token="test-token" />)
  fireEvent.click(screen.getByText('Consultar PTT'))
  fireEvent.click(await screen.findByLabelText('Habilitar pulsación PTT en esta sesión'))
  fireEvent.click(screen.getByText('Preparar micrófono remoto'))
  await screen.findByText('Micrófono preparado; salida silenciada hasta mantener PTT.')
  const button = screen.getByRole('button', { name: 'Armar VOX' })
  fireEvent.click(button)
  await screen.findByRole('button', { name: 'VOX ARMADO' })
}
const voice = () => act(async () => { mic.onLevel?.(0.4) })

describe('VOX in the React console', () => {
  it('is disarmed on load and unavailable until the microphone is ready', async () => {
    render(<PttPanel token="test-token" />)
    fireEvent.click(screen.getByText('Consultar PTT'))
    const button = await screen.findByRole('button', { name: 'Armar VOX' })
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(Object.keys(localStorage).join()).not.toMatch(/vox/i)
  })

  it('never keys below the threshold and keys through the PTT start request on voice', async () => {
    await arm()
    await act(async () => { mic.onLevel?.(0.01) })
    expect(operations).not.toContain('start')
    await voice()
    await waitFor(() => expect(operations).toContain('start'))
    expect(Object.keys(localStorage).join()).not.toMatch(/vox/i)
  })

  it('the PTT button pre-empts VOX: it unkeys, disarms and consumes the press', async () => {
    await arm()
    await voice()
    await waitFor(() => expect(operations).toContain('start'))
    fireEvent.keyDown(screen.getByText('Mantener PTT (Espacio / Intro)'), { key: ' ' })
    await waitFor(() => expect(operations).toContain('stop'))
    expect(screen.getByRole('button', { name: 'Armar VOX' })).toBeTruthy()
    expect(operations.filter((op) => op === 'start')).toHaveLength(1)
  })

  it('a refusal by the agent leaves VOX disarmed', async () => {
    refuse = true
    await arm()
    await voice()
    await screen.findByRole('button', { name: 'Armar VOX' })
    expect(operations.filter((op) => op === 'start')).toHaveLength(1)
    await voice()
    expect(operations.filter((op) => op === 'start')).toHaveLength(1)
  })

  it('hiding the client unkeys and disarms VOX', async () => {
    await arm()
    await voice()
    await waitFor(() => expect(operations).toContain('start'))
    fireEvent.blur(window)
    await waitFor(() => expect(operations).toContain('stop'))
    expect(screen.queryByRole('button', { name: 'VOX ARMADO' })).toBeNull()
  })
})
