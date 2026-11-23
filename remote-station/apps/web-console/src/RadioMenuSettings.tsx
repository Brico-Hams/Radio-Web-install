import { useMemo, useState } from 'react'
import { createControlRequest, isRecord } from './api'
import { useLanguage } from './i18n'

export type MenuSetting = {
  id: string
  label: string
  group: string
  type: string
  read: string
  writable: boolean
  readOnlyReason: string | null
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  step?: number
}

type MenuList = { menu: MenuSetting[] }

export function isMenuList(value: unknown): value is MenuList {
  return isRecord(value) && Array.isArray(value.menu) && value.menu.every(
    (item) => isRecord(item) && typeof item.id === 'string' && typeof item.label === 'string' &&
      typeof item.writable === 'boolean')
}

function isMenuValue(value: unknown): value is { id: string; value: string | null } {
  return isRecord(value) && typeof value.id === 'string' &&
    (value.value === null || typeof value.value === 'string')
}

const MAX_ROWS = 60

export function RadioMenuSettings({ token }: { token: string }) {
  const { t } = useLanguage()
  const send = useMemo(() => createControlRequest(token), [token])
  const [items, setItems] = useState<MenuSetting[]>([])
  const [filter, setFilter] = useState('')
  const [values, setValues] = useState<Record<string, string | null>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run<T>(body: object, validate: (value: unknown) => value is T): Promise<T | null> {
    setBusy(true)
    setError('')
    try {
      return await send('/radio-settings', body, validate)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('radioCatError'))
      return null
    } finally {
      setBusy(false)
    }
  }

  async function load() {
    const list = await run({ operation: 'menu_list' }, isMenuList)
    if (list) setItems(list.menu)
  }

  async function read(id: string) {
    const result = await run({ operation: 'menu_read', id }, isMenuValue)
    if (result) setValues((current) => ({ ...current, [id]: result.value }))
  }

  async function write(id: string) {
    const result = await run(
      { operation: 'menu_write', id, value: drafts[id], request_id: crypto.randomUUID() }, isMenuValue)
    if (result) setValues((current) => ({ ...current, [id]: result.value }))
  }

  const shown = items.filter((item) => item.label.toLowerCase().includes(filter.toLowerCase()))
    .slice(0, MAX_ROWS)
  return (
    <section className="content-card operation-panel" aria-labelledby="radio-menu-title">
      <h2 id="radio-menu-title">{t('menuTitle')}</h2>
      <p>{t('menuWarning')}</p>
      <div className="session-actions">
        <button className="button button-secondary" disabled={busy}
          onClick={() => void load()}>{t('menuLoad')}</button>
        <input aria-label="filter" value={filter} onChange={(event) => setFilter(event.target.value)} />
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <ul>
        {shown.map((item) => (
          <li key={item.id}>
            <strong>{item.label}</strong> ({item.id}) {item.writable ? null :
              <em>{t('menuReadOnly')}{item.readOnlyReason ? `: ${item.readOnlyReason}` : ''}</em>}
            {' '}
            {item.id in values ? (values[item.id] ?? t('menuUnavailable')) : null}
            <button className="button button-secondary" disabled={busy}
              onClick={() => void read(item.id)}>{t('menuRead')}</button>
            {item.writable ? <>
              {item.options ? (
                <select aria-label={item.id} value={drafts[item.id] ?? ''}
                  onChange={(event) => setDrafts({ ...drafts, [item.id]: event.target.value })}>
                  <option value="" />
                  {item.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>))}
                </select>
              ) : (
                <input aria-label={item.id} type="number" min={item.min} max={item.max} step={item.step}
                  value={drafts[item.id] ?? ''}
                  onChange={(event) => setDrafts({ ...drafts, [item.id]: event.target.value })} />
              )}
              <button className="button button-secondary" disabled={busy || !drafts[item.id]}
                onClick={() => void write(item.id)}>{t('menuApply')}</button>
            </> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
