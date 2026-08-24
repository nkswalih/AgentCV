/**
 * The resume page. One component renders every template -- they differ in
 * composition (columns, bands, spines, photo mastheads) rather than only in
 * CSS -- so the preview and the exported PDF can never diverge in content.
 * The document is the data; the template decides how it stands on the page.
 */

import type { CSSProperties } from 'react'

import type { ResumeDocument, Section, SectionType, TemplateId } from '../types'
import { Contact, DocSection, hasContact } from './parts'
import { FONT_STACKS, PHOTO_TEMPLATES } from './registry'

/** Sections that live in the Sidebar template's left rail. */
const SIDEBAR_RAIL: ReadonlySet<SectionType> = new Set([
  'skills',
  'languages',
  'certifications',
])

/** Sections that move into the Two Column template's right rail -- contact
    joins them there. Summary stays with the story in the main column. */
const TWOCOL_RAIL: ReadonlySet<SectionType> = new Set([
  'skills',
  'languages',
  'certifications',
])

/** Sections in the Professional (portal-pro) left rail: contact + skills
    + languages carry the identity; the story lives in the main column. */
const PORTAL_RAIL: ReadonlySet<SectionType> = new Set([
  'skills',
  'languages',
])

/** Sections in the Modern Deep left rail: profile, languages and awards
    ride the dark sidebar; experience, education, skills stay main. */
const MODERN_DEEP_RAIL: ReadonlySet<SectionType> = new Set([
  'summary',
  'languages',
  'custom',
])

/** Technical reading order: proof of skill before the chronology. */
const DEVTECH_ORDER: SectionType[] = [
  'summary',
  'skills',
  'projects',
  'experience',
  'education',
  'certifications',
  'languages',
  'custom',
]

/** Academic reading order: the degree record leads. */
const ACADEMIC_ORDER: SectionType[] = [
  'education',
  'experience',
  'projects',
  'certifications',
  'skills',
  'languages',
  'custom',
  'summary',
]

/** Serif Classic reading order: skills prove the summary early. */
const SERIF_ATS_ORDER: SectionType[] = [
  'summary',
  'skills',
  'experience',
  'projects',
  'education',
  'certifications',
  'languages',
  'custom',
]

/** Jake's reading order: the degree record leads, skills close. */
const JAKE_ORDER: SectionType[] = [
  'education',
  'experience',
  'projects',
  'certifications',
  'skills',
  'summary',
  'languages',
  'custom',
]

/** Entries that ride the ruled date spine instead of carrying head dates. */
const SPINE_TYPES: ReadonlySet<SectionType> = new Set([
  'experience',
  'education',
  'projects',
  'custom',
])

function orderFor(template: TemplateId): SectionType[] | null {
  if (template === 'devtech') return DEVTECH_ORDER
  if (template === 'academic') return ACADEMIC_ORDER
  if (template === 'serif-ats') return SERIF_ATS_ORDER
  if (template === 'jake') return JAKE_ORDER
  return null
}

interface Props {
  doc: ResumeDocument
  /** Set on the print route: hides editor-only placeholder text. */
  forExport?: boolean
}

