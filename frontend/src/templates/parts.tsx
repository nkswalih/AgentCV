/** Shared building blocks used by every resume template. */

import { Fragment, type CSSProperties, type ReactNode } from 'react'

import type {
  Basics,
  CertificationItem,
  CustomItem,
  EducationItem,
  ExperienceItem,
  LanguageItem,
  ProjectItem,
  Section,
  SectionItem,
  SectionType,
  SkillGroup,
  SkillsSection,
  SummaryItem,
} from '../types'
import { DocIcon, iconForLink, type DocIconName } from './doc-icons'

/**
 * Every field that carries visible text, per section type.
 *
 * Empty fields render as nothing at all -- no label, no grey filler. A resume
 * shows only what its author actually typed, so the preview reads like the
 * finished document instead of like a form with prompts left in it.
 */
function textOf(type: SectionType, item: SectionItem): string[] {
  switch (type) {
    case 'summary': {
      const i = item as SummaryItem
      return [i.summary]
    }
    case 'experience': {
      const i = item as ExperienceItem
      return [i.position, i.company, i.location, i.startDate, i.endDate, ...i.bullets]
    }
    case 'education': {
      const i = item as EducationItem
      return [i.degree, i.institution, i.location, i.grade, i.startDate, i.endDate, ...i.bullets]
    }
    case 'skills': {
      const i = item as SkillGroup
      return [i.category, ...i.skills]
    }
    case 'projects': {
      const i = item as ProjectItem
      return [i.name, i.role, i.url, i.startDate, i.endDate, ...i.bullets]
    }
    case 'certifications': {
      const i = item as CertificationItem
      return [i.name, i.issuer, i.date]
    }
    case 'languages': {
      const i = item as LanguageItem
      return [i.name, i.proficiency]
    }
    case 'custom': {
      const i = item as CustomItem
      return [i.title, i.subtitle, i.date, ...i.bullets]
    }
  }
}

/**
 * The entries a section actually contributes. An entry the author has not
 * filled in yet is dropped rather than drawn as a blank gap -- an "on" toggle
 * with nothing typed into it is an intention, not content.
 */
function visibleItems(section: Section): SectionItem[] {
  return section.items.filter((i) => i.visible && textOf(section.type, i).some((v) => v.trim() !== ''))
}

/** "Jan 2024 — Present", collapsing gracefully when either end is missing. */
function dateRange(start: string, end: string, current?: boolean) {
  const to = current ? 'Present' : end.trim()
  if (!start.trim() && !to) return ''
  if (!start.trim()) return to
  if (!to) return start
  return `${start} — ${to}`
}

/** Whether the author has given us anything to put on a contact line. */
export function hasContact(basics: Basics) {
  return (
    [basics.email, basics.phone, basics.location, basics.website].some((p) => p.trim() !== '') ||
    basics.links.some((l) => l.url.trim() !== '' || l.label.trim() !== '')
  )
}

