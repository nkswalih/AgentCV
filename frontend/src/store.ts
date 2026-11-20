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
import { type EditAction, type HistoryEntry, recordEdit, stepBack, stepForward } from './history'
import type {
  Basics,
  ResumeDocument,
  Section,
  SectionType,
  Settings,
  SkillsSection,
} from './types'

const AUTOSAVE_DELAY_MS = 700

/** Phrase for a single edited profile field, so an undo step can name itself. */
const BASICS_NAMES: Partial<Record<keyof Basics, string>> = {
  fullName: 'name',
  headline: 'job title',
  email: 'email',
  phone: 'phone',
  location: 'location',
  website: 'website',
  links: 'links',
  summary: 'summary',
  photoUrl: 'photo',
}

/** Style fields that no camelCase split would name well. */
const SETTINGS_NAMES: Partial<Record<keyof Settings, string>> = {
  template: 'template',
  accentColor: 'accent colour',
  fontFamily: 'body font',
  nameFont: 'name font',
  titleFont: 'title font',
  fontSize: 'font size',
  lineHeight: 'line height',
  sectionSpacing: 'section spacing',
  marginX: 'side margins',
  marginY: 'top and bottom margins',
  paperSize: 'paper size',
  showPhoto: 'photo',
  photoLayout: 'photo',
  showIcons: 'icons',
  nameSize: 'name size',
  titleSize: 'title size',
  headingSize: 'heading size',
  entrySize: 'entry size',
  contactSize: 'contact size',
  // A column change is one intention even when it rewrites both lists.
  columnLayout: 'columns',
  leftColumn: 'columns',
  rightColumn: 'columns',
  columnWidth: 'column width',
  headerPosition: 'header position',
  headingStyle: 'heading style',
  headerStyle: 'header style',
  linkStyle: 'link style',
  colors: 'colours',
  profileLayout: 'header layout',
}

const SECTION_NAMES: Record<string, string> = {
  title: 'section title',
  visible: 'section visibility',
}

const ITEM_NAMES: Record<string, string> = {
  visible: 'entry visibility',
  meta: 'entry details',
  bullets: 'bullet points',
}

/**
 * Turn a stored field name into something a person would say: `marginX` is not
 * a word anyone used in the panel, "side margins" is.
 */
function humanize(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
}

/** Stable key naming the *shape* of a patch, which is what coalescing needs. */
const patchKey = (namespace: string, patch: object) =>
  `${namespace}:${Object.keys(patch).sort().join(',')}`

/**
 * Name the action a patch performed.
 *
 * A control almost always writes one field, and naming that field is the whole
 * value of the undo tooltip ("Undo side margins", not "Undo style setting").
 * A patch that spans several fields collapses to a single name when all of
 * them agree -- switching to two columns also rewrites both column lists, yet
 * is still one thing, "columns" -- and falls back to a generic phrase only when
 * the fields genuinely differ.
 */
function patchLabel(
  patch: object,
  names: Readonly<Record<string, string | undefined>>,
  fallback: string,
): string {
  const labels = new Set<string>()
  for (const key of Object.keys(patch)) {
    labels.add(names[key] ?? humanize(key))
    if (labels.size > 1) return fallback
  }
  return labels.values().next().value ?? fallback
}

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

interface EditorState {
  id: string | null
  name: string
  doc: ResumeDocument | null
  loading: boolean
  loadError: string | null
  saveState: SaveState
  saveError: string | null
  /** Undo stack: each entry is the document as it stood before a named action. */
  past: HistoryEntry[]
  /** Redo stack: states undone out of, newest last. Cleared by any new edit. */
  future: HistoryEntry[]

  load: (id: string) => Promise<void>
  rename: (name: string) => void
  saveNow: () => Promise<void>
  undo: () => void
  redo: () => void

  updateBasics: (patch: Partial<Basics>) => void
  /**
   * `label` names the action for the undo tooltip when the patch spans several
   * fields that share one intention -- a whole design preset, a column switch.
   */
  updateSettings: (patch: Partial<Settings>, label?: string) => void

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

  /**
   * Swap every piece of content for an imported draft, in one undo step.
   * Settings are untouched: an import changes what the resume says, never the
   * design it says it in.
   */
  replaceContent: (basics: Basics, sections: Section[]) => void
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