export function ResumePage({ doc, forExport = false }: Props) {
  const { basics, sections, settings } = doc
  const template = settings.template

  // Style knobs travel as custom properties so a settings change costs a
  // recalculation rather than a React re-render of the whole document. Element
  // size overrides are omitted when null, letting each template's own default
  // (which differs per template) apply through the var() fallback.
  const style = {
    '--doc-font': FONT_STACKS[settings.fontFamily] ?? FONT_STACKS.Inter,
    '--doc-size': `${settings.fontSize}pt`,
    '--doc-leading': settings.lineHeight,
    '--doc-gap': settings.sectionSpacing,
    '--doc-margin-x': `${settings.marginX}mm`,
    '--doc-margin-y': `${settings.marginY}mm`,
    '--doc-accent': settings.accentColor,
    '--doc-col-width': `${settings.columnWidth ?? 40}%`,
    ...(settings.nameSize != null && { '--doc-name-size': `${settings.nameSize}pt` }),
    ...(settings.titleSize != null && { '--doc-title-size': `${settings.titleSize}pt` }),
    ...(settings.headingSize != null && { '--doc-heading-size': `${settings.headingSize}pt` }),
    ...(settings.entrySize != null && { '--doc-entry-size': `${settings.entrySize}pt` }),
  } as CSSProperties

  const showPhoto =
    settings.showPhoto && !!basics.photoUrl && PHOTO_TEMPLATES.has(template)

  // Sidebar templates keep their tpl-* class in all layout modes so their
  // template-specific styling (colors, fonts, typography) is preserved.
  // CSS rules use [data-columns="one"] to override the grid layout.
  const rootProps = {
    className: `page tpl-${template}`,
    style,
    'data-paper': settings.paperSize,
    'data-export': forExport ? 'true' : 'false',
    'data-columns': settings.columnLayout,
    'data-header': settings.headerPosition,
  }

  // Nothing is invented for the page: an empty field simply does not render.
  const name = basics.fullName.trim()
  const headline = basics.headline.trim()

  // Sections reordered by the template's own reading logic (Technical,
  // Academic); everything else keeps the author's order untouched.
  const order = orderFor(template)
  const ordered = order
    ? [...sections].sort(
        (a, b) => order.indexOf(a.type) - order.indexOf(b.type),
      )
    : sections

  // -- Layout column resolution (shared by all templates) ------------------
  const isTwoCol = settings.columnLayout === 'two'
  const headerPos = settings.headerPosition ?? 'top'
  const leftIds = settings.leftColumn ?? []
  const rightIds = settings.rightColumn ?? []
  const colW = settings.columnWidth ?? 40

  function resolveCol(ids: string[]): Section[] {
    return ids
      .map((id) => sections.find((s) => s.id === id))
      .filter((s): s is Section => s != null)
  }

  const leftSections = resolveCol(leftIds)
  const rightSections = resolveCol(rightIds)
  const assignedIds = new Set([...leftIds, ...rightIds])
  const unassigned = ordered.filter((s) => !assignedIds.has(s.id))

  /* -- Professional (portal-pro): dark left rail with identity, story right */
  if (template === 'portal-pro') {
    const rail = leftSections.length > 0 ? leftSections : sections.filter((s) => PORTAL_RAIL.has(s.type))
    const main = rightSections.length > 0 ? rightSections : sections.filter((s) => !PORTAL_RAIL.has(s.type))

    const railContent = (
      <>
        {name && <h1 className="doc-name">{name}</h1>}
        {headline && <p className="doc-headline">{headline}</p>}
        {showPhoto && <img className="doc-photo" src={basics.photoUrl!} alt="" />}
        {hasContact(basics) && (
          <Contact basics={basics} stacked icons={settings.showIcons} />
        )}
        {rail.map((s) => (
          <DocSection key={s.id} section={s} tags />
        ))}
      </>
    )
    const mainContent = main.map((s) => (
      <DocSection key={s.id} section={s} />
    ))

    if (!isTwoCol) {
      // One-column: full-width dark header band with identity, sections below
      return (
        <div {...rootProps}>
          <aside className="doc-rail doc-rail-top">
            {showPhoto && <img className="doc-photo" src={basics.photoUrl!} alt="" />}
            <div className="doc-rail-top-text">
              {name && <h1 className="doc-name">{name}</h1>}
              {headline && <p className="doc-headline">{headline}</p>}
              {hasContact(basics) && (
                <Contact basics={basics} icons={settings.showIcons} />
              )}
            </div>
          </aside>
          <div className="doc-main">
            {ordered.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      )
    }

    if (headerPos === 'left') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: `${colW}% 1fr` }}>
          <aside className="doc-rail">{railContent}</aside>
          <div className="doc-main">{mainContent}</div>
        </div>
      )
    }
    if (headerPos === 'right') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: `1fr ${colW}%` }}>
          <div className="doc-main">{mainContent}</div>
          <aside className="doc-rail">{railContent}</aside>
        </div>
      )
    }
    // headerPos === 'top': full-width dark header, two-column content below
    return (
      <div {...rootProps}>
        <aside className="doc-rail doc-rail-top">
          {showPhoto && <img className="doc-photo" src={basics.photoUrl!} alt="" />}
          <div className="doc-rail-top-text">
            {name && <h1 className="doc-name">{name}</h1>}
            {headline && <p className="doc-headline">{headline}</p>}
            {hasContact(basics) && (
              <Contact basics={basics} icons={settings.showIcons} />
            )}
          </div>
        </aside>
        <div className="doc-columns" style={{ display: 'grid', gridTemplateColumns: `${colW}% 1fr` }}>
          <div className="doc-col doc-col-left">
            {rail.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
          <div className="doc-col doc-col-right">
            {main.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* -- Modern Deep: dark left rail with profile, dot-scale languages ------- */
  if (template === 'modern-deep') {
    const rail = leftSections.length > 0 ? leftSections : sections.filter((s) => MODERN_DEEP_RAIL.has(s.type))
    const main = rightSections.length > 0 ? rightSections : sections.filter((s) => !MODERN_DEEP_RAIL.has(s.type))

    const railContent = (
      <>
        {name && <h1 className="doc-name">{name}</h1>}
        {headline && <p className="doc-headline">{headline}</p>}
        {showPhoto && <img className="doc-photo" src={basics.photoUrl!} alt="" />}
        {hasContact(basics) && (
          <Contact basics={basics} stacked icons={settings.showIcons} />
        )}
        {rail.map((s) => (
          <DocSection key={s.id} section={s} tags />
        ))}
      </>
    )
    const mainContent = main.map((s) => (
      <DocSection key={s.id} section={s} />
    ))

    if (!isTwoCol) {
      // One-column: full-width dark header band with identity, sections below
      return (
        <div {...rootProps}>
          <aside className="doc-rail doc-rail-top">
            {showPhoto && <img className="doc-photo" src={basics.photoUrl!} alt="" />}
            <div className="doc-rail-top-text">
              {name && <h1 className="doc-name">{name}</h1>}
              {headline && <p className="doc-headline">{headline}</p>}
              {hasContact(basics) && (
                <Contact basics={basics} icons={settings.showIcons} />
              )}
            </div>
          </aside>
          <div className="doc-main">
            {ordered.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      )
    }

    if (headerPos === 'left') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: `${colW}% 1fr` }}>
          <aside className="doc-rail">{railContent}</aside>
          <div className="doc-main">{mainContent}</div>
        </div>
      )
    }
    if (headerPos === 'right') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: `1fr ${colW}%` }}>
          <div className="doc-main">{mainContent}</div>
          <aside className="doc-rail">{railContent}</aside>
        </div>
      )
    }
    // headerPos === 'top': full-width dark header, two-column content below
    return (
      <div {...rootProps}>
        <aside className="doc-rail doc-rail-top">
          {showPhoto && <img className="doc-photo" src={basics.photoUrl!} alt="" />}
          <div className="doc-rail-top-text">
            {name && <h1 className="doc-name">{name}</h1>}
            {headline && <p className="doc-headline">{headline}</p>}
            {hasContact(basics) && (
              <Contact basics={basics} icons={settings.showIcons} />
            )}
          </div>
        </aside>
        <div className="doc-columns" style={{ display: 'grid', gridTemplateColumns: `${colW}% 1fr` }}>
          <div className="doc-col doc-col-left">
            {rail.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
          <div className="doc-col doc-col-right">
            {main.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* -- Left sidebar: tinted rail, story on the right --------------------- */
  if (template === 'sidebar') {
    const rail = leftSections.length > 0 ? leftSections : sections.filter((s) => SIDEBAR_RAIL.has(s.type))
    const main = rightSections.length > 0 ? rightSections : sections.filter((s) => !SIDEBAR_RAIL.has(s.type))

    const sidebarHeader = (
      <header className="doc-header">
        <div className="doc-header-text">
          {name && <h1 className="doc-name">{name}</h1>}
          {headline && <p className="doc-headline">{headline}</p>}
        </div>
        {showPhoto && <img className="doc-photo" src={basics.photoUrl!} alt="" />}
      </header>
    )

    if (!isTwoCol) {
      // One-column: full-width dark header band with identity, sections below
      return (
        <div {...rootProps}>
          <aside className="doc-rail doc-rail-top">
            {showPhoto && <img className="doc-photo" src={basics.photoUrl!} alt="" />}
            <div className="doc-rail-top-text">
              {name && <h1 className="doc-name">{name}</h1>}
              {headline && <p className="doc-headline">{headline}</p>}
              {hasContact(basics) && (
                <Contact basics={basics} icons={settings.showIcons} />
              )}
            </div>
          </aside>
          <div className="doc-main">
            {ordered.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      )
    }

    if (headerPos === 'left') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: `${colW}% 1fr` }}>
          <aside className="doc-rail">
            {sidebarHeader}
            {hasContact(basics) && (
              <section className="doc-section">
                <h2 className="doc-section-title">Contact</h2>
                <Contact basics={basics} stacked icons={settings.showIcons} />
              </section>
            )}
            {rail.map((s) => (
              <DocSection key={s.id} section={s} tags />
            ))}
          </aside>
          <div className="doc-main">
            {main.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      )
    }
    if (headerPos === 'right') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: `1fr ${colW}%` }}>
          <div className="doc-main">
            {main.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
          <aside className="doc-rail">
            {sidebarHeader}
            {hasContact(basics) && (
              <section className="doc-section">
                <h2 className="doc-section-title">Contact</h2>
                <Contact basics={basics} stacked icons={settings.showIcons} />
              </section>
            )}
            {rail.map((s) => (
              <DocSection key={s.id} section={s} tags />
            ))}
          </aside>
        </div>
      )
    }
    // headerPos === 'top': full-width dark header, two-column content below
    return (
      <div {...rootProps}>
        <aside className="doc-rail doc-rail-top">
          {showPhoto && <img className="doc-photo" src={basics.photoUrl!} alt="" />}
          <div className="doc-rail-top-text">
            {name && <h1 className="doc-name">{name}</h1>}
            {headline && <p className="doc-headline">{headline}</p>}
            {hasContact(basics) && (
              <Contact basics={basics} icons={settings.showIcons} />
            )}
          </div>
        </aside>
        <div className="doc-columns" style={{ display: 'grid', gridTemplateColumns: `${colW}% 1fr` }}>
          <div className="doc-col doc-col-left">
            {rail.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
          <div className="doc-col doc-col-right">
            {main.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* -- Two Column: wide story column, narrow rail on the RIGHT ----------- */
  if (template === 'two-col') {
    const rail = rightSections.length > 0 ? rightSections : sections.filter((s) => TWOCOL_RAIL.has(s.type))
    const main = leftSections.length > 0 ? leftSections : sections.filter((s) => !TWOCOL_RAIL.has(s.type))

    const twoColHeader = (
      <header className="doc-header">
        {name && <h1 className="doc-name">{name}</h1>}
        {headline && <p className="doc-headline">{headline}</p>}
      </header>
    )

    if (!isTwoCol) {
      // One-column: full-width header with border, sections below
      return (
        <div {...rootProps}>
          <header className="doc-header doc-header-top">
            {showPhoto && <img className="doc-photo" src={basics.photoUrl!} alt="" />}
            <div className="doc-rail-top-text">
              {name && <h1 className="doc-name">{name}</h1>}
              {headline && <p className="doc-headline">{headline}</p>}
              {hasContact(basics) && (
                <Contact basics={basics} icons={settings.showIcons} />
              )}
            </div>
          </header>
          <div className="doc-main">
            {ordered.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      )
    }

    if (headerPos === 'left') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: `${colW}% 1fr` }}>
          <div className="doc-main">
            {twoColHeader}
            {main.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
          <aside className="doc-rail">
            {hasContact(basics) && (
              <section className="doc-section">
                <h2 className="doc-section-title">Contact</h2>
                <Contact basics={basics} stacked icons={settings.showIcons} />
              </section>
            )}
            {rail.map((s) => (
              <DocSection key={s.id} section={s} tags />
            ))}
          </aside>
        </div>
      )
    }
    if (headerPos === 'right') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: `1fr ${colW}%` }}>
          <aside className="doc-rail">
            {hasContact(basics) && (
              <section className="doc-section">
                <h2 className="doc-section-title">Contact</h2>
                <Contact basics={basics} stacked icons={settings.showIcons} />
              </section>
            )}
            {rail.map((s) => (
              <DocSection key={s.id} section={s} tags />
            ))}
          </aside>
          <div className="doc-main">
            {twoColHeader}
            {main.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      )
    }
    // headerPos === 'top': full-width header with border, two-column content below
    return (
      <div {...rootProps}>
        <header className="doc-header doc-header-top">
          {showPhoto && <img className="doc-photo" src={basics.photoUrl!} alt="" />}
          <div className="doc-rail-top-text">
            {name && <h1 className="doc-name">{name}</h1>}
            {headline && <p className="doc-headline">{headline}</p>}
            {hasContact(basics) && (
              <Contact basics={basics} icons={settings.showIcons} />
            )}
          </div>
        </header>
        <div className="doc-columns" style={{ display: 'grid', gridTemplateColumns: `${colW}% 1fr` }}>
          <div className="doc-col doc-col-left">
            {main.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
          <div className="doc-col doc-col-right">
            {rail.map((s) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* -- Creative: identity lives in a deep band; body stays disciplined --- */
  if (template === 'creative') {
    const bandHeader = (
      <header className="doc-band">
        {showPhoto && <img className="doc-photo" src={basics.photoUrl!} alt="" />}
        <div>
          {name && <h1 className="doc-name">{name}</h1>}
          {headline && <p className="doc-headline">{headline}</p>}
          <Contact basics={basics} icons={settings.showIcons} />
        </div>
      </header>
    )

    if (headerPos === 'left') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: `${colW}% 1fr` }}>
          <div className="doc-col doc-col-left">
            {bandHeader}
            {[...leftSections, ...unassigned].map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
          <div className="doc-col doc-col-right">
            {rightSections.map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      )
    }
    if (headerPos === 'right') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: `1fr ${colW}%` }}>
          <div className="doc-col doc-col-left">
            {[...leftSections, ...unassigned].map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
          <div className="doc-col doc-col-right">
            {bandHeader}
            {rightSections.map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      )
    }
    return (
      <div {...rootProps}>
        {bandHeader}
        {isTwoCol ? (
          <div className="doc-columns" style={{ display: 'grid', gridTemplateColumns: `${colW}% 1fr` }}>
            <div className="doc-col doc-col-left">
              {[...leftSections, ...unassigned].map((s: Section) => (
                <DocSection key={s.id} section={s} />
              ))}
            </div>
            <div className="doc-col doc-col-right">
              {rightSections.map((s: Section) => (
                <DocSection key={s.id} section={s} />
              ))}
            </div>
          </div>
        ) : (
          <div className="doc-body">
            {ordered.map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        )}
      </div>
    )
  }

  /* -- Photo Pro: portrait set INTO the masthead ------------------------- */
  if (template === 'photo-pro') {
    const photoHeader = (
      <header className={`doc-photohead${showPhoto ? '' : ' no-photo'}`}>
        {showPhoto && <img className="doc-portrait" src={basics.photoUrl!} alt="" />}
        <div>
          {name && <h1 className="doc-name">{name}</h1>}
          {headline && <p className="doc-headline">{headline}</p>}
          <Contact basics={basics} icons={settings.showIcons} />
        </div>
      </header>
    )

    if (headerPos === 'left') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: `${colW}% 1fr` }}>
          <div className="doc-col doc-col-left">
            {photoHeader}
            {[...leftSections, ...unassigned].map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
          <div className="doc-col doc-col-right">
            {rightSections.map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      )
    }
    if (headerPos === 'right') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: `1fr ${colW}%` }}>
          <div className="doc-col doc-col-left">
            {[...leftSections, ...unassigned].map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
          <div className="doc-col doc-col-right">
            {photoHeader}
            {rightSections.map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      )
    }
    return (
      <div {...rootProps}>
        {photoHeader}
        {isTwoCol ? (
          <div className="doc-columns">
            <div className="doc-col doc-col-left">
              {[...leftSections, ...unassigned].map((s: Section) => (
                <DocSection key={s.id} section={s} />
              ))}
            </div>
            <div className="doc-col doc-col-right">
              {rightSections.map((s: Section) => (
                <DocSection key={s.id} section={s} />
              ))}
            </div>
          </div>
        ) : (
          <div className="doc-body">
            {ordered.map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        )}
      </div>
    )
  }

  /* -- Editorial: split masthead -- identity left, reach right ----------- */
  if (template === 'editorial' && hasContact(basics)) {
    const edHeader = (
      <header className="doc-masthead">
        <div>
          {name && <h1 className="doc-name">{name}</h1>}
          {headline && <p className="doc-headline">{headline}</p>}
        </div>
        <Contact basics={basics} stacked icons={settings.showIcons} />
      </header>
    )

    if (headerPos === 'left') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: `${colW}% 1fr` }}>
          <div className="doc-col doc-col-left">
            {edHeader}
            {[...leftSections, ...unassigned].map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
          <div className="doc-col doc-col-right">
            {rightSections.map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      )
    }
    if (headerPos === 'right') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: `1fr ${colW}%` }}>
          <div className="doc-col doc-col-left">
            {[...leftSections, ...unassigned].map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
          <div className="doc-col doc-col-right">
            {edHeader}
            {rightSections.map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        </div>
      )
    }
    return (
      <div {...rootProps}>
        {edHeader}
        {isTwoCol ? (
          <div className="doc-columns">
            <div className="doc-col doc-col-left">
              {[...leftSections, ...unassigned].map((s: Section) => (
                <DocSection key={s.id} section={s} />
              ))}
            </div>
            <div className="doc-col doc-col-right">
              {rightSections.map((s: Section) => (
                <DocSection key={s.id} section={s} />
              ))}
            </div>
          </div>
        ) : (
          <div className="doc-body">
            {ordered.map((s: Section) => (
              <DocSection key={s.id} section={s} />
            ))}
          </div>
        )}
      </div>
    )
  }

  /* -- Timeline: dates run down a ruled spine beside each entry ---------- */
  const spine = template === 'timeline'
  // Technical and Timeline share the split header architecture: who you are on
  // the left, how to reach you on the right. Technical stacks its contact into
  // a column; Timeline keeps it on one wrapped line under the rule.
  const splitHeader = template === 'devtech' || spine

  // ATS-safe family and remaining designs: one column, heading then sections.

  const headerEl = (
    <header className={`doc-header${splitHeader ? ' doc-header-split' : ''}`}>
      <div className="doc-header-text">
        {name && <h1 className="doc-name">{name}</h1>}
        {headline && <p className="doc-headline">{headline}</p>}
      </div>
      {splitHeader ? (
        <div className="doc-header-side">
          <Contact basics={basics} stacked={template === 'devtech'} icons={settings.showIcons} />
        </div>
      ) : (
        <Contact basics={basics} icons={settings.showIcons} />
      )}
    </header>
  )

  /** Render a list of sections into DocSection components. */
  function renderSections(sections: Section[]) {
    return sections.map((s: Section) => (
      <DocSection
        key={s.id}
        section={s}
        timeline={spine && SPINE_TYPES.has(s.type)}
      />
    ))
  }

  // -- Two-column mode: always exactly two regions -----------------------
  if (isTwoCol) {
    const gridCols = `${colW}% 1fr`

    // Header Left: header inside left column, right column has right sections
    if (headerPos === 'left') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: gridCols }}>
          <div className="doc-col doc-col-left">
            {headerEl}
            {renderSections([...leftSections, ...unassigned])}
          </div>
          <div className="doc-col doc-col-right">
            {renderSections(rightSections)}
          </div>
        </div>
      )
    }

    // Header Right: left column has left sections, header inside right column
    if (headerPos === 'right') {
      return (
        <div {...rootProps} style={{ ...style, display: 'grid', gridTemplateColumns: gridCols }}>
          <div className="doc-col doc-col-left">
            {renderSections([...leftSections, ...unassigned])}
          </div>
          <div className="doc-col doc-col-right">
            {headerEl}
            {renderSections(rightSections)}
          </div>
        </div>
      )
    }

    // Header Top: header full width, then two content columns
    return (
      <div {...rootProps}>
        {headerEl}
        <div className="doc-columns">
          <div className="doc-col doc-col-left">
            {renderSections([...leftSections, ...unassigned])}
          </div>
          <div className="doc-col doc-col-right">
            {renderSections(rightSections)}
          </div>
        </div>
      </div>
    )
  }

  // -- One-column mode: header position with single content flow --------
  if (headerPos === 'left') {
    return (
      <div {...rootProps}>
        {headerEl}
        <div className="doc-body">
          {renderSections(ordered)}
        </div>
      </div>
    )
  }

  if (headerPos === 'right') {
    return (
      <div {...rootProps}>
        <div className="doc-body">
          {renderSections(ordered)}
        </div>
        {headerEl}
      </div>
    )
  }

  // Header Top (default): header full width, single content below
  return (
    <div {...rootProps}>
      {headerEl}
      <div className="doc-body">
        {renderSections(ordered)}
      </div>
    </div>
  )
}
