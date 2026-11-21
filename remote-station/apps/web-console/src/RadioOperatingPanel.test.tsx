import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RadioOperatingPanel } from './RadioOperatingPanel'

const config = {
  api_version: 'v1', model: 'FTX-1', status: 'experimental',
  data_is_simulated: false, hardware_validation_complete: false,
  power_unit: 'watts_setpoint', power_level_max: 50, power_adjustment_enabled: false,
  tuner_switching_enabled: false, tune_enabled: false,
  frequency_adjustment_enabled: true, mode_adjustment_enabled: true,
  mode_options: [
    { code: '1', label: 'LSB' }, { code: '2', label: 'USB' },
    { code: '3', label: 'CW-U' }, { code: 'H', label: 'C4FM-DN' },
  ],
}
const observed = {
  ...config, tx_active: false, tuner_busy: false, observed_at: 123,
  receivers: {
    MAIN: { frequency_hz: 14_250_000, mode_code: '2' },
    SUB: { frequency_hz: 7_074_000, mode_code: '1' },
  },
}

async function loadAndRead() {
  const user = userEvent.setup()
  await user.click(screen.getByText('Consultar controles FTX-1'))
  await user.click(await screen.findByText('Leer receptores FTX-1'))
  await screen.findByText(/Última lectura de MAIN/)
  return user
}

describe('controles MAIN/SUB FTX-1', () => {
  it('exige lectura y envía frecuencia/modo al receptor explícito con nonce', async () => {
    const operations: Record<string, unknown>[] = []
    const state = structuredClone(observed)
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'POST') return Response.json(config)
      const body: Record<string, unknown> = JSON.parse(String(init.body))
      operations.push(body)
      if (body.receiver === 'MAIN' || body.receiver === 'SUB') {
        if (body.operation === 'set_frequency' && typeof body.frequency_hz === 'number') {
          state.receivers[body.receiver].frequency_hz = body.frequency_hz
        } else if (body.operation === 'set_mode' && typeof body.mode_code === 'string') {
          state.receivers[body.receiver].mode_code = body.mode_code
        }
      }
      return Response.json(state)
    }))
    render(<RadioOperatingPanel token="operator-token" />)
    const user = userEvent.setup()
    await user.click(screen.getByText('Consultar controles FTX-1'))
    expect((await screen.findByText('Aplicar frecuencia')).hasAttribute('disabled')).toBe(true)
    await user.click(screen.getByText('Leer receptores FTX-1'))
    await screen.findByText(/Última lectura de MAIN/)
    await user.selectOptions(screen.getByLabelText('Receptor FTX-1'), 'SUB')
    expect(operations).toEqual([{ operation: 'read_operating' }])
    const input = screen.getByLabelText('Frecuencia del receptor (Hz)')
    await user.clear(input)
    await user.type(input, '7100000')
    await user.click(screen.getByText('Aplicar frecuencia'))
    await waitFor(() => expect(operations.at(-1)).toMatchObject({
      operation: 'set_frequency', receiver: 'SUB', frequency_hz: 7_100_000,
    }))
    expect(operations.at(-1)?.request_id).toMatch(/^[a-f0-9-]{36}$/)
    await user.selectOptions(screen.getByLabelText('Modo del receptor'), 'H')
    await user.click(screen.getByText('Aplicar modo'))
    await waitFor(() => expect(operations.at(-1)).toMatchObject({
      operation: 'set_mode', receiver: 'SUB', mode_code: 'H',
    }))
    expect(state.receivers.MAIN.frequency_hz).toBe(14_250_000)
    expect(state.receivers.SUB.mode_code).toBe('H')
  })

  it('no reintenta un setter incierto y bloquea ambos ajustes hasta nueva lectura', async () => {
    const operations: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'POST') return Response.json(config)
      const body: { operation: string } = JSON.parse(String(init.body))
      operations.push(body.operation)
      return body.operation === 'read_operating' ? Response.json(observed) : Response.json({
        api_version: 'v1', error: { code: 'cat_setting_unconfirmed' },
      }, { status: 503 })
    }))
    render(<RadioOperatingPanel token="operator-token" />)
    const user = await loadAndRead()
    await user.click(screen.getByText('Aplicar frecuencia'))
    await screen.findByRole('alert')
    expect(screen.getByText('Aplicar frecuencia').hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('Aplicar modo').hasAttribute('disabled')).toBe(true)
    expect(operations).toEqual(['read_operating', 'set_frequency'])
    await user.click(screen.getByText('Leer receptores FTX-1'))
    await waitFor(() => expect(screen.getByText('Aplicar frecuencia').hasAttribute('disabled')).toBe(false))
  })

  it.each([
    { tx_active: true, tuner_busy: false },
    { tx_active: false, tuner_busy: true },
  ])('bloquea controles con TX o solicitud de sintonía: %j', async (guard) => {
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      Response.json(init?.method === 'POST' ? { ...observed, ...guard } : config)))
    render(<RadioOperatingPanel token="operator-token" />)
    await loadAndRead()
    expect(screen.getByText('Aplicar frecuencia').hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('Aplicar modo').hasAttribute('disabled')).toBe(true)
  })

  it('rechaza una frecuencia de respuesta inválida sin inventar lectura ni habilitar setters', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      Response.json(init?.method === 'POST' ? {
        ...observed, receivers: { ...observed.receivers, MAIN: { frequency_hz: -1, mode_code: '2' } },
      } : config)))
    render(<RadioOperatingPanel token="operator-token" />)
    const user = userEvent.setup()
    await user.click(screen.getByText('Consultar controles FTX-1'))
    await user.click(await screen.findByText('Leer receptores FTX-1'))
    await screen.findByRole('alert')
    expect(screen.queryByText(/Última lectura de MAIN/)).toBeNull()
    expect(screen.getByText('Aplicar frecuencia').hasAttribute('disabled')).toBe(true)
  })
})
