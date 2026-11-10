/** The form for one item, chosen by its section's type. */

import type {
  CertificationItem,
  CustomItem,
  EducationItem,
  ExperienceItem,
  LanguageItem,
  ProjectItem,
  SectionItem,
  SectionType,
  SkillGroup,
  SummaryItem,
} from '../types'
import { Area, Bullets, DateRange, Text, TagInput } from './fields'

type Patch = (patch: Record<string, unknown>) => void

export function ItemFields({
  type,
  item,
  onChange,
}: {
  type: SectionType
  item: SectionItem
  onChange: Patch
}) {
  switch (type) {
    case 'summary': {
      const it = item as SummaryItem
      return (
        <Area
          label="Paragraph"
          value={it.summary}
          rows={5}
          placeholder="One clear sentence about the work you do best."
          onChange={(summary) => onChange({ summary })}
        />
      )
    }

    case 'experience': {
      const it = item as ExperienceItem
      return (
        <>
          <Text label="Job title" value={it.position} placeholder="Senior Engineer" onChange={(v) => onChange({ position: v })} />
          <div className="two-col">
            <Text label="Company" value={it.company} placeholder="Acme" onChange={(v) => onChange({ company: v })} />
            <Text label="Location" value={it.location} placeholder="Remote" onChange={(v) => onChange({ location: v })} />
          </div>
          <DateRange start={it.startDate} end={it.endDate} current={it.current} onChange={onChange} />
          <Bullets bullets={it.bullets} onChange={(bullets) => onChange({ bullets })} />
        </>
      )
    }

    case 'education': {
      const it = item as EducationItem
      return (
        <>
          <Text label="Degree" value={it.degree} placeholder="BSc Computer Science" onChange={(v) => onChange({ degree: v })} />
          <div className="two-col">
            <Text label="Institution" value={it.institution} placeholder="University" onChange={(v) => onChange({ institution: v })} />
            <Text label="Location" value={it.location} onChange={(v) => onChange({ location: v })} />
          </div>
          <DateRange start={it.startDate} end={it.endDate} onChange={onChange} />
          <Text label="Grade" value={it.grade} placeholder="First class · 3.8 GPA" onChange={(v) => onChange({ grade: v })} />
          <Bullets bullets={it.bullets} onChange={(bullets) => onChange({ bullets })} />
        </>
      )
    }

    case 'skills': {
      const it = item as SkillGroup
      return (
        <>
          <Text label="Category" value={it.category} placeholder="Languages" onChange={(v) => onChange({ category: v })} />
          <TagInput
            label="Skills"
            values={it.skills}
            placeholder="Paste a list — commas, lines or bullets all work"
            onChange={(skills) => onChange({ skills })}
            onPasteList={(parsed) => {
              // A "Languages: …" prefix names the group, but never overwrites a
              // category the author already chose.
              if (parsed.category && !it.category.trim()) {
                onChange({ category: parsed.category })
              }
            }}
          />
        </>
      )
    }

    case 'projects': {
      const it = item as ProjectItem
      return (
        <>
          <Text label="Project" value={it.name} placeholder="AgentCV" onChange={(v) => onChange({ name: v })} />
          <div className="two-col">
            <Text label="Role" value={it.role} placeholder="Creator" onChange={(v) => onChange({ role: v })} />
            <Text label="Link" type="url" value={it.url} placeholder="github.com/…" onChange={(v) => onChange({ url: v })} />
          </div>
          <DateRange start={it.startDate} end={it.endDate} onChange={onChange} />
          <Bullets bullets={it.bullets} onChange={(bullets) => onChange({ bullets })} />
        </>
      )
    }

    case 'certifications': {
      const it = item as CertificationItem
      return (
        <>
          <Text label="Certification" value={it.name} placeholder="AWS Solutions Architect" onChange={(v) => onChange({ name: v })} />
          <div className="two-col">
            <Text label="Issuer" value={it.issuer} placeholder="Amazon" onChange={(v) => onChange({ issuer: v })} />
            <Text label="Date" value={it.date} placeholder="2025" onChange={(v) => onChange({ date: v })} />
          </div>
          <Text label="Link" type="url" value={it.url} onChange={(v) => onChange({ url: v })} />
        </>
      )
    }

    case 'languages': {
      const it = item as LanguageItem
      return (
        <div className="two-col">
          <Text label="Language" value={it.name} placeholder="Malayalam" onChange={(v) => onChange({ name: v })} />
          <Text label="Level" value={it.proficiency} placeholder="Native" onChange={(v) => onChange({ proficiency: v })} />
        </div>
      )
    }

    case 'custom': {
      const it = item as CustomItem
      return (
        <>
          <Text label="Title" value={it.title} onChange={(v) => onChange({ title: v })} />
          <div className="two-col">
            <Text label="Subtitle" value={it.subtitle} onChange={(v) => onChange({ subtitle: v })} />
            <Text label="Date" value={it.date} onChange={(v) => onChange({ date: v })} />
          </div>
          <Bullets bullets={it.bullets} onChange={(bullets) => onChange({ bullets })} />
        </>
      )
    }
  }
}

/** One-line summary of an item, shown on its collapsed row. */
export function itemLabel(type: SectionType, item: SectionItem): string {
  switch (type) {
    case 'summary': {
      const text = (item as SummaryItem).summary.trim()
      return text.length > 48 ? `${text.slice(0, 48)}…` : text || 'New paragraph'
    }
    case 'experience': {
      const it = item as ExperienceItem
      return [it.position, it.company].filter(Boolean).join(' · ') || 'New role'
    }
    case 'education': {
      const it = item as EducationItem
      return [it.degree, it.institution].filter(Boolean).join(' · ') || 'New qualification'
    }
    case 'skills': {
      const it = item as SkillGroup
      return it.category || it.skills.filter(Boolean).slice(0, 3).join(', ') || 'New group'
    }
    case 'projects':
      return (item as ProjectItem).name || 'New project'
    case 'certifications':
      return (item as CertificationItem).name || 'New certification'
    case 'languages':
      return (item as LanguageItem).name || 'New language'
    case 'custom':
      return (item as CustomItem).title || 'New entry'
  }
}

/** The quieter second line of a collapsed row: company, school, skills... */
export function itemSubtitle(type: SectionType, item: SectionItem): string {
  switch (type) {
    case 'summary':
      return ''
    case 'experience': {
      const it = item as ExperienceItem
      return [it.company, it.location].filter(Boolean).join(' · ')
    }
    case 'education': {
      const it = item as EducationItem
      return [it.institution, it.grade].filter(Boolean).join(' · ')
    }
    case 'skills': {
      const it = item as SkillGroup
      const skills = it.skills.filter(Boolean)
      return it.category ? skills.slice(0, 6).join(', ') : skills.slice(3, 8).join(', ')
    }
    case 'projects': {
      const it = item as ProjectItem
      return it.role || [it.startDate, it.endDate].filter(Boolean).join(' – ')
    }
    case 'certifications':
      return (item as CertificationItem).issuer
    case 'languages':
      return (item as LanguageItem).proficiency
    case 'custom':
      return (item as CustomItem).subtitle
  }
}
