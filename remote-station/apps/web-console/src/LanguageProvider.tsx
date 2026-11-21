import { useEffect, useState, type ReactNode } from 'react'
import { LanguageContext, languageNames, messages, useLanguage, type Language } from './i18n'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('bricoham.language')
      return saved === 'en' || saved === 'fr' || saved === 'pt' ? saved : 'es'
    } catch {
      console.warn('Language preference storage unavailable.')
      return 'es'
    }
  })
  useEffect(() => {
    document.documentElement.lang = language
    try { localStorage.setItem('bricoham.language', language) }
    catch { console.warn('Language preference could not be saved.') }
  }, [language])
  return <LanguageContext.Provider value={{ language, setLanguage, t: (key) => messages[language][key] }}>
    {children}
  </LanguageContext.Provider>
}

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage()
  return <label className="language-selector">{t('language')}
    <select value={language} onChange={(event) => {
      const value = event.target.value
      if (value === 'es' || value === 'en' || value === 'fr' || value === 'pt') setLanguage(value)
    }}>
      {Object.entries(languageNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
    </select>
  </label>
}
