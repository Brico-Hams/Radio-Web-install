import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PttPanel } from './PttPanel'

const config = {
  api_version: 'v1', model: 'FTX-1', status: 'experimental',
  data_is_simulated: false, hardware_validation_complete: false,
  enabled: true, lease_active: false, rx_confirmed: false, stop_failed: false,
  lease_seconds: 2, max_transmit_seconds: 10, tx_audio_required: false,
  frequency_min_hz: 14_200_000, frequency_max_hz: 14_300_000, power_max_watts: 10,
}
const active = {
  ...config, lease_active: true, rx_confirmed: false, lease_id: 'a'.repeat(43),
}

async function prepare() {
  const user = userEvent.setup()
  await user.click(screen.getByText('Consultar PTT'))
  await user.click(await screen.findByLabelText('Habilitar pulsación PTT en esta sesión'))
  expect(screen.getByText('Mantener PTT (Espacio / Intro)').hasAttribute('disabled')).toBe(true)
  await user.click(screen.getByText('PARAR TX / confirmar RX'))
  const button = screen.getByText('Mantener PTT (Espacio / Intro)')
  await waitFor(() => expect(button.hasAttribute('disabled')).toBe(false))
  return button
}

describe('PTT exclusivo mantenido', () => {
  it('bloquea PTT si el agente exige micrófono y no hay sesión de audio preparada', async () => {
    const operations: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null
      if (body) operations.push(body.operation)
      return Response.json({ ...config, tx_audio_required: true, rx_confirmed: true })
    }))
    render(<PttPanel token="test-token" />)
    fireEvent.click(screen.getByText('Consultar PTT'))
    const checkbox = await screen.findByLabelText('Habilitar pulsación PTT en esta sesión')
    fireEvent.click(checkbox)
    const button = screen.getByText('Mantener PTT (Espacio / Intro)')
    expect(button.hasAttribute('disabled')).toBe(true)
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(operations).not.toContain('start')
    expect(screen.getByText('Preparar micrófono remoto')).toBeTruthy()
  })
  it.each(['keyboard', 'pointer'])('exige opt-in y RX, renueva y para al soltar: %s', async (input) => {
    const operations: Record<string, unknown>[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'POST') return Response.json(config)
      const body = JSON.parse(String(init.body))
      operations.push(body)
      return Response.json(body.operation === 'stop' ? { ...config, rx_confirmed: true } : active)
    }))
    render(<PttPanel token="test-token" />)
    const button = await prepare()
    if (input === 'pointer') {
      fireEvent.pointerDown(button, { button: 0, isPrimary: true, pointerType: 'touch' })
    } else fireEvent.keyDown(button, { key: ' ' })
    await waitFor(() => expect(operations.some((body) => body.operation === 'start')).toBe(true))
    await waitFor(() => expect(operations.some((body) => body.operation === 'renew')).toBe(true), {
      timeout: 2000,
    })
    if (input === 'pointer') {
      fireEvent.pointerUp(window, { button: 0, isPrimary: true, pointerType: 'touch' })
    } else fireEvent.keyUp(window, { key: ' ' })
    await waitFor(() => expect(operations.at(-1)?.operation).toBe('stop'))
    const starts = operations.filter((body) => body.operation === 'start')
    expect(starts).toHaveLength(1)
    expect(starts[0].request_id).toMatch(/^[a-f0-9-]{36}$/)
    expect(operations.at(-1)?.cancel_request_id).toBe(starts[0].request_id)
  })

  it('cancela START pendiente y vuelve a parar una respuesta tardía sin renovar', async () => {
    const operations: string[] = []
    const deferred: { resolve?: (response: Response) => void } = {}
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'POST') return Response.json(config)
      const body = JSON.parse(String(init.body))
      operations.push(body.operation)
      if (body.operation === 'start') {
        return new Promise<Response>((resolve) => { deferred.resolve = resolve })
      }
      return Response.json({ ...config, rx_confirmed: true })
    }))
    render(<PttPanel token="test-token" />)
    const button = await prepare()
    fireEvent.keyDown(button, { key: 'Enter' })
    await waitFor(() => expect(operations).toContain('start'))
    fireEvent.keyUp(window, { key: 'Enter' })
    await waitFor(() => expect(operations.filter((op) => op === 'stop')).toHaveLength(2))
    expect(deferred.resolve).toBeTypeOf('function')
    deferred.resolve?.(Response.json(active))
    await waitFor(() => expect(operations.filter((op) => op === 'stop')).toHaveLength(3))
    expect(operations).not.toContain('renew')
  })

  it.each(['blur', 'unmount'])('solicita RX al perder el cliente: %s', async (event) => {
    const operations: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'POST') return Response.json(config)
      const body = JSON.parse(String(init.body))
      operations.push(body.operation)
      return Response.json(body.operation === 'stop' ? { ...config, rx_confirmed: true } : active)
    }))
    const view = render(<PttPanel token="test-token" />)
    const button = await prepare()
    fireEvent.keyDown(button, { key: ' ' })
    await waitFor(() => expect(operations).toContain('start'))
    if (event === 'unmount') view.unmount()
    else fireEvent.blur(window)
    await waitFor(() => expect(operations.at(-1)).toBe('stop'))
  })
})
