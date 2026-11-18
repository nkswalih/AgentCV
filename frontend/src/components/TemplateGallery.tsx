/**
 * The design gallery: every template rendered as the real page.
 *
 * It is the first step of starting a resume, so each card is a live
 * miniature of the document that template produces -- never a mock-up. The
 * gallery only chooses a design; what happens next is the dialog's business.
 */

import { useState } from 'react'

import { ResumeThumb } from '../components/ResumeThumb'
import { demoDocument } from '../templates/demo'
import { TEMPLATES, type TemplateTag } from '../templates/registry'
import type { TemplateId } from '../types'

const CHIP_LABELS: Record<TemplateTag | 'all', string> = {
  all: 'All Templates',
  popular: 'Popular',
  simple: 'Simple',
  modern: 'Modern',
  creative: 'Creative',
  professional: 'Professional',
  photo: 'Photo',
  twocol: 'Two Column',
  executive: 'Executive',
  technical: 'Technical',
  academic: 'Academic',
}

const FILTERS: (TemplateTag | 'all')[] = ['all', 'popular', 'simple', 'modern', 'creative']

interface Props {
  selected: TemplateId | null
  onSelect: (id: TemplateId) => void
  /** Cards disabled while the page is creating a document. */
  busy?: boolean
  busyId?: TemplateId | null
}

export function TemplateGallery({ selected, onSelect, busy, busyId }: Props) {
  const [filter, setFilter] = useState<TemplateTag | 'all'>('all')

  const visible = TEMPLATES.filter((t) => filter === 'all' || t.tags.includes(filter))

  return (
    <div className="tpl-gallery">
      <div className="tp-filters" role="tablist" aria-label="Template categories">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className="chip"
            data-active={filter === f}
            onClick={() => setFilter(f)}
          >
            {CHIP_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="tp-grid">
        {visible.map((t) => (
          <button
            key={t.id}
            type="button"
            className="tp-card"
            data-selected={selected === t.id}
            aria-pressed={selected === t.id}
            aria-busy={busyId === t.id}
            disabled={busy}
            onClick={() => onSelect(t.id)}
          >
            <div className="tp-card-thumb">
              <ResumeThumb doc={demoDocument(t.id)} />
            </div>
            <span className="tp-meta">
              <span className="tp-name">{t.name}</span>
              <span className="tag tag-sm" data-ats={t.atsSafe ? 'true' : 'false'}>
                {t.atsSafe ? 'ATS-safe' : 'Design-led'}
              </span>
            </span>
            {selected === t.id && (
              <span className="tpl-chosen" aria-hidden="true">
                Selected
              </span>
            )}
            {busyId === t.id && <span className="tp-busy">Creating…</span>}
          </button>
        ))}
        {visible.length === 0 && <p className="hint">Nothing in this category yet.</p>}
      </div>
    </div>
  )
}
