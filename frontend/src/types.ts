/**
 * Mirrors backend/app/schemas.py. The API speaks camelCase, so these types
 * match the wire format exactly -- no mapping layer between fetch and state.
 */

export type SectionType =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'custom'

export type TemplateId =
  | 'ats-classic'
  | 'ats-modern'
  | 'compact'
  | 'sidebar'
  | 'banner'
  // -- the design system --
  | 'classic-pro'
  | 'modern-min'
  | 'two-col'
  | 'editorial'
  | 'executive'
  | 'creative'
  | 'devtech'
  | 'academic'
  | 'timeline'
  | 'photo-pro'
  // -- reference replicas --
  | 'portal-pro'
  | 'modern-deep'
  | 'serif-ats'
  | 'jake'
export type PaperSize = 'A4' | 'Letter'

export interface Link {
  id: string
  label: string
  url: string
}

export interface Basics {
  fullName: string
  headline: string
  email: string
  phone: string
  location: string
  website: string
  photoUrl: string | null
  /** Legacy: old documents kept the summary here instead of in a section.
      Migration lifts it out on load; nothing renders from this field anymore. */
  summary: string
  links: Link[]
}

interface ItemBase {
  id: string
  visible: boolean
}

export interface ExperienceItem extends ItemBase {
  position: string
  company: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  bullets: string[]
}

export interface EducationItem extends ItemBase {
  degree: string
  institution: string
  location: string
  startDate: string
  endDate: string
  grade: string
  bullets: string[]
}

export interface SkillGroup extends ItemBase {
  category: string
  skills: string[]
}

export interface ProjectItem extends ItemBase {
  name: string
  role: string
  url: string
  startDate: string
  endDate: string
  bullets: string[]
}

export interface CertificationItem extends ItemBase {
  name: string
  issuer: string
  date: string
  url: string
}

export interface LanguageItem extends ItemBase {
  name: string
  proficiency: string
}

/** One paragraph of the summary section. Several items read as several
    paragraphs under the same heading. */
export interface SummaryItem extends ItemBase {
  summary: string
}

export interface CustomItem extends ItemBase {
  title: string
  subtitle: string
  date: string
  bullets: string[]
}

interface SectionBase {
  id: string
  title: string
  visible: boolean
}

export interface ExperienceSection extends SectionBase {
  type: 'experience'
  items: ExperienceItem[]
}
/** The professional summary: an editable heading plus one paragraph per item. */
export interface SummarySection extends SectionBase {
  type: 'summary'
  items: SummaryItem[]
}
export interface EducationSection extends SectionBase {
  type: 'education'
  items: EducationItem[]
}
/** How a skills section prints: one line per category ("Backend: Python, Go"),
    or every skill flattened into a column grid. */
export type SkillsLayout = 'inline' | 'bullets'
/**
 * The glyph in front of each skill in the column layout. `flat` renders no
 * marker at all -- just the skill names in their columns.
 */
export type SkillMarker = 'bullet' | 'dash' | 'flat'
/** Columns in the flattened skills grid. */
export type SkillsColumns = 1 | 2 | 3 | 4

export interface SkillsSection extends SectionBase {
  type: 'skills'
  items: SkillGroup[]
  layout: SkillsLayout
  /** Ignored by the inline layout, but kept so switching back and forth
      remembers the choice. */
  marker: SkillMarker
  columns: SkillsColumns
}
export interface ProjectsSection extends SectionBase {
  type: 'projects'
  items: ProjectItem[]
}
export interface CertificationsSection extends SectionBase {
  type: 'certifications'
  items: CertificationItem[]
}
export interface LanguagesSection extends SectionBase {
  type: 'languages'
  items: LanguageItem[]
}
export interface CustomSection extends SectionBase {
  type: 'custom'
  items: CustomItem[]
}

/** Discriminated on `type`, so narrowing a section narrows its items too. */
export type Section =
  | ExperienceSection
  | EducationSection
  | SkillsSection
  | ProjectsSection
  | CertificationsSection
  | LanguagesSection
  | CustomSection
  | SummarySection

export type SectionItem = Section['items'][number]

/** Container drawn around each contact icon in the header. Seven treatments,
 *  split three ways: no frame, a solid frame, or an outlined frame, each in
 *  three shapes. */
export type HeaderIconStyle =
  | 'plain'
  | 'circle-fill'
  | 'rounded-fill'
  | 'square-fill'
  | 'circle-line'
  | 'rounded-line'
  | 'square-line'

/**
 * Header card controls. Every field is optional, and "absent" is a real state:
 * it means the template's own designed treatment. A document that never opened
 * the card therefore renders exactly as it did before these controls existed,
 * which is what keeps nineteen designs intact.
 */
