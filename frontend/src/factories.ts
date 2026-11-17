/** Constructors for new sections and items, with fresh ids. */

import type {
  HeaderStyle,
  Section,
  SectionItem,
  SectionType,
  Settings,
  TemplateId,
} from './types'

export const newId = () =>
  // crypto.randomUUID is available in every browser this app targets.
  crypto.randomUUID().replace(/-/g, '').slice(0, 12)

/** Designs whose own sheet underlines its links. */
const LINK_UNDERLINED_TEMPLATES = new Set<TemplateId>(['jake'])

/**
 * The link treatment a design prints before the author touches the Link card.
 * The card and the sheet both read it from here, so the tick next to
 * "Underline" is a statement about the paper rather than a guess about it.
 */
export function restingLinkDecoration(template: TemplateId): 'underline' | 'plain' {
  return LINK_UNDERLINED_TEMPLATES.has(template) ? 'underline' : 'plain'
}

/**
 * Documented defaults for settings added after the original schema. They exist
 * for exactly one purpose: hydrating documents stored before these fields were
 * introduced. Defaults are only ever merged UNDER loaded values -- a value that
 * was actually saved always wins, so customization can never be reset by a
 * refresh.
 */
const LAYOUT_DEFAULTS = {
  columnLayout: 'one',
  headerPosition: 'top',
  columnWidth: 40,
  leftColumn: [] as string[],
  rightColumn: [] as string[],
} as const

/**
 * Resolve the stored header position to a placement the layout can actually
 * draw.
 *
 * One column stores the identity's *text alignment* in the same field, so
 * 'center' is a legitimate value there. A split page only has three real
 * placements, and a value it cannot draw used to reach the sheet as an
 * attribute no rule paints -- a painted header then floated inside the page
 * margin instead of banding the sheet. Every reader of the field goes through
 * here, so a control, a saved document and the renderer can never disagree
 * about what a position means.
 */
export function resolveHeaderPosition(
  columnLayout: Settings['columnLayout'],
  position: Settings['headerPosition'] | undefined,
): Settings['headerPosition'] {
  const value = position ?? LAYOUT_DEFAULTS.headerPosition
  if (columnLayout !== 'two') return value
  return value === 'left' || value === 'right' ? value : 'top'
}

const PHOTO_LAYOUT_DEFAULTS = {
  show: true,
  grayscale: false,
  position: 'left',
  size: 24,
  shape: 'circle',
  focusX: 50,
  focusY: 50,
  zoom: 1,
  border: false,
  borderWidth: 1,
  borderColor: '#000000',
} as const

const LEGACY_PHOTO_SIZES: Record<string, number> = {
  sm: 18,
  md: 24,
  lg: 30,
  xl: 36,
}

const clampPhotoSize = (value: unknown) => {
  const legacy = typeof value === 'string' ? LEGACY_PHOTO_SIZES[value] : undefined
  const numeric = legacy ?? (typeof value === 'number' ? value : PHOTO_LAYOUT_DEFAULTS.size)
  return Math.max(14, Math.min(44, numeric))
}

const clampPercent = (value: unknown) =>
  Math.max(0, Math.min(100, typeof value === 'number' ? value : 50))

const clampPhotoZoom = (value: unknown) =>
  Math.max(1, Math.min(3, typeof value === 'number' ? value : 1))

const HEADING_STYLE_DEFAULTS = {
  visual: 'underline',
  capitalization: 'uppercase',
  showIcons: true,
  iconStyle: 'filled',
} as const

const COLORS_DEFAULTS = {
  activeTarget: 'full' as const,
  bgType: 'single' as const,
  singlePresetId: 'default',
  multiPresetId: 'slate',
  textColor: '#0f172a',
  backgroundColor: '#f8fafc',
  bgImageTint: 0.38,
  headerType: 'single' as const,
  headerSingleId: 'none',
  headerPresetId: 'slate',
  headerBgImageTint: 0.38,
  borderType: 'single' as const,
  borderSingleId: 'none',
  borderSize: 'M' as const,
  borderSides: { top: true, right: true, bottom: true, left: true },
  apply: {
    name: true,
    dots: true,
    jobTitle: true,
    dates: true,
    headings: true,
    entrySubtitle: true,
    headerIcons: true,
    linkIcons: true,
  },
} as const

