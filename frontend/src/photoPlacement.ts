/*
 * Where the profile photo sits, resolved against the header it lives in.
 *
 * The stored position is the author's preferred arrangement; the header form
 * narrows what can actually be drawn. A full-width band can flank the identity
 * (left/right) or stand above it (top), and "above" only composes cleanly when
 * the identity itself is centred. A side rail has no left or right of the text
 * worth speaking of, so the same two fields mean above/below there.
 *
 * Keeping this in one place means the Photo card and the sheet can never
 * disagree about what a stored position is producing.
 */

export type PhotoPosition = 'left' | 'top' | 'right' | 'center' | 'bottom'
export type PhotoPlacement = 'left' | 'top' | 'right' | 'bottom'

export interface HeaderPlacementContext {
  columns: 'one' | 'two'
  headerPosition: 'top' | 'left' | 'right' | 'center'
  /** Header card alignment. Only read in two-column mode. */
  align?: 'left' | 'center' | 'right'
}

/** The horizontal alignment the identity actually has on the sheet. */
export function headerTextAlign(
  ctx: HeaderPlacementContext,
): 'left' | 'center' | 'right' {
  if (ctx.columns === 'two') return ctx.align ?? 'center'
  if (ctx.headerPosition === 'left' || ctx.headerPosition === 'right') {
    return ctx.headerPosition
  }
  // In one column, "top" and "center" both mean a centred identity.
  return 'center'
}

/** True when the header sits inside a narrow side rail, not above the body. */
export function photoInSideRail(ctx: HeaderPlacementContext): boolean {
  return (
    ctx.columns === 'two' &&
    (ctx.headerPosition === 'left' || ctx.headerPosition === 'right')
  )
}

export function resolvePhotoPlacement(
  position: PhotoPosition | undefined,
  ctx: HeaderPlacementContext,
): PhotoPlacement {
  const stored = position ?? 'left'

  if (photoInSideRail(ctx)) {
    return stored === 'top' ? 'top' : 'bottom'
  }

  const align = headerTextAlign(ctx)
  // A centred identity keeps its balance with the photo above it; a photo
  // beside the name would pull the composition off its axis.
  if (align === 'center') return 'top'
  if (stored === 'right') return 'right'
  if (stored === 'left') return 'left'
  // Stored top/centre/below is a centred composition. With left or right text
  // it settles on that edge instead of producing a mixed alignment.
  return align
}