export interface HeaderStyle {
  /** Horizontal alignment of the identity block. Applied in split layouts,
   *  where the header sits in a side panel; one-column alignment is still the
   *  header position control. */
  align?: 'left' | 'center' | 'right'
  /** How contact details are arranged: an icon per entry, a bullet between
   *  entries, or a rule between entries. */
  details?: 'icon' | 'bullet' | 'bar'
  /** Frame drawn around each contact icon (only visible with details 'icon'). */
  iconStyle?: HeaderIconStyle
  /** Italic or upright name. */
  nameStyle?: 'normal' | 'italic'
  /** Italic or upright professional title. */
  titleStyle?: 'normal' | 'italic'
  /** Title beside the name on one line, or beneath it. */
  titlePosition?: 'below' | 'same-line'
}

/**
 * Link card controls. Both fields are optional; absent means the design's own
 * treatment, so a document that never opened the card keeps its look.
 */
export interface LinkStyle {
  /** How clickable contact entries are marked: none, a rule, or a dotted rule. */
  decoration?: 'plain' | 'underline' | 'dotted'
  /**
   * Link ink: the surrounding text colour, or a fixed hyperlink blue. `accent`
   * is the legacy spelling of `blue` and still renders as the same blue.
   */
  color?: 'ink' | 'blue' | 'accent'
  /**
   * Header entries that always get the underlined accent treatment, whatever
   * the two fields above say. Empty means every entry follows the card.
   */
  emphasis?: ('email' | 'phone')[]
}

export interface Settings {
  template: TemplateId
  accentColor: string
  fontFamily: string
  /**
   * Optional faces for the name and professional title. Absent means "same as
   * the body", which is how every design already behaves -- choosing a face is
   * the only thing that emits an override.
   */
  nameFont?: string
  titleFont?: string
  fontSize: number
  lineHeight: number
  sectionSpacing: number
  /** Page margins in millimetres: left/right and top/bottom. */
  marginX: number
  marginY: number
  paperSize: PaperSize
  showPhoto: boolean
  /** Icons in front of the contact line entries; off prints plain text. */
  showIcons: boolean
  /**
   * Per-element font size overrides in pt. Null follows the template's own
   * default, which differs per template -- so the null state, not a number,
   * is "as designed".
   */
  nameSize: number | null
  titleSize: number | null
  headingSize: number | null
  entrySize: number | null
  contactSize: number | null

  /** Layout controls */
  columnLayout: 'one' | 'two'
  headerPosition: 'top' | 'left' | 'right' | 'center'
  /** Left column width as percentage (30-70). Right = 100 - columnWidth. */
  columnWidth: number
  /** Section IDs assigned to the left column when columnLayout is 'two'. */
  leftColumn: string[]
  /** Section IDs assigned to the right column when columnLayout is 'two'. */
  rightColumn: string[]

  /** Profile layout controls (reserved for future UI). */
  profileLayout?: {
    /** Where the profile/header block appears: 'top' (full-width) | 'left' | 'right'. */
    position?: 'top' | 'left' | 'right'
    /** Photo alignment within the header: 'left' | 'right' | 'center'. */
    photoAlign?: 'left' | 'right' | 'center'
    /** Contact display: 'inline' (single line) | 'stacked' (one per row). */
    contactDisplay?: 'inline' | 'stacked'
  }

  /** Photo layout controls — independent of columns/sections. */
  photoLayout: {
    /** Show / hide the profile photo on the resume. */
    show: boolean
    /** Apply a grayscale filter to the photo. */
    grayscale: boolean
    /** Photo position relative to the profile/header text. `bottom` is only
     *  used inside a side header, where it means "below name & title". */
    position: 'left' | 'top' | 'right' | 'center' | 'bottom'
    /** Photo size in millimetres. */
    size: number
    /** Photo shape. */
    shape: 'circle' | 'square' | 'rounded'
    /** Crop focal point, as percentages of the source image. */
    focusX: number
    focusY: number
    /** Crop zoom multiplier used by the photo adjustment dialog. */
    zoom: number
    /** Border around the photo. */
    border: boolean
    /** Border width in pt. */
    borderWidth: number
    /** Border colour as CSS value. */
    borderColor: string
  }

  /** Section heading visual controls. */
  headingStyle: {
    /**
     * Visual style of section headings.  The last four ids are the ones old
     * builds wrote; they still type-check so saved documents keep opening, and
     * `resolveHeadingVisual` maps them onto the current eight.
     */
    visual:
      | 'underline'
      | 'band'
      | 'inline'
      | 'double'
      | 'bar'
      | 'plain'
      | 'rule'
      | 'wavy'
      | 'none'
      | 'boxed'
      | 'bold'
      | 'accent-bar'
    /** Text capitalisation of section headings. */
    capitalization: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
    /** Show icons next to section headings. */
    showIcons: boolean
    /** Icon visual style. */
    iconStyle: 'filled' | 'outlined'
  }

  /** Header card controls. Absent means each template's own treatment. */
  headerStyle?: HeaderStyle