/** Overlay strength: enough for white text to read, never a blackout. */
function clampTint(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return COLORS_DEFAULTS.bgImageTint
  return Math.max(0.08, Math.min(0.72, value))
}

/**
 * Complete every missing settings field with its documented default so the
 * store holds one consistent, fully-populated settings object after load.
 * Present values (including falsy ones like false or []) are kept as-is;
 * only genuinely absent keys are filled.
 */
export function normalizeSettings(settings: Settings): Settings {
  // The API serialises an unset optional as JSON null, so null has to read
  // exactly like undefined here: both mean "never chosen". They also have to be
  // resolved BEFORE the spreads below, which would dereference a null -- and
  // rewritten on the way out, because `...settings` carries the null through.
  const colors = settings.colors ?? undefined
  const profileLayout = settings.profileLayout ?? undefined

  // The selected Colors tab owns the document accent. Restore that tab's ink on
  // load -- otherwise a Header or Border accent would outlive its tab and the
  // Full Page accent would appear not to work after a reload.
  const colorTarget = colors?.activeTarget ?? COLORS_DEFAULTS.activeTarget
  const storedAccent = settings.accentColor
  const accentForTarget = !colors
    ? storedAccent
    : colorTarget === 'header'
      ? colors.headerAccentColor ?? storedAccent
      : colorTarget === 'border'
        ? colors.borderSingleColor ?? storedAccent
        : (colors.bgType ?? 'single') === 'multi'
          ? colors.multiAccent ?? storedAccent
          : (colors.bgType ?? 'single') === 'single'
            ? colors.singleAccent ?? storedAccent
            : storedAccent

  // A split page can only place the identity at the top, left or right. One
  // column stores its text alignment in the same field, so a saved 'center'
  // (or any value a future control invents) resolves to the top band here,
  // once, instead of leaving the sheet with an arrangement no rule paints.
  const columnLayout = settings.columnLayout ?? LAYOUT_DEFAULTS.columnLayout

  return {
    ...LAYOUT_DEFAULTS,
    ...settings,
    accentColor: accentForTarget,
    columnLayout,
    headerPosition: resolveHeaderPosition(columnLayout, settings.headerPosition),
    columnWidth: settings.columnWidth ?? LAYOUT_DEFAULTS.columnWidth,
    leftColumn: settings.leftColumn ?? LAYOUT_DEFAULTS.leftColumn,
    rightColumn: settings.rightColumn ?? LAYOUT_DEFAULTS.rightColumn,
    contactSize: settings.contactSize ?? null,
    profileLayout,
    photoLayout: {
      ...PHOTO_LAYOUT_DEFAULTS,
      ...settings.photoLayout,
      size: clampPhotoSize(settings.photoLayout?.size),
      shape: (settings.photoLayout as { shape?: string } | undefined)?.shape === 'none'
        ? 'square'
        : settings.photoLayout?.shape ?? PHOTO_LAYOUT_DEFAULTS.shape,
      focusX: clampPercent(settings.photoLayout?.focusX),
      focusY: clampPercent(settings.photoLayout?.focusY),
      zoom: clampPhotoZoom(settings.photoLayout?.zoom),
      border: settings.photoLayout?.border ?? PHOTO_LAYOUT_DEFAULTS.border,
      borderWidth: typeof settings.photoLayout?.borderWidth === 'number' ? settings.photoLayout.borderWidth : PHOTO_LAYOUT_DEFAULTS.borderWidth,
      borderColor: settings.photoLayout?.borderColor ?? PHOTO_LAYOUT_DEFAULTS.borderColor,
    },
    headingStyle: { ...HEADING_STYLE_DEFAULTS, ...settings.headingStyle },
    // Colors stays optional: an absent card state means every template look is
    // untouched. When present, only the shape's required parts are filled.
    colors: colors && (() => {
      const bgType = colors.bgType ?? COLORS_DEFAULTS.bgType
      // Image mode without a real background is the old buggy shape, where the
      // profile photo was used as a backdrop. Fall back to the untouched sheet.
      const resolvedType = bgType === 'image' && !colors.bgImage ? 'single' : bgType
      // The Header tab mirrors Full Page, but its image is its own field: a
      // header photo must never be mistaken for a missing full-page backdrop.
      const headerType = colors.headerType ?? COLORS_DEFAULTS.headerType
      const resolvedHeaderType =
        headerType === 'image' && !colors.headerBgImage ? 'single' : headerType
      // Border follows the same shape rule: an Image frame without an image
      // falls back to an unpainted sheet rather than an invisible frame.
      const borderType = colors.borderType ?? COLORS_DEFAULTS.borderType
      const resolvedBorderType =
        borderType === 'image' && !colors.borderBgImage ? 'single' : borderType
      const borderSize = colors.borderSize
      const resolvedBorderSize =
        borderSize === 'S' || borderSize === 'M' || borderSize === 'L'
          ? borderSize
          : COLORS_DEFAULTS.borderSize
      const target = colors.activeTarget
      const resolvedTarget =
        target === 'full' || target === 'header' || target === 'border'
          ? target
          : COLORS_DEFAULTS.activeTarget
      return {
        ...colors,
        activeTarget: resolvedTarget,
        bgType: resolvedType,
        singlePresetId: colors.singlePresetId ?? COLORS_DEFAULTS.singlePresetId,
        // Only a document saved in Single mode has an accent that is genuinely
        // Single's ink. For Multi/Image, leaving it unset lets the card restore
        // the template accent instead of adopting a scheme's colour.
        singleAccent:
          colors.singleAccent ?? (resolvedType === 'single' ? settings.accentColor : undefined),
        multiAccent:
          colors.multiAccent ?? (resolvedType === 'multi' ? settings.accentColor : undefined),
        multiPresetId: colors.multiPresetId ?? COLORS_DEFAULTS.multiPresetId,
        textColor: colors.textColor ?? COLORS_DEFAULTS.textColor,
        backgroundColor: colors.backgroundColor ?? COLORS_DEFAULTS.backgroundColor,
        bgImageTint: clampTint(colors.bgImageTint),
        headerType: resolvedHeaderType,
        headerSingleId: colors.headerSingleId ?? COLORS_DEFAULTS.headerSingleId,
        headerPresetId: colors.headerPresetId ?? COLORS_DEFAULTS.headerPresetId,
        // A Single header saved without its fill (an older shape) takes the ink
        // it was pointing at rather than silently rendering no band at all.
        headerBackgroundColor:
          colors.headerBackgroundColor ??
          (resolvedHeaderType === 'single' &&
          colors.headerSingleId &&
          colors.headerSingleId !== 'none'
            ? colors.headerAccentColor ?? settings.accentColor
            : undefined),
        headerBgImageTint: clampTint(colors.headerBgImageTint),
        borderType: resolvedBorderType,
        borderSingleId: colors.borderSingleId ?? COLORS_DEFAULTS.borderSingleId,
        // A Single frame saved without its fill (an older shape) takes the ink
        // it was pointing at rather than silently rendering no frame at all.
        borderSingleColor:
          colors.borderSingleColor ??
          (resolvedBorderType === 'single' &&
          colors.borderSingleId &&
          colors.borderSingleId !== 'none'
            ? settings.accentColor
            : undefined),
        borderSize: resolvedBorderSize,
        borderSides: { ...COLORS_DEFAULTS.borderSides, ...colors.borderSides },
        borderPalette: Array.isArray(colors.borderPalette) ? colors.borderPalette : undefined,
        apply: { ...COLORS_DEFAULTS.apply, ...colors.apply },
      }
    })(),
  }
}

