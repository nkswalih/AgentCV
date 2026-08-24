/**
 * Dev-only mount for visual inspection: renders a demo document at natural
 * page size so e2e scripts can screenshot full-resolution pages. Not part of
 * the app surface.
 */

import { createElement } from 'react'
import { createRoot } from 'react-dom/client'

import { ResumePage } from '../templates/ResumePage'
import { demoDocument } from '../templates/demo'
import type { ResumeDocument, Section, TemplateId } from '../types'

/** A realistic short history: one entry per kept section. */
function sparse(doc: ResumeDocument): ResumeDocument {
  const keep = new Set(['summary', 'experience', 'education', 'skills'])
  const sections = doc.sections
    .filter((s) => keep.has(s.type))
    .map(
      (s) =>
        ({ ...s, items: s.items.slice(0, s.type === 'skills' ? 2 : 1) }) as Section,
    )
  return { ...doc, sections }
}

export function mountDemo(
  container: HTMLElement,
  tpl: TemplateId,
  variant: 'full' | 'sparse',
): void {
  const doc = demoDocument(tpl)
  const d = variant === 'sparse' ? sparse(doc) : doc
  createRoot(container).render(createElement(ResumePage, { doc: d }))
}
