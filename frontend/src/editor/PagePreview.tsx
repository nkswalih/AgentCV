/**
 * The centre stage: the resume page, scaled to fit, wearing its prepress marks.
 *
 * Two measurements drive this component. The scale keeps a 210mm page inside
 * whatever width the pane has, and the content height decides how many sheets
 * the resume needs -- which is what places the dashed break rules.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { ResumePage } from '../templates/ResumePage'
import type { ResumeDocument } from '../types'

/** CSS mm at 96dpi. Used to convert paper dimensions into layout pixels. */
const PX_PER_MM = 96 / 25.4

const PAPER_MM = {
  A4: { w: 210, h: 297 },
  Letter: { w: 216, h: 279 },
} as const

export function PagePreview({ doc }: { doc: ResumeDocument }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  const paper = PAPER_MM[doc.settings.paperSize]
  const pageW = paper.w * PX_PER_MM
  const sheetH = paper.h * PX_PER_MM

  const [scale, setScale] = useState(1)
  const [contentH, setContentH] = useState(sheetH)

  // Fit the page to the pane, never enlarging past actual size -- a resume
  // blown up beyond 100% misrepresents how it will print.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const measure = () => {
      // The stage's own horizontal padding. The crop marks are the only thing
      // hanging off the sheet, and at 9px they sit well inside that padding, so
      // the sheet width alone sets the scale.
      const available = stage.clientWidth - 96
      setScale(Math.min(1, Math.max(0.28, available / pageW)))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [pageW])

  // Track the document's real height. The transform does not affect the layout
  // box, so this reads unscaled pixels and stays comparable to sheetH.
  useLayoutEffect(() => {
    const page = pageRef.current
    if (!page) return

    const measure = () => setContentH(page.getBoundingClientRect().height / scale)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(page)
    return () => observer.disconnect()
  }, [scale, doc])

  const pages = Math.max(1, Math.ceil(contentH / sheetH - 0.001))

  return (
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
            <ResumePage doc={doc} />
          </div>

          {/* Dashed rules where Chromium will actually break the page. */}
          {Array.from({ length: pages - 1 }, (_, i) => (
            <span className="page-break" key={i} style={{ top: sheetH * (i + 1) }}>
              <span className="page-break-label">page {i + 2}</span>
            </span>
          ))}

          <span className="page-caption">
            {doc.settings.paperSize} · {paper.w}×{paper.h}mm · {Math.round(scale * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}