/** "https://" prefix for a domain the author typed bare. */
function normalizeUrl(url: string): string {
  const value = url.trim()
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

interface ContactEntry {
  key: string
  icon: DocIconName
  text: string
  href?: string
}

/**
 * Every contact line entry, already resolved to its link target: email dials a
 * mailto, phone a tel, everything web-shaped gets an https prefix it can click
 * through. Empty fields contribute nothing.
 */
function contactEntries(basics: Basics): ContactEntry[] {
  const entries: ContactEntry[] = []

  const email = basics.email.trim()
  if (email) entries.push({ key: 'email', icon: 'mail', text: email, href: `mailto:${email}` })

  const phone = basics.phone.trim()
  if (phone) {
    // Keep digits and the leading +; everything else is formatting.
    const tel = phone.replace(/[^\d+]/g, '')
    entries.push({ key: 'phone', icon: 'phone', text: phone, href: `tel:${tel}` })
  }

  const location = basics.location.trim()
  if (location) entries.push({ key: 'location', icon: 'pin', text: location })

  const website = basics.website.trim()
  if (website)
    entries.push({ key: 'website', icon: 'globe', text: website, href: normalizeUrl(website) })

  for (const link of basics.links) {
    const url = link.url.trim()
    const label = link.label.trim()
    if (!url && !label) continue
    entries.push({
      key: link.id,
      icon: iconForLink(label, url),
      text: label || url,
      href: url ? normalizeUrl(url) : undefined,
    })
  }

  return entries
}

/** Contact line: clickable entries, optional icons. Only non-empty parts appear. */
export function Contact({
  basics,
  stacked,
  icons = false,
}: {
  basics: Basics
  stacked?: boolean
  icons?: boolean
}) {
  const entries = contactEntries(basics)
  if (entries.length === 0) return null

  const renderEntry = (entry: ContactEntry) => {
    const content = icons ? (
      <span className="doc-contact-item">
        <DocIcon name={entry.icon} />
        {entry.text}
      </span>
    ) : (
      entry.text
    )
    return entry.href ? (
      <a className="doc-link" href={entry.href}>
        {content}
      </a>
    ) : (
      <span>{content}</span>
    )
  }

  if (stacked) {
    return <div className="doc-contact">{entries.map((e) => <Fragment key={e.key}>{renderEntry(e)}</Fragment>)}</div>
  }

  const nodes: ReactNode[] = []
  entries.forEach((entry, i) => {
    if (i > 0)
      nodes.push(
        <span className="doc-contact-sep" key={`sep-${entry.key}`}>
          ·
        </span>,
      )
    nodes.push(renderEntry(entry))
  })
  return <div className="doc-contact">{nodes}</div>
}

function Bullets({ bullets }: { bullets: string[] }) {
  const filled = bullets.filter((b) => b.trim() !== '')
  if (filled.length === 0) return null
  return (
    <ul className="doc-bullets">
      {filled.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  )
}

/**
 * Title / subtitle / date, the shape almost every entry type shares. Each slot
 * disappears when empty, and the flex row simply has one fewer child -- which is
 * why a missing date leaves no hole where it would have sat.
 */
function ItemHead({
  title,
  sub,
  meta,
  date,
}: {
  title: string
  sub?: string
  meta?: string
  date?: string
}) {
  const hasSub = !!sub?.trim()
  const hasMeta = !!meta?.trim()
  return (
    <div className="doc-item-head">
      <div>
        {title.trim() && <div className="doc-item-title">{title}</div>}
        {(hasSub || hasMeta) && (
          <div className="doc-item-sub">
            {hasSub && sub}
            {hasMeta && (
              <span className="doc-item-meta">
                {hasSub ? ' · ' : ''}
                {meta}
              </span>
            )}
          </div>
        )}
      </div>
      {date?.trim() && <div className="doc-item-date">{date}</div>}
    </div>
  )
}

function Experience({ item }: { item: ExperienceItem }) {
  return (
    <div className="doc-item">
      <ItemHead
        title={item.position}
        sub={item.company}
        meta={item.location}
        date={dateRange(item.startDate, item.endDate, item.current)}
      />
      <Bullets bullets={item.bullets} />
    </div>
  )
}

function Education({ item }: { item: EducationItem }) {
  return (
    <div className="doc-item">
      <ItemHead
        title={item.degree}
        sub={item.institution}
        meta={item.location}
        date={dateRange(item.startDate, item.endDate)}
      />
      {item.grade.trim() && <div className="doc-item-meta">{item.grade}</div>}
      <Bullets bullets={item.bullets} />
    </div>
  )
}

function Skills({ item, tags }: { item: SkillGroup; tags?: boolean }) {
  const skills = item.skills.filter((s) => s.trim() !== '')
  const label = item.category.trim()

  return (
    <div className="doc-skillgroup">
      {label && <span className="doc-skillgroup-label">{label}</span>}
      {tags ? (
        skills.length > 0 && (
          <div className="doc-taglist">
            {skills.map((s) => (
              <span className="doc-tag" key={s}>
                {s}
              </span>
            ))}
          </div>
        )
      ) : (
        skills.length > 0 && (
          <span>
            {label ? ': ' : ''}
            {skills.join(', ')}
          </span>
        )
      )}
    </div>
  )
}

function Project({ item }: { item: ProjectItem }) {
  return (
    <div className="doc-item">
      <ItemHead
        title={item.name}
        sub={item.role}
        meta={item.url}
        date={dateRange(item.startDate, item.endDate)}
      />
      <Bullets bullets={item.bullets} />
    </div>
  )
}

function Certification({ item }: { item: CertificationItem }) {
  return (
    <div className="doc-item">
      <ItemHead title={item.name} sub={item.issuer} date={item.date} />
    </div>
  )
}

function Language({ item }: { item: LanguageItem }) {
  return (
    <div className="doc-langrow">
      <span>{item.name}</span>
      {item.proficiency.trim() && <span className="doc-item-meta">{item.proficiency}</span>}
    </div>
  )
}

function Custom({ item }: { item: CustomItem }) {
  return (
    <div className="doc-item">
      <ItemHead title={item.title} sub={item.subtitle} date={item.date} />
      <Bullets bullets={item.bullets} />
    </div>
  )
}

/**
 * Renders a section's items. `tags` switches skills to pill form, which suits
 * the narrow sidebar rail but wastes space in a full-width column.
 */
export function SectionBody({ section, tags }: { section: Section; tags?: boolean }) {
  const items = visibleItems(section)

  switch (section.type) {
    case 'summary':
      // Each item is its own paragraph under the section's heading.
      return items.map((i) => <SummaryParagraph key={i.id} item={i as SummaryItem} />)
    case 'experience':
      return items.map((i) => <Experience key={i.id} item={i as ExperienceItem} />)
    case 'education':
      return items.map((i) => <Education key={i.id} item={i as EducationItem} />)
    case 'skills': {
      const s = section as SkillsSection
      // Column mode: every group's skills merge into one flat grid and the
      // category names drop out -- the columns themselves are the structure.
      // The sidebar's pill default is overridden here too: an explicit choice
      // in the panel outranks a template default.
      if (s.layout === 'bullets') {
        const seen = new Set<string>()
        const flat: string[] = []
        for (const group of items as SkillGroup[]) {
          for (const skill of group.skills) {
            const name = skill.trim()
            if (name !== '' && !seen.has(name)) {
              seen.add(name)
              flat.push(name)
            }
          }
        }
        if (flat.length === 0) return null
        return (
          <ul
            className="doc-skill-bullets"
            data-marker={s.marker}
            style={{ '--skill-cols': s.columns } as CSSProperties}
          >
            {flat.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        )
      }
      return items.map((i) => <Skills key={i.id} item={i as SkillGroup} tags={tags} />)
    }
    case 'projects':
      return items.map((i) => <Project key={i.id} item={i as ProjectItem} />)
    case 'certifications':
      return items.map((i) => <Certification key={i.id} item={i as CertificationItem} />)
    case 'languages':
      return items.map((i) => <Language key={i.id} item={i as LanguageItem} />)
    case 'custom':
      return items.map((i) => <Custom key={i.id} item={i as CustomItem} />)
  }
}

/**
 * A section with its heading. Nothing renders when the section is hidden or
 * when none of its entries have been filled in -- a bare heading over empty
 * space is the same noise as a placeholder.
 */
export function DocSection({ section, tags }: { section: Section; tags?: boolean }) {
  if (!section.visible) return null
  if (visibleItems(section).length === 0) return null
  return (
    <section className="doc-section">
      <h2 className="doc-section-title">{section.title}</h2>
      <SectionBody section={section} tags={tags} />
    </section>
  )
}

function SummaryParagraph({ item }: { item: SummaryItem }) {
  if (!item.summary.trim()) return null
  return <p className="doc-summary">{item.summary}</p>
}
