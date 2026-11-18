/** The editor route: top bar + document structure + page + style inspector. */

import { Link, useParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

import { api } from '../api'
import { useEditor } from '../store'
import { ExportDialog } from '../editor/ExportDialog'
import {
  ChevronDown,
  DownloadIcon,
  FileIcon,
  Kebab,
  LinkIcon,
  LogoMark,
  MailIcon,
  RedoIcon,
  UndoIcon,
} from '../editor/icons'
import { PagePreview } from '../editor/PagePreview'
import { LeftPane, RightPane } from '../editor/Panes'
import { useHistoryKeys } from '../editor/useHistoryKeys'
import { PageMeta } from '../components/PageMeta'
import { ResumeImporter } from '../components/ResumeImporter'
import { buildBasics, buildSections } from '../importDoc'
import type { ResumeDocument } from '../types'

/** The share sheet is optional, so ask the browser before assuming it. */
type FileShareNavigator = Navigator & {
  canShare?: (data?: { files?: File[] }) => boolean
  share?: (data?: { files?: File[]; title?: string; text?: string }) => Promise<void>
}

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

/** The undo / redo glyphs for the user's own keyboard, not the one we test on. */
function historyShortcuts() {
  const apple = /mac|iphone|ipad/i.test(navigator.userAgent)
  return apple
    ? { undo: '⌘Z', redo: '⇧⌘Z' }
    : { undo: 'Ctrl+Z', redo: 'Ctrl+Shift+Z' }
}

/**
 * True when the document holds text an import would destroy.
 *
 * Ids and flags are excluded, and bullet lists only count when a bullet has
 * letters: a starter document is full of empty fields, and warning about them
 * would make the confirmation meaningless.
 */
function hasContent(doc: ResumeDocument): boolean {
  const basics = doc.basics
  const fields = [
    basics.fullName,
    basics.headline,
    basics.email,
    basics.phone,
    basics.location,
    basics.website,
  ]
  if (fields.some((value) => value.trim())) return true
  if (basics.links.some((link) => link.url.trim() || link.label.trim())) return true
  return doc.sections.some((section) =>
    section.items.some((item) =>
      Object.entries(item).some(([key, value]) => {
        if (key === 'id') return false
        if (typeof value === 'string') return value.trim().length > 0
        if (Array.isArray(value)) {
          return value.some((entry) => typeof entry === 'string' && entry.trim().length > 0)
        }
        return false
      }),
    ),
  )
}

/**
 * Undo / redo as one segmented pair.
 *
 * Each button's tooltip names the action it would move. That is the only place
 * the history is visible, so it has to say "Undo phone" rather than "Undo" --
 * the difference between stepping back once and undoing an afternoon. The
 * shortcut rides along because a keyboard editor has no menu to discover it in.
 */
function HistoryControls() {
  const undo = useEditor((s) => s.undo)
  const redo = useEditor((s) => s.redo)
  const past = useEditor((s) => s.past)
  const future = useEditor((s) => s.future)
  // Newest first out of the stack: exactly what each button would reverse.
  const undoLabel = past.at(-1)?.label
  const redoLabel = future.at(-1)?.label
  const keys = historyShortcuts()

  return (
    <div className="history-group">
      <button
        type="button"
        className="btn btn-outline history-btn"
        onClick={undo}
        disabled={!undoLabel}
        aria-label={undoLabel ? `Undo ${undoLabel}` : 'Nothing to undo'}
        aria-keyshortcuts="Control+Z Meta+Z"
        title={
          undoLabel ? `Undo ${undoLabel} (${keys.undo})` : 'Nothing to undo'
        }
      >
        <UndoIcon />
      </button>
      <button
        type="button"
        className="btn btn-outline history-btn"
        onClick={redo}
        disabled={!redoLabel}
        aria-label={redoLabel ? `Redo ${redoLabel}` : 'Nothing to redo'}
        aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
        title={
          redoLabel ? `Redo ${redoLabel} (${keys.redo})` : 'Nothing to redo'
        }
      >
        <RedoIcon />
      </button>
    </div>
  )
}

export function Editor() {
  const { id } = useParams<{ id: string }>()
  const load = useEditor((s) => s.load)
  const doc = useEditor((s) => s.doc)
  const name = useEditor((s) => s.name)
  const rename = useEditor((s) => s.rename)
  const saveNow = useEditor((s) => s.saveNow)
  const replaceContent = useEditor((s) => s.replaceContent)
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  useHistoryKeys()

  // The topbar's two popovers share the usual outside-click + Escape contract.
  const [nameOpen, setNameOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const nameRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [toast, setToast] = useState<string | null>(null)
  const [emailBusy, setEmailBusy] = useState(false)

  useEffect(() => {
    if (id) void load(id)
  }, [id, load])

  useEffect(() => {
    if (!nameOpen && !menuOpen) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (nameRef.current && !nameRef.current.contains(target)) setNameOpen(false)
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNameOpen(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [nameOpen, menuOpen])

  useEffect(() => {
    if (!nameOpen) return
    nameInputRef.current?.focus()
    nameInputRef.current?.select()
  }, [nameOpen])

  // The import dialog is its own surface, so Escape closes it rather than
  // reaching whichever topbar popover was open last.
  useEffect(() => {
    if (!importOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setImportOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [importOpen])

  // Status messages are short-lived; a toast should never become furniture.
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

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

  const shareLink = `${window.location.origin}/print/${id}`
  const paperSize = doc.settings.paperSize

  /**
   * "Download via email" should never hand the user a dead attachment. When
   * the browser can share a real file we use the OS sheet; otherwise the PDF
   * is saved and the mail client opens with a ready-to-send draft.
   */
  async function handleEmailDownload() {
    setMenuOpen(false)
    if (!id) return
    setEmailBusy(true)
    setToast('Preparing your PDF…')
    try {
      await saveNow()
      const { blob, filename } = await api.exportPdfFile(id, {
        paperSize,
      })
      const file = new File([blob], filename, { type: 'application/pdf' })
      const nav = navigator as FileShareNavigator

      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: name || 'My resume',
          text: `My resume${name ? ` — ${name}` : ''}`,
        })
        setToast('Share sheet opened')
        return
      }

      // Fallback: save the PDF, then open a draft the file can be attached to.
      const url = URL.createObjectURL(blob)
      try {
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }

      const subject = encodeURIComponent(`My resume${name ? ` — ${name}` : ''}`)
      const body = encodeURIComponent(
        `Hi,\n\nPlease find my resume attached.\n\nBest,\n${name}\n`,
      )
      const mail = document.createElement('a')
      mail.href = `mailto:?subject=${subject}&body=${body}`
      mail.click()
      setToast('PDF downloaded — attach it to the email')
    } catch (e) {
      // Closing the native share sheet is not an error worth shouting about.
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setToast(e instanceof Error ? e.message : 'Could not prepare the PDF')
      }
    } finally {
      setEmailBusy(false)
    }
  }

  async function handleShareLink() {
    setMenuOpen(false)
    if (!id) return
    try {
      await navigator.clipboard.writeText(shareLink)
      setToast('Shareable link copied to clipboard')
    } catch {
      // Older browsers and insecure contexts: a temporary field does the job.
      const field = document.createElement('input')
      field.value = shareLink
      document.body.appendChild(field)
      field.select()
      try {
        document.execCommand('copy')
        setToast('Shareable link copied to clipboard')
      } catch {
        setToast(`Shareable link: ${shareLink}`)
      } finally {
        field.remove()
      }
    }
  }

  return (
    <div className="shell">
      <PageMeta title="Resume editor: AgentCV" noindex />
      <header className="topbar">
        <Link className="wordmark" to="/" aria-label="Back to resumes">
          <LogoMark size={30} />
          <span>agentcv</span>
        </Link>
        <span className="topbar-divider" aria-hidden="true" />

        <div className="name-menu" ref={nameRef}>
          <button
            type="button"
            className="name-field"
            aria-haspopup="dialog"
            aria-expanded={nameOpen}
            onClick={() => {
              setMenuOpen(false)
              setNameOpen((v) => !v)
            }}
          >
            <span className="name-text">{name || 'Untitled Resume'}</span>
            <ChevronDown />
          </button>

          {nameOpen && (
            <div className="name-pop" role="dialog" aria-label="Resume details">
              <label className="name-pop-field">
                <span className="name-pop-label">Resume name</span>
                <input
                  ref={nameInputRef}
                  value={name}
                  aria-label="Resume name"
                  onChange={(e) => rename(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      setNameOpen(false)
                    }
                  }}
                />
              </label>
              <div className="name-pop-foot">
                <SaveState />
                <Link to="/" onClick={() => setNameOpen(false)}>
                  All resumes
                </Link>
              </div>
            </div>
          )}
        </div>

        <span className="topbar-spacer" />

        <HistoryControls />

        <SaveState />

        <button
          type="button"
          className="btn btn-outline import-open"
          onClick={() => {
            setNameOpen(false)
            setMenuOpen(false)
            setImportOpen(true)
          }}
        >
          <FileIcon />
          Import
        </button>

        <button className="btn btn-primary download-btn" onClick={() => setExportOpen(true)}>
          <DownloadIcon />
          Download
        </button>

        <div className="topbar-menu" ref={menuRef}>
          <button
            type="button"
            className="btn btn-icon btn-outline kebab-btn"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => {
              setNameOpen(false)
              setMenuOpen((v) => !v)
            }}
          >
            <Kebab />
          </button>

          {menuOpen && (
            <div className="topbar-dropdown" role="menu">
              <button
                type="button"
                role="menuitem"
                disabled={emailBusy}
                onClick={() => void handleEmailDownload()}
              >
                <MailIcon />
                {emailBusy ? 'Preparing PDF…' : 'Download via email'}
              </button>
              <button type="button" role="menuitem" onClick={() => void handleShareLink()}>
                <LinkIcon />
                Get shareable link
              </button>
            </div>
          )}
        </div>
      </header>

      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}

      {importOpen && (
        <div className="modal-overlay" onClick={() => setImportOpen(false)}>
          <div
            className="modal imp-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Import a resume"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h2 className="modal-title">Import a resume</h2>
                <p className="hint">
                  Read an existing PDF, Word, text or LaTeX resume into this template.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setImportOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="imp-modal-body">
              <ResumeImporter
                template={doc.settings.template}
                replacing={hasContent(doc)}
                showName={false}
                applyLabel="Import into this resume"
                onApply={(draft) => {
                  // One action, one undo step: the author can step back to the
                  // content the import replaced.
                  replaceContent(buildBasics(draft.basics), buildSections(draft))
                  setImportOpen(false)
                  setToast('Imported. Undo is available if you want the old content back.')
                }}
                onCancel={() => setImportOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="panes">
        <LeftPane />
        <PagePreview doc={doc} />
        <RightPane />
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
