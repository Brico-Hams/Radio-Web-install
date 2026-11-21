import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RadioSettingsPanel } from './RadioSettingsPanel'

const settings = {
  api_version: 'v1', model: 'IC-7300', status: 'experimental',
  data_is_simulated: false, hardware_validation_complete: false,
  power_unit: 'cat_position_0_255', power_level_max: 120,
  power_adjustment_enabled: true, tuner_switching_enabled: true, tune_enabled: false,
}
const observed = { ...settings, power_level: 25, tuner_state: 0, tx_active: false, observed_at: 123 }

async function loadAndRead() {
  const user = userEvent.setup()
  await user.click(screen.getByText('Consultar configuración de ajustes'))
  await user.click(await screen.findByText('Leer potencia y acoplador'))
  await waitFor(() => expect(
    screen.getByText('Aplicar nivel de potencia').hasAttribute('disabled'),
  ).toBe(false))
  return user
}

describe('ajustes documentados IC-7300', () => {
  it('exige lectura y envía el nivel CAT con nonce, sin convertirlo en vatios', async () => {
    const operations: Record<string, unknown>[] = []
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'POST') return Response.json(settings)
      const body: Record<string, unknown> = JSON.parse(String(init.body))
      operations.push(body)
      return Response.json({ ...observed, power_level: body.power_level ?? 25 })
    }))
    const user = userEvent.setup()
    render(<RadioSettingsPanel token="operator-token" />)
    await user.click(screen.getByText('Consultar configuración de ajustes'))
    expect((await screen.findByText('Aplicar nivel de potencia')).hasAttribute('disabled')).toBe(true)
    await user.click(screen.getByText('Leer potencia y acoplador'))
    const input = await screen.findByLabelText('Nivel de potencia CAT (no W)')
    await user.clear(input)
    await user.type(input, '100')
    await user.click(screen.getByText('Aplicar nivel de potencia'))
    await waitFor(() => expect(operations.at(-1)).toMatchObject({
      operation: 'set_power', power_level: 100,
    }))
    expect(operations.at(-1)?.request_id).toMatch(/^[a-f0-9-]{36}$/)
    expect(screen.queryByText('Iniciar sintonía')).toBeNull()
  })

  describe('consigna documentada FTX-1 / SPA-1', () => {
    const ftxSettings = {
      ...settings, model: 'FTX-1', power_unit: 'watts_setpoint',
      power_level_max: 50, tuner_switching_enabled: false,
    }
    const ftxObserved = {
      ...ftxSettings, power_level: 8, power_head: 'field', tuner_busy: false,
      tx_active: false, observed_at: 123,
    }

    it('envía W de consigna, respeta el cabezal field y no muestra controles ATU', async () => {
      const operations: Record<string, unknown>[] = []
      vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method !== 'POST') return Response.json(ftxSettings)
        const body: Record<string, unknown> = JSON.parse(String(init.body))
        operations.push(body)
        return Response.json({ ...ftxObserved, power_level: body.power_level ?? 8 })
      }))
      render(<RadioSettingsPanel token="operator-token" />)
      const user = await loadAndRead()
      const input = screen.getByLabelText('Consigna de potencia (W, no medida RF)')
      expect(input.getAttribute('min')).toBe('5')
      expect(input.getAttribute('max')).toBe('10')
      await user.clear(input)
      await user.type(input, '10')
      await user.click(screen.getByText('Aplicar nivel de potencia'))
      await waitFor(() => expect(operations.at(-1)).toMatchObject({
        operation: 'set_power', power_level: 10,
      }))
      expect(screen.queryByText('Insertar acoplador')).toBeNull()
      expect(screen.queryByText('Bypass de acoplador')).toBeNull()
      expect(screen.getByText(/Cabezal: field/)).toBeTruthy()
    })

    it('bloquea potencia si CAT observa una petición de movimiento/sintonía', async () => {
      vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
        Response.json(init?.method === 'POST'
          ? { ...ftxObserved, power_head: 'SPA-1', power_level: 25, tuner_busy: true }
          : ftxSettings)))
      render(<RadioSettingsPanel token="operator-token" />)
      const user = userEvent.setup()
      await user.click(screen.getByText('Consultar configuración de ajustes'))
      await user.click(await screen.findByText('Leer potencia y acoplador'))
      await screen.findByText(/Cabezal: SPA-1/)
      expect(screen.getByText('Aplicar nivel de potencia').hasAttribute('disabled')).toBe(true)
    })

    it('rechaza mezclar posición CAT IC-7300 con W FTX-1 antes de cualquier control', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => Response.json({
        ...ftxSettings, power_unit: 'cat_position_0_255',
      })))
      render(<RadioSettingsPanel token="operator-token" />)
      await userEvent.setup().click(screen.getByText('Consultar configuración de ajustes'))
      await screen.findByRole('alert')
      expect(screen.queryByText('Aplicar nivel de potencia')).toBeNull()
    })
  })

  it('bloquea ajustes si el estado reporta TX o sintonía activa', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      Response.json(init?.method === 'POST'
        ? { ...observed, tx_active: true, tuner_state: 2 } : settings)))
    const user = userEvent.setup()
    render(<RadioSettingsPanel token="operator-token" />)
    await user.click(screen.getByText('Consultar configuración de ajustes'))
    await user.click(await screen.findByText('Leer potencia y acoplador'))
    await screen.findByText(/TX observado: sí/)
    for (const label of ['Aplicar nivel de potencia', 'Insertar acoplador', 'Bypass de acoplador']) {
      expect(screen.getByText(label).hasAttribute('disabled')).toBe(true)
    }
  })

  it('no reintenta un ajuste incierto ni vuelve a habilitarlo sin consultar', async () => {
    const operations: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'POST') return Response.json(settings)
      const body: { operation: string } = JSON.parse(String(init.body))
      operations.push(body.operation)
      return body.operation === 'read' ? Response.json(observed) : Response.json({
        api_version: 'v1', error: { code: 'cat_setting_readback_mismatch' },
      }, { status: 503 })
    }))
    render(<RadioSettingsPanel token="operator-token" />)
    const user = await loadAndRead()
    await user.click(screen.getByText('Aplicar nivel de potencia'))
    expect((await screen.findByRole('alert')).textContent).toContain('Operación no confirmada')
    expect(screen.getByText('Aplicar nivel de potencia').hasAttribute('disabled')).toBe(true)
    expect(operations).toEqual(['read', 'set_power'])
  })

  it('conmuta insertar y bypass sin exponer una orden de sintonía RF', async () => {
    const operations: Record<string, unknown>[] = []
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'POST') return Response.json(settings)
      const body: Record<string, unknown> = JSON.parse(String(init.body))
      operations.push(body)
      return Response.json(observed)
    }))
    render(<RadioSettingsPanel token="operator-token" />)
    const user = await loadAndRead()
    await user.click(screen.getByText('Insertar acoplador'))
    await waitFor(() => expect(operations.at(-1)).toMatchObject({
      operation: 'set_tuner', enabled: true,
    }))
    await user.click(screen.getByText('Bypass de acoplador'))
    await waitFor(() => expect(operations.at(-1)).toMatchObject({
      operation: 'set_tuner', enabled: false,
    }))
    expect(operations.every((operation) => ['read', 'set_tuner'].includes(String(operation.operation))))
      .toBe(true)
  })
})
