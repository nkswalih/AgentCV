/** Shared building blocks used by every resume template. */

import type {
  Basics,
  CertificationItem,
  CustomItem,
  EducationItem,
  ExperienceItem,
  LanguageItem,
  ProjectItem,
  Section,
  SkillGroup,
} from '../types'

/** Renders muted filler in the editor preview; hidden in the exported PDF. */
export function Placeholder({ children }: { children: string }) {
  return <span className="doc-placeholder">{children}</span>
}

function orPlaceholder(value: string, placeholder: string) {
  return value.trim() ? value : <Placeholder>{placeholder}</Placeholder>
}

/** "Jan 2024 — Present", collapsing gracefully when either end is missing. */
function dateRange(start: string, end: string, current?: boolean) {
  const to = current ? 'Present' : end.trim()
  if (!start.trim() && !to) return ''
  if (!start.trim()) return to
  if (!to) return start
  return `${start} — ${to}`
}

/** Contact line. Only non-empty parts appear, so no stray separators. */
export function Contact({ basics, stacked }: { basics: Basics; stacked?: boolean }) {
  const parts = [basics.email, basics.phone, basics.location, basics.website].filter(
    (p) => p.trim() !== '',
  )
  const links = basics.links.filter((l) => l.url.trim() !== '' || l.label.trim() !== '')

  if (parts.length === 0 && links.length === 0) {
    return (
      <div className="doc-contact">
        <Placeholder>your@email.com · +00 000 0000 · City, Country</Placeholder>
      </div>
    )
  }

  if (stacked) {
    return (
      <div className="doc-contact">
        {parts.map((p) => (
          <span key={p}>{p}</span>
        ))}
        {links.map((l) => (
          <span key={l.id}>{l.label || l.url}</span>
        ))}
      </div>
    )
  }

  return (
    <div className="doc-contact">
      {[...parts, ...links.map((l) => l.label || l.url)].join('  ·  ')}
    </div>
  )
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

function Experience({ item }: { item: ExperienceItem }) {
  return (
    <div className="doc-item">
      <div className="doc-item-head">
        <div>
          <div className="doc-item-title">{orPlaceholder(item.position, 'Job Title')}</div>
          <div className="doc-item-sub">
            {orPlaceholder(item.company, 'Company')}
            {item.location.trim() && <span className="doc-item-meta"> · {item.location}</span>}
          </div>
        </div>
        <div className="doc-item-date">{dateRange(item.startDate, item.endDate, item.current)}</div>
      </div>
      <Bullets bullets={item.bullets} />
    </div>
  )
}

function Education({ item }: { item: EducationItem }) {
  return (
    <div className="doc-item">
      <div className="doc-item-head">
        <div>
          <div className="doc-item-title">{orPlaceholder(item.degree, 'Degree')}</div>
          <div className="doc-item-sub">
            {orPlaceholder(item.institution, 'Institution')}
            {item.location.trim() && <span className="doc-item-meta"> · {item.location}</span>}
          </div>
          {item.grade.trim() && <div className="doc-item-meta">{item.grade}</div>}
        </div>
        <div className="doc-item-date">{dateRange(item.startDate, item.endDate)}</div>
      </div>
      <Bullets bullets={item.bullets} />
    </div>
  )
}

function Skills({ item, tags }: { item: SkillGroup; tags?: boolean }) {
  const skills = item.skills.filter((s) => s.trim() !== '')
  if (!item.category.trim() && skills.length === 0) {
    return (
      <div className="doc-skillgroup">
        <Placeholder>Category: skill, skill, skill</Placeholder>
      </div>
    )
  }
  return (
    <div className="doc-skillgroup">
      {item.category.trim() && <span className="doc-skillgroup-label">{item.category}</span>}
      {tags ? (
        <div className="doc-taglist">
          {skills.map((s) => (
            <span className="doc-tag" key={s}>
              {s}
            </span>
          ))}
        </div>
      ) : (
        skills.length > 0 && (
          <span>
            {item.category.trim() ? ': ' : ''}
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
      <div className="doc-item-head">
        <div>
          <div className="doc-item-title">{orPlaceholder(item.name, 'Project')}</div>
          {(item.role.trim() || item.url.trim()) && (
            <div className="doc-item-sub">
              {item.role}
              {item.role.trim() && item.url.trim() ? ' · ' : ''}
              {item.url.trim() && <span className="doc-item-meta">{item.url}</span>}
            </div>
          )}
        </div>
        <div className="doc-item-date">{dateRange(item.startDate, item.endDate)}</div>
      </div>
      <Bullets bullets={item.bullets} />
    </div>
  )
}

function Certification({ item }: { item: CertificationItem }) {
  return (
    <div className="doc-item">
      <div className="doc-item-head">
        <div>
          <div className="doc-item-title">{orPlaceholder(item.name, 'Certification')}</div>
          {item.issuer.trim() && <div className="doc-item-sub">{item.issuer}</div>}
        </div>
        <div className="doc-item-date">{item.date}</div>
      </div>
    </div>
  )
}

function Language({ item }: { item: LanguageItem }) {
  return (
    <div className="doc-langrow">
      <span>{orPlaceholder(item.name, 'Language')}</span>
      <span className="doc-item-meta">{item.proficiency}</span>
    </div>
  )
}

function Custom({ item }: { item: CustomItem }) {
  return (
    <div className="doc-item">
      <div className="doc-item-head">
        <div>
          <div className="doc-item-title">{orPlaceholder(item.title, 'Title')}</div>
          {item.subtitle.trim() && <div className="doc-item-sub">{item.subtitle}</div>}
        </div>
        <div className="doc-item-date">{item.date}</div>
      </div>
      <Bullets bullets={item.bullets} />
    </div>
  )
}

/**
 * Renders a section's items. `tags` switches skills to pill form, which suits
 * the narrow sidebar rail but wastes space in a full-width column.
 */
export function SectionBody({ section, tags }: { section: Section; tags?: boolean }) {
  const visible = section.items.filter((i) => i.visible)

  switch (section.type) {
    case 'experience':
      return visible.map((i) => <Experience key={i.id} item={i as ExperienceItem} />)
    case 'education':
      return visible.map((i) => <Education key={i.id} item={i as EducationItem} />)
    case 'skills':
      return visible.map((i) => <Skills key={i.id} item={i as SkillGroup} tags={tags} />)
    case 'projects':
      return visible.map((i) => <Project key={i.id} item={i as ProjectItem} />)
    case 'certifications':
      return visible.map((i) => <Certification key={i.id} item={i as CertificationItem} />)
    case 'languages':
      return visible.map((i) => <Language key={i.id} item={i as LanguageItem} />)
    case 'custom':
      return visible.map((i) => <Custom key={i.id} item={i as CustomItem} />)
  }
}

/** A section with its heading, or nothing when hidden/empty. */
export function DocSection({ section, tags }: { section: Section; tags?: boolean }) {
  if (!section.visible) return null
  if (section.items.filter((i) => i.visible).length === 0) return null
  return (
    <section className="doc-section">
      <h2 className="doc-section-title">{section.title}</h2>
      <SectionBody section={section} tags={tags} />
    </section>
  )
}

export function Summary({ summary }: { summary: string }) {
  if (!summary.trim()) return null
  return (
    <section className="doc-section">
      <p className="doc-summary">{summary}</p>
    </section>
  )
}