export const SECTION_LABELS: Record<SectionType, string> = {
  summary: 'Summary',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  custom: 'Custom Section',
}

export function emptyItem(type: SectionType): SectionItem {
  const base = { id: newId(), visible: true }
  switch (type) {
    case 'experience':
      return {
        ...base,
        position: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        bullets: [''],
      }
    case 'education':
      return {
        ...base,
        degree: '',
        institution: '',
        location: '',
        startDate: '',
        endDate: '',
        grade: '',
        bullets: [],
      }
    case 'skills':
      return { ...base, category: '', skills: [] }
    case 'projects':
      return {
        ...base,
        name: '',
        role: '',
        url: '',
        startDate: '',
        endDate: '',
        bullets: [''],
      }
    case 'certifications':
      return { ...base, name: '', issuer: '', date: '', url: '' }
    case 'languages':
      return { ...base, name: '', proficiency: '' }
    case 'summary':
      return { ...base, summary: '' }
    case 'custom':
      return { ...base, title: '', subtitle: '', date: '', bullets: [''] }
  }
}

export function emptySection(type: SectionType, title?: string): Section {
  const base = {
    id: newId(),
    title: title ?? SECTION_LABELS[type],
    visible: true,
    type,
    items: [emptyItem(type)],
  }
  // Skills carry their own presentation. A new section starts in category mode,
  // which is the most space-efficient form; the Layout block on the expanded
  // section card switches it to a flat column grid.
  const presentation =
    type === 'skills' ? { layout: 'inline', marker: 'bullet', columns: 2 } : {}
  // The cast is needed because `type` and `items` are correlated in the union
  // but TypeScript can't see that through a runtime-chosen `type`.
  return { ...base, ...presentation } as Section
}

