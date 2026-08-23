/**
 * Mirrors backend/app/schemas.py. The API speaks camelCase, so these types
 * match the wire format exactly -- no mapping layer between fetch and state.
 */

export type SectionType =
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'custom'

export type TemplateId = 'modern' | 'classic' | 'compact' | 'elegant' | 'minimal'
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
export interface EducationSection extends SectionBase {
  type: 'education'
  items: EducationItem[]
}
export interface SkillsSection extends SectionBase {
  type: 'skills'
  items: SkillGroup[]
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

export type SectionItem = Section['items'][number]

export interface Settings {
  template: TemplateId
  accentColor: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  sectionSpacing: number
  paperSize: PaperSize
  showPhoto: boolean
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
