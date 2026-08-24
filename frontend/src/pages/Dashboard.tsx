import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../api'
import { ResumeThumb } from '../components/ResumeThumb'
import { useTemplatePicker } from '../components/TemplatePicker'
import { TEMPLATES_BY_ID } from '../templates/registry'
import type { ResumeDocument, ResumeSummary } from '../types'

function relativeDate(iso: string) {
  const then = new Date(iso).getTime()
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function Dashboard() {
  const picker = useTemplatePicker()
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null)
  /** Documents arrive per resume; a card renders the moment its own arrives. */
  const [docs, setDocs] = useState<Record<string, ResumeDocument>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setResumes(await api.list())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Thumbnails need full documents, which the list endpoint deliberately
  // omits. Fetch them one by one -- one broken document costs only its own
  // card, never the whole gallery.
  useEffect(() => {
    if (!resumes) return
    let cancelled = false
    resumes.forEach((r) => {
      api
        .get(r.id)
        .then((full) => {
          if (!cancelled) setDocs((prev) => ({ ...prev, [r.id]: full.document }))
        })
        .catch(() => {
          /* the card keeps its loading placeholder */
        })
    })
    return () => {
      cancelled = true
    }
  }, [resumes])

  async function act(fn: () => Promise<unknown>) {
    setBusy(true)
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dash">
      <div className="dash-inner">
        {error && (
          <div className="banner" role="alert" style={{ marginBottom: 18 }}>
            {error}
          </div>
        )}

        {resumes === null && !error && <p className="hint">Loading…</p>}

        {resumes?.length === 0 && (
          <div className="empty">
            <span className="regmark" aria-hidden="true" />
            <h1 className="empty-title">No resumes yet</h1>
            <p className="hint">
              Pick a design and it appears here. Every change saves as you type.
            </p>
            <button className="btn btn-primary" onClick={picker.open}>
              Choose a template
            </button>
          </div>
        )}

        {resumes && resumes.length > 0 && (
          <>
            <p className="eyebrow" style={{ marginBottom: 12 }}>
              {resumes.length} document{resumes.length === 1 ? '' : 's'}
            </p>
            <ul className="thumb-grid">
              {resumes.map((r) => {
                const meta = TEMPLATES_BY_ID.get(r.template as never)
                return (
                  <li className="dash-card" key={r.id}>
                    <Link className="dash-card-main" to={`/resume/${r.id}`}>
                      <ResumeThumb doc={docs[r.id]} />
                      <span className="dash-card-name">{r.name}</span>
                      <span className="dash-card-meta">
                        <span className="tag" data-ats={meta?.atsSafe ? 'true' : 'false'}>
                          {meta?.name ?? r.template}
                          {meta ? (meta.atsSafe ? ' · ATS-safe' : ' · design-led') : ''}
                        </span>
                        <span className="tag">edited {relativeDate(r.updatedAt)}</span>
                      </span>
                    </Link>
                    <div className="row">
                      <button
                        className="btn btn-sm"
                        disabled={busy}
                        onClick={() => act(() => api.duplicate(r.id))}
                      >
                        Duplicate
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={busy}
                        onClick={() => {
                          // Deleting a resume cannot be undone, so it is
                          // confirmed by name rather than silently accepted.
                          if (confirm(`Delete “${r.name}”? This cannot be undone.`)) {
                            void act(() => api.remove(r.id))
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
