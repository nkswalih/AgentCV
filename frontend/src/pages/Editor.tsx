/** The editor route: top bar + document structure + page + style inspector. */

import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { useEditor } from '../store'
import { ExportDialog } from '../editor/ExportDialog'
import { PagePreview } from '../editor/PagePreview'
import { LeftPane, RightPane } from '../editor/Panes'

function SaveState() {
  const state = useEditor((s) => s.saveState)
  const error = useEditor((s) => s.saveError)
  const label = state === 'saving' ? 'saving' : state === 'dirty' ? 'unsaved' : state === 'error' ? 'error' : 'saved'
  return (
    <span className="savestate" data-state={state} title={error ?? undefined}>
      <span className="dot" aria-hidden="true" />
      {label}
    </span>
  )
}

export function Editor() {
  const { id } = useParams<{ id: string }>()
  const load = useEditor((s) => s.load)
  const doc = useEditor((s) => s.doc)
  const name = useEditor((s) => s.name)
  const rename = useEditor((s) => s.rename)
  const saveNow = useEditor((s) => s.saveNow)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    if (id) void load(id)
  }, [id, load])

  const error = useEditor((s) => s.loadError)
  if (error) {
    return (
      <div className="center-msg">
        <div>
          <p className="banner">{error}</p>
          <Link className="btn" to="/" style={{ marginTop: 12 }}>
            Back to resumes
          </Link>
        </div>
      </div>
    )
  }
  if (!doc) return <div className="center-msg">Loading document…</div>

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="wordmark" to="/" aria-label="Back to resumes">
          <span className="regmark" aria-hidden="true" />
          AgentCV
        </Link>
        <span className="topbar-divider" aria-hidden="true" />
        <input
          className="name-input"
          value={name}
          aria-label="Resume name"
          onChange={(e) => rename(e.target.value)}
        />
        <span className="topbar-spacer" />
        <SaveState />
        <button className="btn" onClick={() => void saveNow()}>
          Save
        </button>
        <button className="btn btn-primary" onClick={() => setExportOpen(true)}>
          Export
        </button>
      </header>

      {exportOpen && (
        <ExportDialog
          onClose={() => setExportOpen(false)}
        />
      )}

      <div className="panes">
        <LeftPane />
        <PagePreview doc={doc} />
        <RightPane />
      </div>
    </div>
  )
}
