/**
 * The bridge between an uploaded resume and the document the editor edits.
 *
 * The server reads any file down to plain text and returns one neutral shape:
 * no ids, no settings, no template. This module owns the other half -- turning
 * that shape into real sections with fresh ids, and pouring them into the
 * document of whichever template the author chose. Nothing here guesses at
 * presentation: the template keeps its own design, and only the content moves.
 */

import { applyTemplatePreset, newId } from './factories'
import type {
  Basics,
  CustomSection,
  ExperienceSection,
  ResumeDocument,
  Section,
  TemplateId,
} from './types'

export interface ExtractedLink {
  label: string
  url: string
}

export interface ExtractedBasics {
  fullName: string
  headline: string
  email: string
  phone: string
  location: string
  website: string
  links: ExtractedLink[]
}

export interface ExtractedExperience {
  position: string
  company: string
  location: string
  startDate: string
  endDate: string
  current: boolean
  bullets: string[]
}

export interface ExtractedEducation {
  degree: string
  institution: string
  location: string
  startDate: string
  endDate: string
  grade: string
  bullets: string[]
}

export interface ExtractedSkillGroup {
  category: string
  skills: string[]
}

export interface ExtractedProject {
  name: string
  role: string
  url: string
  startDate: string
  endDate: string
  bullets: string[]
}

export interface ExtractedCertification {
  name: string
  issuer: string
  date: string
  url: string
}

export interface ExtractedLanguage {
  name: string
  proficiency: string
}

export interface ExtractedCustomItem {
  title: string
  subtitle: string
  date: string
  bullets: string[]
}

export interface ExtractedCustomSection {
  title: string
  items: ExtractedCustomItem[]
}

/** Everything the reader recovered, before any template is involved. */
export interface ExtractedDocument {
  basics: ExtractedBasics
  summary: string[]
  experience: ExtractedExperience[]
  education: ExtractedEducation[]
  skills: ExtractedSkillGroup[]
  projects: ExtractedProject[]
  certifications: ExtractedCertification[]
  languages: ExtractedLanguage[]
  custom: ExtractedCustomSection[]
  warnings: string[]
  /** Section keys in the order the source printed them. */
  order?: string[]
}

export interface ExtractResult {
  format: 'pdf' | 'docx' | 'txt' | 'tex'
  filename: string
  characters: number
  document: ExtractedDocument
}

const FORMAT_LABELS: Record<ExtractResult['format'], string> = {
  pdf: 'PDF',
  docx: 'Word document',
  txt: 'text file',
  tex: 'LaTeX source',
}

export const formatLabel = (format: ExtractResult['format']) => FORMAT_LABELS[format]

/** A canonical heading per section kind, matching what the editor uses. */
const TITLES = {
  summary: 'Summary',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
} as const

const clean = (value: string | undefined | null) => (value ?? '').trim()

const nonEmpty = (values: string[] | undefined) =>
  (values ?? []).map(clean).filter(Boolean)

const kept = <T>(values: T[] | undefined): T[] => {
  if (!values) return []
  return values.filter((value) => {
    const record = value as unknown as Record<string, unknown>
    return Object.entries(record).some(([key, field]) => {
      if (key === 'bullets') return false
      if (typeof field === 'string') return field.trim().length > 0
      if (typeof field === 'boolean') return false
      return false
    }) || (Array.isArray(record.bullets) && (record.bullets as string[]).some((b) => b.trim()))
  })
}

/**
 * Turn the neutral payload into sections, in the order the source used.
 *
 * Empty sections are dropped rather than created blank: a resume with no
 * projects should not gain an empty Projects heading. Ids are minted here so
 * every item is editable the moment the document opens.
 */
