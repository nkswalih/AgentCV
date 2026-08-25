/** Constructors for new sections and items, with fresh ids. */

import type { Section, SectionItem, SectionType, Settings } from './types'

export const newId = () =>
  // crypto.randomUUID is available in every browser this app targets.
  crypto.randomUUID().replace(/-/g, '').slice(0, 12)

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

const PHOTO_LAYOUT_DEFAULTS = {
  show: true,
  grayscale: false,
  position: 'left',
  size: 24,
  shape: 'circle',
  focusX: 50,
  focusY: 50,
  zoom: 1,
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
  bgType: 'single',
  presetId: 'none',
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

  return {
    ...LAYOUT_DEFAULTS,
    ...settings,
    columnLayout: settings.columnLayout ?? LAYOUT_DEFAULTS.columnLayout,
    headerPosition: settings.headerPosition ?? LAYOUT_DEFAULTS.headerPosition,
    columnWidth: settings.columnWidth ?? LAYOUT_DEFAULTS.columnWidth,
    leftColumn: settings.leftColumn ?? LAYOUT_DEFAULTS.leftColumn,
    rightColumn: settings.rightColumn ?? LAYOUT_DEFAULTS.rightColumn,
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
    },
    headingStyle: { ...HEADING_STYLE_DEFAULTS, ...settings.headingStyle },
    // Colors stays optional: an absent card state means every template look is
    // untouched. When present, only the shape's required parts are filled.
    colors:
      colors && {
        ...colors,
        bgType: colors.bgType ?? COLORS_DEFAULTS.bgType,
        presetId: colors.presetId ?? COLORS_DEFAULTS.presetId,
        apply: { ...COLORS_DEFAULTS.apply, ...colors.apply },
      },
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
