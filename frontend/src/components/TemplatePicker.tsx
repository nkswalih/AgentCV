/**
 * The creation dialog: apply a design before the resume exists.
 *
 * Every card renders the real ResumePage with sample content -- never an
 * abstraction -- so what is picked here is what prints later. Filter chips
 * group the gallery the way people shop for designs; All keeps everything
 * honest.
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../api'
import { ResumeThumb } from '../components/ResumeThumb'
import { demoDocument } from '../templates/demo'
import { TEMPLATES, type TemplateTag } from '../templates/registry'
import type { TemplateId } from '../types'

const CHIP_LABELS: Partial<Record<TemplateTag | 'all', string>> = {
  all: 'All Templates',
  popular: 'Popular',
  simple: 'Simple',
  modern: 'Modern',
}

const FILTERS: (TemplateTag | 'all')[] = ['all', 'popular', 'simple', 'modern']

const PHOTO_LABEL: Record<string, string> = {
  none: '',
  optional: ' · photo optional',
  designed: ' · photo designed-in',
}

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

  // Close on Escape -- same contract as the export dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyId) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, busyId])

  const visible = TEMPLATES.filter((t) => {
    if (filter === 'all') return true
    return t.tags.includes(filter)
  })

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
            <h2 className="modal-title">Apply a design</h2>
            <p className="hint">Every card is your page wearing the design -- pick one and start typing.</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} disabled={!!busyId} aria-label="Close">
            ✕
          </button>
        </div>

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

        <div className="modal-body tp-grid">
          {visible.map((t) => (
            <button
              key={t.id}
              className="tp-card"
              onClick={() => void pick(t.id)}
              disabled={!!busyId}
              aria-busy={busyId === t.id}
            >
              <ResumeThumb doc={demoDocument(t.id)} />
              <span className="tp-meta">
                <span className="tp-name">{t.name}</span>
                <span className="tag" data-ats={t.atsSafe ? 'true' : 'false'}>
                  {t.atsSafe ? 'ATS-safe' : 'Design-led'}
                </span>
              </span>
              <span className="tp-note">
                {t.layout}
                {PHOTO_LABEL[t.photo]}
              </span>
              <span className="tp-note dim">{t.note}</span>
              {busyId === t.id && <span className="tp-busy">Creating…</span>}
            </button>
          ))}
          {visible.length === 0 && <p className="hint">Nothing in this category yet.</p>}
        </div>
      </div>
    </div>
  )
}
