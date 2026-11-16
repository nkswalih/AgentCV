/** Shared building blocks used by every resume template. */

import { createContext, Fragment, useContext, type CSSProperties, type ReactNode } from 'react'

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
  Settings,
  SkillGroup,
  SkillsSection,
  SummaryItem,
} from '../types'
import { DocIcon, linkBrand, SECTION_ICONS, type DocIconName } from './doc-icons'

export function ProfilePhoto({
  src,
  layout,
}: {
  src: string
  layout: Settings['photoLayout']
}) {
  const style = {
    '--photo-focus-x': `${layout.focusX}%`,
    '--photo-focus-y': `${layout.focusY}%`,
    '--photo-zoom': layout.zoom,
    '--photo-border-width': layout.border ? `${layout.borderWidth}pt` : '0',
    '--photo-border-color': layout.borderColor,
  } as CSSProperties

  return (
    <span className="doc-photo-frame" style={style}>
      <img className="doc-photo" src={src} alt="" />
    </span>
  )
}

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

/** "Jan 2024 – Present", collapsing gracefully when either end is missing.
    The separator is an en dash: it joins two ends of one range, where an em
    dash would read as a break in the sentence. */
function dateRange(start: string, end: string, current?: boolean) {
  const to = current ? 'Present' : end.trim()
  if (!start.trim() && !to) return ''
  if (!start.trim()) return to
  if (!to) return start
  return `${start} – ${to}`
}

/** The date line of any entry that carries one -- the timeline layout lifts
    these out of the entry head and onto its own spine. */
