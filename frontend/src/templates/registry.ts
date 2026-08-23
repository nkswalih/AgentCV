/** Template registry: what the style panel offers, and how each is labelled. */

import type { TemplateId } from '../types'

export interface TemplateMeta {
  id: TemplateId
  name: string
  /** Whether an applicant tracking system can parse it reliably. */
  atsSafe: boolean
  note: string
}

/**
 * ATS-safe templates come first. A resume that a parser mangles never reaches a
 * human, so that property is ranked above visual appeal in the picker order.
 */
export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'ats-modern',
    name: 'Modern',
    atsSafe: true,
    note: 'Single column, one accent rule. Safe default.',
  },
  {
    id: 'ats-classic',
    name: 'Classic',
    atsSafe: true,
    note: 'Serif, centred header. Traditional industries.',
  },
  {
    id: 'compact',
    name: 'Compact',
    atsSafe: true,
    note: 'Tightened spacing for longer histories.',
  },
  {
    id: 'sidebar',
    name: 'Sidebar',
    atsSafe: false,
    note: 'Two columns with a photo. Parsers may reorder it.',
  },
  {
    id: 'banner',
    name: 'Banner',
    atsSafe: false,
    note: 'Colour header with a photo. Design-led roles.',
  },
]

export const TEMPLATES_BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]))

/** Templates that lay out a photo. The others ignore one if set. */
export const PHOTO_TEMPLATES: ReadonlySet<TemplateId> = new Set<TemplateId>([
  'sidebar',
  'banner',
])

export const FONT_CHOICES = [
  { label: 'Inter', stack: "'Inter', system-ui, sans-serif", kind: 'Sans' },
  { label: 'IBM Plex Sans', stack: "'IBM Plex Sans', sans-serif", kind: 'Sans' },
  { label: 'Lato', stack: "'Lato', sans-serif", kind: 'Sans' },
  { label: 'Source Serif 4', stack: "'Source Serif 4', Georgia, serif", kind: 'Serif' },
  { label: 'Merriweather', stack: "'Merriweather', Georgia, serif", kind: 'Serif' },
] as const

export const FONT_STACKS: Record<string, string> = Object.fromEntries(
  FONT_CHOICES.map((f) => [f.label, f.stack]),
)

/** Accent presets. Deliberately muted -- these print on white paper. */
export const ACCENT_PRESETS = [
  '#2563eb',
  '#0f766e',
  '#7c3aed',
  '#b91c1c',
  '#c2410c',
  '#1e293b',
]
