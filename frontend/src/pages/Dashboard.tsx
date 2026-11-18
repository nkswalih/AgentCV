import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../api'
import { PageMeta } from '../components/PageMeta'
import { ResumeThumb } from '../components/ResumeThumb'
import { useTemplatePicker } from '../components/TemplatePicker'
import { Kebab, Plus } from '../editor/icons'
import type { ResumeDocument, ResumeSummary } from '../types'

function relativeDate(iso: string) {
  const then = new Date(iso).getTime()
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.round(months / 12)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

export function Dashboard() {
  const picker = useTemplatePicker()
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null)
  /** Documents arrive per resume; a card renders the moment its own arrives. */
  const [docs, setDocs] = useState<Record<string, ResumeDocument>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Close the card actions menu on any outside click or Escape.
  useEffect(() => {
    if (!menuFor) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuFor(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuFor(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuFor])

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
      <PageMeta title="AgentCV: resume builder with live preview and PDF export" />
      <div className="dash-inner">
        <header className="page-head">
          <h1 className="page-title">My Resumes</h1>
          <p className="page-sub">
            Every change saves as you type. Need another version?{' '}
            <button type="button" className="link-cta" onClick={picker.open}>
              Start a new resume
            </button>
          </p>
        </header>

        {error && (
          <div className="banner" role="alert" style={{ marginBottom: 22 }}>
            {error}
          </div>
        )}

        {resumes === null && !error && (
          <div className="resume-grid-skeleton" aria-label="Loading resumes">
            <span className="skeleton-card" />
            <span className="skeleton-card" />
            <span className="skeleton-card" />
          </div>
        )}

        {resumes && (
          <ul className="thumb-grid">
            <li className="new-resume-item">
              <button type="button" className="new-resume-card" onClick={picker.open}>
                <span className="new-resume-plus" aria-hidden="true">
                  <Plus />
                </span>
                <span className="new-resume-label">New resume</span>
              </button>
            </li>

            {resumes.map((r) => {
              const paper = docs[r.id]?.settings.paperSize ?? 'A4'
              const open = menuFor === r.id

              return (
                <li className="resume-card" key={r.id}>
                  <Link
                    className="resume-card-thumb"
                    to={`/resume/${r.id}`}
                    aria-label={`Open ${r.name}`}
                  >
                    <ResumeThumb doc={docs[r.id]} />
                  </Link>

                  <div className="resume-card-foot">
                    <div className="resume-card-info">
                      <Link className="resume-name" to={`/resume/${r.id}`}>
                        {r.name || 'Untitled resume'}
                      </Link>
                      <p className="resume-meta">
                        edited {relativeDate(r.updatedAt)}
                        <span className="meta-dot" aria-hidden="true" />
                        {paper}
                      </p>
                    </div>

                    <div
                      className="card-menu-wrap"
                      ref={open ? menuRef : undefined}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="kebab"
                        aria-label={`Actions for ${r.name}`}
                        aria-haspopup="menu"
                        aria-expanded={open}
                        onClick={() => setMenuFor(open ? null : r.id)}
                      >
                        <Kebab />
                      </button>

                      {open && (
                        <div className="card-menu" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            disabled={busy}
                            onClick={() => {
                              setMenuFor(null)
                              void act(() => api.duplicate(r.id))
                            }}
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="danger"
                            disabled={busy}
                            onClick={() => {
                              setMenuFor(null)
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
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {resumes?.length === 0 && (
          <p className="dash-note">
            No resumes yet — pick a template and this space fills with your work.
          </p>
        )}
      </div>
    </div>
  )
}
