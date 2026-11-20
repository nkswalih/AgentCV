/**
 * The centre stage: the resume page, scaled to fit, wearing its prepress marks.
 *
 * Two measurements drive this component. The fit scale keeps a 210mm page
 * inside whatever width the pane has, and the content height decides how many
 * sheets the resume needs -- which is what places the dashed break rules.
 *
 * On top of the automatic fit sits an explicit zoom: Ctrl/Cmd +/-, Ctrl+wheel
 * over the page, or the toolbar in the corner all set it; Ctrl/Cmd+0 (or the
 * Fit button) hands control back to the fit measurement.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { PAPER_MM, PX_PER_MM, useFitToPage } from '../fit'
import { ResumePage } from '../templates/ResumePage'
import type { ResumeDocument } from '../types'

/** Zoom bounds and per-step factor. Fit stays capped at actual size; only an
    explicit zoom may enlarge past 100%, for proofing fine details. */
const MIN_ZOOM = 0.3
const MAX_ZOOM = 2
const ZOOM_STEP = 1.1

export function PagePreview({ doc }: { doc: ResumeDocument }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  const paper = PAPER_MM[doc.settings.paperSize]
  const pageW = paper.w * PX_PER_MM
  const sheetH = paper.h * PX_PER_MM

  const [fitScale, setFitScale] = useState(1)
  /** null = follow the fit measurement; otherwise an explicit factor. */
  const [zoom, setZoom] = useState<number | null>(null)
  const [contentH, setContentH] = useState(sheetH)

  const scale = zoom ?? fitScale

  // Listeners live across renders, so they read the current scale through
  // this ref rather than closing over a stale one.
  const scaleRef = useRef(scale)
  scaleRef.current = scale

  const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
  const zoomBy = (factor: number) => setZoom(clampZoom(scaleRef.current * factor))

  // Fit the page to the pane width -- never enlarging past actual size. This
  // runs whenever the pane resizes but only drives the result while the user
  // is in Fit mode.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const measure = () => {
      // The stage's own horizontal padding. The crop marks are the only thing
      // hanging off the sheet, and at 9px they sit well inside that padding, so
      // the sheet width alone sets the scale.
      const available = stage.clientWidth - 96
      setFitScale(Math.min(1, Math.max(0.28, available / pageW)))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [pageW])

  // Ctrl/Cmd + wheel zooms -- captured on the WINDOW, not just the stage, so
  // the browser's own page-zoom can never fire anywhere in the editor. Without
  // this, ctrl+wheel over a pane blows the whole chrome up and clips it, which
  // reads as "the sidebar zoomed too". Plain (no-ctrl) scrolling is untouched:
  // the early return leaves native scrolling alone everywhere.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      zoomBy(e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  // Keyboard zoom, matching every viewer's muscle memory.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        zoomBy(ZOOM_STEP)
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        zoomBy(1 / ZOOM_STEP)
      } else if (e.key === '0') {
        e.preventDefault()
        setZoom(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Track the document's real height. The transform does not affect the layout
  // box, so this reads unscaled pixels and stays comparable to sheetH.
  useLayoutEffect(() => {
    const page = pageRef.current
    if (!page) return

    const measure = () => setContentH(page.getBoundingClientRect().height / scaleRef.current)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(page)
    return () => observer.disconnect()
  }, [scale, doc])

  const pages = Math.max(1, Math.ceil(contentH / sheetH - 0.001))
  const atMin = scale <= MIN_ZOOM + 0.001
  const atMax = scale >= MAX_ZOOM - 0.001

  // Keep the document on one sheet. Measured through the preview's own zoom,
  // which is divided back out so the comparison stays in layout pixels.
  const { fit } = useFitToPage({
    ref: pageRef,
    paper: doc.settings.paperSize,
    compensate: scale,
    watch: doc,
  })

  return (
    <div className="preview-wrap">
      <div className="stage" ref={stageRef}>
        <div
          className="page-scaler"
          style={{ width: pageW * scale, height: contentH * scale }}
        >
          <div className="page-frame" style={{ '--preview-scale': scale } as React.CSSProperties}>
            <span className="crop crop-tl" aria-hidden="true" />
            <span className="crop crop-tr" aria-hidden="true" />
            <span className="crop crop-bl" aria-hidden="true" />
            <span className="crop crop-br" aria-hidden="true" />

            <div ref={pageRef}>
              <ResumePage doc={doc} fit={fit} />
            </div>

            {/* Dashed rules where Chromium will actually break the page. */}
            {Array.from({ length: pages - 1 }, (_, i) => (
              <span className="page-break" key={i} style={{ top: sheetH * (i + 1) }}>
                <span className="page-break-label">page {i + 2}</span>
              </span>
            ))}

            <span className="page-caption">
              {doc.settings.paperSize} · {paper.w}×{paper.h}mm · {Math.round(scale * 100)}%
              {zoom == null && ' · fit'}
            </span>
          </div>
        </div>
      </div>

      <div className="zoom-bar" role="group" aria-label="Preview zoom">
        <button
          className="zoom-btn"
          aria-label="Zoom out"
          title="Zoom out (Ctrl + -)"
          disabled={atMin}
          onClick={() => zoomBy(1 / ZOOM_STEP)}
        >
          −
        </button>
        <span className="zoom-value" title={zoom == null ? 'Fitted to pane' : 'Custom zoom'}>
          {Math.round(scale * 100)}%
        </span>
        <button
          className="zoom-btn"
          aria-label="Zoom in"
          title="Zoom in (Ctrl + +)"
          disabled={atMax}
          onClick={() => zoomBy(ZOOM_STEP)}
        >
          +
        </button>
        <span className="zoom-divider" aria-hidden="true" />
        <button
          className="zoom-fit"
          data-active={zoom == null}
          title="Reset to fit (Ctrl + 0)"
          onClick={() => setZoom(null)}
        >
          Fit
        </button>
      </div>
    </div>
  )
}
