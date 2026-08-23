/**
 * The resume page. One component renders every template -- they differ in
 * layout and CSS class, not in content -- so the preview and the exported PDF
 * can never diverge in what they include.
 */

import type { CSSProperties } from 'react'

import type { ResumeDocument, Section, SectionType } from '../types'
import { Contact, DocSection, Summary } from './parts'
import { FONT_STACKS, PHOTO_TEMPLATES } from './registry'

/** In the sidebar template these move into the rail; the rest stay in main. */
const RAIL_TYPES: ReadonlySet<SectionType> = new Set<SectionType>([
  'skills',
  'languages',
  'certifications',
])

interface Props {
  doc: ResumeDocument
  /** Set on the print route: hides editor-only placeholder text. */
  forExport?: boolean
}

export function ResumePage({ doc, forExport = false }: Props) {
  const { basics, sections, settings } = doc

  // Style knobs travel as custom properties so a settings change costs a
  // recalculation rather than a React re-render of the whole document.
  const style = {
    '--doc-font': FONT_STACKS[settings.fontFamily] ?? FONT_STACKS.Inter,
    '--doc-size': `${settings.fontSize}pt`,
    '--doc-leading': settings.lineHeight,
    '--doc-gap': settings.sectionSpacing,
    '--doc-accent': settings.accentColor,
  } as CSSProperties

  const showPhoto =
    settings.showPhoto && !!basics.photoUrl && PHOTO_TEMPLATES.has(settings.template)

  const rootProps = {
    className: `page tpl-${settings.template}`,
    style,
    'data-paper': settings.paperSize,
    'data-export': forExport ? 'true' : 'false',
  }

  const name = basics.fullName.trim() || 'Your Name'
  const headline = basics.headline.trim()

  if (settings.template === 'sidebar') {
    const rail = sections.filter((s) => RAIL_TYPES.has(s.type))
    const main = sections.filter((s) => !RAIL_TYPES.has(s.type))
    return (
      <div {...rootProps}>
        <aside className="doc-rail">
          {showPhoto && <img className="doc-photo" src={basics.photoUrl!} alt="" />}
          <section className="doc-section">
            <h2 className="doc-section-title">Contact</h2>
            <Contact basics={basics} stacked />
          </section>
          {rail.map((s) => (
            <DocSection key={s.id} section={s} tags />
          ))}
        </aside>
        <div className="doc-main">
          <header className="doc-header">
            <h1 className="doc-name">{name}</h1>
            {headline && <p className="doc-headline">{headline}</p>}
          </header>
          <Summary summary={basics.summary} />
          {main.map((s) => (
            <DocSection key={s.id} section={s} />
          ))}
        </div>
      </div>
    )
  }

  if (settings.template === 'banner') {
    return (
      <div {...rootProps}>
        <header className="doc-header">
          {showPhoto && <img className="doc-photo" src={basics.photoUrl!} alt="" />}
          <div>
            <h1 className="doc-name">{name}</h1>
            {headline && <p className="doc-headline">{headline}</p>}
            <Contact basics={basics} />
          </div>
        </header>
        <div className="doc-body">
          <Summary summary={basics.summary} />
          {sections.map((s: Section) => (
            <DocSection key={s.id} section={s} />
          ))}
        </div>
      </div>
    )
  }

  // ATS-safe family: one column, heading then sections, nothing to reorder.
  return (
    <div {...rootProps}>
      <header className="doc-header">
        <h1 className="doc-name">{name}</h1>
        {headline && <p className="doc-headline">{headline}</p>}
        <Contact basics={basics} />
      </header>
      <Summary summary={basics.summary} />
      {sections.map((s: Section) => (
        <DocSection key={s.id} section={s} />
      ))}
    </div>
  )
}
