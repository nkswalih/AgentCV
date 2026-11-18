/**
 * The first-run flow: choose a design, then either import an existing resume
 * into it or start from a blank page.
 *
 * The design comes first on purpose. An imported resume is poured into the
 * chosen template, so picking the look before the content means the result is
 * the template the author wanted rather than a document they have to restyle
 * afterwards.
 */

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { api } from '../api'
import { PageMeta } from '../components/PageMeta'
import { ResumeImporter } from '../components/ResumeImporter'
import { ResumeThumb } from '../components/ResumeThumb'
import { TemplateGallery } from '../components/TemplateGallery'
import { FileIcon, Pencil } from '../editor/icons'
import { importedDocument, withPreset, type ExtractedDocument } from '../importDoc'
import { demoDocument } from '../templates/demo'
import { TEMPLATES_BY_ID } from '../templates/registry'
import type { TemplateId } from '../types'

const isTemplateId = (value: string | null): value is TemplateId =>
  value !== null && TEMPLATES_BY_ID.has(value as TemplateId)

export function NewResume() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preset = params.get('template')

  const [template, setTemplate] = useState<TemplateId | null>(
    isTemplateId(preset) ? preset : null,
  )
  /** Step 2 is a dialog over the gallery, so choosing a design never leaves the page. */
  const [startOpen, setStartOpen] = useState(() => isTemplateId(preset))
  const [mode, setMode] = useState<'choose' | 'import'>('choose')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const meta = template ? TEMPLATES_BY_ID.get(template) : undefined

  // Escape closes step 2 without losing the design the author just picked.
  useEffect(() => {
    if (!startOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStartOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [startOpen])

  function choose(id: TemplateId) {
    setTemplate(id)
    setError(null)
    setStartOpen(true)
  }

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
      // The dialog covers the page, so surface the failure where it can be read.
      setError(e instanceof Error ? e.message : String(e))
      setCreating(false)
      setStartOpen(false)
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

  if (mode === 'import' && template && meta) {
    return (
      <div className="dash new-flow">
        <PageMeta title="Import a resume: AgentCV" noindex />
        <div className="dash-inner">
          <header className="page-head">
            <button type="button" className="link-cta new-back" onClick={() => setMode('choose')}>
              ← Back to templates
            </button>
            <h1 className="page-title">Import your resume</h1>
            <p className="page-sub">
              Reading it into <strong>{meta.name}</strong>. You can review and correct
              everything before it is saved.
            </p>
          </header>
          <ResumeImporter
            template={template}
            onApply={applyImport}
            onCancel={() => setMode('choose')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="dash new-flow">
      <PageMeta title="New resume: AgentCV" noindex />
      <div className="dash-inner">
        <header className="page-head">
          <p className="new-step">Step 1 of 2 · Choose a design</p>
          <h1 className="page-title">Start a new resume</h1>
          <p className="page-sub">
            Pick a template first. Then import an existing resume into it, or open it
            blank and type.
          </p>
        </header>

        {error && (
          <div className="banner" role="alert" style={{ marginBottom: 22 }}>
            {error}
          </div>
        )}

        <div className="new-layout">
          <div className="new-main">
            <TemplateGallery selected={template} onSelect={choose} busy={creating} />
          </div>

          <aside className="new-side" aria-label="Template preview">
            {template && meta ? (
              <>
                <div className="new-side-paper">
                  <ResumeThumb doc={demoDocument(template)} fitToHeight />
                </div>
                <div className="new-side-info">
                  <h2 className="new-side-name">{meta.name}</h2>
                  <span className="tag" data-ats={meta.atsSafe ? 'true' : 'false'}>
                    {meta.atsSafe ? 'ATS-safe' : 'Design-led'}
                  </span>
                  <p className="new-side-note">{meta.note}</p>
                  <p className="hint">{meta.layout}</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setStartOpen(true)}
                    disabled={creating}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <div className="new-side-empty">
                <p className="hint">
                  Select a template to see it here. Every card is the real page you
                  will edit.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>

      {startOpen && template && meta && (
        <div className="modal-overlay" onClick={() => setStartOpen(false)}>
          <div
            className="modal new-start"
            role="dialog"
            aria-modal="true"
            aria-label={`Start with ${meta.name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head new-start-head">
              <p className="new-step">Step 2 of 2 · Start</p>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                aria-label="Close"
                onClick={() => setStartOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body new-start-body">
              <div className="new-start-copy">
                <h2 className="modal-title new-start-title">{meta.name}</h2>
                <p className="new-choice-sub">
                  This design keeps its own layout, type and colours either way.
                </p>

                <div className="new-choice-stack">
                  <button
                    type="button"
                    className="new-choice"
                    onClick={() => {
                      setStartOpen(false)
                      setMode('import')
                    }}
                    disabled={creating}
                  >
                    <span className="new-choice-icon" aria-hidden="true">
                      <FileIcon />
                    </span>
                    <span className="new-choice-label">Import existing resume</span>
                    <span className="new-choice-note">
                      PDF, Word, text or LaTeX. We read it into this template and let you
                      check every field first.
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
              </div>

              <div className="new-start-preview">
                <div className="new-side-paper">
                  <ResumeThumb doc={demoDocument(template)} fitToHeight />
                </div>
                <p className="hint">
                  The page you will edit, in this design. Nothing is saved until you
                  confirm in the next step.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
