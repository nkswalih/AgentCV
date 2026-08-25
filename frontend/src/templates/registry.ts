/** Template registry: the design system, its metadata, and its fonts. */

import type { TemplateId } from '../types'

/** How a photo participates in the design. */
export type PhotoSupport = 'none' | 'optional' | 'designed'

export interface TemplateMeta {
  id: TemplateId
  name: string
  /** Whether an applicant tracking system can parse it reliably. */
  atsSafe: boolean
  note: string
  /** The structural idea, in words -- shown on the picker card. */
  layout: string
  photo: PhotoSupport
  /** Dialog filter chips this design belongs to. */
  tags: TemplateTag[]
  /** The face the design was drawn with. Applying the design applies it. */
  font: string
}

/**
 * Filter chips for the creation dialog, in display order. A template appears
 * under a chip when its tags include it; "ATS Safe" reads the atsSafe flag.
 */
export const TEMPLATE_CHIPS = [
  'popular',
  'simple',
  'modern',
  'professional',
  'creative',
  'photo',
  'twocol',
  'executive',
  'technical',
  'academic',
] as const

export type TemplateTag = (typeof TEMPLATE_CHIPS)[number]

/**
 * Twelve directions, each with its own layout, header structure and rhythm --
 * switching templates changes the composition of the page, not just its
 * colours. ATS-safe designs stay single-column with plain text order; the
 * design-led ones say so honestly.
 *
 * Retired ids (atlantic-blue & co.) are deliberately absent: they were colour
 * studies on one shared skeleton, which is exactly what this system should not
 * be. Documents saved with those ids still validate and render through the
 * generic single-column path.
 */
export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'classic-pro',
    name: 'Classic Professional',
    atsSafe: true,
    note: 'The timeless single column. Strong serif hierarchy, quiet rules.',
    layout: 'Single column · serif',
    photo: 'none',
    tags: ['popular', 'simple', 'professional'],
    font: 'Georgia',
  },
  {
    id: 'modern-min',
    name: 'Modern Minimal',
    atsSafe: true,
    note: 'A large confident name and generous air. Nothing else competes.',
    layout: 'Single column · airy sans',
    photo: 'none',
    tags: ['popular', 'simple', 'modern'],
    font: 'Inter',
  },
  {
    id: 'executive',
    name: 'Executive',
    atsSafe: true,
    note: 'Centred small caps between double rules. Senior, formal, composed.',
    layout: 'Centred header · serif',
    photo: 'none',
    tags: ['popular', 'professional', 'executive'],
    font: 'Garamond',
  },
  {
    id: 'two-col',
    name: 'Two Column',
    atsSafe: false,
    note: 'Experience earns the wide column; skills and contact live aside.',
    layout: 'Two columns · right rail',
    photo: 'none',
    tags: ['professional', 'twocol'],
    font: 'Inter',
  },
  {
    id: 'sidebar',
    name: 'Sidebar',
    atsSafe: false,
    note: 'A tinted left rail carries contact and skills beside the story.',
    layout: 'Left sidebar · photo ready',
    photo: 'optional',
    tags: ['creative', 'twocol', 'photo'],
    font: 'Inter',
  },
  {
    id: 'editorial',
    name: 'Editorial',
    atsSafe: false,
    note: 'Magazine typography: oversized serif name, split masthead, rules.',
    layout: 'Split masthead · serif',
    photo: 'none',
    tags: ['modern', 'creative'],
    font: 'Georgia',
  },
  {
    id: 'compact',
    name: 'Compact',
    atsSafe: true,
    note: 'Tightened margins and leading for long histories.',
    layout: 'Single column · dense',
    photo: 'none',
    tags: ['simple', 'professional'],
    font: 'Arial',
  },
  {
    id: 'creative',
    name: 'Creative',
    atsSafe: false,
    note: 'A deep indigo band holds the identity; the body stays disciplined.',
    layout: 'Header band · photo optional',
    photo: 'optional',
    tags: ['creative', 'photo', 'modern'],
    font: 'Lato',
  },
  {
    id: 'devtech',
    name: 'Technical',
    atsSafe: true,
    note: 'Skills and projects surface first, the way engineers are read.',
    layout: 'Reordered · projects early',
    photo: 'none',
    tags: ['modern', 'technical'],
    font: 'IBM Plex Sans',
  },
  {
    id: 'academic',
    name: 'Academic',
    atsSafe: true,
    note: 'Education leads, centred Times masthead, no ornament at all.',
    layout: 'Centred header · education first',
    photo: 'none',
    tags: ['professional', 'academic'],
    font: 'Times New Roman',
  },
  {
    id: 'timeline',
    name: 'Timeline',
    atsSafe: false,
    note: 'Dates run down a ruled spine beside each role. Order you can see.',
    layout: 'Timeline entries',
    photo: 'none',
    tags: ['modern', 'creative'],
    font: 'IBM Plex Sans',
  },
  {
    id: 'photo-pro',
    name: 'Photo Pro',
    atsSafe: false,
    note: 'Portrait set into the masthead, name and contact around it.',
    layout: 'Photo masthead',
    photo: 'designed',
    tags: ['photo', 'professional'],
    font: 'Georgia',
  },
  {
    id: 'portal-pro',
    name: 'Professional',
    atsSafe: false,
    note: 'Deep navy rail carries identity and skills; banded section headers.',
    layout: 'Left rail · banded headers',
    photo: 'designed',
    tags: ['professional', 'photo'],
    font: 'Georgia',
  },
  {
    id: 'modern-deep',
    name: 'Modern Deep',
    atsSafe: false,
    note: 'Dark rail with profile, dot-scale languages and awards beside the story.',
    layout: 'Left rail · profile aside',
    photo: 'designed',
    tags: ['creative', 'photo'],
    font: 'Merriweather',
  },
  {
    id: 'serif-ats',
    name: 'Serif Classic',
    atsSafe: true,
    note: 'Centered Times masthead, ruled title-case headers, plain text only.',
    layout: 'Single column · Times',
    photo: 'none',
    tags: ['professional'],
    font: 'Times New Roman',
  },
  {
    id: 'jake',
    name: "Jake's Resume",
    atsSafe: true,
    note: 'The proven plain format: small-caps headers, two-line entries, education first.',
    layout: 'Single column · education first',
    photo: 'none',
    tags: ['professional'],
    font: 'Times New Roman',
  },
  // -- The original classic, kept: documents already use it and it remains
  //    the plainest page in the set. --
  {
    id: 'ats-classic',
    name: 'ATS Classic',
    atsSafe: true,
    note: 'The original single column. Centered serif header, quiet rules.',
    layout: 'Single column · classic serif',
    photo: 'none',
    tags: ['professional'],
    font: 'Georgia',
  },
]

