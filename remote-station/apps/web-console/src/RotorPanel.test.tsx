import { act, fireEvent, render as renderComponent, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setCoordinatorUrl } from './api'
import { RotorPanel } from './RotorPanel'
import { LanguageProvider, LanguageSelector } from './LanguageProvider'

function render(ui: ReactNode) {
  return renderComponent(<LanguageProvider>{ui}</LanguageProvider>)
}

beforeEach(() => localStorage.removeItem('bricoham.language'))

afterEach(() => setCoordinatorUrl(''))

const state = {
  api_version: 'v1', source: 'hamlib_rotctld', status: 'experimental',
  data_is_simulated: false, hardware_validation_complete: false,
  label: 'Rotator bench', motion_enabled: true, lease_active: false, stop_failed: false,
  limits: { azimuth_min: 0, azimuth_max: 360, elevation_min: 0, elevation_max: 0 },
}

function controller() {
  const operations: Record<string, unknown>[] = []
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method !== 'POST') return Response.json(state)
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    operations.push(body)
    return Response.json(body.operation === 'stop' ? state : {
      ...state, lease_active: true, lease_id: 'a'.repeat(43),
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, operations }
}

async function moveRotor() {
  const user = userEvent.setup()
  await user.click(screen.getByText('Consultar configuración del rotor'))
  await user.type(await screen.findByLabelText('Azimut objetivo (grados)'), '90')
  await user.click(screen.getByText('Mover rotor'))
  await screen.findByText(/Sesión renovada mientras/)
}

describe('control de rotor compartido', () => {
  it.each([
    ['en', 'Target azimuth (degrees)', 'STOP ROTATOR'],
    ['fr', 'Azimut cible (degrés)', 'ARRÊTER LE ROTOR'],
    ['pt', 'Azimute alvo (graus)', 'PARAR ROTOR'],
  ])('mantiene objetivo y sesión al cambiar a %s; perder foco todavía para', async (lang, label, stop) => {
    const { operations } = controller()
    render(<><LanguageSelector /><RotorPanel token="operator-token" /></>)
    await moveRotor()
    const input = screen.getByLabelText<HTMLInputElement>('Azimut objetivo (grados)')
    fireEvent.change(screen.getByLabelText('Idioma'), { target: { value: lang } })
    expect(screen.getByLabelText(label)).toBe(input)
    expect(input.value).toBe('90')
    expect(screen.getByRole('button', { name: stop })).toBeTruthy()
    expect(operations.filter((op) => op.operation === 'move')).toHaveLength(1)
    expect(operations.some((op) => op.operation === 'stop')).toBe(false)
    await waitFor(() => expect(operations.some((op) => op.operation === 'renew')).toBe(true), {
      timeout: 2500,
    })
    await act(async () => { window.dispatchEvent(new Event('blur')) })
    await waitFor(() => expect(operations.at(-1)?.operation).toBe('stop'))
    expect(operations.at(-1)?.cancel_request_id).toBe(operations[0].request_id)
  })

  it('envía objetivo con nonce, renueva la sesión y para al perder foco', async () => {
    const { operations, fetchMock } = controller()
    render(<RotorPanel token="operator-token" />)
    await moveRotor()
    expect(operations[0]).toMatchObject({
      operation: 'move', azimuth_deg: 90, elevation_deg: 0,
    })
    expect(operations[0].request_id).toMatch(/^[a-f0-9-]{36}$/)
    await waitFor(() => expect(operations.some((op) => op.operation === 'renew')).toBe(true), {
      timeout: 2500,
    })
    await act(async () => { window.dispatchEvent(new Event('blur')) })
    await waitFor(() => expect(operations.at(-1)).toEqual({
      operation: 'stop', cancel_request_id: operations[0].request_id,
    }))
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/rotor', expect.objectContaining({
      method: 'POST', keepalive: true, credentials: 'omit', redirect: 'error',
      headers: { Authorization: 'Bearer operator-token', 'Content-Type': 'application/json' },
    }))
    expect(screen.queryByText(/Sesión renovada mientras/)).toBeNull()
  })

  it('solicita parada al desmontar el cliente con una sesión activa', async () => {
    const { operations } = controller()
    const mounted = render(<RotorPanel token="operator-token" />)
    await moveRotor()
    mounted.unmount()
    await waitFor(() => expect(operations.at(-1)?.operation).toBe('stop'))
  })

  it('mantiene la parada en el host original tras desmontar y recibir una confirmación tardía', async () => {
    setCoordinatorUrl('https://original.example')
    const operations: Record<string, unknown>[] = []
    let replyMove: ((response: Response) => void) | undefined
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'POST') return Response.json(state)
      const body: Record<string, unknown> = JSON.parse(String(init.body))
      operations.push(body)
      if (body.operation === 'move') {
        return new Promise<Response>((resolve) => { replyMove = resolve })
      }
      return Response.json(state)
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    const mounted = render(<RotorPanel token="operator-token" />)
    await user.click(screen.getByText('Consultar configuración del rotor'))
    await user.type(await screen.findByLabelText('Azimut objetivo (grados)'), '90')
    await user.click(screen.getByText('Mover rotor'))
    mounted.unmount()
    await waitFor(() => expect(operations.at(-1)).toEqual({
      operation: 'stop', cancel_request_id: operations[0].request_id,
    }))
    setCoordinatorUrl('https://another.example')
    expect(replyMove).toBeDefined()
    await act(async () => {
      replyMove?.(Response.json({ ...state, lease_active: true, lease_id: 'a'.repeat(43) }))
    })
    await waitFor(() => expect(operations.filter((op) => op.operation === 'stop')).toHaveLength(2))
    expect(operations.at(-1)?.cancel_request_id).toBe(operations[0].request_id)
    expect(fetchMock).toHaveBeenLastCalledWith('https://original.example/api/v1/rotor',
      expect.objectContaining({ headers: {
        Authorization: 'Bearer operator-token', 'Content-Type': 'application/json',
      } }))
    expect(operations.some((op) => op.operation === 'renew')).toBe(false)
    expect(screen.queryByText(/Sesión renovada mientras/)).toBeNull()
  })

  it('no ofrece movimiento cuando el agente solo permite lectura', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      ...state, motion_enabled: false,
    })))
    const user = userEvent.setup()
    render(<RotorPanel token="operator-token" />)
    await user.click(screen.getByText('Consultar configuración del rotor'))
    await screen.findByText(/SOLO LECTURA/)
    expect(screen.getByText('Mover rotor').hasAttribute('disabled')).toBe(true)
    expect(screen.queryByText(/Sesión renovada mientras/)).toBeNull()
  })

  it('presenta errores de parada sin afirmar que el motor se ha detenido', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      api_version: 'v1', error: { code: 'rotor_transport_failed' },
    }, { status: 503 })))
    const user = userEvent.setup()
    render(<RotorPanel token="operator-token" />)
    await user.click(screen.getByText('PARAR ROTOR'))
    expect((await screen.findByRole('alert')).textContent).toContain('Parada NO confirmada')
  })
})
