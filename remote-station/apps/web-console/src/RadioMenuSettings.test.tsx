import { render as renderComponent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from './LanguageProvider'
import { RadioMenuSettings } from './RadioMenuSettings'

function render(ui: ReactNode) {
  return renderComponent(<LanguageProvider>{ui}</LanguageProvider>)
}

const base = { group: 'g', type: 'enum', read: 'EX010413;' }
const menu = [
  { ...base, id: 'ex-010413', label: 'MODE SETTING', writable: true, readOnlyReason: null,
    options: [{ value: '3', label: 'three' }, { value: '4', label: 'four' }] },
  { ...base, id: 'ex-030503', label: 'HF MAX POWER', writable: false,
    readOnlyReason: 'Region / TX limit' },
]

afterEach(() => vi.unstubAllGlobals())

describe('menu settings', () => {
  it('lists read-only items without an editor and sends writes with a request id', async () => {
    const bodies: unknown[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body)
      bodies.push(body)
      const payload = body.operation === 'menu_list' ? { menu } : { id: body.id, value: body.value ?? '3' }
      return new Response(JSON.stringify(payload), { status: 200 })
    }))
    const user = userEvent.setup()
    render(<RadioMenuSettings token="t" />)
    await user.click(screen.getByText('Cargar menú'))
    expect(await screen.findByText(/HF MAX POWER/)).toBeTruthy()
    expect(screen.queryByLabelText('ex-030503')).toBeNull()
    await user.selectOptions(screen.getByLabelText('ex-010413'), '4')
    await user.click(screen.getAllByText('Aplicar')[0])
    const write = bodies.find((body) => (body as { operation: string }).operation === 'menu_write')
    expect(write).toMatchObject({ id: 'ex-010413', value: '4' })
    expect((write as { request_id: string }).request_id).toBeTruthy()
  })
})