export function itemDateRange(section: Section, item: SectionItem): string {
  switch (section.type) {
    case 'experience': {
      const i = item as ExperienceItem
      return dateRange(i.startDate, i.endDate, i.current)
    }
    case 'education':
      return dateRange((item as EducationItem).startDate, (item as EducationItem).endDate)
    case 'projects':
      return dateRange((item as ProjectItem).startDate, (item as ProjectItem).endDate)
    case 'custom':
      return (item as CustomItem).date
    default:
      return ''
  }
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

/**
 * The address as it should read on paper: no scheme, no `www.`, no trailing
 * slash. A resume header is a caption, not a hyperlink target -- the anchor
 * already carries the full URL, so the printed line stays short enough for
 * the second contact row.
 */
function bareUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
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
 *
 * The entries are split into the two rows a resume header reads best in:
 * the plain ways to reach someone (email, phone, place) on the first line, and
 * the places their work lives (website, profiles) on the second. A pasted URL
 * decides its own mark -- `linkedin.com/in/ada` arrives as LinkedIn, a GitHub
 * profile as GitHub, a personal site as the globe.
 */
function contactGroups(basics: Basics): { plain: ContactEntry[]; links: ContactEntry[] } {
  const plain: ContactEntry[] = []
  const links: ContactEntry[] = []

  const email = basics.email.trim()
  if (email) plain.push({ key: 'email', icon: 'mail', text: email, href: `mailto:${email}` })

  const phone = basics.phone.trim()
  if (phone) {
    // Keep digits and the leading +; everything else is formatting.
    const tel = phone.replace(/[^\d+]/g, '')
    plain.push({ key: 'phone', icon: 'phone', text: phone, href: `tel:${tel}` })
  }

  const location = basics.location.trim()
  if (location) plain.push({ key: 'location', icon: 'pin', text: location })

  const website = basics.website.trim()
  if (website) {
    links.push({
      key: 'website',
      icon: linkBrand('', website)?.icon ?? 'globe',
      // The address itself, printed the way people read it: no scheme, no
      // www. A URL parses for an ATS; a nickname does not.
      text: bareUrl(website),
      href: normalizeUrl(website),
    })
  }

  for (const link of basics.links) {
    const url = link.url.trim()
    const label = link.label.trim()
    if (!url && !label) continue
    links.push({
      key: link.id,
      icon: linkBrand(label, url)?.icon ?? 'link',
      // An author-written label replaces the address; with no label the
      // address carries the entry, minus the scheme it was pasted with.
      text: label || bareUrl(url),
      href: url ? normalizeUrl(url) : undefined,
    })
  }

  return { plain, links }
}

/**
 * True inside miniatures (dashboard cards, the picker gallery). Thumbnails
 * often sit inside a navigational link, so interactive elements -- the
 * contact line's anchors -- render as inert spans there: an <a> inside an
 * <a> is invalid DOM, and clicking a thumbnail should navigate once.
 */
const PreviewContext = createContext(false)

export function PreviewScope({ children }: { children: ReactNode }) {
  return <PreviewContext.Provider value={true}>{children}</PreviewContext.Provider>
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
  const { plain, links } = contactGroups(basics)
  if (plain.length === 0 && links.length === 0) return null

  const preview = useContext(PreviewContext)
  const renderEntry = (entry: ContactEntry) => {
    const content = icons ? (
      <span className="doc-contact-item">
        <DocIcon name={entry.icon} />
        {/* The item is a flex box, and text decoration does not reach into an
            atomic inline child -- so the link's rule is drawn on the text
            itself rather than on the anchor around it. */}
        <span className="doc-contact-text">{entry.text}</span>
      </span>
    ) : (
      entry.text
    )
    if (entry.href && !preview)
      return (
        <a className="doc-link" href={entry.href} data-contact-key={entry.key}>
          {content}
        </a>
      )
    // The key travels in miniature too: designs may reorder or emphasise an
    // entry by it (Jake leads with the phone number), and a thumbnail should
    // show the same arrangement the exported page will.
    return (
      <span className={entry.href ? 'doc-link' : undefined} data-contact-key={entry.key}>
        {content}
      </span>
    )
  }

  // A whole row reads as one inline run, so separators sit only between the
  // entries on that row -- never at a row boundary.
  // The separator is ornament, not content: each design draws its own glyph
  // (an interpunct, a pipe, nothing at all), so the span carries no text and
  // the CSS supplies the mark. It also keeps the raw string out of the PDF's
  // text layer, where it would otherwise sit between two addresses.
  const renderRow = (entries: ContactEntry[], row: 'plain' | 'links') => (
    <div className="doc-contact-row" data-row={row}>
      {entries.map((entry, i) => (
        <Fragment key={entry.key}>
          {i > 0 && <span className="doc-contact-sep" aria-hidden="true" />}
          {renderEntry(entry)}
        </Fragment>
      ))}
    </div>
  )

  if (stacked) {
    return (
      <div className="doc-contact">
        {[...plain, ...links].map((entry) => (
          <div className="doc-contact-row" key={entry.key}>
            {renderEntry(entry)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="doc-contact">
      {plain.length > 0 && renderRow(plain, 'plain')}
      {links.length > 0 && renderRow(links, 'links')}
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

/**
 * Entry-head layout, chosen by the design rather than by the data:
 *
 * - `default`  stacks the subtitle under the title, date beside the title.
 * - `swap`     puts the place over the dates and the subtitle under them.
 * - `dual`     keeps the dates on the title's row and drops the place to the
 *              second row.
 * - `beside`   sets the subtitle on the title's own line -- a project's stack
 *              printed beside its name.
 *
 * `swap`/`dual` describe where each field sits, so the same record can read
 * "school over dates" or "dates over place" without touching the data.
 */
export type HeadKind = 'default' | 'swap' | 'dual' | 'beside'

function ItemHead({
  title,
  sub,
  meta,
  date,
  hideDate,
  inlineSub,
  head = 'default',
}: {
  title: string
  sub?: string
  meta?: string
  date?: string
  /** The timeline layout draws the date on its own spine instead. */
  hideDate?: boolean
  /** Single-line heads: the subtitle rides beside the title instead of
      stacking beneath it -- how a certification row wants to read. */
  inlineSub?: boolean
  head?: HeadKind
}) {
  const hasSub = !!sub?.trim()
  const hasMeta = !!meta?.trim()
  const showsDate = !hideDate && !!date?.trim()
  if (head === 'swap' || head === 'dual') {
    // The two spread layouts differ only in which field owns the right column
    // of each row. Each cell keeps the class of the field it holds, so a place
    // stays a place and a date stays a date for the typography rules.
    const cell = (value: string, kind: 'date' | 'meta') => (
      <div className={kind === 'date' ? 'doc-item-date' : 'doc-item-meta'}>{value}</div>
    )
    const firstRight = head === 'swap' ? meta : date
    const firstRightKind = head === 'swap' ? 'meta' : 'date'
    const secondRight = head === 'swap' ? date : meta
    const secondRightKind = head === 'swap' ? 'date' : 'meta'
    const firstRightShown = head === 'swap' ? hasMeta : showsDate
    const secondRightShown = head === 'swap' ? showsDate : hasMeta
    return (
      <div className={`doc-item-head doc-item-head-${head}`}>
        <div className="doc-item-row">
          {title.trim() && <div className="doc-item-title">{title}</div>}
          {firstRightShown && cell(firstRight ?? '', firstRightKind)}
        </div>
        {(hasSub || secondRightShown) && (
          <div className="doc-item-row">
            {hasSub && <div className="doc-item-sub">{sub}</div>}
            {secondRightShown && cell(secondRight ?? '', secondRightKind)}
          </div>
        )}
      </div>
    )
  }
  if (head === 'beside') {
    return (
      <div className="doc-item-head doc-item-head-beside">
        <div className="doc-item-title">
          {title}
          {hasSub && <span className="doc-item-sub doc-item-beside">{sub}</span>}
        </div>
        {showsDate && <div className="doc-item-date">{date}</div>}
      </div>
    )
  }
  return (
    <div className="doc-item-head">
      <div>
        {title.trim() && (
          <div className="doc-item-title">
            {title}
            {inlineSub && hasSub && (
              <span className="doc-item-sub doc-item-inline"> — {sub}</span>
            )}
          </div>
        )}
        {!inlineSub && (hasSub || hasMeta) && (
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
        {inlineSub && hasMeta && (
          <div className="doc-item-meta">{meta}</div>
        )}
      </div>
      {!hideDate && date?.trim() && <div className="doc-item-date">{date}</div>}
    </div>
  )
}

function Experience({ item, bare, head }: { item: ExperienceItem; bare?: boolean; head?: HeadKind }) {
  return (
    <div className="doc-item">
      <ItemHead
        title={item.position}
        sub={item.company}
        meta={item.location}
        date={dateRange(item.startDate, item.endDate, item.current)}
        hideDate={bare}
        head={head}
      />
      <Bullets bullets={item.bullets} />
    </div>
  )
}

function Education({ item, bare, head }: { item: EducationItem; bare?: boolean; head?: HeadKind }) {
  // `swap` is the school-led record: the institution becomes the head line and
  // the degree drops to the italic second line, which is the reading order
  // Jake's Resume prints.
  const schoolLeads = head === 'swap'
  return (
    <div className="doc-item">
      <ItemHead
        title={schoolLeads ? item.institution : item.degree}
        sub={schoolLeads ? item.degree : item.institution}
        meta={item.location}
        date={dateRange(item.startDate, item.endDate)}
        hideDate={bare}
        head={head}
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
          <ul className="doc-skilllines">
            {skills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
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

function Project({ item, bare, head }: { item: ProjectItem; bare?: boolean; head?: HeadKind }) {
  return (
    <div className="doc-item">
      <ItemHead
        title={item.name}
        sub={item.role}
        meta={item.url}
        date={dateRange(item.startDate, item.endDate)}
        hideDate={bare}
        head={head}
      />
      <Bullets bullets={item.bullets} />
    </div>
  )
}

function Certification({ item }: { item: CertificationItem }) {
  return (
    <div className="doc-item">
      <ItemHead title={item.name} sub={item.issuer} date={item.date} inlineSub />
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

function Custom({ item, bare, head }: { item: CustomItem; bare?: boolean; head?: HeadKind }) {
  return (
    <div className="doc-item">
      <ItemHead
        title={item.title}
        sub={item.subtitle}
        date={item.date}
        hideDate={bare}
        head={head}
      />
      <Bullets bullets={item.bullets} />
    </div>
  )
}

/** Section types whose entries carry dates and can ride the timeline spine. */
const TIMELINE_TYPES: ReadonlySet<SectionType> = new Set([
  'experience',
  'education',
  'projects',
  'custom',
])

/**
 * Renders a section's items. `tags` switches skills to pill form, which suits
 * the narrow sidebar rail but wastes space in a full-width column. `timeline`
 * lifts dates out of the entries onto a ruled spine -- the Timeline template.
 */
export function SectionBody({
  section,
  tags,
  timeline,
  head,
}: {
  section: Section
  tags?: boolean
  timeline?: boolean
  /** Entry-head shape for the dated item types; designs that print a house
      style (Jake's Resume) choose which field leads each row. */
  head?: HeadKind
}) {
  const items = visibleItems(section)
  const onSpine = timeline && TIMELINE_TYPES.has(section.type)

  const render = (i: SectionItem): ReactNode => {
    // Renders ONE entry -- the item it is handed. The caller maps over the
    // section's items; returning the whole list from here multiplied every
    // entry N times (and every resume onto a second page).
    switch (section.type) {
      case 'summary':
        return <SummaryParagraph key={i.id} item={i as SummaryItem} />
      case 'experience':
        return <Experience key={i.id} item={i as ExperienceItem} bare={onSpine} head={head} />
      case 'education':
        return <Education key={i.id} item={i as EducationItem} bare={onSpine} head={head} />
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
        const g = i as SkillGroup
        return <Skills key={g.id} item={g} tags={tags} />
      }
      case 'projects':
        return <Project key={i.id} item={i as ProjectItem} bare={onSpine} head={head} />
      case 'certifications':
        return <Certification key={i.id} item={i as CertificationItem} />
      case 'languages':
        return <Language key={i.id} item={i as LanguageItem} />
      case 'custom':
        return <Custom key={i.id} item={i as CustomItem} bare={onSpine} head={head} />
    }
  }

  if (onSpine) {
    return (
      <div className="tl-list">
        {items.map((i) => (
          <div className="tl-item" key={i.id}>
            <div className="tl-when">{itemDateRange(section, i)}</div>
            <div className="tl-body">{render(i)}</div>
          </div>
        ))}
      </div>
    )
  }

  // The flattened grid is built from the section rather than from one entry, so
  // it renders once. Inline skills print one block per group and therefore go
  // through the ordinary item map -- rendering only items[0] dropped every
  // group after the first.
  if (section.type === 'skills' && (section as SkillsSection).layout === 'bullets') {
    return <>{render(items[0])}</>
  }
  return <>{items.map((i) => render(i))}</>
}

/**
 * A section with its heading. Nothing renders when the section is hidden or
 * when none of its entries have been filled in -- a bare heading over empty
 * space is the same noise as a placeholder.
 */
export function DocSection({
  section,
  tags,
  timeline,
  head,
}: {
  section: Section
  tags?: boolean
  timeline?: boolean
  head?: HeadKind
}) {
  if (!section.visible) return null
  if (visibleItems(section).length === 0) return null
  const sectionIcon = SECTION_ICONS[section.type]
  // Both drawings are rendered; the document root's data-heading-* attributes
  // decide which one shows, keeping the icons in lockstep with the Section
  // Headings controls without threading settings through every template.
  return (
    <section className="doc-section" data-type={section.type}>
      <h2 className="doc-section-title">
        {sectionIcon && (
          <>
            <DocIcon name={sectionIcon} className="doc-section-icon icon-outline" variant="outline" />
            <DocIcon name={sectionIcon} className="doc-section-icon icon-fill" variant="fill" />
          </>
        )}
        {section.title}
      </h2>
      <SectionBody section={section} tags={tags} timeline={timeline} head={head} />
    </section>
  )
}

function SummaryParagraph({ item }: { item: SummaryItem }) {
  if (!item.summary.trim()) return null
  return <p className="doc-summary">{item.summary}</p>
}
