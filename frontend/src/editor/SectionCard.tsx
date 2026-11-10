/**
 * One section in the left pane: a draggable header that expands to reveal its
 * items, each of which is itself draggable within the section.
 *
 * The forms live inline rather than behind a mode switch, so reordering and
 * editing are the same view. The heading is the one exception: it stays a
 * read-only label until "Edit Heading" is pressed, which keeps accidental
 * renames (and an input capturing every click) out of the way.
 */

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useRef, useState } from 'react'

import { useEditor } from '../store'
import { DocIcon, SECTION_ICONS } from '../templates/doc-icons'
import type {
  Section,
  SectionItem,
  SkillMarker,
  SkillsColumns,
  SkillsSection,
} from '../types'
import { ItemFields, itemLabel, itemSubtitle } from './ItemFields'
import { Segmented } from './fields'
import {
  CheckIcon,
  Chevron,
  Eye,
  EyeOff,
  Grip,
  ListIcon,
  Pencil,
  Plus,
  Trash,
  XIcon,
} from './icons'

/** Shared drag setup: vertical only, confined to the list it belongs to. */
export const DRAG_MODIFIERS = [restrictToVerticalAxis, restrictToParentElement]

export function useDragSensors() {
  return useSensors(
    // A small distance threshold keeps a click on the row from being read as
    // the start of a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
}

/** The small tinted glyph that identifies a section at a glance. */
function SectionGlyph({ section }: { section: Section }) {
  return (
    <span className="section-icon" aria-hidden="true">
      <DocIcon name={SECTION_ICONS[section.type] ?? 'file'} />
    </span>
  )
}

/**
 * Inline heading editor. The label and the field deliberately occupy the same
 * spot, so pressing "Edit Heading" feels like the text itself became editable
 * rather than a form appearing somewhere else.
 *
 * Enter or blur saves; Escape restores the previous heading.
 */
function HeadingEditor({ section }: { section: Section }) {
  const updateSection = useEditor((s) => s.updateSection)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(section.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const skipBlur = useRef(false)

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  function start() {
    skipBlur.current = false
    setDraft(section.title)
    setEditing(true)
  }

  function commit() {
    if (skipBlur.current) {
      skipBlur.current = false
      return
    }
    const next = draft.trim()
    if (next && next !== section.title) updateSection(section.id, { title: next })
    setEditing(false)
  }

  function cancel() {
    skipBlur.current = true
    setDraft(section.title)
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="edit-heading"
        title="Rename this section heading"
        onClick={start}
      >
        <Pencil />
        Edit Heading
      </button>
    )
  }

  return (
    <div className="heading-edit">
      <input
        ref={inputRef}
        className="heading-edit-input"
        value={draft}
        aria-label="Edit section heading"
        title="Press Enter to save, Escape to cancel"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
          }
        }}
      />
      <button
        type="button"
        className="mini-icon"
        aria-label="Save heading"
        title="Save heading"
        // Keep focus in the field so the click commits intentionally rather
        // than through a blur that unmounts this button mid-press.
        onMouseDown={(e) => e.preventDefault()}
        onClick={commit}
      >
        <CheckIcon />
      </button>
      <button
        type="button"
        className="mini-icon mini-icon-quiet"
        aria-label="Cancel heading edit"
        title="Cancel (Esc)"
        onMouseDown={(e) => e.preventDefault()}
        onClick={cancel}
      >
        <XIcon />
      </button>
    </div>
  )
}

