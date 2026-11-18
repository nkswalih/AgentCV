/**
 * Read an existing resume into the chosen template.
 *
 * One component, two homes: the new-resume flow and the editor's Import
 * action. Both follow the same three steps -- upload, review, confirm -- so a
 * resume read in either place behaves identically. The review is editable on
 * purpose: extraction is a good first draft, not a verdict, and the person who
 * wrote the original gets the last word before anything is saved.
 */

import { useMemo, useRef, useState, type DragEvent } from 'react'

import { api } from '../api'
import { Area, Text } from '../editor/fields'
import {
  formatLabel,
  importedDocument,
  resumeNameFromFile,
  type ExtractResult,
  type ExtractedBasics,
  type ExtractedDocument,
} from '../importDoc'
import { demoDocument } from '../templates/demo'
import type { TemplateId } from '../types'
import { ResumeThumb } from './ResumeThumb'

type ListKey = 'experience' | 'education' | 'projects' | 'certifications' | 'languages'

interface Props {
  template: TemplateId
  /**
   * Applies the reviewed draft. The caller decides whether that means creating
   * a new resume or replacing the open one; this component only reads files and
   * gathers the author's corrections.
   */
  onApply: (draft: ExtractedDocument, name: string) => Promise<void> | void
  onCancel?: () => void
  /** The open resume already has content that an import would replace. */
  replacing?: boolean
  /** The dashboard name is only editable where a resume is being created. */
  showName?: boolean
  applyLabel?: string
}

const MAX_BYTES = 10 * 1024 * 1024

/** Bullets are edited as lines: one bullet per line, exactly how they print. */
function linesToBullets(value: string): string[] {
  return value.split('\n')
}

