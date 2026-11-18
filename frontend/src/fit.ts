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
 * height against the sheet, correct, repeat. Height is not proportional to the
 * factor, though. Shrinking the factor widens the measure (`width: 210mm / fit`),
 * so the text reflows into fewer lines and the page gets shorter faster than
 * the factor does. A correction written as `fit * target / height` therefore
 * overshoots in both directions and can bounce between two values forever --
 * one too airy, one spilling onto a second sheet -- and whichever value the
 * step budget happens to stop on becomes the next visit's starting point.
 *
 * The search below is bracketed instead. Every measurement rules out one side
 * of the factor range: too tall is a new upper bound, too short a new lower
 * bound. Inside that range the next try comes from the power law through the
 * last measurement on each side -- page height grows faster than the factor,
 * because a smaller factor also widens the measure -- and a try that would
 * cross a bound already measured is replaced by a bisection of the range.
 * Because height is monotone in the factor (a larger factor means a larger
 * zoom and a narrower measure), the range can only shrink around the answer,
 * so the sequence terminates on the right side instead of oscillating.
 */

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

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

/** Give up after this many corrections, so a layout that cannot settle can
    never spin the render loop. The search usually needs four or five passes;
    the rest is slack for a page whose height jumps at a reflow boundary, and
    for the corrections spent while web fonts arrive. */
const MAX_STEPS = 16

/** A step smaller than this is below the precision of the fit value itself. */
const MIN_STEP = 1e-5

/** When the two measured bounds are this close, the page's height is jumping
    between them and the short side is the answer. */
const BRACKET_EPSILON = 1e-4

/** Height deadband in layout pixels. Smaller than a printed pixel at any
    usable factor, so stopping here really does mean "fills the sheet". */