// ---------------------------------------------------------------------------
// Template presets — every setting a design needs, applied on selection.
// ---------------------------------------------------------------------------

interface TemplatePreset {
  fontFamily: string
  columnLayout: 'one' | 'two'
  headerPosition: 'top' | 'left' | 'right' | 'center'
  sectionSpacing: number
  marginX: number
  marginY: number
  lineHeight: number
  accentColor: string
  showIcons: boolean
  showPhoto: boolean
  photoPosition: 'left' | 'top' | 'right'
  photoShape: 'circle' | 'square' | 'rounded'
  photoSize: number
  columnWidth: number
  /** Body size in pt. Omitted = the app default (10.5pt). */
  fontSize?: number
  /** Omitted = A4, the stock every design is fitted to. */
  paperSize?: 'A4' | 'Letter'
  /** Section-title case. Omitted = the uppercase house default. */
  capitalization?: Settings['headingStyle']['capitalization']
  /** Section-title icons. Omitted = the house default (drawn). */
  headingIcons?: boolean
  /**
   * The header card state this design is drawn with. Omitted = the design has
   * no opinion, so the card keeps whatever the user already chose. A design
   * that declares one owns those two fields on selection, the way it owns its
   * margins or accent.
   */
  headerStyle?: HeaderStyle
}

