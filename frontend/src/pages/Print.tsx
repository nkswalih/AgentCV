/**
 * Print route -- the surface Chromium screenshots into a PDF.
 *
 * It renders the resume page alone: no editor chrome, no preview scaling, no
 * placeholder text. The `data-print-ready` flag is the handshake the backend
 * waits on, so a PDF is never captured mid-load.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { api } from '../api'
import { ResumePage } from '../templates/ResumePage'
import type { ResumeDocument } from '../types'

export function Print() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<ResumeDocument | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api
      .get(id)
      .then((r) => setDoc(r.document))
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

  if (error) {
    // Surfaced as text rather than thrown: the backend reports the render
    // failure with this message rather than a blank PDF.
    return <pre data-print-error="true">{error}</pre>
  }
  if (!doc) return null

  return (
    <div data-print-ready="true">
      <ResumePage doc={doc} forExport />
    </div>
  )
}
