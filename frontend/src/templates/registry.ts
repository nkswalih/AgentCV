/** Template registry: the design system, its metadata, and its fonts. */

import type { BorderSize, TemplateId } from '../types'

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

/**
 * Single is the default Full Page treatment: one ink that reaches the name,
 * headings and the other elements switched on in "Apply Accent Color". It never
 * paints the sheet itself -- the template keeps its own paper.
 */
export const SINGLE_ACCENTS: { id: string; label: string; value: string }[] = [
  { id: 'ink', label: 'Ink', value: '#191e24' },
  { id: 'graphite', label: 'Graphite', value: '#374151' },
  { id: 'royal', label: 'Royal', value: '#1d4ed8' },
  { id: 'blue', label: 'Blue', value: '#2563eb' },
  { id: 'cyan', label: 'Cyan', value: '#0891b2' },
  { id: 'teal', label: 'Teal', value: '#0f766e' },
  { id: 'green', label: 'Green', value: '#15803d' },
  { id: 'olive', label: 'Olive', value: '#4d7c0f' },
  { id: 'amber', label: 'Amber', value: '#b45309' },
  { id: 'rust', label: 'Rust', value: '#c2410c' },
  { id: 'crimson', label: 'Crimson', value: '#b91c1c' },
  { id: 'rose', label: 'Rose', value: '#be123c' },
  { id: 'violet', label: 'Violet', value: '#7c3aed' },
  { id: 'purple', label: 'Purple', value: '#9333ea' },
]

/**
 * Multi presets repaint the whole sheet. Each scheme carries its own ink and
 * accent so the result stays readable instead of tinting a template blindly.
 */
export interface MultiPreset {
  id: string
  label: string
  /** CSS background — solid colour or layered gradient. */
  background: string
  /** First stop, used to seed the custom colour picker. */
  solid: string
  /** Body ink. */
  text: string
  /** Accent for the name, headings and other switched-on elements. */
  accent: string
}

export const MULTI_PRESETS: MultiPreset[] = [
  {
    id: 'slate',
    label: 'Slate',
    background: 'linear-gradient(150deg, #f8fafc 0%, #e2e8f0 100%)',
    solid: '#eef2f7',
    text: '#0f172a',
    accent: '#1d4ed8',
  },
  {
    id: 'ink',
    label: 'Ink',
    background: 'linear-gradient(150deg, #1e293b 0%, #0b1220 100%)',
    solid: '#131c2b',
    text: '#f8fafc',
    accent: '#93c5fd',
  },
  {
    id: 'forest',
    label: 'Forest',
    background: 'linear-gradient(150deg, #f1f8f3 0%, #d7e9dc 100%)',
    solid: '#e4f0e8',
    text: '#14281c',
    accent: '#15803d',
  },
  {
    id: 'sand',
    label: 'Sand',
    background: 'linear-gradient(150deg, #fdf8f1 0%, #f0e2cd 100%)',
    solid: '#f6ecdb',
    text: '#3b2f21',
    accent: '#b45309',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    background: 'linear-gradient(150deg, #eef7fc 0%, #d0e7f4 100%)',
    solid: '#e1f0f9',
    text: '#0b2b3c',
    accent: '#0369a1',
  },
  {
    id: 'plum',
    label: 'Plum',
    background: 'linear-gradient(150deg, #1f1230 0%, #3b1d57 100%)',
    solid: '#2a1640',
    text: '#f5eefc',
    accent: '#d8b4fe',
  },
  {
    id: 'rose',
    label: 'Rose',
    background: 'linear-gradient(150deg, #fdf5f6 0%, #f4dde2 100%)',
    solid: '#f8e6ea',
    text: '#3d1520',
    accent: '#be123c',
  },
  {
    id: 'charcoal',
    label: 'Charcoal',
    background: 'linear-gradient(150deg, #2b3138 0%, #14181d 100%)',
    solid: '#1d2329',
    text: '#f1f5f9',
    accent: '#fbbf24',
  },
]

/**
 * Header presets are band schemes, not page schemes: each one owns the header's
 * fill, its ink and the accent the rest of the page inherits. The body stays on
 * the template's own paper, which is what separates Header · Multi from the
 * Full Page treatment.
 */
export interface HeaderPreset {
  id: string
  label: string
  /** Header band fill. */
  background: string
  /** Header ink. */
  text: string
  /** Accent for headings and the other switched-on elements. */
  accent: string
}

export const HEADER_PRESETS: HeaderPreset[] = [
  { id: 'slate', label: 'Slate', background: '#1e293b', text: '#f8fafc', accent: '#93c5fd' },
  { id: 'ink', label: 'Ink', background: '#0b1220', text: '#f8fafc', accent: '#cbd5e1' },
  { id: 'forest', label: 'Forest', background: '#14532d', text: '#f0fdf4', accent: '#86efac' },
  { id: 'ocean', label: 'Ocean', background: '#0c4a6e', text: '#ecfeff', accent: '#7dd3fc' },
  { id: 'plum', label: 'Plum', background: '#3b1d57', text: '#f5eefc', accent: '#d8b4fe' },
  { id: 'rose', label: 'Rose', background: '#9f1239', text: '#fff1f2', accent: '#fda4af' },
  { id: 'sand', label: 'Sand', background: '#f3e7d3', text: '#3b2f21', accent: '#b45309' },
  { id: 'charcoal', label: 'Charcoal', background: '#1f2937', text: '#f1f5f9', accent: '#fbbf24' },
]

/**
 * Frame thickness presets. Millimetres on the sheet, so the preview, the PDF
 * and the exported HTML all draw the same physical frame.
 */
export const BORDER_SIZES: { id: BorderSize; label: string; mm: number }[] = [
  { id: 'S', label: 'S', mm: 3 },
  { id: 'M', label: 'M', mm: 5 },
  { id: 'L', label: 'L', mm: 8 },
]


/**
 * Curated backdrops ship with the app, so Image mode works offline and a PDF
 * never waits on a third-party host. Uploads are stored beside them.
 */
export interface BackgroundImage {
  id: string
  label: string
  src: string
  /** A little darker than a thumbnail, for white text legibility. */
  tone: 'dark' | 'light'
}

export const BACKGROUND_GALLERY: BackgroundImage[] = [
  { id: 'midnight', label: 'Midnight', src: '/backgrounds/midnight.svg', tone: 'dark' },
  { id: 'forest', label: 'Forest', src: '/backgrounds/forest.svg', tone: 'dark' },
  { id: 'plum', label: 'Plum', src: '/backgrounds/plum.svg', tone: 'dark' },
  { id: 'terracotta', label: 'Terracotta', src: '/backgrounds/terracotta.svg', tone: 'dark' },
  { id: 'slate', label: 'Slate', src: '/backgrounds/slate.svg', tone: 'dark' },
  { id: 'teal', label: 'Teal', src: '/backgrounds/teal.svg', tone: 'dark' },
  { id: 'charcoal', label: 'Charcoal', src: '/backgrounds/charcoal.svg', tone: 'dark' },
  { id: 'burgundy', label: 'Burgundy', src: '/backgrounds/burgundy.svg', tone: 'dark' },
]