export function buildSections(extracted: ExtractedDocument): Section[] {
  const sections: Record<string, Section | null> = {
    summary: extracted.summary.some((p) => clean(p))
      ? {
          id: newId(),
          type: 'summary',
          title: TITLES.summary,
          visible: true,
          items: extracted.summary
            .filter((p) => clean(p))
            .map((paragraph) => ({ id: newId(), visible: true, summary: clean(paragraph) })),
        }
      : null,

    experience: kept(extracted.experience).length
      ? ({
          id: newId(),
          type: 'experience',
          title: TITLES.experience,
          visible: true,
          items: kept(extracted.experience).map((item) => ({
            id: newId(),
            visible: true,
            position: clean(item.position),
            company: clean(item.company),
            location: clean(item.location),
            startDate: clean(item.startDate),
            endDate: clean(item.endDate),
            current: Boolean(item.current),
            bullets: nonEmpty(item.bullets),
          })),
        } satisfies ExperienceSection)
      : null,

    education: kept(extracted.education).length
      ? {
          id: newId(),
          type: 'education',
          title: TITLES.education,
          visible: true,
          items: kept(extracted.education).map((item) => ({
            id: newId(),
            visible: true,
            degree: clean(item.degree),
            institution: clean(item.institution),
            location: clean(item.location),
            startDate: clean(item.startDate),
            endDate: clean(item.endDate),
            grade: clean(item.grade),
            bullets: nonEmpty(item.bullets),
          })),
        }
      : null,

    skills: extracted.skills.filter((group) => group.skills.some((s) => clean(s))).length
      ? {
          id: newId(),
          type: 'skills',
          title: TITLES.skills,
          visible: true,
          layout: 'inline',
          marker: 'bullet',
          columns: 2,
          items: extracted.skills
            .filter((group) => group.skills.some((s) => clean(s)))
            .map((group) => ({
              id: newId(),
              visible: true,
              category: clean(group.category),
              skills: nonEmpty(group.skills),
            })),
        }
      : null,

    projects: kept(extracted.projects).length
      ? {
          id: newId(),
          type: 'projects',
          title: TITLES.projects,
          visible: true,
          items: kept(extracted.projects).map((item) => ({
            id: newId(),
            visible: true,
            name: clean(item.name),
            role: clean(item.role),
            url: clean(item.url),
            startDate: clean(item.startDate),
            endDate: clean(item.endDate),
            bullets: nonEmpty(item.bullets),
          })),
        }
      : null,

    certifications: kept(extracted.certifications).length
      ? {
          id: newId(),
          type: 'certifications',
          title: TITLES.certifications,
          visible: true,
          items: kept(extracted.certifications).map((item) => ({
            id: newId(),
            visible: true,
            name: clean(item.name),
            issuer: clean(item.issuer),
            date: clean(item.date),
            url: clean(item.url),
          })),
        }
      : null,

    languages: kept(extracted.languages).length
      ? {
          id: newId(),
          type: 'languages',
          title: TITLES.languages,
          visible: true,
          items: kept(extracted.languages).map((item) => ({
            id: newId(),
            visible: true,
            name: clean(item.name),
            proficiency: clean(item.proficiency),
          })),
        }
      : null,
  }

  const custom: CustomSection[] = extracted.custom
    .filter((section) => kept(section.items).length)
    .map((section) => ({
      id: newId(),
      type: 'custom' as const,
      title: clean(section.title) || 'Additional',
      visible: true,
      items: kept(section.items).map((item) => ({
        id: newId(),
        visible: true,
        title: clean(item.title),
        subtitle: clean(item.subtitle),
        date: clean(item.date),
        bullets: nonEmpty(item.bullets),
      })),
    }))

  const byKey = new Map<string, Section>()
  for (const [kind, section] of Object.entries(sections)) {
    if (section) byKey.set(kind, section)
  }
  for (const section of custom) byKey.set(`custom:${section.title}`, section)

  // Follow the source's own outline where it is known, then append anything
  // the payload held that the outline did not mention.
  const ordered: Section[] = []
  for (const key of extracted.order ?? []) {
    const section = byKey.get(key)
    if (section) {
      ordered.push(section)
      byKey.delete(key)
    }
  }
  for (const section of byKey.values()) ordered.push(section)
  return ordered
}

/** Basics in the editor's shape, with fresh ids for the link rows. */
export function buildBasics(extracted: ExtractedBasics): Basics {
  const links = extracted.links
    .filter((link) => clean(link.url))
    .map((link) => ({
      id: newId(),
      label: clean(link.label) || 'Link',
      url: clean(link.url),
    }))
  return {
    fullName: clean(extracted.fullName),
    headline: clean(extracted.headline),
    email: clean(extracted.email),
    phone: clean(extracted.phone),
    location: clean(extracted.location),
    website: clean(extracted.website),
    photoUrl: null,
    summary: '',
    links,
  }
}

/**
 * Put extracted content into an existing document.
 *
 * The base document supplies the template's settings -- font, margins, accent,
 * columns -- so the imported page is the design the author picked. Only the
 * author's content is replaced.
 */
export function importedDocument(base: ResumeDocument, extracted: ExtractedDocument): ResumeDocument {
  return {
    ...base,
    basics: buildBasics(extracted.basics),
    sections: buildSections(extracted),
  }
}

/**
 * The document a new resume starts from: the chosen design's preset with the
 * starter sections and nothing typed in them.
 */
export function scratchDocument(
  base: ResumeDocument,
  template: TemplateId,
): ResumeDocument {
  return {
    ...base,
    settings: { ...base.settings, ...applyTemplatePreset(template) },
  }
}

/** The design's own preset applied to a created document, content untouched. */
export function withPreset(base: ResumeDocument, template: TemplateId): ResumeDocument {
  return {
    ...base,
    settings: { ...base.settings, ...applyTemplatePreset(template) },
  }
}

/** A filename suitable as a resume name, minus its extension. */
export function resumeNameFromFile(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  if (!stem) return 'Imported resume'
  return stem.charAt(0).toUpperCase() + stem.slice(1)
}
