/**
 * The resume page. One component renders every template -- they differ in
 * composition (columns, bands, spines, photo mastheads) rather than only in
 * CSS -- so the preview and the exported PDF can never diverge in content.
 * The document is the data; the template decides how it stands on the page.
 */

import type { CSSProperties } from 'react'

import type { ResumeDocument, Section, SectionType, TemplateId } from '../types'
import { Contact, DocSection, hasContact, ProfilePhoto } from './parts'
import { FONT_STACKS, HEADER_PRESETS } from './registry'

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

/** White on a dark header band, near-black on a pale one. */
function readableInk(background: string | undefined): string {
  const m = /^#([0-9a-f]{6})$/i.exec(background ?? '')
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111827' : '#ffffff'
}

interface Props {
  doc: ResumeDocument
  /** Set on the print route: hides editor-only placeholder text. */
  forExport?: boolean
  /** One-page fit factor from useFitToPage. 1 (or omitted) leaves the document
      at its natural size. */
  fit?: number
}

export function ResumePage({ doc, forExport = false, fit }: Props) {
  const { basics, sections, settings } = doc
  const template = settings.template
  const fitted = fit != null && fit < 0.999

  // Photo layout — fully independent of column/header layout.
  const pl = settings.photoLayout ?? {
    show: true,
    grayscale: false,
    position: 'left' as const,
    size: 24,
    shape: 'circle' as const,
    focusX: 50,
    focusY: 50,
    zoom: 1,
  }
  const showPhoto = pl.show && !!basics.photoUrl

  // Colors card. Undefined fields mean "template default": nothing is emitted
  // and every design keeps its own look until a colour is chosen.
  const colors = settings.colors

  // Section heading style controls.
  const hs = settings.headingStyle ?? { visual: 'underline', capitalization: 'uppercase', showIcons: true, iconStyle: 'filled' }

  // Full Page treatment. Single changes ink only; Multi repaints the sheet and
  // supplies its own body ink; Image covers the sheet, tints it, and turns every
  // ink white so the text survives any photograph.
  const imageMode = colors?.bgType === 'image' && !!colors.bgImage

  // Header treatment. Single and Multi paint only the identity band (or the
  // side column that holds it); Image covers that band alone and leaves the
  // body on the template's own paper.
  const headerType = colors?.headerType ?? 'single'
  const headerPreset =
    HEADER_PRESETS.find((p) => p.id === (colors?.headerPresetId ?? 'slate')) ?? HEADER_PRESETS[0]
  const headerSingleActive =
    headerType === 'single' &&
    (colors?.headerSingleId ?? 'none') !== 'none' &&
    !!colors?.headerBackgroundColor
  const headerMultiActive = headerType === 'multi'
  const headerImageActive = headerType === 'image' && !!colors?.headerBgImage
  const headerPaint = headerSingleActive || headerMultiActive || headerImageActive
  const headerBg =
    colors?.headerBackgroundColor ?? (headerMultiActive ? headerPreset.background : undefined)
  const headerText = headerImageActive
    ? '#ffffff'
    : colors?.headerTextColor ??
      (headerMultiActive ? headerPreset.text : readableInk(headerBg))
  const headerAccent =
    headerType === 'image'
      ? undefined
      : colors?.headerAccentColor ?? (headerMultiActive ? headerPreset.accent : undefined)
  const headerPageAccent =
    headerMultiActive && colors?.headerPresetId === 'custom'
      ? colors?.headerPageAccentColor
      : undefined
  const headerTint = colors?.headerBgImageTint ?? 0.38
  // Only a real page fill or ink repaints the sheet. An accent on its own just
  // recolours headings and must not reset the template's body ink.
  const headerPagePaint =
    headerMultiActive &&
    colors?.headerPresetId === 'custom' &&
    !!(colors?.headerPageBackgroundColor || colors?.headerPageTextColor)
  const headerSide =
    settings.columnLayout === 'two' && (settings.headerPosition ?? 'top') !== 'top'
      ? settings.headerPosition ?? 'top'
      : 'full'

  const docAccent = imageMode
    ? '#ffffff'
    : headerPageAccent ?? headerAccent ?? settings.accentColor

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
    '--doc-accent': docAccent,
    '--doc-col-width': `${settings.columnWidth ?? 40}%`,
    '--doc-photo-size': `${pl.size}mm`,
    ...(settings.nameSize != null && { '--doc-name-size': `${settings.nameSize}pt` }),
    ...(settings.titleSize != null && { '--doc-title-size': `${settings.titleSize}pt` }),
    ...(settings.headingSize != null && { '--doc-heading-size': `${settings.headingSize}pt` }),
    ...(settings.entrySize != null && { '--doc-entry-size': `${settings.entrySize}pt` }),
    ...(settings.contactSize != null && { '--doc-contact-size': `${settings.contactSize}pt` }),
    ...(colors?.bgType === 'multi' && {
      '--doc-page-bg': colors.backgroundColor ?? '#f8fafc',
      '--doc-text-color': colors.textColor ?? '#0f172a',
    }),
    ...(imageMode && colors && {
      '--doc-text-color': '#ffffff',
      '--doc-border-color': 'rgba(255, 255, 255, 0.5)',
      '--doc-bg-image': `url(${JSON.stringify(colors.bgImage)})`,
      '--doc-img-tint': String(colors.bgImageTint ?? 0.38),
    }),
    ...(headerPaint && {
      '--doc-header-bg': headerBg,
      '--doc-header-text': headerText,
      ...(headerAccent && { '--doc-header-accent': headerAccent }),
    }),
    ...(headerImageActive && colors && {
      '--doc-header-image': `url(${JSON.stringify(colors.headerBgImage)})`,
      '--doc-header-tint': String(headerTint),
    }),
    ...(headerPagePaint && colors && {
      '--doc-header-page-bg': colors.headerPageBackgroundColor ?? 'transparent',
      '--doc-header-page-text': colors.headerPageTextColor ?? '#0f172a',
    }),
    ...(fitted && { '--doc-fit': fit }),
  } as CSSProperties

  // Sidebar templates keep their tpl-* class in all layout modes so their
  // template-specific styling (colors, fonts, typography) is preserved.
  // CSS rules use [data-columns="one"] to override the grid layout.
  const rootProps = {
    className: `page tpl-${template}`,
    style,
    'data-paper': settings.paperSize,
    'data-export': forExport ? 'true' : 'false',
    ...(fitted && { 'data-fit': 'on' }),
    'data-columns': settings.columnLayout,
    'data-header': settings.headerPosition,
    'data-photo-position': pl.position,
    'data-photo-size': pl.size,
    'data-photo-shape': pl.shape,
    ...(pl.grayscale && { 'data-photo-grayscale': 'true' }),
    'data-heading-visual': hs.visual,
    'data-heading-cap': hs.capitalization,
    ...(hs.showIcons && { 'data-heading-icons': 'true' }),
    ...(hs.showIcons && { 'data-heading-icon-style': hs.iconStyle }),
    ...(colors && {
      'data-colors': 'on',
      'data-bg': colors.bgType,
      // Accent switches: "on" is the default reading, so the attribute simply
      // mirrors each flag and CSS keys off the pair.
      'data-accent-name': String(colors.apply.name),
      'data-accent-jobtitle': String(colors.apply.jobTitle),
      'data-accent-headings': String(colors.apply.headings),
      'data-accent-dates': String(colors.apply.dates),
      'data-accent-dots': String(colors.apply.dots),
      'data-accent-subtitle': String(colors.apply.entrySubtitle),
      'data-accent-hicons': String(colors.apply.headerIcons),
      'data-accent-linkicons': String(colors.apply.linkIcons),
    }),
    ...(headerPaint && {
      'data-header-paint': headerType,
      'data-header-side': headerSide,
      ...(headerMultiActive &&
        colors?.headerPresetId === 'custom' && { 'data-header-custom': 'true' }),
      ...(headerPagePaint && { 'data-page-paint': 'true' }),
    }),
  }

  // Nothing is invented for the page: an empty field simply does not render.
  const name = basics.fullName.trim()
  const headline = basics.headline.trim()

  /** Marks the identity surface so the Header styles can find and paint it. */
  const headerMark = { 'data-doc-header': 'true' } as const

  // Template-specific reading order is only applied in two-column mode, where
  // the layout requires sections in a particular sequence.  In one-column mode
  // the author's drag-and-drop order is always respected.
  const isTwoCol = settings.columnLayout === 'two'
  const order = isTwoCol ? orderFor(template) : null
  const ordered = order
    ? [...sections].sort(
        (a, b) => order.indexOf(a.type) - order.indexOf(b.type),
      )
    : sections

  // -- Layout column resolution (shared by all templates) ------------------
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
        <div className="doc-profile-stack" {...headerMark}>
          <div className="doc-header-text">
            {name && <h1 className="doc-name">{name}</h1>}
            {headline && <p className="doc-headline">{headline}</p>}
          </div>
          {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
        </div>
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
          <aside className="doc-rail doc-rail-top doc-photo-layout" {...headerMark}>
            {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
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
        <aside className="doc-rail doc-rail-top doc-photo-layout" {...headerMark}>
          {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
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
        {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
        {hasContact(basics) && (
          <Contact basics={basics} stacked icons={settings.showIcons} />
        )}
        {rail.map((s) => (
          <DocSection key={s.id} section={s} tags />
        ))}
      </>
    )

    const mainHeader = (
      <div className="doc-header" {...headerMark}>
        <div className="doc-header-text">
          {name && <h1 className="doc-name">{name}</h1>}
          {headline && <p className="doc-headline">{headline}</p>}
        </div>
      </div>
    )

    const mainContent = (
      <>
        {mainHeader}
        {main.map((s) => (
          <DocSection key={s.id} section={s} />
        ))}
      </>
    )

    if (!isTwoCol) {
      // One-column: full-width dark header band with identity, sections below
      return (
        <div {...rootProps}>
          <aside className="doc-rail doc-rail-top doc-photo-layout" {...headerMark}>
            {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
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
        <aside className="doc-rail doc-rail-top doc-photo-layout" {...headerMark}>
          {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
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
      <header className="doc-header doc-profile-stack" {...headerMark}>
        <div className="doc-header-text">
          {name && <h1 className="doc-name">{name}</h1>}
          {headline && <p className="doc-headline">{headline}</p>}
        </div>
        {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
      </header>
    )

    if (!isTwoCol) {
      // One-column: full-width dark header band with identity, sections below
      return (
        <div {...rootProps}>
          <aside className="doc-rail doc-rail-top doc-photo-layout" {...headerMark}>
            {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
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
        <aside className="doc-rail doc-rail-top doc-photo-layout" {...headerMark}>
          {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
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
      <header className="doc-header doc-photo-layout" {...headerMark}>
        <div className="doc-header-text">
          {name && <h1 className="doc-name">{name}</h1>}
          {headline && <p className="doc-headline">{headline}</p>}
        </div>
        {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
      </header>
    )

    if (!isTwoCol) {
      // One-column: full-width header with border, sections below
      return (
        <div {...rootProps}>
          <header className="doc-header doc-header-top doc-photo-layout" {...headerMark}>
            {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
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
        <header className="doc-header doc-header-top doc-photo-layout" {...headerMark}>
          {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
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
      <header className="doc-band doc-photo-layout" {...headerMark}>
        {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
        <div className="doc-header-text">
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
      <header className={`doc-photohead doc-photo-layout${showPhoto ? '' : ' no-photo'}`} {...headerMark}>
        {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
        <div className="doc-header-text">
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
      <header className="doc-masthead doc-photo-layout" {...headerMark}>
        {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
        <div className="doc-header-text">
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
    <header className={`doc-header doc-photo-layout${splitHeader ? ' doc-header-split' : ''}`} {...headerMark}>
      {showPhoto && <ProfilePhoto src={basics.photoUrl!} layout={pl} />}
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

  // -- One-column mode: header is always at the top; Left/Right/Center
  //    controls text-align only, handled via data-header attribute in CSS.
  return (
    <div {...rootProps}>
      {headerEl}
      <div className="doc-body">
        {renderSections(ordered)}
      </div>
    </div>
  )
}
