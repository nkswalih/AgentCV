/**
 * The resume page. One component renders every template -- they differ in
 * composition (columns, bands, spines, photo mastheads) rather than only in
 * CSS -- so the preview and the exported PDF can never diverge in content.
 * The document is the data; the template decides how it stands on the page.
 */

import type { CSSProperties } from 'react'

import type { ResumeDocument, Section, SectionType, TemplateId } from '../types'
import { resolveHeadingVisual } from '../headingStyles'
import { resolveHeaderPosition, restingLinkDecoration } from '../factories'
import { resolvePhotoPlacement } from '../photoPlacement'
import { Contact, DocSection, hasContact, ProfilePhoto, type HeadKind } from './parts'
import { FONT_STACKS, BORDER_SIZES, HEADER_PRESETS } from './registry'

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

  // Header card controls. Each field is optional; absent means the template's
  // own treatment, so an untouched document renders exactly as before.
  const hdr = settings.headerStyle ?? {}
  // Details arrangement owns the icons: choosing "Icon" draws them even when
  // the older Show contact icons switch is off, and choosing Bullet or Bar
  // suppresses them. Until a choice is made, the switch decides.
  const headerIcons = hdr.details == null ? settings.showIcons : hdr.details === 'icon'

  // Where the identity sits, resolved once for the whole render: the layout,
  // the sheet's own data attributes and the photo resolver all read this, so a
  // stored alignment value can never reach them as a placement.
  const headerPos = resolveHeaderPosition(settings.columnLayout, settings.headerPosition)

  // The photo card's tiles and this attribute read one resolver, so the sheet
  // only ever draws an arrangement the card says is available.
  const photoPlacement = resolvePhotoPlacement(pl.position, {
    columns: settings.columnLayout,
    headerPosition: headerPos,
    align: hdr.align,
  })

  // Only the selected Colors tab is in effect. The other tabs keep their
  // settings for when the user returns, but they must not paint the sheet --
  // that was the bug where a Header band or Border frame survived a tab switch.
  const activeTarget = colors?.activeTarget ?? 'full'
  const fullActive = activeTarget === 'full'
  const headerActive = activeTarget === 'header'
  const borderActive = activeTarget === 'border'

  // Full Page treatment. Single changes ink only; Multi repaints the sheet and
  // supplies its own body ink; Image covers the sheet, tints it, and turns every
  // ink white so the text survives any photograph.
  const imageMode = fullActive && colors?.bgType === 'image' && !!colors.bgImage

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
  const headerPaint =
    headerActive && (headerSingleActive || headerMultiActive || headerImageActive)
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
    headerActive &&
    headerMultiActive &&
    colors?.headerPresetId === 'custom' &&
    !!(colors?.headerPageBackgroundColor || colors?.headerPageTextColor)
  // Where the painted surface sits -- not where the ink sits. A side panel only
  // exists where the sheet is divided into regions, so only a split page can
  // carry one. One column is a single region: its identity is always a
  // full-width band, and `data-header` alone chooses which edge the ink aligns
  // to. Deriving this from the position alone made a one-column band inherit the
  // side-panel geometry, which no side rule paints there -- the band shrank back
  // inside the page margin instead of crossing the sheet.
  const headerSide =
    settings.columnLayout === 'two' && (headerPos === 'left' || headerPos === 'right')
      ? headerPos
      : 'full'

  // Border treatment. The frame is drawn with real CSS borders on the sheet, so
  // paper size never changes and each template's own padding keeps the content
  // clear of it. Single paints the frame in the document accent; Image lays a
  // photograph into the same border box and leaves the page treatment visible.
  const borderType = colors?.borderType ?? 'single'
  const borderSides = colors?.borderSides ?? { top: true, right: true, bottom: true, left: true }
  const borderMm = BORDER_SIZES.find((s) => s.id === (colors?.borderSize ?? 'M'))?.mm ?? 5
  const anyBorderSide =
    borderSides.top || borderSides.right || borderSides.bottom || borderSides.left
  const borderSingleActive =
    borderType === 'single' &&
    (colors?.borderSingleId ?? 'none') !== 'none' &&
    !!colors?.borderSingleColor
  const borderImageActive = borderType === 'image' && !!colors?.borderBgImage
  const borderPaint = borderActive && anyBorderSide && (borderSingleActive || borderImageActive)

  const docAccent = imageMode
    ? '#ffffff'
    : headerActive
      ? headerPageAccent ?? headerAccent ?? settings.accentColor
      : settings.accentColor

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
    // Optional faces for the identity. Only a chosen face emits anything; the
    // absent case keeps whatever face the design already uses for that slot.
    ...(settings.nameFont && {
      '--doc-name-font': FONT_STACKS[settings.nameFont] ?? FONT_STACKS.Inter,
    }),
    ...(settings.titleFont && {
      '--doc-title-font': FONT_STACKS[settings.titleFont] ?? FONT_STACKS.Inter,
    }),
    ...(fullActive &&
      colors?.bgType === 'multi' && {
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
    ...(borderPaint && {
      '--doc-frame-color': settings.accentColor,
      '--doc-frame-top': `${borderSides.top ? borderMm : 0}mm`,
      '--doc-frame-right': `${borderSides.right ? borderMm : 0}mm`,
      '--doc-frame-bottom': `${borderSides.bottom ? borderMm : 0}mm`,
      '--doc-frame-left': `${borderSides.left ? borderMm : 0}mm`,
    }),
    ...(borderPaint && borderImageActive && colors && {
      '--doc-frame-image': `url(${JSON.stringify(colors.borderBgImage)})`,
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
    'data-header': headerPos,
    // The resolved arrangement, not the stored preference: a header change
    // must never leave the sheet in a composition the card cannot describe.
    'data-photo-position': photoPlacement,
    'data-photo-size': pl.size,
    'data-photo-shape': pl.shape,
    ...(pl.grayscale && { 'data-photo-grayscale': 'true' }),
    'data-heading-visual': resolveHeadingVisual(hs.visual),
    'data-heading-cap': hs.capitalization,
    ...(hs.showIcons && { 'data-heading-icons': 'true' }),
    ...(hs.showIcons && { 'data-heading-icon-style': hs.iconStyle }),
    // Header card. In a split layout the alignment decides the side region. In
    // one column the header position owns the axis -- except at the top, where
    // it says nothing horizontal and the card's alignment leads.
    ...(hdr.align &&
      (settings.columnLayout === 'two' || headerPos === 'top') && {
        'data-header-align': hdr.align,
      }),
    ...(hdr.details && { 'data-header-details': hdr.details }),
    ...(hdr.details === 'icon' && hdr.iconStyle && { 'data-header-icon': hdr.iconStyle }),
    ...(hdr.nameStyle && { 'data-name-style': hdr.nameStyle }),
    ...(hdr.titleStyle && { 'data-title-style': hdr.titleStyle }),
    ...(hdr.titlePosition && { 'data-title-position': hdr.titlePosition }),
    // Typography card. A chosen face is the only thing that emits these.
    ...(settings.nameFont && { 'data-name-font': 'true' }),
    ...(settings.titleFont && { 'data-title-font': 'true' }),
    // Link card. The resolved value is written down, not just the stored one, so
    // the page always has a decoration to answer with: it rests plain unless the
    // author ticked Underline (or an Advanced key drew its own rule).
    'data-link-style':
      settings.linkStyle?.decoration ?? restingLinkDecoration(settings.template),
    ...(settings.linkStyle?.color && {
      // 'accent' was the old name for link colour. It now resolves to the fixed
      // hyperlink blue, so legacy documents render as links rather than as body
      // ink in the document accent.
      'data-link-color':
        settings.linkStyle.color === 'accent' ? 'blue' : settings.linkStyle.color,
    }),
    // Per-entry switches from the Advanced panel. An entry named in neither
    // list follows the tile, so a document that never opened the panel emits
    // nothing here and the card's two tiles keep full control.
    ...(settings.linkStyle?.emphasis?.length && {
      'data-link-emphasis': settings.linkStyle.emphasis.join(' '),
    }),
    ...(settings.linkStyle?.emphasisOff?.length && {
      'data-link-emphasis-off': settings.linkStyle.emphasisOff.join(' '),
    }),
    ...(colors && {
      'data-colors': 'on',
      // Only the Full Page tab owns the sheet treatment. On Header or Border,
      // leaving the attribute off keeps the template's own paper underneath.
      ...(fullActive && { 'data-bg': colors.bgType }),
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
    ...(borderPaint && {
      'data-border-paint': borderImageActive ? 'image' : 'single',
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
          <Contact basics={basics} stacked icons={headerIcons} />
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
                <Contact basics={basics} icons={headerIcons} />
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
              <Contact basics={basics} icons={headerIcons} />
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
          <Contact basics={basics} stacked icons={headerIcons} />
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
                <Contact basics={basics} icons={headerIcons} />
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
              <Contact basics={basics} icons={headerIcons} />
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
                <Contact basics={basics} icons={headerIcons} />
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
              <Contact basics={basics} icons={headerIcons} />
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
                <Contact basics={basics} icons={headerIcons} />
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
              <Contact basics={basics} icons={headerIcons} />
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
          <Contact basics={basics} icons={headerIcons} />
        </div>
      </header>
    )

    // A side masthead is a split-page composition. In one column the band stays
    // full width and only its ink follows the chosen edge, exactly as in every
    // other design -- the header position must not quietly re-split the page.
    if (isTwoCol && headerPos === 'left') {
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
    if (isTwoCol && headerPos === 'right') {
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
          <Contact basics={basics} icons={headerIcons} />
        </div>
      </header>
    )

    // Same rule as Creative: a side masthead needs a split page. One column
    // keeps the full-width photo head and only moves its ink.
    if (isTwoCol && headerPos === 'left') {
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
    if (isTwoCol && headerPos === 'right') {
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
        <Contact basics={basics} stacked icons={headerIcons} />
      </header>
    )

    // Editorial's split masthead is a two-column idea; in one column the
    // masthead stays the full-width newspaper rule and the position moves its ink.
    if (isTwoCol && headerPos === 'left') {
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
    if (isTwoCol && headerPos === 'right') {
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
          <Contact basics={basics} stacked={template === 'devtech'} icons={headerIcons} />
        </div>
      ) : (
        <Contact basics={basics} icons={headerIcons} />
      )}
    </header>
  )

  /** Render a list of sections into DocSection components. */
  function renderSections(sections: Section[]) {
    // Jake's Resume prints a house shape per entry type rather than one shared
    // head: the school leads and the degree sits under it, experience puts the
    // dates on the title row and the place beneath, and a project's stack rides
    // beside its name. Every other design keeps the shared head.
    const jakeHeads: Partial<Record<SectionType, HeadKind>> = {
      education: 'swap',
      experience: 'dual',
      projects: 'beside',
    }
    return sections.map((s: Section) => (
      <DocSection
        key={s.id}
        section={s}
        timeline={spine && SPINE_TYPES.has(s.type)}
        head={template === 'jake' ? jakeHeads[s.type] : undefined}
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