const TEMPLATE_PRESETS: Record<TemplateId, TemplatePreset> = {
  'ats-classic':  { fontFamily: 'Georgia',          columnLayout: 'one', headerPosition: 'top', sectionSpacing: 1,   marginX: 15, marginY: 14, lineHeight: 1.65,  accentColor: '#374151', showIcons: false, showPhoto: false, photoPosition: 'top', photoShape: 'circle', photoSize: 24, columnWidth: 40 },
  'ats-modern':   { fontFamily: 'Inter',            columnLayout: 'one', headerPosition: 'top', sectionSpacing: 1,   marginX: 15, marginY: 14, lineHeight: 1.65,  accentColor: '#374151', showIcons: false, showPhoto: false, photoPosition: 'top', photoShape: 'circle', photoSize: 24, columnWidth: 40 },
  'classic-pro':  { fontFamily: 'Georgia',          columnLayout: 'one', headerPosition: 'top', sectionSpacing: 0.75, marginX: 15, marginY: 14, lineHeight: 1.65,  accentColor: '#20252b', showIcons: false, showPhoto: false, photoPosition: 'top', photoShape: 'circle', photoSize: 24, columnWidth: 40 },
  'modern-min':   { fontFamily: 'Inter',            columnLayout: 'one', headerPosition: 'top', sectionSpacing: 0.65, marginX: 15, marginY: 14, lineHeight: 1.5,  accentColor: '#10151b', showIcons: false, showPhoto: false, photoPosition: 'top', photoShape: 'circle', photoSize: 24, columnWidth: 40 },
  'executive':    { fontFamily: 'Garamond',         columnLayout: 'one', headerPosition: 'top', sectionSpacing: 0.75,marginX: 15, marginY: 14, lineHeight: 1.65,  accentColor: '#33383f', showIcons: false, showPhoto: false, photoPosition: 'top', photoShape: 'circle', photoSize: 24, columnWidth: 40 },
  'compact':      { fontFamily: 'Arial',            columnLayout: 'one', headerPosition: 'top', sectionSpacing: 0.65, marginX: 12, marginY: 12, lineHeight: 1.35, accentColor: '#374151', showIcons: false, showPhoto: false, photoPosition: 'top', photoShape: 'circle', photoSize: 24, columnWidth: 40 },
  'creative':     { fontFamily: 'Lato',             columnLayout: 'one', headerPosition: 'top', sectionSpacing: 0.65,marginX: 15, marginY: 14, lineHeight: 1.65,  accentColor: '#2e3a80', showIcons: false, showPhoto: true,  photoPosition: 'top', photoShape: 'rounded', photoSize: 24, columnWidth: 40 },
  'devtech':      { fontFamily: 'IBM Plex Sans',    columnLayout: 'one', headerPosition: 'top', sectionSpacing: 0.65,marginX: 15, marginY: 14, lineHeight: 1.65,  accentColor: '#0f766e', showIcons: false, showPhoto: false, photoPosition: 'top', photoShape: 'circle', photoSize: 24, columnWidth: 40 },
  'academic':     { fontFamily: 'Times New Roman',  columnLayout: 'one', headerPosition: 'top', sectionSpacing: 1,   marginX: 15, marginY: 14, lineHeight: 1.65,  accentColor: '#374151', showIcons: false, showPhoto: false, photoPosition: 'top', photoShape: 'circle', photoSize: 24, columnWidth: 40 },
  'timeline':     { fontFamily: 'IBM Plex Sans',    columnLayout: 'one', headerPosition: 'top', sectionSpacing: 0.66, marginX: 15, marginY: 14, lineHeight: 1.65,  accentColor: '#39424c', showIcons: false, showPhoto: false, photoPosition: 'top', photoShape: 'circle', photoSize: 24, columnWidth: 40 },
  'photo-pro':    { fontFamily: 'Georgia',          columnLayout: 'one', headerPosition: 'top', sectionSpacing: 0.75, marginX: 15, marginY: 14, lineHeight: 1.65,  accentColor: '#23282e', showIcons: false, showPhoto: true,  photoPosition: 'top', photoShape: 'circle', photoSize: 30, columnWidth: 40 },
  'portal-pro':   { fontFamily: 'Georgia',          columnLayout: 'two', headerPosition: 'left', sectionSpacing: 0.85,marginX: 15, marginY: 14, lineHeight: 1.45, accentColor: '#1e293b', showIcons: true,  showPhoto: true,  photoPosition: 'top', photoShape: 'circle', photoSize: 32, columnWidth: 43 },
  'modern-deep':  { fontFamily: 'Merriweather',     columnLayout: 'two', headerPosition: 'left', sectionSpacing: 0.85,marginX: 15, marginY: 14, lineHeight: 1.45, accentColor: '#2b3a55', showIcons: true,  showPhoto: true,  photoPosition: 'top', photoShape: 'square', photoSize: 32, columnWidth: 43 },
  'serif-ats':    { fontFamily: 'Times New Roman',  columnLayout: 'one', headerPosition: 'top', sectionSpacing: 1,   marginX: 15, marginY: 14, lineHeight: 1.65,  accentColor: '#191e24', showIcons: false, showPhoto: false, photoPosition: 'top', photoShape: 'circle', photoSize: 24, columnWidth: 40 },
  'jake':         { fontFamily: 'Times New Roman',  columnLayout: 'one', headerPosition: 'top', sectionSpacing: 1, marginX: 12.7, marginY: 12.7, lineHeight: 1.2727,  accentColor: '#191e24', showIcons: false, showPhoto: false, photoPosition: 'top', photoShape: 'circle', photoSize: 24, columnWidth: 40, fontSize: 11, capitalization: 'none', headingIcons: false, headerStyle: { align: 'center', details: 'bar' } },
  'banner':       { fontFamily: 'Inter',            columnLayout: 'one', headerPosition: 'top', sectionSpacing: 0.87, marginX: 15, marginY: 14, lineHeight: 1.65,  accentColor: '#374151', showIcons: false, showPhoto: true,  photoPosition: 'top', photoShape: 'rounded', photoSize: 28, columnWidth: 40 },
  'editorial':    { fontFamily: 'Georgia',          columnLayout: 'one', headerPosition: 'top', sectionSpacing: 0.75, marginX: 15, marginY: 14, lineHeight: 1.65,  accentColor: '#171b21', showIcons: false, showPhoto: false, photoPosition: 'top', photoShape: 'circle', photoSize: 24, columnWidth: 40 },
  'two-col':      { fontFamily: 'Inter',            columnLayout: 'two', headerPosition: 'left', sectionSpacing: 0.85, marginX: 15, marginY: 14, lineHeight: 1.65,  accentColor: '#273038', showIcons: false, showPhoto: false, photoPosition: 'top', photoShape: 'circle', photoSize: 24, columnWidth: 50 },
  'sidebar':      { fontFamily: 'Inter',            columnLayout: 'two', headerPosition: 'left', sectionSpacing: 0.85,marginX: 15, marginY: 14, lineHeight: 1.45, accentColor: '#1e293b', showIcons: true,  showPhoto: true,  photoPosition: 'top', photoShape: 'circle', photoSize: 32, columnWidth: 43 },
}