function ItemRow({ section, item }: { section: Section; item: SectionItem }) {
  const { updateItem, removeItem } = useEditor()
  const [open, setOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const subtitle = itemSubtitle(section.type, item)

  return (
    <div
      ref={setNodeRef}
      className="item-card"
      data-dragging={isDragging}
      data-hidden={!item.visible}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="item-head">
        <button className="grip" {...attributes} {...listeners} aria-label="Reorder entry">
          <Grip />
        </button>
        <button
          type="button"
          className="item-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="item-title">{itemLabel(section.type, item)}</span>
          {subtitle && <span className="item-subtitle">{subtitle}</span>}
        </button>
        <button
          className="eye"
          aria-label={item.visible ? 'Hide from resume' : 'Show on resume'}
          title={item.visible ? 'Hide from resume' : 'Show on resume'}
          onClick={() => updateItem(section.id, item.id, { visible: !item.visible })}
        >
          {item.visible ? <Eye /> : <EyeOff />}
        </button>
      </div>

      {open && (
        <div className="item-body">
          <ItemFields
            type={section.type}
            item={item}
            onChange={(patch) => updateItem(section.id, item.id, patch)}
          />
          <div className="item-body-foot">
            <button
              type="button"
              className="link-danger"
              onClick={() => removeItem(section.id, item.id)}
            >
              Delete entry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const MARKER_CHOICES: { value: SkillMarker; label: string }[] = [
  { value: 'bullet', label: '• Bullet' },
  { value: 'dash', label: '- Dash' },
  { value: 'flat', label: 'Flat' },
]

const COLUMN_CHOICES: { value: SkillsColumns; label: string }[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
]

/**
 * Presentation settings for a skills section. Category keeps the familiar
 * "Backend: Python, Redis" lines; Column flattens every group into one grid
 * spread over up to four columns.
 */
function SkillsLayoutSettings({ section }: { section: SkillsSection }) {
  const { updateSection } = useEditor()

  return (
    <div className="skills-settings">
      <p className="eyebrow">Layout</p>
      <Segmented
        label="Skills mode"
        value={section.layout}
        options={[
          { value: 'inline', label: 'Category' },
          { value: 'bullets', label: 'Column' },
        ]}
        onChange={(layout) => updateSection(section.id, { layout })}
      />
      <p className="hint">
        {section.layout === 'bullets'
          ? `Every skill prints in ${section.columns} column${section.columns > 1 ? 's' : ''}; category names are hidden.`
          : 'Each group prints on one line, like “Backend: Python, Redis”.'}
      </p>
      {section.layout === 'bullets' && (
        <>
          <Segmented
            label="Marker"
            value={section.marker}
            options={MARKER_CHOICES}
            onChange={(marker) => updateSection(section.id, { marker })}
          />
          <Segmented
            label="Columns"
            value={section.columns}
            options={COLUMN_CHOICES}
            onChange={(columns) => updateSection(section.id, { columns })}
          />
        </>
      )}
    </div>
  )
}

export function SectionCard({ section }: { section: Section }) {
  const { updateSection, removeSection, addItem, moveItem } = useEditor()
  const [open, setOpen] = useState(false)
  const sensors = useDragSensors()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })

  function onItemDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = section.items.findIndex((i) => i.id === active.id)
    const to = section.items.findIndex((i) => i.id === over.id)
    if (from !== -1 && to !== -1) moveItem(section.id, from, to)
  }

  return (
    <div
      ref={setNodeRef}
      className="section-card"
      data-dragging={isDragging}
      data-hidden={!section.visible}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="section-row">
        <button
          className="grip section-grip"
          {...attributes}
          {...listeners}
          aria-label="Reorder section"
        >
          <Grip />
        </button>
        <SectionGlyph section={section} />
        <button
          type="button"
          className="section-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="section-row-title">{section.title}</span>
          <span className="section-count">{section.items.length}</span>
          <Chevron open={open} />
        </button>
        {!section.visible && (
          <span className="section-hidden-mark" title="Hidden from resume">
            <EyeOff />
          </span>
        )}
      </div>

      {open && (
        <div className="section-body">
          <div className="section-heading-row">
            <HeadingEditor section={section} />
          </div>

          {section.type === 'skills' && <SkillsLayoutSettings section={section} />}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={DRAG_MODIFIERS}
            onDragEnd={onItemDragEnd}
          >
            <SortableContext
              items={section.items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {section.items.map((item) => (
                <ItemRow key={item.id} section={section} item={item} />
              ))}
            </SortableContext>
          </DndContext>

          <div className="section-footer">
            <button
              type="button"
              className="section-tool"
              data-off={!section.visible}
              aria-label={section.visible ? 'Hide section from resume' : 'Show section on resume'}
              title={section.visible ? 'Hide from resume' : 'Show on resume'}
              onClick={() => updateSection(section.id, { visible: !section.visible })}
            >
              <ListIcon />
            </button>
            <button type="button" className="add-entry" onClick={() => addItem(section.id)}>
              <Plus />
              Add Entry
            </button>
            <button
              type="button"
              className="section-tool section-tool-danger"
              aria-label="Delete section"
              title="Delete section"
              onClick={() => removeSection(section.id)}
            >
              <Trash />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
