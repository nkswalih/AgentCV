/**
 * One-page fit: the factor that keeps a resume on a single sheet.
 *
 * The document is shrunk with CSS `zoom` rather than a transform, because zoom
 * scales the hardcoded pt and mm values inside every template as well and lets
 * the text reflow into the smaller measure -- so the page reads as a smaller
 * edition of the same design instead of a photograph of it with white space
 * on two sides.
 *
 * The factor is measured, not guessed: render, compare the document's real
 * height against the sheet, correct, repeat. Reflow makes each pass cheaper
 * than the last, so this converges in a handful of renders and then stops.
 */

import { useEffect, useRef, useState, type RefObject } from 'react'

import type { PaperSize } from './types'

/** CSS mm at 96dpi -- paper dimensions into layout pixels. */
export const PX_PER_MM = 96 / 25.4

export const PAPER_MM: Record<PaperSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  Letter: { w: 216, h: 279 },
}

/** Never shrink past this. Below it the type stops being readable in print,
    and a resume that needs more than this much squeezing genuinely has two
    pages' worth of content. */
export const FIT_FLOOR = 0.62

/** Give up after this many corrections, so a layout that oscillates between
    two heights can never spin the render loop. */
const MAX_STEPS = 12

export function useFitToPage({
  ref,
  paper,
  compensate = 1,
  watch,
}: {
  /** Wraps the `.page` element; its box height is the document's real height. */
  ref: RefObject<HTMLElement | null>
  paper: PaperSize
  /** Any scale applied by an ancestor (the preview's zoom), divided back out. */
  compensate?: number
  /** Re-opens the measurement when the document or paper changes. */
  watch?: unknown
}) {
  const [fit, setFit] = useState(1)
  const [settled, setSettled] = useState(false)
  const steps = useRef(0)

  // Deliberately runs after every commit: each render is one correction pass,
  // and the convergence check below is what ends the sequence.
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const sheet = PAPER_MM[paper].h * PX_PER_MM
    const height = el.getBoundingClientRect().height / (compensate || 1)
    if (height <= 0) return

    // Aim a hair under the sheet: landing exactly on the boundary is what
    // hands Chromium a second, empty page.
    const target = sheet * 0.994

    let next = fit
    if (height > sheet + 0.5) {
      next = Math.max(FIT_FLOOR, fit * (target / height))
    } else if (fit < 1 && height < sheet * 0.9) {
      // Content shrank (an entry was deleted): let the type grow back, but
      // only from a clear distance so this cannot ping-pong with the branch
      // above on a one-pixel difference.
      next = Math.min(1, fit * (target / height))
    }

    if (Math.abs(next - fit) > 0.004 && steps.current < MAX_STEPS) {
      steps.current += 1
      setSettled(false)
      setFit(next)
    } else if (!settled) {
      setSettled(true)
    }
  })

  useEffect(() => {
    steps.current = 0
    setSettled(false)
  }, [watch, paper])

  return { fit, settled }
}