  /**
   * Link styling for the contact line's clickable entries. Absent means the
   * design's own treatment -- most templates print links as plain ink, Jake
   * underlines them -- so untouched documents keep their look.
   */
  linkStyle?: LinkStyle

  /**
   * Colors card state. Undefined fields mean "template default" — the resume
   * keeps its designed look until a value is explicitly chosen.
   */
  colors?: ColorsState
}

/** Which surface the Colors card is editing. */
export type ColorTarget = 'full' | 'header' | 'border'

/** Full Page treatment: a single accent, a preset scheme, or a photo. */
export type FullPageMode = 'single' | 'multi' | 'image'

/** Border treatment: a painted frame or a photographic one. */
export type BorderMode = 'single' | 'image'

/** Frame thickness presets, measured in millimetres on the sheet. */
export type BorderSize = 'S' | 'M' | 'L'

/** Which edges of the sheet the frame occupies. */
export interface BorderSides {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

export interface ColorsState {
  /** Which Colors tab is in effect. Only that tab's treatment is rendered, so
      switching tabs can never leave a header band or frame behind. Defaults to
      'full'. */
  activeTarget?: ColorTarget

  /** Full page treatment. Defaults to 'single'. */
  bgType: FullPageMode

  // -- Full Page · Single ------------------------------------------------
  /** Accent swatch id, or 'default' to follow the template's own accent. */
  singlePresetId?: string
  /** The accent Single owns, kept separate from a Multi scheme's accent so
      switching treatments back and forth never leaves the wrong ink behind. */
  singleAccent?: string

  // -- Full Page · Multi -------------------------------------------------
  /** Multi scheme id, or 'custom' once a colour is hand-picked. */
  multiPresetId?: string
  /** The accent Multi owns, restored when returning from another treatment. */
  multiAccent?: string
  /** Body ink for the multi scheme. */
  textColor?: string
  /** Page background for the multi scheme (solid or gradient). */
  backgroundColor?: string
  /** Optional header/rail fill for the multi scheme. */
  headerColor?: string

  // -- Full Page · Image -------------------------------------------------
  /** Uploaded or curated background image URL. */
  bgImage?: string
  /** Dark overlay strength, 0–1. */
  bgImageTint?: number

  // -- Header ------------------------------------------------------------
  /** Header treatment. Defaults to 'single'. */
  headerType?: FullPageMode
  /** Header Single accent id, 'default' for the template accent, or 'none'. */
  headerSingleId?: string
  /** The fill Header · Single owns, kept through a detour into Multi. */
  headerSingleColor?: string
  /** Header Multi scheme id, or 'custom' once a colour is hand-picked. */
  headerPresetId?: string
  /** The header band's fill. */
  headerBackgroundColor?: string
  /** Ink used on the header band. */
  headerTextColor?: string
  /** Accent the header scheme owns (shared with the document accent). */
  headerAccentColor?: string
  /** Header Multi · Custom: body ink for the page below the header. */
  headerPageTextColor?: string
  /** Header Multi · Custom: page background below the header. */
  headerPageBackgroundColor?: string
  /** Header Multi · Custom: page accent below the header. */
  headerPageAccentColor?: string
  /** Header Image background image URL. */
  headerBgImage?: string
  /** Header image overlay strength, 0–1. */
  headerBgImageTint?: number

  // -- Border ------------------------------------------------------------
  /** Border treatment. Defaults to 'single'. */
  borderType?: BorderMode
  /** Border Single swatch id, 'custom' once hand-picked, or 'none'. */
  borderSingleId?: string
  /** The fill Border · Single owns, kept through a detour into Image. */
  borderSingleColor?: string
  /** Frame thickness preset. Defaults to 'M'. */
  borderSize?: BorderSize
  /** Edges the frame occupies. Defaults to all four. */
  borderSides?: BorderSides
  /** Border Image source URL. */
  borderBgImage?: string
  /** Accent colours sampled from the border image. */
  borderPalette?: string[]

  // -- Legacy keys -------------------------------------------------------
  /** Retained so old documents load; not applied while bgType is 'single'. */
  page?: string
  header?: string
  border?: string
  /** Retained for backwards compatibility; superseded by singlePresetId. */
  presetId?: string

  /** Where the accent colour is allowed to reach. All default to on, so an
      untouched document looks exactly as each template designed it. */
  apply: {
    name: boolean
    dots: boolean
    jobTitle: boolean
    dates: boolean
    headings: boolean
    entrySubtitle: boolean
    headerIcons: boolean
    linkIcons: boolean
  }
}

export interface ResumeDocument {
  basics: Basics
  sections: Section[]
  settings: Settings
}

export interface ResumeSummary {
  id: string
  name: string
  template: string
  createdAt: string
  updatedAt: string
}

export interface Resume extends ResumeSummary {
  document: ResumeDocument
}
