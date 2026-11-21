import { render as renderComponent, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RadioOperatingPanel } from './RadioOperatingPanel'
import { LanguageProvider, LanguageSelector } from './LanguageProvider'

beforeEach(() => localStorage.removeItem('bricoham.language'))

function render(ui: ReactNode) {
  return renderComponent(<LanguageProvider>{ui}</LanguageProvider>)
}

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
  await user.click(screen.getByText('Consultar controles de radio'))
  await user.click(await screen.findByText('Leer receptores'))
  await screen.findByText(/Última lectura de MAIN/)
  return user
}

describe('controles MAIN/SUB FTX-1', () => {
  it.each([
    ['en', 'Receiver frequency (Hz)', 'Receiver mode', 'Apply frequency', 'Apply mode', 'unavailable for this selector'],
    ['fr', 'Fréquence du récepteur (Hz)', 'Mode du récepteur', 'Appliquer la fréquence', 'Appliquer le mode', 'indisponible pour ce sélecteur'],
    ['pt', 'Frequência do recetor (Hz)', 'Modo do recetor', 'Aplicar frequência', 'Aplicar modo', 'indisponível para este seletor'],
  ])('cambiar a %s conserva la lectura y no habilita modo VFO-B inexistente', async (
    language, frequencyLabel, modeLabel, applyFrequency, applyMode, unavailable,
  ) => {
    const yaesuConfig = {
      ...config, model: 'FT-991A', frequency_min_hz: 30_000, frequency_max_hz: 470_000_000,
      mode_options: [{ code: '1', label: 'LSB' }, { code: '2', label: 'USB' }],
      receiver_options: [
        { receiver: 'MAIN', label: 'VFO-A', mode_supported: true },
        { receiver: 'SUB', label: 'VFO-B', mode_supported: false },
      ],
    }
    const state = {
      ...observed, ...yaesuConfig,
      receivers: { ...observed.receivers, SUB: { frequency_hz: 7_074_000, mode_code: null } },
    }
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      Response.json(init?.method === 'POST' ? state : yaesuConfig))
    vi.stubGlobal('fetch', fetch)
    render(<><LanguageSelector /><RadioOperatingPanel token="operator-token" /></>)
    const user = await loadAndRead()
    await user.selectOptions(screen.getByLabelText('Receptor de radio'), 'SUB')
    const input = screen.getByLabelText<HTMLInputElement>('Frecuencia del receptor (Hz)')
    await user.selectOptions(screen.getByLabelText('Idioma'), language)
    expect(screen.getByLabelText(frequencyLabel)).toBe(input)
    expect(input.value).toBe('7074000')
    expect(screen.getByText(unavailable, { exact: false })).toBeTruthy()
    expect(screen.getByText(applyFrequency).hasAttribute('disabled')).toBe(false)
    expect(screen.getByText(applyMode).hasAttribute('disabled')).toBe(true)
    expect(screen.getByLabelText(modeLabel).hasAttribute('disabled')).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('rechaza capacidades extra no validadas en una respuesta FTX-1', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      ...config, receiver_options: 'invalid',
    })))
    render(<RadioOperatingPanel token="operator-token" />)
    await userEvent.setup().click(screen.getByText('Consultar controles de radio'))
    await screen.findByRole('alert')
    expect(screen.queryByText('Aplicar frecuencia')).toBeNull()
  })

  it.each(['FT-991A', 'FTDX3000'])('permite VFO-B sin inventar un modo secundario para %s', async (model) => {
    const yaesuConfig = {
      ...config, model, frequency_min_hz: 30_000,
      frequency_max_hz: model === 'FT-991A' ? 470_000_000 : 60_000_000,
      mode_options: [{ code: '1', label: 'LSB' }, { code: '2', label: 'USB' }],
      receiver_options: [
        { receiver: 'MAIN', label: 'VFO-A', mode_supported: true },
        { receiver: 'SUB', label: 'VFO-B', mode_supported: false },
      ],
    }
    const state = {
      ...observed, ...yaesuConfig,
      receivers: { ...observed.receivers, SUB: { frequency_hz: 7_074_000, mode_code: null } },
    }
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      Response.json(init?.method === 'POST' ? state : yaesuConfig)))
    render(<RadioOperatingPanel token="operator-token" />)
    const user = await loadAndRead()
    await user.selectOptions(screen.getByLabelText('Receptor de radio'), 'SUB')
    expect(screen.getByText(/no disponible para este selector/)).toBeTruthy()
    expect(screen.getByText('Aplicar frecuencia').hasAttribute('disabled')).toBe(false)
    expect(screen.getByText('Aplicar modo').hasAttribute('disabled')).toBe(true)
    expect(screen.getByLabelText('Modo del receptor').hasAttribute('disabled')).toBe(true)
    expect(screen.getByLabelText('Frecuencia del receptor (Hz)').getAttribute('max'))
      .toBe(String(yaesuConfig.frequency_max_hz))
  })
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
    await user.click(screen.getByText('Consultar controles de radio'))
    expect((await screen.findByText('Aplicar frecuencia')).hasAttribute('disabled')).toBe(true)
    await user.click(screen.getByText('Leer receptores'))
    await screen.findByText(/Última lectura de MAIN/)
    await user.selectOptions(screen.getByLabelText('Receptor de radio'), 'SUB')
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
    await user.click(screen.getByText('Leer receptores'))
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
    await user.click(screen.getByText('Consultar controles de radio'))
    await user.click(await screen.findByText('Leer receptores'))
    await screen.findByRole('alert')
    expect(screen.queryByText(/Última lectura de MAIN/)).toBeNull()
    expect(screen.getByText('Aplicar frecuencia').hasAttribute('disabled')).toBe(true)
  })
})
