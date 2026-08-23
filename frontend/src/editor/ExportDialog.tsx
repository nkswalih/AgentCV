/**
 * The export dialog: one place to choose what leaves the app and how.
 *
 * Format decides the rest of the form -- PDF offers compression, Word and
 * LaTeX take a paper size, HTML needs neither because it captures the preview
 * as-is. Every path flushes pending keystrokes first so an export can never
 * contain the previous autosave.
 */

import { useEffect, useState } from 'react'

import { api, type ExportOptions } from '../api'
import { useEditor } from '../store'
import type { PaperSize } from '../types'
import { Check, Segmented } from './fields'

type ExportFormat = 'pdf' | 'docx' | 'tex' | 'html'

const FORMATS: { value: ExportFormat; label: string; note: string }[] = [
  { value: 'pdf', label: 'PDF', note: 'Exactly what the preview shows' },
  { value: 'docx', label: 'Word', note: 'Editable .docx for recruiters' },
  { value: 'tex', label: 'LaTeX', note: '.tex source, compiles clean' },
  { value: 'html', label: 'HTML', note: 'Self-contained web page' },
]

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const { id, name, doc, saveNow } = useEditor()
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [paperSize, setPaperSize] = useState<PaperSize>('A4')
  const [compress, setCompress] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Default the export to whatever the document itself is set to.
  useEffect(() => {
    if (doc) setPaperSize(doc.settings.paperSize)
  }, [doc])

  // Close on Escape -- a dialog that traps the keyboard is a trap, not a tool.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!doc) return null
  const needsPaper = format !== 'html'

  async function run() {
    if (!id) return
    setBusy(true)
    setError(null)
    try {
      // Flush first: exporting must never race the 700ms autosave debounce.
      await saveNow()
      const options: ExportOptions = { paperSize }
      if (format === 'pdf') {
        await api.exportPdf(id, { ...options, compress })
      } else if (format === 'docx') {
        await api.exportDocx(id, options)
      } else if (format === 'tex') {
        await api.exportTex(id, options)
      } else {
        const { downloadHtmlExport } = await import('./exportHtml')
        downloadHtmlExport(name)
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Export resume"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <p className="eyebrow">Export</p>
          <button className="btn btn-ghost btn-icon" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <span className="field-label">Format</span>
          <div className="export-grid">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                className="export-card"
                data-active={format === f.value}
                onClick={() => setFormat(f.value)}
              >
                <span className="export-format">{f.label}</span>
                <span className="export-note">{f.note}</span>
              </button>
            ))}
          </div>

          {needsPaper && (
            <>
              <span className="field-label" style={{ display: 'block', marginTop: 12 }}>
                Page size
              </span>
              <Segmented
                label=""
                value={paperSize}
                options={[
                  { value: 'A4', label: 'A4 · 210 × 297mm' },
                  { value: 'Letter', label: 'Letter · 8.5 × 11in' },
                ]}
                onChange={(size) => setPaperSize(size)}
              />
            </>
          )}

          {format === 'pdf' && (
            <div className="field" style={{ marginTop: 10 }}>
              <Check
                label="Compress PDF (smaller file)"
                checked={compress}
                onChange={setCompress}
              />
            </div>
          )}

          {error && (
            <p className="upload-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-primary" disabled={busy} onClick={() => void run()}>
            {busy ? 'Exporting…' : `Export ${FORMATS.find((f) => f.value === format)?.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}
