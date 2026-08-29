import { Fragment, useEffect, useRef, useState } from 'react'

import { useEditor } from '../store'
import { newId, applyTemplatePreset } from '../factories'
import {
  loadCustomTemplates,
  saveCustomTemplate,
  removeCustomTemplate,
  applyCustomTemplate,
  type CustomTemplate,
} from '../customTemplates'
import {
  COLOR_PRESETS,
  FONT_CHOICES,
  FONT_GROUP_LABELS,
  FONT_GROUPS,
  TEMPLATES,
} from '../templates/registry'
import { DocIcon, isKnownLinkLabel, suggestLinkLabel } from '../templates/doc-icons'
import { Check, Segmented, Slider, Text } from './fields'
import { SectionCard, useDragSensors, DRAG_MODIFIERS } from './SectionCard'
import { PhotoAdjustDialog } from './PhotoAdjustDialog'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  closestCorners,
  pointerWithin,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { ColorsState, Link, Section, SectionType, TemplateId } from '../types'
import { Grip, Plus } from './icons'

const ADDABLE: SectionType[] = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'languages',
  'custom',
]

/**
 * Cross-column collision strategy: prefer whatever is physically under the
 * cursor so either column is an equal drop target, falling back to nearest
 * corners for keyboard drags (which never move a pointer).
 */
const dualCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  return pointerCollisions.length > 0 ? pointerCollisions : closestCorners(args)
}

type ColumnId = 'left' | 'right'

/** Simplified section card for the drag overlay — no sortable/dnd hooks. */
function DragOverlayCard({ section }: { section: Section }) {
  return (
    <div className="section-card">
      <div className="section-row" data-hidden={!section.visible}>
        <span className="grip" aria-hidden="true"><Grip /></span>
        <span className="section-row-title">{section.title}</span>
        <span className="count">{section.items.length}</span>
      </div>
    </div>
  )
}

/** A column body that is a valid droppable target for cross-container dragging.
 *  SortableContext is INSIDE so items are sortable within this droppable zone.
 *  While dragging, `insertAt` draws the insertion line at the exact slot where
 *  the section will land. */
function DroppableColumn({
  id,
  column,
  items,
  sections,
  emptyLabel,
  insertAt = null,
}: {
  id: string
  column: ColumnId
  items: string[]
  sections: Section[]
  emptyLabel: string
  insertAt?: number | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className="dual-column-body"
      id={id}
      data-column={column}
      data-over={isOver}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {sections.length === 0 && (
          <div className="dual-column-empty">{emptyLabel}</div>
        )}
        {sections.map((section, i) => (
          <Fragment key={section.id}>
            {insertAt === i && <div className="drop-indicator" />}
            <SectionCard section={section} />
          </Fragment>
        ))}
        {insertAt != null && insertAt >= sections.length && (
          <div className="drop-indicator" />
        )}
      </SortableContext>
    </div>
  )
}

