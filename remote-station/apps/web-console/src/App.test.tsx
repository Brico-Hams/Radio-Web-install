import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import App from './App'
import { setCoordinatorUrl } from './api'

const catalog = {
  api_version: 'v1',
  schema_version: '1.0',
  hardware_validation_complete: false,
  models: [
    {
      manufacturer: 'Yaesu',
      model: 'FTX-1',
      firmware: null,
      connection: 'USB',
      capabilities: [
        {
          function: 'native_spectrum',
          status: 'unsupported',
          source_document: null,
          implementation: 'No hay lector de muestras de espectro nativo implementado.',
          limitations: ['Pendiente de validación física.'],
        },
      ],
    },
  ],
}

const snapshot = {
  api_version: 'v1',
  schema_version: '1.0',
  station_id: 'demo-station',
  name: 'Estación de demostración',
  callsign: 'EA5KAO',
  source: 'deterministic_simulator',
  data_is_simulated: true,
  hardware_connected: false,
  radio_profile: {
    manufacturer: 'Yaesu',
    model: 'FTX-1',
    profile_only: true,
    accessory_profile: 'SPA-1',
  },
  frequency_hz: 14_074_000,
  vfo: 'A',
  mode: 'USB',
  band: '20m',
  tx: {
    enabled: false,
    ptt_available: false,
    state: 'blocked',
    reason: 'TX remoto no está implementado en esta versión.',
  },
  spectrum: {
    status: 'unsupported',
    samples: null,
    message: 'Espectro nativo no disponible: pendiente de validación del protocolo.',
  },
  waterfall: {
    status: 'unsupported',
    data: null,
    message: 'Waterfall nativo no disponible: pendiente de validación del protocolo.',
  },
}

const diagnostics = {
  api_version: 'v1',
  simulator: true,
  hardware_discovered: false,
  cat_operations_enabled: false,
  tx_enabled: false,
}

const radioCandidates = {
  api_version: 'v1',
  schema_version: '1.0',
  hardware_validation_complete: false,
  notice:
    'Las fichas de terceros son afirmaciones, no soporte ni pruebas de BricoHams.',
  candidates: [
    {
      manufacturer: 'Icom',
      model: 'IC-705',
      connection_claim: 'Wi-Fi or USB',
      bands_claim: '160m-6m, 2m, 70cm',
      third_party_scope_claim: 'yes',
      third_party_tested: 'yes',
      third_party_support_status: 'not_stated',
      evidence_source: 'third_party_listing',
      source_url: 'https://www.remotemyshack.com/radios/icom-ic-705',
      bricoham_status: 'candidate',
    },
  ],
}

const deviceInventory = {
  api_version: 'v1',
  schema_version: '1.0',
  devices: [
    {
      port: 'COM7',
      description: 'USB serial adapter',
      hwid: null,
      vid: '1234',
      pid: '5678',
      manufacturer: 'Example',
      product: 'USB serial adapter',
      interface: 'Interface 0',
      classification: 'unknown',
    },
  ],
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubSuccessfulCoordinator(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input)
      if (path.endsWith('/capabilities')) return jsonResponse(catalog)
      if (path.endsWith('/status')) return jsonResponse(snapshot)
      if (path.endsWith('/devices')) return jsonResponse(deviceInventory)
      if (path.endsWith('/radios')) return jsonResponse(radioCandidates)
      return jsonResponse(diagnostics)
    }),
  )
}

