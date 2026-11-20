/**
 * The editor's undo / redo shortcuts.
 *
 * The document in the store is the single source of truth and every field is a
 * controlled input, so the browser's own per-field undo history is a second
 * history that can only disagree with ours -- consuming a native undo fires an
 * onChange, which lands in the store as a brand new edit. The shortcut is
 * therefore claimed everywhere in the editor, focused input or not, and the
 * document stack is the only thing it moves. That is also why it still calls
 * preventDefault when the stack is empty: a native undo is never the good
 * answer here.
 */

import { useEffect } from 'react'

import { useEditor } from '../store'

export function useHistoryKeys() {
  const undo = useEditor((s) => s.undo)
  const redo = useEditor((s) => s.redo)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Let an IME finish composing: Cmd/Ctrl+Z there belongs to the input
      // method, and a handler that fires mid-composition corrupts the field.
      if (e.isComposing || e.defaultPrevented) return
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return

      const key = e.key.toLowerCase()
      if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (key === 'y' && !e.shiftKey) {
        // Windows-style redo. Shift+Y is not a binding anywhere, so it is left
        // alone rather than swallowed.
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])
}
