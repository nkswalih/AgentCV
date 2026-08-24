/**
 * Editor state for a single resume, with debounced autosave.
 *
 * The whole document lives here and every template reads from it, so the
 * preview updates on each keystroke without a round-trip. Persistence is
 * debounced separately -- typing should never wait on the network.
 */

import { arrayMove } from '@dnd-kit/sortable'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { api } from './api'
import { emptyItem, emptySection, newId, normalizeSettings } from './factories'
import type {
  Basics,
  ResumeDocument,
  Section,
  SectionType,
  Settings,
  SkillsSection,
} from './types'

const AUTOSAVE_DELAY_MS = 700

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

interface EditorState {
  id: string | null
  name: string
  doc: ResumeDocument | null
  loading: boolean
  loadError: string | null
  saveState: SaveState
  saveError: string | null

  load: (id: string) => Promise<void>
  rename: (name: string) => void
  saveNow: () => Promise<void>

  updateBasics: (patch: Partial<Basics>) => void
  updateSettings: (patch: Partial<Settings>) => void

  addSection: (type: SectionType) => void
  removeSection: (sectionId: string) => void
  updateSection: (
    sectionId: string,
    // `layout`, `marker` and `columns` exist only on skills sections; the union
    // above is what keeps them from being applied to any other kind.
    patch: Partial<Pick<Section, 'title' | 'visible'>> &
      Partial<Pick<SkillsSection, 'layout' | 'marker' | 'columns'>>,
  ) => void
  moveSection: (from: number, to: number) => void
  moveSectionToColumn: (sectionId: string, toColumn: 'left' | 'right', toIndex: number) => void

  addItem: (sectionId: string) => void
  removeItem: (sectionId: string, itemId: string) => void
  updateItem: (sectionId: string, itemId: string, patch: Record<string, unknown>) => void
  moveItem: (sectionId: string, from: number, to: number) => void
}

let saveTimer: ReturnType<typeof setTimeout> | undefined

export const useEditor = create<EditorState>()(
  immer((set, get) => {
    /** Mark dirty and (re)arm the autosave timer. */
    function scheduleSave() {
      set((s) => {
        s.saveState = 'dirty'
      })
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => void get().saveNow(), AUTOSAVE_DELAY_MS)
    }

    /** Apply a mutation to the loaded document, then schedule a save. */
    function edit(recipe: (doc: ResumeDocument) => void) {
      set((s) => {
        if (s.doc) recipe(s.doc)
      })
      scheduleSave()
    }

    function withSection(
      doc: ResumeDocument,
      sectionId: string,
      fn: (section: Section) => void,
    ) {
      const section = doc.sections.find((s) => s.id === sectionId)
      if (section) fn(section)
    }

    return {
      id: null,
      name: '',
      doc: null,
      loading: false,
      loadError: null,
      saveState: 'saved',
      saveError: null,

      async load(id) {
        // Drop any save still pending for the previously open resume.
        clearTimeout(saveTimer)
        set((s) => {
          s.loading = true
          s.loadError = null
          s.saveState = 'saved'
          s.saveError = null
        })
        try {
          const resume = await api.get(id)
          const doc = resume.document
          // Hydration: fill any settings gaps left by documents stored before
          // a field existed. Saved values always win -- defaults never
          // overwrite them -- and the store ends up with one complete,
          // consistent settings object, so control state can't drift from the
          // preview after a refresh.
          doc.settings = normalizeSettings(doc.settings)
          // Legacy documents kept the summary on basics with no heading and no
          // way to reach it from the section list. Lift it into a real summary
          // section so it edits and prints like every other section.
          if (doc.basics.summary.trim() && !doc.sections.some((s) => s.type === 'summary')) {
            doc.sections.unshift({
              id: newId(),
              type: 'summary',
              title: 'Summary',
              visible: true,
              items: [{ id: newId(), visible: true, summary: doc.basics.summary }],
            })
            doc.basics.summary = ''
            scheduleSave()
          }
          set((s) => {
            s.id = resume.id
            s.name = resume.name
            s.doc = doc
            s.loading = false
          })
        } catch (err) {
          set((s) => {
            s.loading = false
            s.loadError = err instanceof Error ? err.message : String(err)
          })
        }
      },

      rename(name) {
        set((s) => {
          s.name = name
        })
        scheduleSave()
      },

      async saveNow() {
        const { id, doc, name } = get()
        if (!id || !doc) return

        clearTimeout(saveTimer)
        set((s) => {
          s.saveState = 'saving'
        })
        try {
          await api.update(id, { name, document: doc })
          set((s) => {
            // Another edit may have landed mid-flight; that edit armed its own
            // timer, so don't overwrite its 'dirty' with 'saved'.
            if (s.saveState === 'saving') s.saveState = 'saved'
            s.saveError = null
          })
        } catch (err) {
          set((s) => {
            s.saveState = 'error'
            s.saveError = err instanceof Error ? err.message : String(err)
          })
        }
      },

      updateBasics(patch) {
        edit((doc) => {
          Object.assign(doc.basics, patch)
        })
      },

      updateSettings(patch) {
        edit((doc) => {
          Object.assign(doc.settings, patch)
        })
      },

      addSection(type) {
        edit((doc) => {
          const section = emptySection(type)
          doc.sections.push(section)
          // In two-column mode, new sections go to the left column
          if (doc.settings.columnLayout === 'two') {
            doc.settings.leftColumn.push(section.id)
          }
        })
      },

      removeSection(sectionId) {
        edit((doc) => {
          doc.sections = doc.sections.filter((s) => s.id !== sectionId)
          // Clean up column assignments
          doc.settings.leftColumn = doc.settings.leftColumn.filter((id) => id !== sectionId)
          doc.settings.rightColumn = doc.settings.rightColumn.filter((id) => id !== sectionId)
        })
      },

      updateSection(sectionId, patch) {
        edit((doc) => withSection(doc, sectionId, (s) => Object.assign(s, patch)))
      },

      moveSection(from, to) {
        edit((doc) => {
          doc.sections = arrayMove(doc.sections, from, to)
        })
      },

      moveSectionToColumn(sectionId, toColumn, toIndex) {
        edit((doc) => {
          const fromCol = doc.settings.leftColumn.includes(sectionId) ? 'left' : 'right'
          const fromArr = fromCol === 'left' ? doc.settings.leftColumn : doc.settings.rightColumn
          const toArr = toColumn === 'left' ? doc.settings.leftColumn : doc.settings.rightColumn
          const fromIdx = fromArr.indexOf(sectionId)
          if (fromIdx !== -1) fromArr.splice(fromIdx, 1)
          toArr.splice(toIndex, 0, sectionId)
        })
      },

      addItem(sectionId) {
        edit((doc) =>
          withSection(doc, sectionId, (s) => {
            // Item shape follows the section's own type, so this is sound.
            s.items.push(emptyItem(s.type) as never)
          }),
        )
      },

      removeItem(sectionId, itemId) {
        edit((doc) =>
          withSection(doc, sectionId, (s) => {
            s.items = s.items.filter((i) => i.id !== itemId) as never
          }),
        )
      },

      updateItem(sectionId, itemId, patch) {
        edit((doc) =>
          withSection(doc, sectionId, (s) => {
            const item = s.items.find((i) => i.id === itemId)
            if (item) Object.assign(item, patch)
          }),
        )
      },

      moveItem(sectionId, from, to) {
        edit((doc) =>
          withSection(doc, sectionId, (s) => {
            s.items = arrayMove(s.items as never[], from, to) as never
          }),
        )
      },
    }
  }),
)