    /** Apply a mutation to the loaded document, record it for undo, save. */
    function edit(recipe: (doc: ResumeDocument) => void, action: EditAction) {
      const before = get().doc
      set((s) => {
        if (s.doc) recipe(s.doc)
      })
      const after = get().doc
      // Immer returns the same state when a recipe changed nothing (a drag that
      // landed where it started, a patch that matched the stored value). Those
      // are not undoable steps.
      if (!before || !after || before === after) return
      set((s) => recordEdit(s.past, s.future, before, action, Date.now()))
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
      past: [],
      future: [],

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
            // A fresh document is not a step in the previous one's story.
            s.past = []
            s.future = []
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

      undo() {
        const { past, doc } = get()
        if (!past.length || !doc) return
        set((s) => {
          const restored = stepBack(s.past, s.future, doc)
          if (restored) s.doc = restored
        })
        // Undo is an edit like any other: the restored document is what the
        // server should end up holding, not the one the user backed out of.
        scheduleSave()
      },

      redo() {
        const { future, doc } = get()
        if (!future.length || !doc) return
        set((s) => {
          const restored = stepForward(s.past, s.future, doc)
          if (restored) s.doc = restored
        })
        scheduleSave()
      },

      updateBasics(patch) {
        edit(
          (doc) => {
            Object.assign(doc.basics, patch)
          },
          {
            label: patchLabel(patch, BASICS_NAMES, 'contact details'),
            key: patchKey('basics', patch),
          },
        )
      },

      updateSettings(patch, label) {
        edit(
          (doc) => {
            Object.assign(doc.settings, patch)
          },
          {
            label: label ?? patchLabel(patch, SETTINGS_NAMES, 'style'),
            key: patchKey('settings', patch),
          },
        )
      },

      addSection(type) {
        edit(
          (doc) => {
            const section = emptySection(type)
            doc.sections.push(section)
            // In two-column mode, new sections go to the left column
            if (doc.settings.columnLayout === 'two') {
              doc.settings.leftColumn.push(section.id)
            }
          },
          { label: 'adding a section' },
        )
      },

      removeSection(sectionId) {
        edit(
          (doc) => {
            doc.sections = doc.sections.filter((s) => s.id !== sectionId)
            // Clean up column assignments
            doc.settings.leftColumn = doc.settings.leftColumn.filter((id) => id !== sectionId)
            doc.settings.rightColumn = doc.settings.rightColumn.filter((id) => id !== sectionId)
          },
          { label: 'removing a section' },
        )
      },

      updateSection(sectionId, patch) {
        edit(
          (doc) => withSection(doc, sectionId, (s) => Object.assign(s, patch)),
          {
            label: patchLabel(patch, SECTION_NAMES, 'section setting'),
            key: patchKey(`section:${sectionId}`, patch),
          },
        )
      },

      moveSection(from, to) {
        edit(
          (doc) => {
            doc.sections = arrayMove(doc.sections, from, to)
          },
          { label: 'reordering sections' },
        )
      },

      moveSectionToColumn(sectionId, toColumn, toIndex) {
        edit(
          (doc) => {
            const fromCol = doc.settings.leftColumn.includes(sectionId) ? 'left' : 'right'
            const fromArr = fromCol === 'left' ? doc.settings.leftColumn : doc.settings.rightColumn
            const toArr = toColumn === 'left' ? doc.settings.leftColumn : doc.settings.rightColumn
            const fromIdx = fromArr.indexOf(sectionId)
            if (fromIdx !== -1) fromArr.splice(fromIdx, 1)
            toArr.splice(toIndex, 0, sectionId)
          },
          { label: 'moving a section' },
        )
      },

      addItem(sectionId) {
        edit(
          (doc) =>
            withSection(doc, sectionId, (s) => {
              // Item shape follows the section's own type, so this is sound.
              s.items.push(emptyItem(s.type) as never)
            }),
          { label: 'adding an entry' },
        )
      },

      removeItem(sectionId, itemId) {
        edit(
          (doc) =>
            withSection(doc, sectionId, (s) => {
              s.items = s.items.filter((i) => i.id !== itemId) as never
            }),
          { label: 'removing an entry' },
        )
      },

      updateItem(sectionId, itemId, patch) {
        edit(
          (doc) =>
            withSection(doc, sectionId, (s) => {
              const item = s.items.find((i) => i.id === itemId)
              if (item) Object.assign(item, patch)
            }),
          {
            label: patchLabel(patch, ITEM_NAMES, 'entry'),
            key: patchKey(`item:${sectionId}:${itemId}`, patch),
          },
        )
      },

      moveItem(sectionId, from, to) {
        edit(
          (doc) =>
            withSection(doc, sectionId, (s) => {
              s.items = arrayMove(s.items as never[], from, to) as never
            }),
          { label: 'reordering entries' },
        )
      },

      replaceContent(basics, sections) {
        edit(
          (doc) => {
            doc.basics = { ...basics }
            doc.sections = sections
            // The new sections have new ids, so old column assignments would
            // point at nothing. Empty lists let each design place its own
            // sections by type, which is exactly what a fresh import wants.
            doc.settings.leftColumn = []
            doc.settings.rightColumn = []
          },
          { label: 'imported content' },
        )
      },
    }
  }),
)
