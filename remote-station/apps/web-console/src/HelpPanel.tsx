import content from './help-content.json'
import { useLanguage } from './i18n'

export function HelpPanel() {
  const { language, t } = useLanguage()
  const book = content[language]
  return <section className="content-card help-panel" aria-labelledby="help-title">
    <h2 id="help-title">{book.title}</h2>
    <p>{book.intro}</p>
    <a className="button button-secondary" download={`bricoham-${language}.md`}
      href={`${import.meta.env.BASE_URL}help/${language}/manual.md`}>{t('downloadHelp')}</a>
    <nav aria-label={t('help')} className="help-toc">
      {book.sections.map((section) => <a key={section.id} href={`#help-${section.id}`}>{section.title}</a>)}
    </nav>
    {book.sections.map((section) => <article id={`help-${section.id}`} key={section.id}>
      <h3>{section.title}</h3>
      {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      <ol>{section.steps.map((step) => <li key={step}>{step}</li>)}</ol>
    </article>)}
    <p className="form-hint">{t('technicalLanguage')}</p>
  </section>
}