const HEIGHT_DEADBAND = 0.5

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
  /**
   * The factor is searched inside a bracket. `short` was measured to leave room
   * on the sheet, `tall` was measured to overflow it. Both ends are facts from
   * a render, never guesses, so the answer always lies between them.
   */
  const bracket = useRef({ short: 0, tall: 1 })
  /**
   * The last measurement on each side of the target. Two points are enough to
   * estimate how fast the page grows with the factor, which is what turns the
   * correction from a guess that overshoots into one that lands close.
   */
  const probe = useRef<{
    short: { fit: number; height: number } | null
    tall: { fit: number; height: number } | null
  }>({ short: null, tall: null })
  /**
   * Whether the current commit still needs measuring. A content change or a
   * pending correction opens it; a settled page closes it, so editor chrome
   * that does not touch the document (save state, dialogs, panels) never
   * forces a layout read of the resume.
   */
  const pending = useRef(true)
  /** Forces a commit so a self-detected change can be measured before paint. */
  const [, bump] = useState(0)

  /** Restart the search: new content means old bounds describe another page. */
  const restart = () => {
    steps.current = 0
    bracket.current = { short: 0, tall: 1 }
    probe.current = { short: null, tall: null }
    pending.current = true
    setSettled(false)
  }

  // Re-open the search when the document or the paper changes. Declared before
  // the measuring effect, so a new document is measured against a fresh bracket
  // in the same commit rather than inheriting the previous page's bounds.
  useLayoutEffect(() => {
    restart()
    // `restart` only touches refs and a state setter, so its identity does not
    // matter here; depending on it would restart the search on every paint,
    // which is exactly what must not happen.
  }, [watch, paper])

  // Web fonts land after the first layout, and a face swap changes both the
  // number of wrapped lines and how much of the sheet is filled. Re-measure
  // when a face actually finishes loading, not on an arbitrary timer, so the
  // first guess is not the one that sticks.
  useEffect(() => {
    const fonts = document.fonts
    if (!fonts) return
    const onLoaded = () => restart()
    fonts.addEventListener('loadingdone', onLoaded)
    return () => fonts.removeEventListener('loadingdone', onLoaded)
  }, [])

  // The page also changes size without anybody announcing it: a late image, a
  // template rule that only applies once a class lands, a correction that was
  // computed for the previous content and is still on screen for a frame. So
  // the sheet watches its own box. A change re-opens the measurement, which is
  // exactly the same check the content change does, and the deadband above
  // stops it: a change that still fits produces no correction and no further
  // render.
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      // A correction is already queued; measuring again would only repeat it.
      if (pending.current) return
      pending.current = true
      bump((n) => n + 1)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  // Deliberately runs after every commit: each correction is one render, and
  // the search ends itself when the measurement stops moving.
  //
  // Layout effect, not effect, because the search is a run of corrections and
  // only the last one should ever reach the screen. From a passive effect the
  // page paints at the starting factor first: full size and spilling off the
  // sheet, then far too small, then up to the answer -- the whole settle
  // visible as the document resizing itself after it appears. A layout effect
  // runs before paint, so the loop finishes inside one frame and the first
  // painted page is the fitted one.
  useLayoutEffect(() => {
    if (!pending.current) return
    const el = ref.current
    if (!el) return
    pending.current = false

    // Measure the document, not the sheet box. A fitted page is pinned to at
    // least one sheet tall so Chromium still paginates it, and that floor hides
    // a page that is shorter than its sheet -- which is exactly the state that
    // says the type can grow. Reading through the floor used to make the first
    // correction permanent: one overshoot downward and the box measured a full
    // sheet forever, so the document stayed smaller than its own content for
    // the rest of the session. The floor is lifted for this read only, in the
    // same frame, so nothing is ever painted without it.
    const page = el.querySelector<HTMLElement>('.page') ?? el
    const floor = page.style.minHeight
    page.style.minHeight = '0px'
    const height = page.getBoundingClientRect().height / (compensate || 1)
    page.style.minHeight = floor
    if (!(height > 0)) return

    const sheet = PAPER_MM[paper].h * PX_PER_MM

    // Aim a hair under the sheet: landing exactly on the boundary is what
    // hands Chromium a second, empty page.
    const target = sheet * 0.994

    const { short, tall } = bracket.current
    let next = fit

    /**
     * Next factor to try, from the current measurement.
     *
     * Two measured points give the local exponent of height against factor:
     * the page grows faster than the factor, because a smaller factor also
     * widens the measure. Solving the power law for the target lands on the
     * answer in one step where the plain proportional correction would
     * overshoot to the other side. The result is still only a hint: it is
     * clamped to the measured bracket, and a value that would cross a bound
     * already tried is replaced by a bisection of the bracket.
     */
    const step = (factor: number, measured: number) => {
      const other = measured > target ? probe.current.short : probe.current.tall
      let guess = factor * (target / measured)
      if (other && other.fit !== factor && other.height > 0) {
        const exponent =
          Math.log(measured / other.height) / Math.log(factor / other.fit)
        // Bounded because a reflow can make two neighbouring factors measure
        // almost the same height; an unbounded exponent would divide by zero.
        if (Number.isFinite(exponent) && exponent > 0.25 && exponent < 8) {
          guess = factor * Math.pow(target / measured, 1 / exponent)
        }
      }
      // The factor never goes past actual size: that is the natural page, and
      // growing beyond it is the explicit zoom's job.
      if (guess >= 1) return 1
      const inside = Math.max(FIT_FLOOR, guess)
      return inside > bracket.current.short && inside < bracket.current.tall
        ? inside
        : (bracket.current.short + bracket.current.tall) / 2
    }

    if (height > target + HEIGHT_DEADBAND) {
      // Too tall for one sheet: this factor is a measured upper bound.
      bracket.current.tall = Math.min(tall, fit)
      probe.current.tall = { fit, height }
      next = step(fit, height)
    } else if (height < target - HEIGHT_DEADBAND) {
      // Room left on the sheet: this factor is a measured lower bound.
      bracket.current.short = Math.max(short, fit)
      probe.current.short = { fit, height }
      next = step(fit, height)
    }

    next = Math.min(1, Math.max(FIT_FLOOR, next))

    // The height does not move smoothly with the factor: a hair more zoom can
    // wrap one more word and push a whole block onto the next line, so between
    // two nearly equal factors the page can go from fitting to overflowing.
    // When the bracket has narrowed to that gap there is no factor that both
    // fills the sheet and fits on it, and the search would keep stepping
    // across the cliff until the budget ran out. The answer is the short side:
    // the most the page can be filled without spilling.
    const gap = bracket.current.tall - bracket.current.short
    if (gap > 0 && gap <= BRACKET_EPSILON) {
      const decided = Math.max(FIT_FLOOR, bracket.current.short)
      if (Math.abs(decided - fit) > MIN_STEP && steps.current < MAX_STEPS) {
        steps.current += 1
        pending.current = true
        setSettled(false)
        setFit(decided)
        return
      }
      if (!settled) setSettled(true)
      return
    }

    // Whether another render is worth it. The height deadband above is the
    // only stop rule: a correction that is small in factor can still move the
    // painted page several pixels at a reflow boundary, and stopping there
    // leaves the page either short or overflowing. The bracket guarantees
    // progress, and MAX_STEPS guarantees an end.
    if (Math.abs(next - fit) > MIN_STEP && steps.current < MAX_STEPS) {
      steps.current += 1
      pending.current = true
      setSettled(false)
      setFit(next)
      return
    }

    // Out of budget while the page still overflows: land on the last factor
    // measured to fit. A page with a little air beats one that spills onto a
    // second sheet. At the floor there is no such factor, so the floor stands
    // and the document genuinely needs two pages.
    const knownShort = bracket.current.short
    if (
      steps.current >= MAX_STEPS &&
      height > target + HEIGHT_DEADBAND &&
      knownShort > 0 &&
      fit - knownShort > MIN_STEP
    ) {
      pending.current = true
      setFit(knownShort)
      return
    }

    if (!settled) setSettled(true)
  })

  return { fit, settled }
}