describe('web console', () => {
  it('changes language while preserving the connection without persisting the token', async () => {
    stubSuccessfulCoordinator()
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Token de acceso'), 'language-test-token')
    await user.click(screen.getByRole('button', { name:'Conectar' }))
    await screen.findByText('Coordinador conectado')
    vi.mocked(fetch).mockClear()
    await user.selectOptions(screen.getByLabelText('Idioma'), 'en')
    expect(screen.getByText('Coordinator connected')).toBeTruthy()
    expect(fetch).not.toHaveBeenCalled()
    expect(localStorage.getItem('bricoham.language')).toBe('en')
    expect(JSON.stringify(localStorage)).not.toContain('language-test-token')
  })

  it('does not reconnect when an outstanding refresh finishes after disconnect', async () => {
    stubSuccessfulCoordinator()
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Token de acceso'), 'refresh-test-token')
    await user.click(screen.getByRole('button', { name:'Conectar' }))
    await screen.findByText('Coordinador conectado')
    let release = () => {}
    const gate = new Promise<void>((resolve) => { release = resolve })
    const original = fetch
    const requests: Promise<Response>[] = []
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const request = gate.then(() => original(input, init))
      requests.push(request)
      return request
    }))
    await user.click(screen.getByRole('button', { name:'Actualizar datos' }))
    await user.click(screen.getByRole('button', { name:'Desconectar' }))
    await act(async () => { release(); await Promise.all(requests) })
    expect(screen.queryByText('Coordinador conectado')).toBeNull()
    expect(screen.getByRole('button', { name:'Conectar' })).toBeTruthy()
  })

  it('connects with a token and makes simulated and unavailable features explicit', async () => {
    stubSuccessfulCoordinator()
    const user = userEvent.setup()
    render(<App />)

    const tokenField = screen.getByLabelText('Token de acceso')
    expect(tokenField.getAttribute('type')).toBe('password')
    await user.type(tokenField, 'local-test-token')
    await user.click(screen.getByRole('button', { name: 'Conectar' }))

    expect(await screen.findByText('MODO DEMOSTRACIÓN · DATOS SIMULADOS')).toBeTruthy()
    expect(screen.getByText('Espectro nativo no disponible: pendiente de validación del protocolo.'))
      .toBeTruthy()
    expect(screen.getByText('Transmisión remota bloqueada')).toBeTruthy()
    expect(screen.getByText('COM7')).toBeTruthy()
    expect(screen.getByText('NO CLASIFICADO')).toBeTruthy()
    expect(await screen.findByText('Radios candidatas')).toBeTruthy()
    const desk = screen.getByRole('region', { name: 'Escritorio de operación' })
    const catalogHeading = screen.getByRole('heading', { name: 'Perfiles y capacidades' })
    expect(desk.compareDocumentPosition(catalogHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const shortcuts = screen.getByRole('navigation', { name: 'Acceso directo a controles de radio' })
    for (const link of shortcuts.querySelectorAll('a')) {
      const target = link.getAttribute('href')?.slice(1)
      expect(target ? document.getElementById(target) : null).not.toBeNull()
    }
    expect(screen.queryByText(/No hay controles de PTT ni transmisión en esta consola/)).toBeNull()
    await user.click(screen.getByText('Icom'))
    expect(screen.getByText('IC-705')).toBeTruthy()
    expect(screen.getByText('CANDIDATA · NO VALIDADA')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Mantener PTT/ })).toBeNull()
  })

  it('shows the capability catalog to a guest without inventing station data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const path = String(input)
        if (path.endsWith('/capabilities')) return jsonResponse(catalog)
        if (path.endsWith('/radios')) return jsonResponse(radioCandidates)
        return jsonResponse({ api_version: 'v1', error: { code: 'forbidden' } }, 403)
      }),
    )
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Token de acceso'), 'guest-token')
    await user.click(screen.getByRole('button', { name: 'Conectar' }))

    expect(await screen.findByText(/no tiene permiso para consultar el estado/i)).toBeTruthy()
    expect(screen.getByText('Yaesu FTX-1')).toBeTruthy()
    expect(screen.queryByText('14.074.000')).toBeNull()
  })

  it('keeps the console available when the optional station agent is offline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const path = String(input)
        if (path.endsWith('/capabilities')) return jsonResponse(catalog)
        if (path.endsWith('/status')) return jsonResponse(snapshot)
        if (path.endsWith('/diagnostics')) return jsonResponse(diagnostics)
        if (path.endsWith('/radios')) return jsonResponse(radioCandidates)
        return jsonResponse(
          { api_version: 'v1', error: { code: 'station_agent_unavailable' } },
          503,
        )
      }),
    )
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Token de acceso'), 'local-token')
    await user.click(screen.getByRole('button', { name: 'Conectar' }))

    expect(await screen.findByText(/El agente local no está disponible/i)).toBeTruthy()
    expect(screen.getByText('Estación de demostración')).toBeTruthy()
  })

  it('reports an invalid token without displaying it in page content', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 401)))
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Token de acceso'), 'secret-token-value')
    await user.click(screen.getByRole('button', { name: 'Conectar' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Token inválido o sin configurar.',
    )
    expect(document.body.textContent).not.toContain('secret-token-value')
  })

  it('requires HTTPS in native clients before sending the token', async () => {
    const native = vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    try {
      stubSuccessfulCoordinator()
      const user = userEvent.setup()
      render(<App />)
      const host = screen.getByLabelText('Host BricoHams (HTTPS)')
      await user.type(host, 'http://host.test')
      await user.type(screen.getByLabelText('Token de acceso'), 'native-test-token')
      await user.click(screen.getByRole('button', { name: 'Conectar' }))
      expect((await screen.findByRole('alert')).textContent).toContain('HTTPS')
      expect(fetch).not.toHaveBeenCalled()
      await user.clear(host)
      await user.type(host, 'https://host.test')
      await user.click(screen.getByRole('button', { name: 'Conectar' }))
      expect(await screen.findByText('Estación de demostración')).toBeTruthy()
      expect(fetch).toHaveBeenCalledWith(
        'https://host.test/api/v1/capabilities', expect.objectContaining({ redirect: 'error' }),
      )
    } finally {
      native.mockRestore()
      setCoordinatorUrl('')
    }
  })
})