export const TEMPLATES_BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]))

/** Templates that lay out a photo. The others ignore one if set. */
export const PHOTO_TEMPLATES: ReadonlySet<TemplateId> = new Set<TemplateId>([
  'sidebar',
  'banner',
  'creative',
  'photo-pro',
  'portal-pro',
  'modern-deep',
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

/** Accent presets. Deliberately muted -- these print on white paper. Grey
    leads: it is the default, so it is the first swatch a user sees active. */
export const ACCENT_PRESETS = [
  '#374151',
  '#2563eb',
  '#0f766e',
  '#7c3aed',
  '#b91c1c',
  '#c2410c',
  '#1e293b',
]

export interface ColorPreset {
  id: string
  /** Page background, header/rail fill, rule colour, accent ink. */
  page: string
  header: string
  border: string
  accent: string
}

/**
 * Preset color combinations for the Colors card. Each tile previews its pair:
 * header fill on the left, page tint on the right, an accent "T" over both --
 * the combination reads at a glance before anything is applied.
 */
export const COLOR_PRESETS: ColorPreset[] = [
  { id: 'paper',   page: '#ffffff', header: '#eef1f5', border: '#d4dae2', accent: '#374151' },
  { id: 'azure',   page: '#f5f8ff', header: '#dbe7ff', border: '#b6cdf5', accent: '#2563eb' },
  { id: 'teal',    page: '#f2faf8', header: '#d2ece6', border: '#a9d8cd', accent: '#0f766e' },
  { id: 'violet',  page: '#f8f5ff', header: '#e6dcfb', border: '#cbbaf2', accent: '#7c3aed' },
  { id: 'crimson', page: '#fff5f5', header: '#fbdedb', border: '#f0bcc0', accent: '#b91c1c' },
  { id: 'ember',   page: '#fff8f2', header: '#fbe4d1', border: '#f0ccb2', accent: '#c2410c' },
  { id: 'ink',     page: '#f6f7f8', header: '#232a33', border: '#3d4650', accent: '#e2e8f0' },
  { id: 'forest',  page: '#f4f8f2', header: '#dde9d8', border: '#bcd2b4', accent: '#3f6212' },
]
