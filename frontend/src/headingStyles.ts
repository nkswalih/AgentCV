/**
 * Section-heading styles.
 *
 * One list drives both the editor card and the sheet: the card draws a
 * miniature from the same id the document root publishes in
 * `data-heading-visual`, so a tile can never describe a look the page does not
 * produce.
 *
 * Ids from earlier builds resolve onto these eight. That keeps an old document
 * opening with a treatment the card can show as selected instead of a blank
 * grid.
 */
export type HeadingVisual =
  | 'underline'
  | 'band'
  | 'inline'
  | 'double'
  | 'bar'
  | 'plain'
  | 'rule'
  | 'wavy'

export type HeadingVisualOption = {
  value: HeadingVisual
  label: string
  hint: string
}

export const HEADING_VISUALS: readonly HeadingVisualOption[] = [
  {
    value: 'underline',
    label: 'Underline',
    hint: 'A full-width rule directly beneath the heading.',
  },
  {
    value: 'band',
    label: 'Filled band',
    hint: 'The heading sits in a soft tinted strip.',
  },
  {
    value: 'inline',
    label: 'Short underline',
    hint: 'A rule that stops at the end of the words.',
  },
  {
    value: 'double',
    label: 'Rules above and below',
    hint: 'The heading is held between two hairlines.',
  },
  {
    value: 'bar',
    label: 'Accent bar',
    hint: 'A short, thick bar under the first words.',
  },
  {
    value: 'plain',
    label: 'Plain',
    hint: 'No ornament: weight alone carries the heading.',
  },
  {
    value: 'rule',
    label: 'Rule below',
    hint: 'A quiet hairline set below the heading with air around it.',
  },
  {
    value: 'wavy',
    label: 'Wavy underline',
    hint: 'A hand-ruled wave beneath the heading.',
  },
]

/** Ids that older builds wrote into saved documents. */
const LEGACY_VISUALS: Record<string, HeadingVisual> = {
  none: 'plain',
  bold: 'plain',
  boxed: 'band',
  'accent-bar': 'bar',
}

const KNOWN = new Set<string>(HEADING_VISUALS.map((option) => option.value))

/**
 * Resolve a stored id onto one of the eight current styles. Unknown values
 * fall back to Underline, the shipped default, so a corrupt or future id never
 * leaves the sheet without a heading treatment.
 */
export function resolveHeadingVisual(value: string | null | undefined): HeadingVisual {
  if (!value) return 'underline'
  if (value in LEGACY_VISUALS) return LEGACY_VISUALS[value]
  return (KNOWN.has(value) ? value : 'underline') as HeadingVisual
}
