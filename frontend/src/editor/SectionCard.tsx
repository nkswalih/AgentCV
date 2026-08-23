/**
 * One section in the left pane: a draggable header that expands to reveal its
 * items, each of which is itself draggable within the section.
 *
 * The forms live inline rather than behind a mode switch, so reordering and
 * editing are the same view.
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
import { useState } from 'react'

import { useEditor } from '../store'
import type {
  Section,
  SectionItem,
  SkillMarker,
  SkillsColumns,
  SkillsSection,
} from '../types'
import { ItemFields, itemLabel } from './ItemFields'
import { Segmented } from './fields'
import { Chevron, Eye, EyeOff, Grip, Plus, Trash } from './icons'

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

function ItemRow({ section, item }: { section: Section; item: SectionItem }) {
  const { updateItem, removeItem } = useEditor()
  const [open, setOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  return (
    <div
      ref={setNodeRef}
      className="item-card"
      data-dragging={isDragging}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="item-head">
        <button className="grip" {...attributes} {...listeners} aria-label="Reorder entry">
          <Grip />
        </button>
        <button className="item-toggle" onClick={() => setOpen((v) => !v)}>
          <Chevron open={open} />
          <span className="item-title">{itemLabel(section.type, item)}</span>
        </button>
        <button
          className="eye"
          aria-label={item.visible ? 'Hide from resume' : 'Show on resume'}
          onClick={() => updateItem(section.id, item.id, { visible: !item.visible })}
        >
          {item.visible ? <Eye /> : <EyeOff />}
        </button>
        <button
          className="eye"
          aria-label="Delete entry"
          onClick={() => removeItem(section.id, item.id)}
        >
          <Trash />
        </button>
      </div>

      {open && (
        <div className="item-body">
          <ItemFields
            type={section.type}
            item={item}
            onChange={(patch) => updateItem(section.id, item.id, patch)}
          />
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
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="section-row" data-hidden={!section.visible}>
        <button className="grip" {...attributes} {...listeners} aria-label="Reorder section">
          <Grip />
        </button>
        <button className="item-toggle" onClick={() => setOpen((v) => !v)}>
          <Chevron open={open} />
          <input
            className="section-title-input"
            value={section.title}
            aria-label="Section title"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updateSection(section.id, { title: e.target.value })}
          />
        </button>
        <span className="count">{section.items.length}</span>
        <button
          className="eye"
          aria-label={section.visible ? 'Hide section' : 'Show section'}
          onClick={() => updateSection(section.id, { visible: !section.visible })}
        >
          {section.visible ? <Eye /> : <EyeOff />}
        </button>
        <button className="eye" aria-label="Delete section" onClick={() => removeSection(section.id)}>
          <Trash />
        </button>
      </div>

      {open && (
        <div className="section-items">
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

          <button className="btn btn-sm add-item" onClick={() => addItem(section.id)}>
            <Plus />
            Add entry
          </button>
        </div>
      )}
    </div>
  )
}
