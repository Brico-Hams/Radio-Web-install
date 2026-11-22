import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => localStorage.removeItem('bricoham.language'))

describe('multilingual help and configuration', () => {
  it('localizes connection, agent/host configuration and offline help in all four languages', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    render(<App />)
    const languages = [
      ['es','Idioma','Ayuda','Configuración','Conecta con el coordinador','Configuración del host HTTPS','Descargar manual completo','Consola'],
      ['en','Language','Help','Configuration','Connect to the coordinator','HTTPS host configuration','Download complete manual','Console'],
      ['fr','Langue','Aide','Configuration','Connexion au coordinateur',"Configuration de l'hôte HTTPS",'Télécharger le manuel complet','Console'],
      ['pt','Idioma','Ajuda','Configuração','Ligar ao coordenador','Configuração do host HTTPS','Descarregar manual completo','Consola'],
    ]
    for (const [language, label, help, settings, connection, host, download, console] of languages) {
      fireEvent.change(screen.getByRole('combobox'), { target:{ value:language } })
      expect(document.documentElement.lang).toBe(language)
      expect(screen.getByLabelText(label)).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name:help }))
      expect(screen.getByRole('link', { name:download }).getAttribute('href')).toBe(`/help/${language}/manual.md`)
      fireEvent.click(screen.getByRole('button', { name:settings }))
      expect(screen.getByRole('heading', { name:host })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name:console }))
      expect(screen.getByRole('heading', { name:connection })).toBeTruthy()
    }
    expect(fetch).not.toHaveBeenCalled()
    expect(localStorage.getItem('bricoham.language')).toBe('pt')
  })
  it('prepares a safe local command without network I/O and clears it after edits', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name:'Configuración' }))
    fireEvent.click(screen.getAllByRole('button', { name:'Preparar comando local' })[0])
    expect(screen.getByRole('status').textContent).toBe('Comando preparado; no ejecutado.')
    expect(screen.getByText("py -3.12 'bricoham-station-agent.pyz' '--port' '8791'")).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Archivo del agente ZIPAPP'), { target:{ value:'other.pyz' } })
    expect(screen.queryByRole('status')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})
