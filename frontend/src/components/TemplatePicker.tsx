/**
 * The creation dialog: apply a design before the resume exists.
 *
 * Every card renders the real ResumePage with sample content -- never an
 * abstraction -- so what is picked here is what prints later. Click a card
 * to preview the design at larger scale before committing.
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../api'
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

interface PickerApi {
  open: () => void
}

const Ctx = createContext<PickerApi>({ open: () => {} })

/** Opens the design dialog from anywhere inside the home shell. */
export function useTemplatePicker() {
  return useContext(Ctx)
}

export function TemplatePickerProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState(false)
  const api2 = useMemo(() => ({ open: () => setShown(true) }), [])
  return (
    <Ctx.Provider value={api2}>
      {children}
      {shown && <TemplatePicker onClose={() => setShown(false)} />}
    </Ctx.Provider>
  )
}

function TemplatePicker({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<TemplateTag | 'all'>('all')
  const [busyId, setBusyId] = useState<TemplateId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<TemplateId | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewId) setPreviewId(null)
        else if (!busyId) onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busyId, previewId])

  const visible = TEMPLATES.filter((t) => {
    if (filter === 'all') return true
    return t.tags.includes(filter)
  })

  const previewTpl = previewId ? TEMPLATES.find((t) => t.id === previewId) : null

  async function pick(id: TemplateId) {
    if (busyId) return
    setBusyId(id)
    setError(null)
    try {
      const resume = await api.create(undefined, id)
      navigate(`/resume/${resume.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusyId(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={busyId ? undefined : onClose}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a template"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2 className="modal-title">Apply a design template</h2>
            {!previewId && (
              <p className="hint">Every card is your page wearing the design — pick one and start typing.</p>
            )}
          </div>
          <button className="btn btn-ghost" onClick={onClose} disabled={!!busyId} aria-label="Close">
            ✕
          </button>
        </div>

        {/* ---- Preview mode ---- */}
        {previewTpl ? (
          <div className="tp-preview">
            <div className="tp-preview-layout">
              <div className="tp-preview-thumb">
                <ResumeThumb doc={demoDocument(previewTpl.id)} fitToHeight />
              </div>
              <div className="tp-preview-info">
                <div>
                  <button
                    type="button"
                    className="btn btn-ghost tp-preview-back"
                    onClick={() => setPreviewId(null)}
                  >
                    ← Back to all templates
                  </button>
                  <h3 className="tp-preview-name">{previewTpl.name}</h3>
                  <span className="tag" data-ats={previewTpl.atsSafe ? 'true' : 'false'}>
                    {previewTpl.atsSafe ? 'ATS-safe' : 'Design-led'}
                  </span>
                </div>
                <p className="tp-preview-note">{previewTpl.note}</p>
                <ul className="tp-preview-features">
                  <li>A4 / US-Letter Size</li>
                  <li>Editable Text</li>
                  <li>Fully Customizable</li>
                  <li>Print Ready Format</li>
                  <li>Online Resume with Shareable Link</li>
                </ul>
                <button
                  type="button"
                  className="btn btn-primary tp-preview-apply"
                  disabled={!!busyId}
                  onClick={() => void pick(previewTpl.id)}
                >
                  {busyId === previewTpl.id ? 'Creating…' : 'Use this template'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ---- Filter chips ---- */}
            <div className="tp-filters" role="tablist" aria-label="Template categories">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className="chip"
                  data-active={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {CHIP_LABELS[f]}
                </button>
              ))}
            </div>

            {error && (
              <div className="banner" role="alert">
                {error}
              </div>
            )}

            {/* ---- Template grid ---- */}
            <div className="modal-body tp-grid">
              {visible.map((t) => (
                <button
                  key={t.id}
                  className="tp-card"
                  onClick={() => setPreviewId(t.id)}
                  disabled={!!busyId}
                  aria-busy={busyId === t.id}
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
                  {busyId === t.id && <span className="tp-busy">Creating…</span>}
                </button>
              ))}
              {visible.length === 0 && <p className="hint">Nothing in this category yet.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
