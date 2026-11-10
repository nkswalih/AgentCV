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

export interface Settings {
  template: TemplateId
  accentColor: string
  fontFamily: string
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
    /** Photo position relative to the profile/header text. */
    position: 'left' | 'top' | 'right'
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
    /** Visual style of section headings. */
    visual: 'none' | 'underline' | 'boxed' | 'bold' | 'accent-bar'
    /** Text capitalisation of section headings. */
    capitalization: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
    /** Show icons next to section headings. */
    showIcons: boolean
    /** Icon visual style. */
    iconStyle: 'filled' | 'outlined'
  }

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

export interface ColorsState {
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
