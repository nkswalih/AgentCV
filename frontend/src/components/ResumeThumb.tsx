/**
 * A live miniature of a whole resume.
 *
 * It renders the same ResumePage the editor previews -- never a simplified
 * mock-up -- scaled into whatever width its card gives it, clipped to the
 * first sheet like a stack of paper seen from above. A badge counts extra
 * pages so a two-page resume is identifiable without opening it.
 */

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

import { PreviewScope } from '../templates/parts'
import { ResumePage } from '../templates/ResumePage'
import type { PaperSize, ResumeDocument } from '../types'

/** CSS mm at 96dpi -- matches the editor preview's coordinate system. */
const PX_PER_MM = 96 / 25.4

const PAPER_MM: Record<PaperSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  Letter: { w: 216, h: 279 },
}

export function ResumeThumb({ doc }: { doc?: ResumeDocument }) {
  const windowRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  const [pages, setPages] = useState(1)

  const size = PAPER_MM[doc?.settings.paperSize ?? 'A4']
  const pageW = size.w * PX_PER_MM
  const sheetH = size.h * PX_PER_MM

  // Scale to whatever width the grid hands this card.
  useLayoutEffect(() => {
    const el = windowRef.current
    if (!el || !doc) return
    const measure = () => setScale(el.clientWidth / pageW)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [doc, pageW])

  // Real rendered height decides how many sheets the document spans.
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el || !doc || scale === 0) return
    const naturalH = el.getBoundingClientRect().height / scale
    setPages(Math.max(1, Math.ceil(naturalH / sheetH - 0.001)))
  }, [doc, scale, sheetH])

  return (
    <div
      className="thumb-window"
      ref={windowRef}
      style={{ aspectRatio: `${size.w} / ${size.h}` }}
    >
      {doc && scale > 0 ? (
        <>
          <div className="thumb-scaler" style={{ width: pageW * scale }}>
            <div
              className="thumb-frame"
              ref={contentRef}
              style={{ '--preview-scale': scale } as CSSProperties}
            >
              <PreviewScope>
                <ResumePage doc={doc} />
              </PreviewScope>
            </div>
          </div>
          {pages > 1 && <span className="thumb-pages">{pages} pages</span>}
        </>
      ) : (
        <span className="thumb-loading">{doc ? 'Scaling…' : 'Loading…'}</span>
      )}
    </div>
  )
}
