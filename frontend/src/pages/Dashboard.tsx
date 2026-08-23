import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { api } from '../api'
import { TEMPLATES_BY_ID } from '../templates/registry'
import type { ResumeSummary } from '../types'

function relativeDate(iso: string) {
  const then = new Date(iso).getTime()
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function Dashboard() {
  const navigate = useNavigate()
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null)
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

  async function create() {
    setBusy(true)
    try {
      const resume = await api.create()
      navigate(`/resume/${resume.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

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
    <div className="shell">
      <header className="topbar">
        <span className="wordmark">
          <span className="regmark" aria-hidden="true" />
          AgentCV
        </span>
        <div className="topbar-spacer" />
        <button className="btn btn-primary" onClick={create} disabled={busy}>
          New resume
        </button>
      </header>

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
                Start one and it appears here. Every change saves as you type.
              </p>
              <button className="btn btn-primary" onClick={create} disabled={busy}>
                Create your first resume
              </button>
            </div>
          )}

          {resumes && resumes.length > 0 && (
            <>
              <p className="eyebrow" style={{ marginBottom: 12 }}>
                {resumes.length} document{resumes.length === 1 ? '' : 's'}
              </p>
              <ul className="dash-list">
                {resumes.map((r) => {
                  const meta = TEMPLATES_BY_ID.get(r.template as never)
                  return (
                    <li className="dash-card" key={r.id}>
                      <Link className="dash-card-main" to={`/resume/${r.id}`}>
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
    </div>
  )
}