export function ResumeImporter({
  template,
  onApply,
  onCancel,
  replacing,
  showName = true,
  applyLabel,
}: Props) {
  const [result, setResult] = useState<ExtractResult | null>(null)
  const [draft, setDraft] = useState<ExtractedDocument | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const previewBase = useMemo(() => demoDocument(template), [template])
  const previewDoc = useMemo(
    () => (draft ? importedDocument(previewBase, draft) : null),
    [previewBase, draft],
  )

  async function read(file: File) {
    if (busy) return
    if (file.size > MAX_BYTES) {
      setError('That file is larger than 10 MB. Upload the resume itself rather than a bundle.')
      return
    }
    setBusy('reading')
    setError(null)
    try {
      const extracted = await api.extractResume(file)
      setResult(extracted)
      setDraft(extracted.document)
      setName((current) => current || extracted.document.basics.fullName.trim() || resumeNameFromFile(extracted.filename))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void read(file)
  }

  function reset() {
    setResult(null)
    setDraft(null)
    setError(null)
    setConfirmed(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function patchBasics(patch: Partial<ExtractedBasics>) {
    setDraft((current) => (current ? { ...current, basics: { ...current.basics, ...patch } } : current))
  }

  function patchAt(key: ListKey, index: number, patch: Record<string, unknown>) {
    setDraft((current) => {
      if (!current) return current
      const list = current[key] as unknown as Record<string, unknown>[]
      return {
        ...current,
        [key]: list.map((item, i) => (i === index ? { ...item, ...patch } : item)),
      }
    })
  }

  function removeAt(key: ListKey, index: number) {
    setDraft((current) => {
      if (!current) return current
      const list = current[key] as unknown as unknown[]
      return { ...current, [key]: list.filter((_, i) => i !== index) }
    })
  }

  function patchSummary(index: number, value: string) {
    setDraft((current) =>
      current
        ? { ...current, summary: current.summary.map((p, i) => (i === index ? value : p)) }
        : current,
    )
  }

  function patchSkills(index: number, patch: { category?: string; skills?: string[] }) {
    setDraft((current) =>
      current
        ? {
            ...current,
            skills: current.skills.map((group, i) => (i === index ? { ...group, ...patch } : group)),
          }
        : current,
    )
  }

  function patchCustom(si: number, ii: number, patch: Record<string, unknown>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            custom: current.custom.map((section, i) =>
              i === si
                ? {
                    ...section,
                    items: section.items.map((item, j) => (j === ii ? { ...item, ...patch } : item)),
                  }
                : section,
            ),
          }
        : current,
    )
  }

  async function create() {
    if (!draft || busy) return
    if (replacing && !confirmed) return
    setBusy('saving')
    setError(null)
    try {
      await onApply(draft, name.trim() || 'Imported resume')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(null)
    }
  }

  if (!draft || !result) {
    return (
      <div className="imp imp-upload">
        {error && (
          <div className="banner" role="alert">
            {error}
          </div>
        )}

        <div
          className="imp-drop"
          data-dragging={dragging}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,.tex,.latex,application/pdf,text/plain"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void read(file)
            }}
          />
          <span className="imp-drop-icon" aria-hidden="true">
            ⇪
          </span>
          <p className="imp-drop-title">
            Drop your resume here, or{' '}
            <button
              type="button"
              className="link-cta"
              disabled={busy === 'reading'}
              onClick={() => inputRef.current?.click()}
            >
              choose a file
            </button>
          </p>
          <p className="hint">
            PDF, Word (.docx), plain text or LaTeX. Up to 10 MB. Nothing is saved
            until you confirm.
          </p>
          {busy === 'reading' && <p className="imp-reading">Reading your resume…</p>}
        </div>

        {onCancel && (
          <div className="imp-foot">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
          </div>
        )}
      </div>
    )
  }

  const basics = draft.basics

  return (
    <div className="imp imp-review">
      <div className="imp-review-bar">
        <div className="imp-file">
          <span className="imp-file-name">{result.filename}</span>
          <span className="imp-file-meta">
            Read as {formatLabel(result.format)} · {result.characters.toLocaleString()} characters
          </span>
        </div>
        <div className="imp-bar-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={busy === 'saving'}>
            Use another file
          </button>
          {onCancel && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy === 'saving'}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="banner" role="alert">
          {error}
        </div>
      )}

      {draft.warnings.length > 0 && (
        <ul className="imp-warnings" role="status">
          {draft.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <div className="imp-columns">
        <div className="imp-fields">
          {showName && (
            <section className="imp-block">
              <h3 className="imp-block-title">Resume name</h3>
              <Text
                label="Name in your dashboard"
                value={name}
                onChange={setName}
                placeholder="Imported resume"
              />
            </section>
          )}

          <section className="imp-block">
            <h3 className="imp-block-title">Personal details</h3>
            <div className="imp-row">
              <Text label="Full name" value={basics.fullName} onChange={(v) => patchBasics({ fullName: v })} />
              <Text label="Professional title" value={basics.headline} onChange={(v) => patchBasics({ headline: v })} />
            </div>
            <div className="imp-row">
              <Text label="Email" type="email" value={basics.email} onChange={(v) => patchBasics({ email: v })} />
              <Text label="Phone" type="tel" value={basics.phone} onChange={(v) => patchBasics({ phone: v })} />
            </div>
            <div className="imp-row">
              <Text label="Location" value={basics.location} onChange={(v) => patchBasics({ location: v })} />
              <Text label="Website" value={basics.website} onChange={(v) => patchBasics({ website: v })} />
            </div>
            {basics.links.length > 0 && (
              <div className="imp-links">
                {basics.links.map((link, index) => (
                  <div className="imp-link-row" key={`${link.url}-${index}`}>
                    <Text label="Label" value={link.label} onChange={(v) => patchBasics({
                      links: basics.links.map((l, i) => (i === index ? { ...l, label: v } : l)),
                    })} />
                    <Text label="URL" value={link.url} onChange={(v) => patchBasics({
                      links: basics.links.map((l, i) => (i === index ? { ...l, url: v } : l)),
                    })} />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm imp-remove"
                      onClick={() => patchBasics({ links: basics.links.filter((_, i) => i !== index) })}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {draft.summary.length > 0 && (
            <section className="imp-block">
              <h3 className="imp-block-title">Summary</h3>
              {draft.summary.map((paragraph, index) => (
                <Area
                  key={index}
                  label={`Paragraph ${index + 1}`}
                  rows={4}
                  value={paragraph}
                  onChange={(v) => patchSummary(index, v)}
                />
              ))}
            </section>
          )}

          {draft.experience.length > 0 && (
            <section className="imp-block">
              <h3 className="imp-block-title">Work experience</h3>
              {draft.experience.map((item, index) => (
                <div className="imp-item" key={index}>
                  <div className="imp-row">
                    <Text label="Position" value={item.position} onChange={(v) => patchAt('experience', index, { position: v })} />
                    <Text label="Company" value={item.company} onChange={(v) => patchAt('experience', index, { company: v })} />
                  </div>
                  <div className="imp-row imp-row-3">
                    <Text label="Location" value={item.location} onChange={(v) => patchAt('experience', index, { location: v })} />
                    <Text label="Start" value={item.startDate} onChange={(v) => patchAt('experience', index, { startDate: v })} />
                    <Text label="End" value={item.endDate} onChange={(v) => patchAt('experience', index, { endDate: v })} />
                  </div>
                  <Area
                    label="Bullets (one per line)"
                    rows={Math.min(10, Math.max(3, item.bullets.length + 1))}
                    value={item.bullets.join('\n')}
                    onChange={(v) => patchAt('experience', index, { bullets: linesToBullets(v) })}
                  />
                  <button type="button" className="btn btn-ghost btn-sm imp-remove" onClick={() => removeAt('experience', index)}>
                    Remove this role
                  </button>
                </div>
              ))}
            </section>
          )}

          {draft.education.length > 0 && (
            <section className="imp-block">
              <h3 className="imp-block-title">Education</h3>
              {draft.education.map((item, index) => (
                <div className="imp-item" key={index}>
                  <div className="imp-row">
                    <Text label="Degree" value={item.degree} onChange={(v) => patchAt('education', index, { degree: v })} />
                    <Text label="Institution" value={item.institution} onChange={(v) => patchAt('education', index, { institution: v })} />
                  </div>
                  <div className="imp-row imp-row-3">
                    <Text label="Location" value={item.location} onChange={(v) => patchAt('education', index, { location: v })} />
                    <Text label="Start" value={item.startDate} onChange={(v) => patchAt('education', index, { startDate: v })} />
                    <Text label="End" value={item.endDate} onChange={(v) => patchAt('education', index, { endDate: v })} />
                  </div>
                  <Text label="Grade" value={item.grade} onChange={(v) => patchAt('education', index, { grade: v })} />
                  <button type="button" className="btn btn-ghost btn-sm imp-remove" onClick={() => removeAt('education', index)}>
                    Remove this entry
                  </button>
                </div>
              ))}
            </section>
          )}

          {draft.skills.length > 0 && (
            <section className="imp-block">
              <h3 className="imp-block-title">Skills</h3>
              {draft.skills.map((group, index) => (
                <div className="imp-row" key={index}>
                  <Text
                    label="Category"
                    value={group.category}
                    placeholder="General"
                    onChange={(v) => patchSkills(index, { category: v })}
                  />
                  <Text
                    label="Skills (comma separated)"
                    value={group.skills.join(', ')}
                    onChange={(v) => patchSkills(index, { skills: v.split(',') })}
                  />
                </div>
              ))}
            </section>
          )}

          {draft.projects.length > 0 && (
            <section className="imp-block">
              <h3 className="imp-block-title">Projects</h3>
              {draft.projects.map((item, index) => (
                <div className="imp-item" key={index}>
                  <div className="imp-row">
                    <Text label="Project" value={item.name} onChange={(v) => patchAt('projects', index, { name: v })} />
                    <Text label="Role" value={item.role} onChange={(v) => patchAt('projects', index, { role: v })} />
                  </div>
                  <div className="imp-row imp-row-3">
                    <Text label="Link" value={item.url} onChange={(v) => patchAt('projects', index, { url: v })} />
                    <Text label="Start" value={item.startDate} onChange={(v) => patchAt('projects', index, { startDate: v })} />
                    <Text label="End" value={item.endDate} onChange={(v) => patchAt('projects', index, { endDate: v })} />
                  </div>
                  <Area
                    label="Bullets (one per line)"
                    rows={Math.min(10, Math.max(3, item.bullets.length + 1))}
                    value={item.bullets.join('\n')}
                    onChange={(v) => patchAt('projects', index, { bullets: linesToBullets(v) })}
                  />
                  <button type="button" className="btn btn-ghost btn-sm imp-remove" onClick={() => removeAt('projects', index)}>
                    Remove this project
                  </button>
                </div>
              ))}
            </section>
          )}

          {draft.certifications.length > 0 && (
            <section className="imp-block">
              <h3 className="imp-block-title">Certifications</h3>
              {draft.certifications.map((item, index) => (
                <div className="imp-item" key={index}>
                  <div className="imp-row imp-row-3">
                    <Text label="Name" value={item.name} onChange={(v) => patchAt('certifications', index, { name: v })} />
                    <Text label="Issuer" value={item.issuer} onChange={(v) => patchAt('certifications', index, { issuer: v })} />
                    <Text label="Year" value={item.date} onChange={(v) => patchAt('certifications', index, { date: v })} />
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm imp-remove" onClick={() => removeAt('certifications', index)}>
                    Remove this certification
                  </button>
                </div>
              ))}
            </section>
          )}

          {draft.languages.length > 0 && (
            <section className="imp-block">
              <h3 className="imp-block-title">Languages</h3>
              {draft.languages.map((item, index) => (
                <div className="imp-row" key={index}>
                  <Text label="Language" value={item.name} onChange={(v) => patchAt('languages', index, { name: v })} />
                  <Text label="Level" value={item.proficiency} onChange={(v) => patchAt('languages', index, { proficiency: v })} />
                </div>
              ))}
            </section>
          )}

          {draft.custom.map((section, si) => (
            <section className="imp-block" key={`${section.title}-${si}`}>
              <h3 className="imp-block-title">{section.title || 'Additional section'}</h3>
              {section.items.map((item, ii) => (
                <div className="imp-item" key={ii}>
                  <div className="imp-row imp-row-3">
                    <Text label="Title" value={item.title} onChange={(v) => patchCustom(si, ii, { title: v })} />
                    <Text label="Detail" value={item.subtitle} onChange={(v) => patchCustom(si, ii, { subtitle: v })} />
                    <Text label="Date" value={item.date} onChange={(v) => patchCustom(si, ii, { date: v })} />
                  </div>
                  <Area
                    label="Detail lines (one per line)"
                    rows={Math.min(8, Math.max(2, item.bullets.length + 1))}
                    value={item.bullets.join('\n')}
                    onChange={(v) => patchCustom(si, ii, { bullets: linesToBullets(v) })}
                  />
                </div>
              ))}
            </section>
          ))}
        </div>

        <aside className="imp-preview">
          <div className="imp-preview-paper">
            {previewDoc && <ResumeThumb doc={previewDoc} fitToHeight />}
          </div>
          <div className="imp-preview-foot">
            <p className="hint">
              This is how the content sits in the template you chose. Its design,
              typography and colours stay exactly as they are.
            </p>
            {replacing && (
              <label className="imp-confirm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={busy === 'saving'}
                />
                <span>I understand this replaces the current resume content.</span>
              </label>
            )}
            <button
              type="button"
              className="btn btn-primary imp-create"
              onClick={() => void create()}
              disabled={busy === 'saving' || (replacing === true && !confirmed)}
            >
              {busy === 'saving'
                ? 'Applying…'
                : applyLabel ?? (replacing ? 'Replace content' : 'Create resume')}
            </button>
            <p className="hint">Everything stays editable in the editor afterwards.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
