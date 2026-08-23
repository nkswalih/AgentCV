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

export interface FontChoice {
  label: string
  stack: string
  kind: 'Sans' | 'Serif'
  /** Which picker section the choice sits in. */
  group: 'corporate' | 'web'
}

/**
 * Font picker, grouped the way resumes think about them: the universal system
 * fonts every ATS parser and recruiter machine already has, then the modern
 * web fonts loaded with the editor.
 *
 * All of these are deliberately ligature-safe -- no display faces (Montserrat,
 * Poppins, Raleway...), whose fi/fl pairs older parsers mangle into "Ef?ciency".
 */
export const FONT_CHOICES: FontChoice[] = [
  // -- Standard corporate & FAANG system fonts --
  { label: 'Arial', stack: "Arial, Helvetica, sans-serif", kind: 'Sans', group: 'corporate' },
  { label: 'Calibri', stack: "Calibri, 'Segoe UI', sans-serif", kind: 'Sans', group: 'corporate' },
  { label: 'Garamond', stack: "Garamond, 'EB Garamond', Georgia, serif", kind: 'Serif', group: 'corporate' },
  { label: 'Georgia', stack: "Georgia, 'Times New Roman', serif", kind: 'Serif', group: 'corporate' },
  { label: 'Helvetica', stack: "Helvetica, Arial, sans-serif", kind: 'Sans', group: 'corporate' },
  { label: 'Times New Roman', stack: "'Times New Roman', Tinos, Times, serif", kind: 'Serif', group: 'corporate' },
  { label: 'Palatino', stack: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif", kind: 'Serif', group: 'corporate' },
  { label: 'Baskerville', stack: "Baskerville, 'Libre Baskerville', Georgia, serif", kind: 'Serif', group: 'corporate' },
  // -- Modern tech web fonts --
  { label: 'Inter', stack: "'Inter', system-ui, sans-serif", kind: 'Sans', group: 'web' },
  { label: 'Roboto', stack: "'Roboto', Arial, sans-serif", kind: 'Sans', group: 'web' },
  { label: 'Open Sans', stack: "'Open Sans', Arial, sans-serif", kind: 'Sans', group: 'web' },
  { label: 'Lato', stack: "'Lato', sans-serif", kind: 'Sans', group: 'web' },
  { label: 'IBM Plex Sans', stack: "'IBM Plex Sans', sans-serif", kind: 'Sans', group: 'web' },
  { label: 'Cambria', stack: "Cambria, Georgia, serif", kind: 'Serif', group: 'web' },
  { label: 'Noto Serif', stack: "'Noto Serif', Georgia, serif", kind: 'Serif', group: 'web' },
  { label: 'Cormorant Garamond', stack: "'Cormorant Garamond', Garamond, Georgia, serif", kind: 'Serif', group: 'web' },
  // Earlier defaults, kept so documents already using them still resolve.
  { label: 'Source Serif 4', stack: "'Source Serif 4', Georgia, serif", kind: 'Serif', group: 'web' },
  { label: 'Merriweather', stack: "'Merriweather', Georgia, serif", kind: 'Serif', group: 'web' },
]

const FONT_GROUP_LABELS = {
  corporate: 'Standard corporate & system',
  web: 'Modern tech web fonts',
} as const

export { FONT_GROUP_LABELS }

/** Picker order: corporate system fonts first, web fonts after. */
export const FONT_GROUPS = ['corporate', 'web'] as const

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
