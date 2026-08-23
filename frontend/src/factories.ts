/** Constructors for new sections and items, with fresh ids. */

import type { Section, SectionItem, SectionType } from './types'

export const newId = () =>
  // crypto.randomUUID is available in every browser this app targets.
  crypto.randomUUID().replace(/-/g, '').slice(0, 12)

export const SECTION_LABELS: Record<SectionType, string> = {
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  custom: 'Custom Section',
}

export function emptyItem(type: SectionType): SectionItem {
  const base = { id: newId(), visible: true }
  switch (type) {
    case 'experience':
      return {
        ...base,
        position: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        current: false,
        bullets: [''],
      }
    case 'education':
      return {
        ...base,
        degree: '',
        institution: '',
        location: '',
        startDate: '',
        endDate: '',
        grade: '',
        bullets: [],
      }
    case 'skills':
      return { ...base, category: '', skills: [] }
    case 'projects':
      return {
        ...base,
        name: '',
        role: '',
        url: '',
        startDate: '',
        endDate: '',
        bullets: [''],
      }
    case 'certifications':
      return { ...base, name: '', issuer: '', date: '', url: '' }
    case 'languages':
      return { ...base, name: '', proficiency: '' }
    case 'custom':
      return { ...base, title: '', subtitle: '', date: '', bullets: [''] }
  }
}

export function emptySection(type: SectionType, title?: string): Section {
  // The cast is needed because `type` and `items` are correlated in the union
  // but TypeScript can't see that through a runtime-chosen `type`.
  return {
    id: newId(),
    title: title ?? SECTION_LABELS[type],
    visible: true,
    type,
    items: [emptyItem(type)],
  } as Section
}
