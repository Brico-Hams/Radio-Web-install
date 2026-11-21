import { expect, it, vi } from 'vitest'

it('Workspace collects only fixed technical data and sends nothing before explicit approval', async () => {
  document.body.innerHTML = '<main><input id="radio-setting" value="kept"></main>'
  localStorage.setItem('radio.backup', 'private-codeplug')
  const fetchMock = vi.fn().mockResolvedValue(new Response('{"accepted":true}', { status: 202 }))
  vi.stubGlobal('fetch', fetchMock)
  await import('../../../../diagnostics-ui.mjs')
  if (!document.querySelector('section.panel')) document.dispatchEvent(new Event('DOMContentLoaded'))
  expect(document.querySelector('section.panel')).not.toBeNull()
  expect(fetchMock).not.toHaveBeenCalled()
  globalThis.RadioWorkspace.recordDiagnostic('usb', new Error('TOKEN EA5XYZ C:\\Users\\private'))
  const details = document.querySelector('details')
  details.dispatchEvent(new Event('toggle'))
  const preview = document.querySelector('pre').textContent
  for (const secret of ['TOKEN', 'EA5XYZ', 'private', 'Users']) expect(preview).not.toContain(secret)
  expect(JSON.parse(preview).events.at(-1).source).toBe('usb')
  const controls = [...document.querySelectorAll('button')]
  await controls.find(button => button.textContent.startsWith('Enviar una vez')).click()
  await vi.waitFor(() => expect(document.querySelector('[role="status"]').textContent).toContain('confirmado'))
  expect(fetchMock).toHaveBeenCalledOnce()
  controls.find(button => button.textContent.startsWith('Borrar registros')).click()
  await Promise.resolve()
  expect(localStorage.getItem('radio.backup')).toBe('private-codeplug')
  expect(localStorage.getItem('bricohams.diagnostics.workspace-web')).toBeNull()
  expect(document.getElementById('radio-setting').value).toBe('kept')
  vi.unstubAllGlobals()
})