export function LeftPane() {
  const { doc, addSection, moveSection, moveSectionToColumn, updateSettings } = useEditor()
  const sensors = useDragSensors()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [photoAdjustOpen, setPhotoAdjustOpen] = useState(false)
  if (!doc) return null

  const currentDoc = doc
  const { columnLayout, headerPosition, columnWidth = 40 } = currentDoc.settings
  const leftIds = currentDoc.settings.leftColumn ?? []
  const rightIds = currentDoc.settings.rightColumn ?? []

  /** Resolve section IDs to Section objects, skipping any that no longer exist. */
  function resolveSections(ids: string[]): Section[] {
    return ids
      .map((id) => currentDoc.sections.find((s) => s.id === id))
      .filter((s): s is Section => s != null)
  }

  const leftSections = resolveSections(leftIds)
  const rightSections = resolveSections(rightIds)

  /** Auto-distribute sections into two columns when switching from one to two. */
  function switchToTwo() {
    const all = currentDoc.sections.map((s) => s.id)
    const mid = Math.ceil(all.length / 2)
    updateSettings({
      columnLayout: 'two',
      leftColumn: all.slice(0, mid),
      rightColumn: all.slice(mid),
    })
  }

  /** Flatten back to one column, preserving combined order. */
  function switchToOne() {
    const merged = [...leftIds, ...rightIds]
    updateSettings({
      columnLayout: 'one',
      leftColumn: [],
      rightColumn: [],
      // Also reorder the main sections array to match the merged column order
    })
    // Reorder sections to match merged order
    for (let i = 0; i < merged.length; i++) {
      const currentIdx = currentDoc.sections.findIndex((s) => s.id === merged[i])
      if (currentIdx !== -1 && currentIdx !== i) {
        moveSection(currentIdx, i)
      }
    }
  }

  function onSingleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const from = currentDoc.sections.findIndex((s) => s.id === e.active.id)
    const to = currentDoc.sections.findIndex((s) => s.id === e.over!.id)
    if (from !== -1 && to !== -1) moveSection(from, to)
  }

  /** Where a dragged section would land right now: which column and at which
   *  slot. Null when the cursor is over no valid target (or over its own
   *  current position). Drives the live insertion indicator. */
  const [dropTarget, setDropTarget] = useState<{ column: ColumnId; index: number } | null>(null)

  function onDualDragStart(e: { active: { id: string | number } }) {
    setActiveId(String(e.active.id))
    setDropTarget(null)
  }

  function onDualDragOver(e: DragOverEvent) {
    const over = e.over
    if (!over || e.active.id === over.id) {
      setDropTarget(null)
      return
    }
    const id = String(e.active.id)
    const overId = String(over.id)

    // Resolve which column the pointer is over, and the slot it maps to:
    // hovering a section card means "take this card's place" (or the slot
    // after it, past its midpoint), hovering the column body means "append".
    let column: ColumnId
    let index: number
    if (overId === 'left-column') {
      column = 'left'
      index = leftIds.length
    } else if (overId === 'right-column') {
      column = 'right'
      index = rightIds.length
    } else if (leftIds.includes(overId)) {
      column = 'left'
      index = leftIds.indexOf(overId)
    } else if (rightIds.includes(overId)) {
      column = 'right'
      index = rightIds.indexOf(overId)
    } else {
      setDropTarget(null)
      return
    }

    // Below the hovered card's midpoint inserts after it, not before.
    const translated = e.active.rect.current.translated
    if (translated && overId !== 'left-column' && overId !== 'right-column' && over.rect) {
      const cursorY = translated.top + translated.height / 2
      const overMidY = over.rect.top + over.rect.height / 2
      if (cursorY > overMidY) index += 1
    }

    // Suppress the indicator when it would land exactly where the section
    // already is (its own slot, or directly beneath itself).
    const fromColumn: ColumnId = leftIds.includes(id) ? 'left' : 'right'
    const fromIndex = fromColumn === 'left' ? leftIds.indexOf(id) : rightIds.indexOf(id)
    if (column === fromColumn && (index === fromIndex || index === fromIndex + 1)) {
      setDropTarget(null)
      return
    }

    setDropTarget({ column, index })
  }

  function onDualDragEnd() {
    if (activeId && dropTarget) {
      // The stored index counts the section's old position; moving down within
      // the same column shifts everything after the removal up by one.
      const fromColumn: ColumnId = leftIds.includes(activeId) ? 'left' : 'right'
      const fromIndex = fromColumn === 'left' ? leftIds.indexOf(activeId) : rightIds.indexOf(activeId)
      const index =
        dropTarget.column === fromColumn && dropTarget.index > fromIndex
          ? dropTarget.index - 1
          : dropTarget.index
      moveSectionToColumn(activeId, dropTarget.column, index)
    }
    setDropTarget(null)
    setActiveId(null)
  }

  function onDualDragCancel() {
    setDropTarget(null)
    setActiveId(null)
  }

  const step = 5
  const clamp = (v: number) => Math.max(30, Math.min(70, v))
  const pl = currentDoc.settings.photoLayout
  const hs = currentDoc.settings.headingStyle ?? { visual: 'underline', capitalization: 'uppercase', showIcons: true, iconStyle: 'filled' }

  return (
    <aside className="pane pane-left">
      <div className="pane-head">
        <p className="eyebrow">Layout</p>
      </div>
      <div className="pane-body">

        {/* ============================================================ */}
        {/*  LAYOUT                                                      */}
        {/* ============================================================ */}
        <div className="pane-section">
          <p className="pane-section-title">Layout</p>
          <Segmented
            label="Columns"
            value={columnLayout}
            options={[
              { value: 'one', label: 'One' },
              { value: 'two', label: 'Two' },
            ]}
            onChange={(v) => (v === 'two' ? switchToTwo() : switchToOne())}
          />
          {columnLayout === 'two' && (
            <Segmented
              label="Header Position"
              value={headerPosition}
              options={[
                { value: 'top', label: 'Top' },
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' },
              ]}
              onChange={(v) => updateSettings({ headerPosition: v })}
            />
          )}
          {columnLayout === 'one' && (
            <Segmented
              label="Header Position"
              value={headerPosition === 'top' ? 'center' : headerPosition}
              options={[
                { value: 'center', label: 'Center' },
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' },
              ]}
              onChange={(v) => updateSettings({ headerPosition: v })}
            />
          )}
          {columnLayout === 'two' && (
            <div className="field">
              <span className="field-label">Column Width</span>
              <div className="col-width-controls">
                <div className="col-width-row">
                  <span className="col-width-label">Left</span>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => updateSettings({ columnWidth: clamp(columnWidth - step) })}
                    aria-label="Decrease left column width"
                  >
                    −
                  </button>
                  <span className="col-width-value">{Math.round(columnWidth)}%</span>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => updateSettings({ columnWidth: clamp(columnWidth + step) })}
                    aria-label="Increase left column width"
                  >
                    +
                  </button>
                </div>
                <div className="col-width-row">
                  <span className="col-width-label">Right</span>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => updateSettings({ columnWidth: clamp(columnWidth + step) })}
                    aria-label="Decrease right column width"
                  >
                    −
                  </button>
                  <span className="col-width-value">{Math.round(100 - columnWidth)}%</span>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => updateSettings({ columnWidth: clamp(columnWidth - step) })}
                    aria-label="Increase right column width"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/*  CONTENT                                                     */}
        {/* ============================================================ */}
        <div className="pane-section">
          <p className="pane-section-title">Content</p>
          {columnLayout === 'one' ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={DRAG_MODIFIERS}
              onDragEnd={onSingleDragEnd}
            >
              <SortableContext
                items={currentDoc.sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {currentDoc.sections.map((section) => (
                  <SectionCard key={section.id} section={section} />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={dualCollisionDetection}
              onDragStart={onDualDragStart}
              onDragOver={onDualDragOver}
              onDragEnd={onDualDragEnd}
              onDragCancel={onDualDragCancel}
            >
              {/* -- Profile header card ---------------------------------- */}
              <div className="profile-header-card">
                <p className="eyebrow" style={{ marginBottom: 6 }}>Profile</p>
                <div className="profile-header-row">
                  {currentDoc.basics.photoUrl && (
                    <img
                      className="profile-header-thumb"
                      src={currentDoc.basics.photoUrl}
                      alt=""
                    />
                  )}
                  <div className="profile-header-info">
                    <span className="profile-header-name">
                      {currentDoc.basics.fullName || 'Your Name'}
                    </span>
                    {currentDoc.basics.headline && (
                      <span className="profile-header-headline">
                        {currentDoc.basics.headline}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="dual-columns">
                <div className="dual-column">
                  <p className="eyebrow">Left Column</p>
                  <DroppableColumn
                    id="left-column"
                    column="left"
                    items={leftIds}
                    sections={leftSections}
                    emptyLabel="Drop sections here"
                    insertAt={dropTarget?.column === 'left' ? dropTarget.index : null}
                  />
                </div>
                <div className="dual-column">
                  <p className="eyebrow">Right Column</p>
                  <DroppableColumn
                    id="right-column"
                    column="right"
                    items={rightIds}
                    sections={rightSections}
                    emptyLabel="Drop sections here"
                    insertAt={dropTarget?.column === 'right' ? dropTarget.index : null}
                  />
                </div>
              </div>

              <DragOverlay dropAnimation={null}>
                {activeId ? (
                  <div className="drag-overlay-card">
                    <DragOverlayCard
                      section={currentDoc.sections.find((s) => s.id === activeId)!}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* ============================================================ */}
        {/*  ADD SECTION                                                 */}
        {/* ============================================================ */}
        <div className="pane-section">
          <p className="pane-section-title">Add Section</p>
          <div className="add-section-pills">
            {ADDABLE.map((type) => (
              <button key={type} className="btn btn-sm" onClick={() => addSection(type)}>
                <Plus />
                {type === 'custom' ? 'Custom' : type[0].toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/*  PHOTO                                                       */}
        {/* ============================================================ */}
        {currentDoc.settings.showPhoto && (
        <div className="pane-section">
          <p className="pane-section-title">Photo</p>
          <Check
            label="Grayscale"
            checked={pl.grayscale}
            onChange={(grayscale) => updateSettings({ photoLayout: { ...pl, grayscale } })}
          />
          <Segmented
            label="Position"
            value={pl.position}
            options={[
              { value: 'left', label: 'Left' },
              { value: 'top', label: 'Top' },
              { value: 'right', label: 'Right' },
            ]}
            onChange={(position) => updateSettings({ photoLayout: { ...pl, position } })}
          />
          <Slider label="Size" value={pl.size} min={14} max={44} step={1} unit="mm" onChange={(size) => updateSettings({ photoLayout: { ...pl, size } })} />
          <Segmented
            label="Shape"
            value={pl.shape}
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'rounded', label: 'Rounded' },
              { value: 'square', label: 'Square' },
            ]}
            onChange={(shape) => updateSettings({ photoLayout: { ...pl, shape } })}
          />
          <Check
            label="Border"
            checked={pl.border}
            onChange={(border) => updateSettings({ photoLayout: { ...pl, border } })}
          />
          {pl.border && (
            <>
              <Slider label="Border Width" value={pl.borderWidth} min={0.5} max={10} step={0.5} unit="pt" onChange={(borderWidth) => updateSettings({ photoLayout: { ...pl, borderWidth } })} />
              <label className="field">
                <span className="field-label">Border Color</span>
                <div className="color-input-row">
                  <input
                    type="color"
                    className="color-input"
                    value={pl.borderColor}
                    onChange={(e) => updateSettings({ photoLayout: { ...pl, borderColor: e.target.value } })}
                  />
                  <span className="color-input-value">{pl.borderColor}</span>
                </div>
              </label>
            </>
          )}
          {currentDoc.basics.photoUrl && (
            <button className="btn btn-sm photo-adjust-trigger" type="button" onClick={() => setPhotoAdjustOpen(true)}>
              Adjust / crop photo
            </button>
          )}
        </div>
        )}

        {/* ============================================================ */}
        {/*  SECTION HEADINGS                                            */}
        {/* ============================================================ */}
        <div className="pane-section">
          <p className="pane-section-title">Section Headings</p>
          <div className="field">
            <span className="field-label">Heading style</span>
            <div className="heading-preview">
              {([
                { value: 'none', label: 'Plain' },
                { value: 'underline', label: 'Underline' },
                { value: 'boxed', label: 'Boxed' },
                { value: 'bold', label: 'Bold' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  className="heading-preview-item"
                  data-active={hs.visual === opt.value}
                  onClick={() => updateSettings({ headingStyle: { ...hs, visual: opt.value } })}
                  aria-label={opt.label}
                >
                  <span className={`heading-visual-${opt.value}`} />
                  <span className="heading-preview-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <Segmented
            label="Capitalization"
            value={hs.capitalization}
            options={[
              { value: 'none', label: 'None' },
              { value: 'uppercase', label: 'AA' },
              { value: 'lowercase', label: 'aa' },
              { value: 'capitalize', label: 'Ab' },
            ]}
            onChange={(capitalization) => updateSettings({ headingStyle: { ...hs, capitalization } })}
          />
          <Check
            label="Show icons"
            checked={hs.showIcons}
            onChange={(showIcons) => updateSettings({ headingStyle: { ...hs, showIcons } })}
          />
          {hs.showIcons && (
            <div className="field">
              <span className="field-label">Icon style</span>
              <div className="icon-style-options">
                <button
                  className="icon-style-btn"
                  data-active={hs.iconStyle === 'filled'}
                  onClick={() => updateSettings({ headingStyle: { ...hs, iconStyle: 'filled' } })}
                >
                  <span className="icon-style-dot">
                    <DocIcon name="briefcase" variant="fill" />
                  </span>
                  Filled
                </button>
                <button
                  className="icon-style-btn"
                  data-active={hs.iconStyle === 'outlined'}
                  onClick={() => updateSettings({ headingStyle: { ...hs, iconStyle: 'outlined' } })}
                >
                  <span className="icon-style-dot">
                    <DocIcon name="briefcase" variant="outline" />
                  </span>
                  Outlined
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
      {photoAdjustOpen && <PhotoAdjustDialog onClose={() => setPhotoAdjustOpen(false)} />}
    </aside>
  )
}

function PhotoField() {
  const { doc, updateBasics, updateSettings } = useEditor()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)
  if (!doc) return null

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/uploads/photo', { method: 'POST', body })
      if (!res.ok) throw new Error((await res.json()).detail ?? `Upload failed (${res.status})`)
      const { url } = (await res.json()) as { url: string }
      updateBasics({ photoUrl: url })
      updateSettings({ showPhoto: true, photoLayout: { ...doc!.settings.photoLayout, show: true } })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="field">
      <span className="field-label">Profile photo</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
          e.target.value = ''
        }}
      />
      <div className="photo-control">
        {doc.basics.photoUrl ? (
          <img className="photo-thumb" src={doc.basics.photoUrl} alt="" />
        ) : (
          <span className="photo-empty">No image</span>
        )}
        <div className="grow">
          <div className="photo-actions">
            <button className="btn btn-sm" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? 'Uploading…' : doc.basics.photoUrl ? 'Replace photo' : 'Upload photo'}
            </button>
            {doc.basics.photoUrl && (
              <button className="btn btn-sm btn-ghost" type="button" onClick={() => setAdjustOpen(true)}>
                Adjust crop
              </button>
            )}
          </div>
          <p className="hint">PNG, JPEG, or WebP · 5MB max</p>
        </div>
      </div>
      {error && <p className="upload-error">{error}</p>}
      {doc.basics.photoUrl && (
        <Check
          label="Show on resume"
          checked={doc.settings.photoLayout.show}
          onChange={(showPhoto) => updateSettings({ showPhoto, photoLayout: { ...doc.settings.photoLayout, show: showPhoto } })}
        />
      )}
      {adjustOpen && <PhotoAdjustDialog onClose={() => setAdjustOpen(false)} />}
    </div>
  )
}

/**
 * Editable list of extra links -- LinkedIn, GitHub, Instagram, X, a portfolio.
 * Pasting a known profile URL auto-fills its label and the resume draws the
 * matching brand icon; anything else keeps a generic one.
 */
function LinksField() {
  const { doc, updateBasics } = useEditor()
  if (!doc) return null
  const links = doc.basics.links

  const set = (next: Link[]) => updateBasics({ links: next })
  const patch = (i: number, part: Partial<Link>) =>
    set(links.map((l, j) => (j === i ? { ...l, ...part } : l)))

  /** Detect the brand as the URL is typed or pasted, and name the link from it
      -- but never overwrite a label the author actually chose. */
  const onUrlChange = (i: number, url: string) => {
    const suggested = suggestLinkLabel(url)
    if (suggested && (links[i].label.trim() === '' || isKnownLinkLabel(links[i].label))) {
      patch(i, { url, label: suggested })
    } else {
      patch(i, { url })
    }
  }

  return (
    <div className="field">
      <span className="field-label">
        Links
        <span className="field-value">{links.filter((l) => l.url.trim() || l.label.trim()).length}</span>
      </span>
      {links.map((link, i) => (
        <div className="link-row" key={link.id}>
          <input
            className="input link-label"
            value={link.label}
            placeholder="LinkedIn"
            aria-label="Link label"
            onChange={(e) => patch(i, { label: e.target.value })}
          />
          <input
            className="input"
            value={link.url}
            placeholder="Paste a profile URL"
            aria-label="Link URL"
            onChange={(e) => onUrlChange(i, e.target.value)}
          />
          <button
            className="btn btn-ghost btn-icon"
            aria-label="Remove link"
            onClick={() => set(links.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        className="btn btn-sm"
        onClick={() => set([...links, { id: newId(), label: '', url: '' }])}
      >
        <Plus />
        Add link
      </button>
    </div>
  )
}

/** Per-template default sizes the individual controls return to when unset --
    each design's own typographic scale. Retired ids keep rows so documents
    saved with them still resolve. */
const SIZE_FALLBACKS: Record<TemplateId, { name: number; title: number; heading: number }> = {
  'ats-classic': { name: 21, title: 11, heading: 10.5 },
  'ats-modern': { name: 23, title: 11, heading: 10 },
  compact: { name: 17.5, title: 10, heading: 9.5 },
  'classic-pro': { name: 22, title: 10.5, heading: 10 },
  'modern-min': { name: 24, title: 11, heading: 9 },
  'two-col': { name: 21, title: 10.5, heading: 10 },
  sidebar: { name: 20, title: 10, heading: 10 },
  editorial: { name: 29, title: 12, heading: 10.5 },
  executive: { name: 20, title: 11, heading: 10 },
  creative: { name: 23, title: 10, heading: 10 },
  devtech: { name: 20, title: 10.5, heading: 9.5 },
  academic: { name: 19, title: 10.5, heading: 10 },
  timeline: { name: 20, title: 10.5, heading: 10 },
  'photo-pro': { name: 23, title: 11, heading: 10 },
  'portal-pro': { name: 18, title: 9.5, heading: 11 },
  'modern-deep': { name: 17, title: 8.5, heading: 11 },
  'serif-ats': { name: 22, title: 11, heading: 12 },
  'jake': { name: 24, title: 11, heading: 11 },
  banner: { name: 21, title: 10.5, heading: 10 },
}

/** Fixed identities -- each design's mini swatch wears its own ink rather
    than following whatever accent the open document happens to have. */
const MINI_ACCENTS: Partial<Record<TemplateId, string>> = {
  'classic-pro': '#20252b',
  'modern-min': '#10151b',
  executive: '#33383f',
  'two-col': '#273038',
  sidebar: '#242e39',
  editorial: '#171b21',
  creative: '#2e3a80',
  devtech: '#0f766e',
  academic: '#23282e',
  timeline: '#39424c',
  'photo-pro': '#23282e',
  'portal-pro': '#1e293b',
  'modern-deep': '#1a1f2e',
  'serif-ats': '#191e24',
  'jake': '#191e24',
}

/**
 * A font-size slider for one element. Null follows the template's own default
 * -- shown as "auto" -- and dragging the slider sets an override that a reset
 * button clears.
 */
function SizeControl({
  label,
  value,
  fallback,
  min,
  max,
  onChange,
}: {
  label: string
  value: number | null
  fallback: number
  min: number
  max: number
  onChange: (value: number | null) => void
}) {
  const custom = value != null
  return (
    <div className="field">
      <span className="field-label">
        {label}
        <span className="field-value">
          {(custom ? value : fallback).toFixed(1).replace(/\.0$/, '')}pt
          {!custom && ' · auto'}
          {custom && (
            <button
              type="button"
              className="btn btn-ghost btn-icon size-reset"
              aria-label={`Reset ${label} to template default`}
              title="Reset to template default"
              onClick={() => onChange(null)}
            >
              ↺
            </button>
          )}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.5}
        value={custom ? value : Math.min(Math.max(fallback, min), max)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function RightPane() {
  const { doc, updateBasics, updateSettings } = useEditor()
  const [customTpls, setCustomTpls] = useState<CustomTemplate[]>(() => loadCustomTemplates())
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (saveOpen) {
      setSaveName('')
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [saveOpen])

  if (!doc) return null

  function handleSaveTemplate() {
    if (!saveName.trim() || !doc) return
    const saved = saveCustomTemplate(saveName, doc.settings)
    if (saved) {
      setCustomTpls(loadCustomTemplates())
      setSaveOpen(false)
    }
  }

  function handleDeleteCustom(id: string) {
    removeCustomTemplate(id)
    setCustomTpls(loadCustomTemplates())
  }

  return (
    <aside className="pane pane-right">
      <div className="pane-head">
        <p className="eyebrow">Type & appearance</p>
      </div>
      <div className="pane-body">
        <section className="style-section">
          <p className="eyebrow style-section-title">Identity</p>
          <PhotoField />
          <Text
            label="Full name"
            value={doc.basics.fullName}
            placeholder="Your Name"
            onChange={(fullName) => updateBasics({ fullName })}
          />
          <Text
            label="Headline"
            value={doc.basics.headline}
            placeholder="Senior Product Designer"
            onChange={(headline) => updateBasics({ headline })}
          />
        </section>

        <section className="style-section">
          <p className="eyebrow style-section-title">Contact</p>
          <Text label="Email" type="email" value={doc.basics.email} onChange={(email) => updateBasics({ email })} />
          <Text label="Phone" type="tel" value={doc.basics.phone} onChange={(phone) => updateBasics({ phone })} />
          <Text label="Location" value={doc.basics.location} onChange={(location) => updateBasics({ location })} />
          <Text label="Website" type="url" value={doc.basics.website} onChange={(website) => updateBasics({ website })} />
          <LinksField />
          <Check
            label="Show contact icons"
            checked={doc.settings.showIcons}
            onChange={(showIcons) => updateSettings({ showIcons })}
          />
        </section>

        <section className="style-section">
          <p className="eyebrow style-section-title">Template</p>
          <div className="template-grid">
            {TEMPLATES.map((template) => (
              <button
                className="template-card"
                key={template.id}
                data-active={doc.settings.template === template.id}
                onClick={() => {
                  const preset = applyTemplatePreset(template.id)
                  // Auto-distribute sections when switching to a two-column layout.
                  if (preset.columnLayout === 'two') {
                    const all = doc.sections.map((s) => s.id)
                    const mid = Math.ceil(all.length / 2)
                    preset.leftColumn = all.slice(0, mid)
                    preset.rightColumn = all.slice(mid)
                  } else {
                    preset.leftColumn = []
                    preset.rightColumn = []
                  }
                  updateSettings(preset)
                }}
              >
                <TemplateThumb
                  id={template.id}
                  accent={MINI_ACCENTS[template.id] ?? doc.settings.accentColor}
                />
                <span className="template-meta">
                  <span className="template-name">{template.name}</span>
                  <span className="tag" data-ats={template.atsSafe ? 'true' : 'false'}>
                    {template.atsSafe ? 'ATS-safe' : 'Design-led'}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            ATS-safe templates use a single column and real text headings. Design-led layouts can be reordered by some parsers.
          </p>
          <button
            type="button"
            className="btn btn-sm btn-ghost save-custom-tpl-btn"
            onClick={() => setSaveOpen(true)}
          >
            + Save current as custom template
          </button>
          {customTpls.length > 0 && (
            <>
              <p className="eyebrow style-section-title" style={{ marginTop: 12 }}>Custom Templates</p>
              <div className="template-grid">
                {customTpls.map((ct) => (
                  <button
                    className="template-card custom-template-card"
                    key={ct.id}
                    data-active={
                      doc.settings.template === ct.baseTemplate &&
                      doc.settings.fontFamily === ct.settings.fontFamily &&
                      doc.settings.accentColor === ct.settings.accentColor
                    }
                    onClick={() => {
                      const patch = applyCustomTemplate(ct, doc.sections)
                      updateSettings(patch)
                    }}
                  >
                    <TemplateThumb
                      id={ct.baseTemplate}
                      accent={ct.settings.accentColor}
                    />
                    <span className="template-meta">
                      <span className="template-name">{ct.name}</span>
                      <span className="tag">Custom</span>
                    </span>
                    <span
                      className="custom-tpl-delete"
                      role="button"
                      tabIndex={0}
                      title="Delete custom template"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCustom(ct.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation()
                          handleDeleteCustom(ct.id)
                        }
                      }}
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Save custom template modal */}
        {saveOpen && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-label="Save custom template"
            onClick={() => setSaveOpen(false)}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <p className="modal-title">Save Custom Template</p>
              </div>
              <div className="modal-body">
                <Text
                  label="Template name"
                  value={saveName}
                  onChange={setSaveName}
                  placeholder="My custom template"
                />
              </div>
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={() => setSaveOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!saveName.trim()}
                  onClick={handleSaveTemplate}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <section className="style-section">
          <p className="eyebrow style-section-title">Typography</p>
          <label className="field">
            <span className="field-label">Font</span>
            <select
              className="select"
              value={doc.settings.fontFamily}
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
            >
              {FONT_GROUPS.map((group) => (
                <optgroup key={group} label={FONT_GROUP_LABELS[group]}>
                  {FONT_CHOICES.filter((font) => font.group === group).map((font) => (
                    <option key={font.label} value={font.label}>
                      {font.label} · {font.kind}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <p className="hint" style={{ marginTop: -6 }}>
            Every choice is ATS-safe. Display fonts (Montserrat, Poppins…) are left out on
            purpose -- older parsers misread their fi/fl ligatures.
          </p>
          <Slider
            label="Base font size"
            value={doc.settings.fontSize}
            min={8}
            max={14}
            step={0.5}
            unit="pt"
            onChange={(fontSize) => updateSettings({ fontSize })}
          />
          <SizeControl
            label="Full name"
            value={doc.settings.nameSize}
            fallback={SIZE_FALLBACKS[doc.settings.template].name}
            min={14}
            max={32}
            onChange={(nameSize) => updateSettings({ nameSize })}
          />
          <SizeControl
            label="Professional title"
            value={doc.settings.titleSize}
            fallback={SIZE_FALLBACKS[doc.settings.template].title}
            min={9}
            max={18}
            onChange={(titleSize) => updateSettings({ titleSize })}
          />
          <SizeControl
            label="Section headings"
            value={doc.settings.headingSize}
            fallback={SIZE_FALLBACKS[doc.settings.template].heading}
            min={8}
            max={16}
            onChange={(headingSize) => updateSettings({ headingSize })}
          />
          <SizeControl
            label="Entry headers"
            value={doc.settings.entrySize}
            fallback={doc.settings.fontSize * 1.02}
            min={8}
            max={16}
            onChange={(entrySize) => updateSettings({ entrySize })}
          />
          <SizeControl
            label="Contact info"
            value={doc.settings.contactSize}
            fallback={9}
            min={7}
            max={12}
            onChange={(contactSize) => updateSettings({ contactSize })}
          />
          <Slider
            label="Line height"
            value={doc.settings.lineHeight}
            min={1.1}
            max={1.9}
            step={0.05}
            onChange={(lineHeight) => updateSettings({ lineHeight })}
          />
        </section>

        <section className="style-section">
          <p className="eyebrow style-section-title">Spacing</p>
          <Slider
            label="Section spacing"
            value={doc.settings.sectionSpacing}
            min={0.5}
            max={2}
            step={0.1}
            unit="×"
            onChange={(sectionSpacing) => updateSettings({ sectionSpacing })}
          />
          <Slider
            label="Left & right margin"
            value={doc.settings.marginX}
            min={8}
            max={28}
            step={1}
            unit="mm"
            onChange={(marginX) => updateSettings({ marginX })}
          />
          <Slider
            label="Top & bottom margin"
            value={doc.settings.marginY}
            min={8}
            max={28}
            step={1}
            unit="mm"
            onChange={(marginY) => updateSettings({ marginY })}
          />
        </section>

        <ColorsSection />

        <section className="style-section">
          <p className="eyebrow style-section-title">Page</p>
          <label className="field">
            <span className="field-label">Paper</span>
            <select
              className="select"
              value={doc.settings.paperSize}
              onChange={(e) => updateSettings({ paperSize: e.target.value as 'A4' | 'Letter' })}
            >
              <option value="A4">A4 · 210 × 297mm</option>
              <option value="Letter">Letter · 8.5 × 11in</option>
            </select>
          </label>
        </section>
      </div>
    </aside>
  )
}

type ApplyKey = keyof ColorsState['apply']

/** Two-column checkbox layout of the reference: where the accent may reach. */
const APPLY_OPTIONS: { column: 1 | 2; key: ApplyKey; label: string }[] = [
  { column: 1, key: 'name', label: 'Name' },
  { column: 1, key: 'jobTitle', label: 'Job title' },
  { column: 1, key: 'headings', label: 'Headings' },
  { column: 1, key: 'headerIcons', label: 'Header icons' },
  { column: 2, key: 'dots', label: 'Dots / bars / bubbles' },
  { column: 2, key: 'dates', label: 'Dates' },
  { column: 2, key: 'entrySubtitle', label: 'Entry subtitle' },
  { column: 2, key: 'linkIcons', label: 'Link icons' },
]

const APPLY_ALL: ColorsState['apply'] = {
  name: true,
  jobTitle: true,
  dates: true,
  dots: true,
  headings: true,
  entrySubtitle: true,
  headerIcons: true,
  linkIcons: true,
}

/**
 * One surface-colour control of the trio: a rounded swatch that opens the
 * native colour picker, labelled beneath, with a reset back to the template's
 * own default once an explicit colour has been chosen.
 */
function ColorTile({
  label,
  value,
  fallback,
  onChange,
  onReset,
}: {
  label: string
  value: string | undefined
  fallback: string
  onChange: (value: string) => void
  onReset: () => void
}) {
  return (
    <div className="color-tile" data-set={!!value}>
      <label className="color-swatch" style={{ background: value ?? fallback }}>
        <input
          type="color"
          value={value ?? fallback}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} colour`}
        />
        {!value && <span className="color-swatch-auto">A</span>}
      </label>
      <span className="color-tile-label">
        {label}
        {value && (
          <button
            type="button"
            className="btn btn-ghost btn-icon color-reset"
            aria-label={`Reset ${label} to template default`}
            title="Reset to template default"
            onClick={onReset}
          >
            ↺
          </button>
        )}
      </span>
    </div>
  )
}

const BG_TYPES = [
  { value: 'single', label: 'Single' },
  { value: 'multi', label: 'Multi' },
  { value: 'image', label: 'Image' },
] as const

/**
 * The Colors card: surface tints, backdrop treatment, preset palettes shown as
 * color-pair tiles, a custom escape hatch, and per-element accent switches --
 * one organized card, previews over words.
 */
function ColorsSection() {
  const { doc, updateSettings } = useEditor()
  if (!doc) return null
  const c = doc.settings.colors

  /** Merge a patch into the colors state, creating it on first touch. */
  const setC = (patch: Partial<ColorsState>) =>
    updateSettings({
      colors: {
        bgType: 'single',
        presetId: 'none',
        apply: { ...APPLY_ALL },
        ...doc.settings.colors,
        ...patch,
      },
    })

  const setApply = (key: ApplyKey, v: boolean) =>
    setC({ apply: { ...(c?.apply ?? APPLY_ALL), [key]: v } })

  const pickColor = (field: 'page' | 'header' | 'border', value: string) =>
    setC({ [field]: value, presetId: 'custom' } as Partial<ColorsState>)

  const applyPreset = (id: string) => {
    const p = COLOR_PRESETS.find((x) => x.id === id)
    if (!p) return
    // A preset is a package deal: its accent rides along with the surfaces.
    updateSettings({
      accentColor: p.accent,
      colors: {
        bgType: c?.bgType ?? 'single',
        presetId: id,
        apply: { ...(c?.apply ?? APPLY_ALL) },
        page: p.page,
        header: p.header,
        border: p.border,
      },
    })
  }

  const previewVars = {
    '--pv-page': c?.page ?? '#ffffff',
    '--pv-header': c?.header ?? '#eef1f5',
  } as React.CSSProperties

  return (
    <section className="style-section">
      <p className="eyebrow style-section-title">Colors</p>

      {/* -- Surface colours ------------------------------------------ */}
      <div className="color-trio">
        <ColorTile
          label="Full Page"
          value={c?.page}
          fallback="#ffffff"
          onChange={(v) => pickColor('page', v)}
          onReset={() => setC({ page: undefined })}
        />
        <ColorTile
          label="Header"
          value={c?.header}
          fallback="#eef1f5"
          onChange={(v) => pickColor('header', v)}
          onReset={() => setC({ header: undefined })}
        />
        <ColorTile
          label="Border"
          value={c?.border}
          fallback="#d4dae2"
          onChange={(v) => pickColor('border', v)}
          onReset={() => setC({ border: undefined })}
        />
      </div>

      {/* -- Backdrop treatment --------------------------------------- */}
      <div className="bgtype-row" role="group" aria-label="Background type">
        {BG_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            className="bgtype-tile"
            data-active={(c?.bgType ?? 'single') === t.value}
            onClick={() => setC({ bgType: t.value })}
          >
            <span className={`bgtype-preview bg-${t.value}`} style={previewVars} aria-hidden="true" />
            <span className="color-tile-label">{t.label}</span>
          </button>
        ))}
      </div>

      {/* -- Preset palettes ------------------------------------------- */}
      <div className="preset-grid">
        {COLOR_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="preset-tile"
            data-active={c?.presetId === p.id}
            onClick={() => applyPreset(p.id)}
            aria-label={`${p.id} palette`}
            title={`${p.id} palette`}
          >
            <span className="preset-band" style={{ background: p.header }} aria-hidden="true" />
            <span className="preset-body" style={{ background: p.page }} aria-hidden="true">
              <span className="preset-t" style={{ color: p.accent }}>T</span>
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="preset-custom"
        data-active={c?.presetId === 'custom'}
        onClick={() => setC({ presetId: 'custom' })}
      >
        <Plus />
        Custom
      </button>

      {/* -- Where the accent reaches ---------------------------------- */}
      <div className="apply-accent">
        <p className="eyebrow apply-accent-title">Apply Accent Color</p>
        <div className="apply-grid">
          {[1, 2].map((col) => (
            <div key={col}>
              {APPLY_OPTIONS.filter((o) => o.column === col).map((o) => (
                <Check
                  key={o.key}
                  label={o.label}
                  checked={(c?.apply ?? APPLY_ALL)[o.key]}
                  onChange={(v) => setApply(o.key, v)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Layout families, for the miniature: each design shows its own structure,
    not the same lines in a different colour. */const RAIL_LEFT: ReadonlySet<string> = new Set(['sidebar', 'portal-pro', 'modern-deep'])
const RAIL_RIGHT: ReadonlySet<string> = new Set(['two-col'])
const BAND: ReadonlySet<string> = new Set(['banner', 'creative'])
const PHOTO_HEAD: ReadonlySet<string> = new Set(['photo-pro'])
const SPINE: ReadonlySet<string> = new Set(['timeline'])

function TemplateThumb({ id, accent }: { id: string; accent: string }) {
  // The template id travels on a data attribute, never as a class. As a class
  // it collided with the inner parts' own names: `mini-banner` matched both this
  // container and the strip inside it, and the strip's `position: absolute` won
  // on source order -- which tore the thumbnail out of its card and stretched it
  // across the top of the app, over the topbar.
  return (
    <span className="template-mini" data-tpl={id} aria-hidden="true" style={{ '--mini-accent': accent } as React.CSSProperties}>
      {RAIL_LEFT.has(id) && <span className="mini-rail" />}
      {RAIL_RIGHT.has(id) && <span className="mini-rail right" />}
      {BAND.has(id) && <span className="mini-banner" />}
      {PHOTO_HEAD.has(id) && <span className="mini-portrait" />}
      <span className={`mini-name${SPINE.has(id) ? ' spine' : ''}`} />
      <span className={`mini-rule${SPINE.has(id) ? ' spine' : ''}`} />
      <span className={`mini-lines${SPINE.has(id) ? ' spine' : ''}`} />
      {!SPINE.has(id) && <span className="mini-lines short" />}
    </span>
  )
}
