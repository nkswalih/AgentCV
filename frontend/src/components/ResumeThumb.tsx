/**
 * A live miniature of a whole resume.
 *
 * It renders the same ResumePage the editor previews -- never a simplified
 * mock-up -- scaled into whatever width its card gives it, clipped to the
 * first sheet like a stack of paper seen from above. A badge counts extra
 * pages so a two-page resume is identifiable without opening it.
 */

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

import { PAPER_MM, PX_PER_MM, useFitToPage } from '../fit'
import { PreviewScope } from '../templates/parts'
import { ResumePage } from '../templates/ResumePage'
import type { ResumeDocument } from '../types'

export function ResumeThumb({ doc, fitToHeight }: { doc?: ResumeDocument; fitToHeight?: boolean }) {
  const windowRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  const [pages, setPages] = useState(1)

  const size = PAPER_MM[doc?.settings.paperSize ?? 'A4']
  const pageW = size.w * PX_PER_MM
  const sheetH = size.h * PX_PER_MM

  // The miniature shows what the sheet will look like, fit included.
  const { fit } = useFitToPage({
    ref: contentRef,
    paper: doc?.settings.paperSize ?? 'A4',
    compensate: scale || 1,
    watch: doc,
  })

  // Scale to fit the container — by width normally, or by height when
  // fitToHeight is requested (used by the preview modal so the whole page
  // is visible without scrolling).
  useLayoutEffect(() => {
    const el = windowRef.current
    if (!el || !doc) return
    const measure = () => {
      if (fitToHeight && el.clientHeight > 0) {
        const byH = el.clientHeight / sheetH
        const byW = el.clientWidth / pageW
        setScale(Math.min(byW, byH))
      } else {
        setScale(el.clientWidth / pageW)
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [doc, pageW, sheetH, fitToHeight])

  // Real rendered height decides how many sheets the document spans. This has
  // to re-run when the fit changes -- and keep watching, because webfonts and
  // images land after the first measurement -- or the badge freezes on the
  // count from before the document was fitted and claims two pages forever.
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el || !doc || scale === 0) return

    const measure = () => {
      const naturalH = el.getBoundingClientRect().height / scale
      setPages(Math.max(1, Math.ceil(naturalH / sheetH - 0.001)))
    }
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [doc, scale, sheetH, fit])

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
                <ResumePage doc={doc} fit={fit} />
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