/**
 * Build a full settings patch that resets every visual/layout setting to match
 * the chosen template's designed defaults. Content (basics, sections, order)
 * is never touched -- only the settings object is replaced.
 */
export function applyTemplatePreset(template: TemplateId): Partial<Settings> {
  const p = TEMPLATE_PRESETS[template]
  return {
    template,
    fontFamily: p.fontFamily,
    columnLayout: p.columnLayout,
    headerPosition: p.headerPosition,
    sectionSpacing: p.sectionSpacing,
    marginX: p.marginX,
    marginY: p.marginY,
    lineHeight: p.lineHeight,
    accentColor: p.accentColor,
    showIcons: p.showIcons,
    // Typography: null = "let the template's CSS defaults apply"
    fontSize: p.fontSize ?? 10.5,
    nameSize: null,
    titleSize: null,
    headingSize: null,
    entrySize: null,
    contactSize: null,
    // Paper stock: every design is fitted to A4. A design that ever needs
    // another stock states it here; otherwise the choice stays the default.
    paperSize: p.paperSize ?? 'A4',
    // Photo: per-template defaults
    showPhoto: p.showPhoto,
    photoLayout: {
      show: p.showPhoto,
      grayscale: false,
      position: p.photoPosition,
      size: p.photoSize,
      shape: p.photoShape,
      focusX: 50,
      focusY: 50,
      zoom: 1,
      border: false,
      borderWidth: 1,
      borderColor: '#000000',
    },
    // Headings: standard underline style, case per design. Jake's small caps
    // are drawn by the font, so the text must reach it untransformed, and its
    // section titles carry no icon column.
    headingStyle: {
      ...HEADING_STYLE_DEFAULTS,
      ...(p.headingIcons != null ? { showIcons: p.headingIcons } : {}),
      ...(p.capitalization ? { capitalization: p.capitalization } : {}),
    },
    // Header, link and face choices belong to the user, not to the design
    // switch: only a design that draws its own masthead states the card here,
    // and every other design leaves a chosen mark, axis, link style or face
    // exactly as the user left it.
    ...(p.headerStyle ? { headerStyle: p.headerStyle } : {}),
    // Colors: null = template CSS defaults
    colors: undefined,
    // Layout
    columnWidth: p.columnWidth,
  }
}
