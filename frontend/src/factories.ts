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
  size: 'md',
  shape: 'circle',
} as const

const HEADING_STYLE_DEFAULTS = {
  visual: 'underline',
  capitalization: 'uppercase',
  showIcons: true,
  iconStyle: 'filled',
} as const

/**
 * Complete every missing settings field with its documented default so the
 * store holds one consistent, fully-populated settings object after load.
 * Present values (including falsy ones like false or []) are kept as-is;
 * only genuinely absent keys are filled.
 */
export function normalizeSettings(settings: Settings): Settings {
  return {
    ...LAYOUT_DEFAULTS,
    ...settings,
    columnLayout: settings.columnLayout ?? LAYOUT_DEFAULTS.columnLayout,
    headerPosition: settings.headerPosition ?? LAYOUT_DEFAULTS.headerPosition,
    columnWidth: settings.columnWidth ?? LAYOUT_DEFAULTS.columnWidth,
    leftColumn: settings.leftColumn ?? LAYOUT_DEFAULTS.leftColumn,
    rightColumn: settings.rightColumn ?? LAYOUT_DEFAULTS.rightColumn,
    ...(settings.profileLayout !== undefined && { profileLayout: settings.profileLayout }),
    photoLayout: { ...PHOTO_LAYOUT_DEFAULTS, ...settings.photoLayout },
    headingStyle: { ...HEADING_STYLE_DEFAULTS, ...settings.headingStyle },
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
