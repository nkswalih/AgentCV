/**
 * Print route -- the surface Chromium screenshots into a PDF.
 *
 * It renders the resume page alone: no editor chrome, no preview scaling, no
 * placeholder text. The `data-print-ready` flag is the handshake the backend
 * waits on, so a PDF is never captured mid-load -- which now also means: not
 * before the one-page fit has settled and the webfonts have loaded, since both
 * change the height the fit is measured against.
 */

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { api } from '../api'
import { normalizeSettings } from '../factories'
import { useFitToPage } from '../fit'
import { ResumePage } from '../templates/ResumePage'
import type { ResumeDocument } from '../types'

/** However the measurement is going, print after this long. A hung handshake
    would surface as an export timeout, which is worse than a page that is a
    few millimetres off. */
const SETTLE_TIMEOUT_MS = 3000

export function Print() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<ResumeDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fontsReady, setFontsReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    api
      .get(id)
      .then((r) => {
        // Same hydration the editor applies, so the PDF is rendered from
        // exactly the settings the editor was showing.
        r.document.settings = normalizeSettings(r.document.settings)
        setDoc(r.document)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [id])

  // Strip the dark app background; this document is printed onto paper.
  useEffect(() => {
    const { style } = document.body
    const previous = style.background
    style.background = '#ffffff'
    return () => {
      style.background = previous
    }
  }, [])

  // Fonts change every line box, so the fit is only trustworthy once they are
  // in. The backend waits on document.fonts too, but the measurement here has
  // to happen after them, not alongside.
  useEffect(() => {
    let live = true
    void document.fonts.ready.then(() => {
      if (live) setFontsReady(true)
    })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), SETTLE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [])

  const { fit, settled } = useFitToPage({
    ref: pageRef,
    paper: doc?.settings.paperSize ?? 'A4',
    watch: `${id}:${fontsReady}`,
  })

  if (error) {
    // Surfaced as text rather than thrown: the backend reports the render
    // failure with this message rather than a blank PDF.
    return <pre data-print-error="true">{error}</pre>
  }
  if (!doc) return null

  const ready = fontsReady && (settled || timedOut)

  return (
    <div data-print-ready={ready ? 'true' : 'false'}>
      <div ref={pageRef}>
        <ResumePage doc={doc} forExport fit={fit} />
      </div>
    </div>
  )
}
