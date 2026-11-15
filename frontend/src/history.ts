/**
 * Undo/redo history for the editor document.
 *
 * The store holds one immutable document at a time: every mutation runs through
 * its `edit` funnel, which hands back a new document and leaves the previous one
 * untouched. History can therefore keep *references* instead of copies. Immer
 * shares unchanged subtrees, so a snapshot of a large document costs a handful
 * of objects -- which is what lets the whole stack live in memory without a
 * size budget or a serialization step.
 *
 * Three rules keep the stack useful rather than merely correct:
 *
 *   - One step per intention. Typing is one action, not one action per
 *     keystroke, so edits that share a key merge while they land inside
 *     COALESCE_MS of each other. A name still undoes in a single step however
 *     many letters it took.
 *   - Barriers. Anything that ends a train of thought -- undo, redo, switching
 *     resume, a structural change -- closes the open step, so a later edit can
 *     never silently join an earlier one.
 *   - Names. Each entry records the action that produced the state *after* it,
 *     which is exactly what an "Undo name" affordance needs to display.
 *
 * History is per open resume and deliberately not persisted: undoing across a
 * reload would replay states the server never saw.
 */

import type { ResumeDocument } from './types'

/** What a mutation was, in the store's terms. */
export interface EditAction {
  /** Phrase naming the change, e.g. "name". Displayed as "Undo name". */
  label: string
  /** Edits sharing a key within the coalesce window become one step. Omit for
   *  actions that must always stand alone (adds, deletes, reorders). */
  key?: string
}

/** One undoable step: the document as it stood before the labelled action. */
export interface HistoryEntry {
  doc: ResumeDocument
  label: string
  key?: string
  /** When the action that follows this snapshot landed, in ms. */
  at: number
}

/** Deep enough for a long editing session, bounded so a tab left open all day
 *  cannot grow without limit. Snapshots share structure, so this is cheap. */
export const HISTORY_LIMIT = 100

/** A pause longer than this starts a new undo step even in the same field. */
export const COALESCE_MS = 600

/**
 * Record the state an edit is about to replace.
 *
 * Mutates `past` in place so it can run inside an immer draft, and closes the
 * redo branch: once a new edit lands, the abandoned future is unreachable.
 */
export function recordEdit(
  past: HistoryEntry[],
  future: HistoryEntry[],
  before: ResumeDocument,
  action: EditAction,
  now: number,
): void {
  const top = past[past.length - 1]
  const merges = !!action.key && top?.key === action.key && now - top.at < COALESCE_MS

  if (merges && top) {
    // Keep the older snapshot -- undo must return to the start of the run, not
    // to the previous keystroke -- and extend the window.
    top.at = now
    top.label = action.label
  } else {
    past.push({ doc: before, label: action.label, key: action.key, at: now })
    if (past.length > HISTORY_LIMIT) past.shift()
  }

  future.length = 0
}

/**
 * Step back one action.
 *
 * Returns the document to restore and moves the state being replaced onto the
 * redo stack, keeping the label with it so redo describes the same action.
 * Returns null when there is nothing to undo.
 */
export function stepBack(
  past: HistoryEntry[],
  future: HistoryEntry[],
  current: ResumeDocument,
): ResumeDocument | null {
  const entry = past.pop()
  if (!entry) return null

  future.push({ doc: current, label: entry.label, key: entry.key, at: 0 })
  // Undo ends the open step: the next keystroke is its own action even if it
  // lands milliseconds later in the same field.
  const top = past[past.length - 1]
  if (top) top.at = 0

  return entry.doc
}

/** Step forward one action. Mirror of stepBack. */
export function stepForward(
  past: HistoryEntry[],
  future: HistoryEntry[],
  current: ResumeDocument,
): ResumeDocument | null {
  const entry = future.pop()
  if (!entry) return null

  past.push({ doc: current, label: entry.label, key: entry.key, at: 0 })
  return entry.doc
}
