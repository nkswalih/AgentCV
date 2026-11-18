/**
 * The creation dialog: choose a design, then import a resume into it or open it
 * blank.
 *
 * It is a dialog rather than a page on purpose. Starting a resume is a short
 * decision made from the dashboard, and leaving the page to make it made the
 * cards jump while the author was still reading them. Every card is the real
 * ResumePage, so what is chosen here is what prints later.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { api } from '../api'
import { FileIcon, Pencil } from '../editor/icons'
import { importedDocument, withPreset, type ExtractedDocument } from '../importDoc'
import { demoDocument } from '../templates/demo'
import { TEMPLATES_BY_ID } from '../templates/registry'
import type { TemplateId } from '../types'
import { ResumeImporter } from './ResumeImporter'
import { ResumeThumb } from './ResumeThumb'
import { TemplateGallery } from './TemplateGallery'

interface PickerApi {
  open: () => void
}

const Ctx = createContext<PickerApi>({ open: () => {} })

/** Opens the creation dialog from anywhere inside the home shell. */
export function useTemplatePicker() {
  return useContext(Ctx)
}

export function TemplatePickerProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams()
  const [shown, setShown] = useState<{ template: TemplateId | null } | null>(null)
  const picker = useMemo(() => ({ open: () => setShown({ template: null }) }), [])

  // A link can still name a design. The dialog opens on step 2 for it, then the
  // parameter is dropped so closing the dialog does not reopen it.
  useEffect(() => {
    const preset = params.get('template')
    if (!preset || !TEMPLATES_BY_ID.has(preset as TemplateId)) return
    setShown({ template: preset as TemplateId })
    const next = new URLSearchParams(params)
    next.delete('template')
    setParams(next, { replace: true })
  }, [params, setParams])

  return (
    <Ctx.Provider value={picker}>
      {children}
      {shown && (
        <TemplatePickerDialog initial={shown.template} onClose={() => setShown(null)} />
      )}
    </Ctx.Provider>
  )
}

function TemplatePickerDialog({
  initial,
  onClose,
}: {
  initial: TemplateId | null
  onClose: () => void
}) {
  const navigate = useNavigate()
  const [step, setStep] = useState<'design' | 'preview' | 'import'>(
    initial ? 'preview' : 'design',
  )
  const [template, setTemplate] = useState<TemplateId | null>(initial)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const meta = template ? TEMPLATES_BY_ID.get(template) : undefined

  // Escape steps back one screen; a close while the document is being written
  // would leave the author without the resume they asked for.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (creating) return
      if (step === 'design') onClose()
      else setStep(step === 'import' ? 'preview' : 'design')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, creating, onClose])

  async function startFromScratch() {
    if (!template || creating) return
    setCreating(true)
    setError(null)
    try {
      // The design's preset is applied here, not left to the server's starter:
      // a created document keeps the template id but not its layout rules, so
      // the page would open in a generic single column.
      const created = await api.create(undefined, template)
      const document = withPreset(created.document, template)
      await api.update(created.id, { document })
      navigate(`/resume/${created.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setCreating(false)
    }
  }

  /** Create the resume, then write the reviewed content into its template. */
  async function applyImport(draft: ExtractedDocument, name: string) {
    if (!template) return
    const created = await api.create(name, template)
    const document = importedDocument(withPreset(created.document, template), draft)
    const saved = await api.update(created.id, { document })
    navigate(`/resume/${saved.id}`)
  }

  return (
    <div className="modal-overlay" onClick={creating ? undefined : onClose}>
      <div
        className="modal new-dialog"
        data-step={step}
        role="dialog"
        aria-modal="true"
        aria-label="Start a new resume"
        onClick={(event) => event.stopPropagation()}
      >
        {step === 'design' && (
          <>
            <div className="modal-head new-dialog-head">
              <div>
                <p className="new-step">Step 1 of 2 · Choose a design</p>
                <h2 className="modal-title new-dialog-title">Start a new resume</h2>
                <p className="hint">
                  Pick a template first. Then import an existing resume into it, or
                  open it blank and type.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label="Close"
                onClick={onClose}
              >
                ×
              </button>
            </div>

            <div className="modal-body new-dialog-body">
              <TemplateGallery
                selected={template}
                onSelect={(id) => {
                  setTemplate(id)
                  setError(null)
                  setStep('preview')
                }}
                busy={creating}
              />
            </div>
          </>
        )}

        {step === 'preview' && template && meta && (
          <>
            <div className="modal-head new-dialog-head">
              <div>
                <p className="new-step">Step 2 of 2 · Start</p>
                <h2 className="modal-title new-dialog-title">Start a new resume</h2>
                <p className="hint">
                  This is your page in {meta.name}. Import an existing resume into it,
                  or open it blank and type.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label="Close"
                onClick={onClose}
                disabled={creating}
              >
                ×
              </button>
            </div>

            <div className="tp-preview">
              <div className="tp-preview-layout">
                <div className="tp-preview-thumb">
                  <ResumeThumb doc={demoDocument(template)} fitToHeight />
                </div>

                <div className="tp-preview-info">
                  <div>
                    <button
                      type="button"
                      className="btn btn-ghost tp-preview-back"
                      onClick={() => setStep('design')}
                      disabled={creating}
                    >
                      ← All designs
                    </button>
                    <h3 className="tp-preview-name">{meta.name}</h3>
                    <span className="tag" data-ats={meta.atsSafe ? 'true' : 'false'}>
                      {meta.atsSafe ? 'ATS-safe' : 'Design-led'}
                    </span>
                  </div>

                  <p className="tp-preview-note">{meta.note}</p>

                  <ul className="tp-preview-features">
                    <li>A4 / US-Letter size</li>
                    <li>Editable text</li>
                    <li>Fully customisable</li>
                    <li>Print ready</li>
                    <li>Online copy with a shareable link</li>
                  </ul>

                  <div className="new-choice-stack tp-preview-choices">
                    <button
                      type="button"
                      className="new-choice"
                      onClick={() => setStep('import')}
                      disabled={creating}
                    >
                      <span className="new-choice-icon" aria-hidden="true">
                        <FileIcon />
                      </span>
                      <span className="new-choice-label">Import existing resume</span>
                      <span className="new-choice-note">
                        PDF, Word, text or LaTeX. We read it into this template and let
                        you check every field first.
                      </span>
                    </button>

                    <button
                      type="button"
                      className="new-choice"
                      onClick={() => void startFromScratch()}
                      disabled={creating}
                    >
                      <span className="new-choice-icon" aria-hidden="true">
                        <Pencil />
                      </span>
                      <span className="new-choice-label">
                        {creating ? 'Opening…' : 'Create from scratch'}
                      </span>
                      <span className="new-choice-note">
                        Open {meta.name} with empty sections, ready to type.
                      </span>
                    </button>
                  </div>

                  {error && (
                    <div className="banner" role="alert">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {step === 'import' && template && meta && (
          <>
            <div className="modal-head new-dialog-head">
              <div>
                <p className="new-step">Step 2 of 2 · Import</p>
                <h2 className="modal-title new-dialog-title">Import your resume</h2>
                <p className="hint">
                  Reading it into {meta.name}. Review and correct everything before it
                  is saved.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label="Close"
                onClick={onClose}
              >
                ×
              </button>
            </div>

            <div className="modal-body new-dialog-body new-import-body">
              <ResumeImporter
                template={template}
                showName
                applyLabel="Create resume"
                onApply={applyImport}
                onCancel={() => setStep('preview')}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
