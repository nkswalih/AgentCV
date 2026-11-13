import { Fragment, useEffect, useRef, useState } from 'react'

import { useEditor } from '../store'
import { HEADING_VISUALS, resolveHeadingVisual } from '../headingStyles'
import {
  headerTextAlign,
  photoInSideRail,
  resolvePhotoPlacement,
} from '../photoPlacement'
import { newId, applyTemplatePreset } from '../factories'
import { api } from '../api'
import {
  loadCustomTemplates,
  saveCustomTemplate,
  removeCustomTemplate,
  applyCustomTemplate,
  type CustomTemplate,
} from '../customTemplates'
import {
  BACKGROUND_GALLERY,
  BORDER_SIZES,
  FONT_CHOICES,
  FONT_GROUP_LABELS,
  FONT_GROUPS,
  HEADER_PRESETS,
  MULTI_PRESETS,
  SINGLE_ACCENTS,
  TEMPLATES,
  type HeaderPreset,
  type MultiPreset,
  type TemplateTag,
} from '../templates/registry'
import { ResumeThumb } from '../components/ResumeThumb'
import { demoDocument } from '../templates/demo'
import { extractPalette } from './imagePalette'
import { DocIcon, SECTION_ICONS, isKnownLinkLabel, suggestLinkLabel } from '../templates/doc-icons'
import { Check, ChoiceTiles, Segmented, Slider, Text } from './fields'
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
import type {
  BorderMode,
  BorderSize,
  ColorTarget,
  ColorsState,
  FullPageMode,
  HeaderIconStyle,
  HeaderStyle,
  Link,
  LinkStyle,
  Section,
  SectionType,
  TemplateId,
} from '../types'
import { CheckIcon, Grip, Plus, Trash } from './icons'

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
      <div className="section-row">
        <span className="grip" aria-hidden="true"><Grip /></span>
        <span className="section-icon" aria-hidden="true">
          <DocIcon name={SECTION_ICONS[section.type] ?? 'file'} />
        </span>
        <span className="section-row-title">{section.title}</span>
        <span className="section-count">{section.items.length}</span>
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

/** Miniature body for the Columns control: one stack of text lines, or two. */
function ColumnsGlyph({ columns }: { columns: 1 | 2 }) {
  const stack = (key: string) => (
    <span className="lt-stack" key={key}>
      <span className="lt-line" />
      <span className="lt-line" />
      <span className="lt-line" />
      <span className="lt-line lt-line--short" />
    </span>
  )
  return (
    <span className="lt-lines" data-cols={columns} aria-hidden="true">
      {columns === 2 ? (
        <>
          {stack('a')}
          {stack('b')}
        </>
      ) : (
        stack('a')
      )}
    </span>
  )
}

/** Miniature of where the header band sits in a two-column page. */
function HeaderBandGlyph({ mode }: { mode: 'top' | 'left' | 'right' }) {
  return (
    <span className="lt-band" data-mode={mode} aria-hidden="true">
      <span className="lt-band-fill" />
      <span className="lt-band-body">
        <span className="lt-band-line" />
        <span className="lt-band-line" />
        <span className="lt-band-line lt-band-line--short" />
      </span>
    </span>
  )
}

/** Miniature of a one-column header's text alignment. */
function HeaderAlignGlyph({ align }: { align: 'center' | 'left' | 'right' }) {
  return (
    <span className="lt-align" data-align={align} aria-hidden="true">
      <span className="lt-align-name" />
      <span className="lt-align-contact" />
      <span className="lt-align-rule" />
      <span className="lt-align-rule" />
      <span className="lt-align-rule lt-align-rule--short" />
    </span>
  )
}

/** Miniature of where the portrait sits relative to name & title. */
function PhotoPositionGlyph({
  mode,
}: {
  mode: 'left' | 'right' | 'top' | 'above' | 'below'
}) {
  return (
    <span className="lt-photo" data-mode={mode} aria-hidden="true">
      <span className="lt-photo-portrait" />
      <span className="lt-photo-text">
        <span className="lt-photo-line" />
        <span className="lt-photo-line lt-photo-line--mid" />
        <span className="lt-photo-line lt-photo-line--short" />
      </span>
    </span>
  )
}

/** Miniature of the contact line: an icon per entry, or words with a bullet
 *  or a rule between them. */
function DetailsGlyph({ mode }: { mode: 'icon' | 'bullet' | 'bar' }) {
  if (mode === 'icon') {
    return (
      <span className="lt-details" data-mode={mode} aria-hidden="true">
        <span className="lt-detail-icon" />
        <span className="lt-detail-word" />
        <span className="lt-detail-icon" />
        <span className="lt-detail-word" />
      </span>
    )
  }
  return (
    <span className="lt-details" data-mode={mode} aria-hidden="true">
      <span className="lt-detail-word" />
      <span className="lt-detail-sep">{mode === 'bullet' ? '•' : '|'}</span>
      <span className="lt-detail-word" />
      <span className="lt-detail-sep">{mode === 'bullet' ? '•' : '|'}</span>
      <span className="lt-detail-word" />
    </span>
  )
}

/** The seven icon frames, in the order the row presents them: none, solid,
 *  then outlined -- each family in circle, rounded-square, square order. */
const HEADER_ICON_STYLES: {
  value: HeaderIconStyle
  label: string
  shape: 'none' | 'circle' | 'rounded' | 'square'
  fill: boolean
}[] = [
  { value: 'plain', label: 'No frame', shape: 'none', fill: false },
  { value: 'circle-fill', label: 'Solid circle', shape: 'circle', fill: true },
  { value: 'rounded-fill', label: 'Solid rounded square', shape: 'rounded', fill: true },
  { value: 'square-fill', label: 'Solid square', shape: 'square', fill: true },
  { value: 'circle-line', label: 'Outlined circle', shape: 'circle', fill: false },
  { value: 'rounded-line', label: 'Outlined rounded square', shape: 'rounded', fill: false },
  { value: 'square-line', label: 'Outlined square', shape: 'square', fill: false },
]

/** Designs whose professional title is already italic, so the Header card's
 *  resting tile matches the page instead of arguing with it. */
const ITALIC_TITLE_TEMPLATES = new Set<TemplateId>([
  'executive',
  'editorial',
  'academic',
  'portal-pro',
  'modern-deep',
])

/** Designs whose links are underlined by default, so the Link card's resting
 *  tile agrees with the sheet. */
const LINK_UNDERLINED_TEMPLATES = new Set<TemplateId>(['jake'])

/** A font picker over the ATS-safe catalogue. With `sameAsBody`, the empty
 *  option means "inherit the body face" -- the resting state of every design. */
function FontSelect({
  label,
  value,
  onChange,
  sameAsBody,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  sameAsBody?: boolean
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {sameAsBody && <option value="">Same as body font</option>}
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
  )
}


export function LeftPane() {
  const { doc, addSection, moveSection, moveSectionToColumn, updateSettings } = useEditor()
  const sensors = useDragSensors()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [photoAdjustOpen, setPhotoAdjustOpen] = useState(false)
  const [headerAdvancedOpen, setHeaderAdvancedOpen] = useState(true)
  const [linkAdvancedOpen, setLinkAdvancedOpen] = useState(true)
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
  // Legacy ids resolve onto the eight current treatments, so the tile that
  // describes the sheet is always one of the eight on screen.
  const headingVisual = resolveHeadingVisual(hs.visual)

  // -- Header card state ---------------------------------------------------
  // Absent fields are "as designed", so every tile reads the effective value
  // the page is showing -- a control never appears to disagree with the sheet.
  const header = currentDoc.settings.headerStyle ?? {}
  const headerDetails = header.details ?? (currentDoc.settings.showIcons ? 'icon' : 'bullet')
  // One placement model decides what the photo control offers and what the
  // sheet draws, so a choice can never look available but render otherwise.
  const photoCtx = {
    columns: columnLayout,
    headerPosition,
    align: header.align,
  }
  const headerAlign = headerTextAlign(photoCtx)
  const photoRail = photoInSideRail(photoCtx)
  const photoPlacement = resolvePhotoPlacement(pl.position, photoCtx)
  const photoTileValue = photoRail
    ? photoPlacement === 'top'
      ? 'top'
      : 'bottom'
    : (photoPlacement as 'left' | 'top' | 'right')
  const headerIconStyle: HeaderIconStyle = header.iconStyle ?? 'plain'
  const headerNameStyle = header.nameStyle ?? 'normal'
  const headerTitleStyle =
    header.titleStyle ??
    (ITALIC_TITLE_TEMPLATES.has(currentDoc.settings.template) ? 'italic' : 'normal')
  const headerTitlePosition = header.titlePosition ?? 'below'
  const setHeader = (patch: HeaderStyle) =>
    updateSettings({ headerStyle: { ...header, ...patch } })

  // -- Link card state -----------------------------------------------------
  // Same rule as the header: the resting value is whatever the sheet already
  // shows, so Jake's underlined links light up the Underline tile and every
  // other design rests on Plain.
  const link = currentDoc.settings.linkStyle ?? {}
  const linkDecoration =
    link.decoration ??
    (LINK_UNDERLINED_TEMPLATES.has(currentDoc.settings.template) ? 'underline' : 'plain')
  const linkUnderline = linkDecoration !== 'plain'
  const linkColor = link.color ?? 'ink'
  // 'accent' is the legacy value from before link blue was a fixed colour; it
  // now means the same thing as 'blue'.
  const linkBlue = linkColor === 'blue' || linkColor === 'accent'
  const linkEmphasis = link.emphasis ?? []
  // The contact icons are owned by the Header card's Details arrangement; the
  // Link card mirrors it so "Link icon" and "Icon" can never disagree.
  const linkIconsOn = headerDetails === 'icon'
  const setLink = (patch: LinkStyle) =>
    updateSettings({ linkStyle: { ...link, ...patch } })
  const setLinkIcons = (on: boolean) =>
    updateSettings({
      showIcons: on,
      headerStyle: { ...header, details: on ? 'icon' : 'bullet' },
    })
  const toggleEmphasis = (key: 'email' | 'phone') => {
    const next = linkEmphasis.includes(key)
      ? linkEmphasis.filter((k) => k !== key)
      : [...linkEmphasis, key]
    setLink({ emphasis: next.length > 0 ? next : undefined })
  }


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
          <ChoiceTiles
            label="Columns"
            value={columnLayout}
            options={[
              { value: 'one', label: 'One', visual: <ColumnsGlyph columns={1} /> },
              { value: 'two', label: 'Two', visual: <ColumnsGlyph columns={2} /> },
            ]}
            onChange={(v) => (v === 'two' ? switchToTwo() : switchToOne())}
          />
          {columnLayout === 'two' && (
            <ChoiceTiles
              label="Header Position"
              value={headerPosition}
              options={[
                { value: 'top', label: 'Top', visual: <HeaderBandGlyph mode="top" /> },
                { value: 'left', label: 'Left', visual: <HeaderBandGlyph mode="left" /> },
                { value: 'right', label: 'Right', visual: <HeaderBandGlyph mode="right" /> },
              ]}
              onChange={(v) => updateSettings({ headerPosition: v })}
            />
          )}
          {columnLayout === 'one' && (
            <ChoiceTiles
              label="Header Position"
              value={headerPosition === 'top' ? 'center' : headerPosition}
              options={[
                { value: 'center', label: 'Center', visual: <HeaderAlignGlyph align="center" /> },
                { value: 'left', label: 'Left', visual: <HeaderAlignGlyph align="left" /> },
                { value: 'right', label: 'Right', visual: <HeaderAlignGlyph align="right" /> },
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
          <ChoiceTiles
            label="Position"
            value={photoTileValue}
            options={
              photoRail
                ? [
                    {
                      value: 'top' as const,
                      label: 'Above name & title',
                      visual: <PhotoPositionGlyph mode="above" />,
                    },
                    {
                      value: 'bottom' as const,
                      label: 'Below name & title',
                      visual: <PhotoPositionGlyph mode="below" />,
                    },
                  ]
                : [
                    {
                      value: 'left' as const,
                      label: 'Left',
                      visual: <PhotoPositionGlyph mode="left" />,
                      disabled: headerAlign === 'center',
                      note: 'Centred header text keeps the photo above the name',
                    },
                    {
                      value: 'top' as const,
                      label: 'Top',
                      visual: <PhotoPositionGlyph mode="top" />,
                      // Above the identity only composes when the identity is
                      // centred; a left or right header would leave the photo
                      // hanging off the text's axis.
                      disabled: headerAlign !== 'center',
                      note: 'Needs centred header text',
                    },
                    {
                      value: 'right' as const,
                      label: 'Right',
                      visual: <PhotoPositionGlyph mode="right" />,
                      disabled: headerAlign === 'center',
                      note: 'Centred header text keeps the photo above the name',
                    },
                  ]
            }
            hint={
              photoRail
                ? undefined
                : headerAlign === 'center'
                  ? 'Centred header text keeps the photo above the name.'
                  : 'A photo above needs centred header text.'
            }
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
        {/*  HEADER                                                      */}
        {/* ============================================================ */}
        <div className="pane-section">
          <p className="pane-section-title">Header</p>

          <ChoiceTiles
            label="Text Alignment"
            value={headerAlign}
            options={[
              { value: 'left', label: 'Left', visual: <HeaderAlignGlyph align="left" /> },
              { value: 'center', label: 'Center', visual: <HeaderAlignGlyph align="center" /> },
              { value: 'right', label: 'Right', visual: <HeaderAlignGlyph align="right" /> },
            ]}
            onChange={(align) =>
              // One column has no side panel: there the header position IS the
              // alignment, so both controls move together instead of fighting.
              columnLayout === 'two'
                ? setHeader({ align })
                : updateSettings({ headerPosition: align })
            }
          />

          <ChoiceTiles
            label="Details Arrangement"
            value={headerDetails}
            options={[
              { value: 'icon', label: 'Icon', visual: <DetailsGlyph mode="icon" /> },
              { value: 'bullet', label: 'Bullet', visual: <DetailsGlyph mode="bullet" /> },
              { value: 'bar', label: 'Bar', visual: <DetailsGlyph mode="bar" /> },
            ]}
            onChange={(details) => setHeader({ details })}
          />

          <div className="field">
            <span className="field-label">Icon Style</span>
            <div className="hdr-icon-row" role="radiogroup" aria-label="Icon style">
              {HEADER_ICON_STYLES.map((opt, i) => {
                const active = headerIconStyle === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className="hdr-icon-opt"
                    data-active={active}
                    role="radio"
                    aria-checked={active}
                    aria-label={opt.label}
                    title={opt.label}
                    tabIndex={active ? 0 : -1}
                    // Picking a frame means wanting to see it: the details
                    // arrangement switches to Icon so the page answers at once.
                    onClick={() => setHeader({ details: 'icon', iconStyle: opt.value })}
                    onKeyDown={(e) => {
                      const n = HEADER_ICON_STYLES.length
                      let next = i
                      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n
                      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n
                      else if (e.key === 'Home') next = 0
                      else if (e.key === 'End') next = n - 1
                      else return
                      e.preventDefault()
                      setHeader({ details: 'icon', iconStyle: HEADER_ICON_STYLES[next].value })
                      const el = e.currentTarget.parentElement?.children[next] as
                        | HTMLElement
                        | undefined
                      el?.focus()
                    }}
                  >
                    <span className="hdr-icon-chip" data-shape={opt.shape} data-fill={opt.fill}>
                      <DocIcon name="link" variant="outline" className="hdr-icon-glyph" />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="adv-settings" data-open={headerAdvancedOpen}>
            <button
              type="button"
              className="adv-toggle"
              aria-expanded={headerAdvancedOpen}
              onClick={() => setHeaderAdvancedOpen((v) => !v)}
            >
              Advanced Settings
              <svg
                className="adv-chev"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {headerAdvancedOpen && (
              <div className="adv-body">
                <div className="field">
                  <span className="field-label">Name Style</span>
                  <div className="style-pair" role="radiogroup" aria-label="Name style">
                    <button
                      type="button"
                      className="style-opt"
                      role="radio"
                      aria-checked={headerNameStyle === 'normal'}
                      aria-label="Upright name"
                      data-active={headerNameStyle === 'normal'}
                      onClick={() => setHeader({ nameStyle: 'normal' })}
                    >
                      Aa
                    </button>
                    <button
                      type="button"
                      className="style-opt"
                      role="radio"
                      aria-checked={headerNameStyle === 'italic'}
                      aria-label="Italic name"
                      data-style="italic"
                      data-active={headerNameStyle === 'italic'}
                      onClick={() => setHeader({ nameStyle: 'italic' })}
                    >
                      Aa
                    </button>
                  </div>
                </div>

                <div className="field">
                  <span className="field-label">Professional Title Style</span>
                  <div className="style-pair" role="radiogroup" aria-label="Professional title style">
                    <button
                      type="button"
                      className="style-opt"
                      role="radio"
                      aria-checked={headerTitleStyle === 'normal'}
                      aria-label="Upright professional title"
                      data-active={headerTitleStyle === 'normal'}
                      onClick={() => setHeader({ titleStyle: 'normal' })}
                    >
                      Aa
                    </button>
                    <button
                      type="button"
                      className="style-opt"
                      role="radio"
                      aria-checked={headerTitleStyle === 'italic'}
                      aria-label="Italic professional title"
                      data-style="italic"
                      data-active={headerTitleStyle === 'italic'}
                      onClick={() => setHeader({ titleStyle: 'italic' })}
                    >
                      Aa
                    </button>
                  </div>
                </div>

                <div className="field">
                  <span className="field-label">Professional Title Position</span>
                  <div className="pill-choice" role="radiogroup" aria-label="Professional title position">
                    <button
                      type="button"
                      className="pill-opt"
                      role="radio"
                      aria-checked={headerTitlePosition === 'same-line'}
                      data-active={headerTitlePosition === 'same-line'}
                      onClick={() => setHeader({ titlePosition: 'same-line' })}
                    >
                      Try Same Line
                    </button>
                    <button
                      type="button"
                      className="pill-opt"
                      role="radio"
                      aria-checked={headerTitlePosition === 'below'}
                      data-active={headerTitlePosition === 'below'}
                      onClick={() => setHeader({ titlePosition: 'below' })}
                    >
                      Below
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/*  SECTION HEADINGS                                            */}
        {/* ============================================================ */}
        <div className="pane-section">
          <p className="pane-section-title">Section Headings</p>
          <div className="field">
            <span className="field-label">Style</span>
            <div className="heading-style-grid" role="radiogroup" aria-label="Heading style">
              {HEADING_VISUALS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={headingVisual === opt.value}
                  aria-label={opt.label}
                  title={`${opt.label} — ${opt.hint}`}
                  className="heading-style-tile"
                  data-active={headingVisual === opt.value}
                  onClick={() => updateSettings({ headingStyle: { ...hs, visual: opt.value } })}
                >
                  <span className="heading-glyph" data-style={opt.value} aria-hidden="true">
                    <span className="hg-line hg-line--text" />
                    <span className="hg-line hg-line--mark" />
                  </span>
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

        {/* ============================================================ */}
        {/*  LINK STYLING                                                */}
        {/* ============================================================ */}
        <div className="pane-section">
          <p className="pane-section-title">Link Styling</p>

          <div className="link-switch-list">
            <Check
              label="Underline"
              checked={linkUnderline}
              onChange={(on) => setLink({ decoration: on ? 'underline' : 'plain' })}
            />
            <Check
              label="Blue color"
              checked={linkBlue}
              onChange={(on) => setLink({ color: on ? 'blue' : 'ink' })}
            />
            <Check
              label="Link icon"
              checked={linkIconsOn}
              onChange={setLinkIcons}
            />
          </div>

          <div className="adv-settings" data-open={linkAdvancedOpen}>
            <button
              type="button"
              className="adv-toggle"
              aria-expanded={linkAdvancedOpen}
              onClick={() => setLinkAdvancedOpen((v) => !v)}
            >
              Advanced Settings
              <svg
                className="adv-chev"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {linkAdvancedOpen && (
              <div className="adv-body">
                <div className="field">
                  <span className="field-label">
                    Apply underline and blue color to header
                  </span>
                  <div className="link-switch-list link-switch-advanced">
                    <Check
                      label="Email"
                      checked={linkEmphasis.includes('email')}
                      onChange={() => toggleEmphasis('email')}
                    />
                    <Check
                      label="Phone"
                      checked={linkEmphasis.includes('phone')}
                      onChange={() => toggleEmphasis('phone')}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="hint link-hint">
            Underline and Blue color reach every clickable contact entry. Use
            Advanced Settings to force them on individual header entries even
            when those switches are off. The sheet shows the same treatment in
            the PDF.
          </p>
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
  const [browseOpen, setBrowseOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (saveOpen) {
      setSaveName('')
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [saveOpen])

  if (!doc) return null

  /** One entry point for picking a design, shared by the sidebar and the
      gallery so both paths auto-distribute a two-column layout the same way. */
  function applyTemplate(templateId: TemplateId) {
    if (!doc) return
    const preset = applyTemplatePreset(templateId)
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
  }

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
          <TemplateShortlist
            current={doc.settings.template}
            accent={doc.settings.accentColor}
            onPick={applyTemplate}
            onBrowse={() => setBrowseOpen(true)}
          />
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

        {/* Full design gallery, opened from the shortlist */}
        {browseOpen && (
          <TemplateBrowser
            current={doc.settings.template}
            onPick={(id) => {
              applyTemplate(id)
              setBrowseOpen(false)
            }}
            onClose={() => setBrowseOpen(false)}
          />
        )}

        <section className="style-section">
          <p className="eyebrow style-section-title">Typography</p>
          <FontSelect
            label="Body Font"
            value={doc.settings.fontFamily}
            onChange={(fontFamily) => updateSettings({ fontFamily })}
          />
          <FontSelect
            label="Name Font"
            value={doc.settings.nameFont ?? ''}
            sameAsBody
            onChange={(nameFont) => updateSettings({ nameFont: nameFont || undefined })}
          />
          <FontSelect
            label="Title Font"
            value={doc.settings.titleFont ?? ''}
            sameAsBody
            onChange={(titleFont) => updateSettings({ titleFont: titleFont || undefined })}
          />
          <p className="hint" style={{ marginTop: -6 }}>
            The name and title follow the body font until you pick a face for
            them. Every choice is ATS-safe. Display fonts (Montserrat, Poppins…)
            are left out on purpose -- older parsers misread their fi/fl
            ligatures.
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

const COLOR_TARGETS: { id: ColorTarget; label: string }[] = [
  { id: 'full', label: 'Full Page' },
  { id: 'header', label: 'Header' },
  { id: 'border', label: 'Border' },
]

const FULL_MODES: { id: FullPageMode; label: string }[] = [
  { id: 'single', label: 'Single' },
  { id: 'multi', label: 'Multi' },
  { id: 'image', label: 'Image' },
]

/** The Border card has two treatments: a painted frame or a photographic one. */
const BORDER_MODES: { id: BorderMode; label: string }[] = [
  { id: 'single', label: 'Single' },
  { id: 'image', label: 'Image' },
]

/** Perceived luminance, so a tick stays visible on both light and dark inks. */
function contrastInk(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const y = (r * 299 + g * 587 + b * 114) / 1000
  return y > 150 ? '#111827' : '#ffffff'
}

function isPlainHex(value: string | undefined): value is string {
  return !!value && /^#[0-9a-f]{6}$/i.test(value)
}

/** A labelled colour control: swatch opens the picker, hex reads back. */
function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="color-row">
      <span className="color-row-label">{label}</span>
      <span className="color-row-swatch" style={{ background: value }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} colour`}
        />
      </span>
      <span className="color-row-hex">{value.toUpperCase()}</span>
    </label>
  )
}

/**
 * The Colors card. Three exclusive targets: Full Page, Header, Border. The
 * selected target is document state -- only its treatment renders, so switching
 * tabs can never leave the previous tab's ink, band or frame behind.
 */
function ColorsSection() {
  const { doc, updateSettings } = useEditor()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [paletteBusy, setPaletteBusy] = useState(false)
  const [query, setQuery] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  if (!doc) return null
  const c = doc.settings.colors
  const mode: FullPageMode = c?.bgType ?? 'single'
  const headerMode: FullPageMode = c?.headerType ?? 'single'
  // The selected tab is document state: the renderer applies only this
  // treatment, so a Header band or Border frame cannot survive a tab switch.
  const target: ColorTarget = c?.activeTarget ?? 'full'

  /** The template's own accent -- what "Default" restores. */
  const defaultAccent = applyTemplatePreset(doc.settings.template).accentColor ?? '#374151'

  /** Complete state on every write, so a partial patch can never drop a key. */
  const baseColors = (): ColorsState => ({
    activeTarget: 'full',
    bgType: 'single',
    singlePresetId: 'default',
    multiPresetId: 'slate',
    textColor: '#0f172a',
    backgroundColor: '#f8fafc',
    bgImageTint: 0.38,
    headerType: 'single',
    headerSingleId: 'none',
    headerPresetId: 'slate',
    headerBgImageTint: 0.38,
    borderType: 'single',
    borderSingleId: 'none',
    borderSize: 'M',
    borderSides: { top: true, right: true, bottom: true, left: true },
    ...c,
    apply: { ...APPLY_ALL, ...c?.apply },
  })

  const setC = (patch: Partial<ColorsState>) =>
    updateSettings({ colors: { ...baseColors(), ...patch } })

  /** Change the active Colors tab. The settings of the other tabs are kept, so
      returning to one restores it -- they simply do not render meanwhile. Each
      tab also owns its accent, so switching tabs never carries the previous
      tab's ink into the new one. */
  const chooseTarget = (id: ColorTarget) => {
    const owned =
      id === 'header'
        ? c?.headerAccentColor ?? doc.settings.accentColor
        : id === 'border'
          ? c?.borderSingleColor ?? doc.settings.accentColor
          : mode === 'multi'
            ? c?.multiAccent ?? doc.settings.accentColor
            : mode === 'single'
              ? c?.singleAccent ?? doc.settings.accentColor
              : doc.settings.accentColor
    updateSettings({
      accentColor: owned,
      colors: { ...baseColors(), activeTarget: id },
    })
  }

  const setApply = (key: ApplyKey, v: boolean) =>
    setC({ apply: { ...(c?.apply ?? APPLY_ALL), [key]: v } })

  // -- Single ------------------------------------------------------------
  const accent = doc.settings.accentColor
  // Value wins over stored id, with the template default checked first: two
  // swatches can share a hex, and the default is the meaningful one then.
  const singleActive =
    accent.toLowerCase() === defaultAccent.toLowerCase()
      ? 'default'
      : SINGLE_ACCENTS.find((a) => a.value.toLowerCase() === accent.toLowerCase())?.id ?? 'custom'

  const applyAccent = (value: string, id: string) =>
    updateSettings({
      accentColor: value,
      colors: {
        ...baseColors(),
        bgType: 'single',
        singlePresetId: id,
        singleAccent: value,
      },
    })

  const singleCaption =
    singleActive === 'default'
      ? `Template default · ${defaultAccent.toUpperCase()}`
      : singleActive === 'custom'
        ? `Custom · ${accent.toUpperCase()}`
        : `${SINGLE_ACCENTS.find((a) => a.id === singleActive)?.label ?? 'Accent'} · ${accent.toUpperCase()}`

  // -- Multi -------------------------------------------------------------
  const activeMulti = MULTI_PRESETS.find((p) => p.id === (c?.multiPresetId ?? 'slate')) ?? MULTI_PRESETS[0]

  const applyMulti = (p: MultiPreset) =>
    updateSettings({
      accentColor: p.accent,
      colors: {
        ...baseColors(),
        bgType: 'multi',
        multiPresetId: p.id,
        multiAccent: p.accent,
        backgroundColor: p.background,
        textColor: p.text,
      },
    })

  const openMultiCustom = () => {
    const background = c?.backgroundColor
    const seed = isPlainHex(background) ? background : activeMulti.solid
    setC({
      bgType: 'multi',
      multiPresetId: 'custom',
      // Whatever accent the scheme is showing now becomes Custom's own, so a
      // reload cannot silently swap it for another preset's colour.
      multiAccent: c?.multiAccent ?? doc.settings.accentColor,
      backgroundColor: seed,
    })
  }

  const setMultiColor = (key: 'text' | 'background' | 'accent', value: string) => {
    if (key === 'accent') {
      updateSettings({
        accentColor: value,
        colors: {
          ...baseColors(),
          bgType: 'multi',
          multiPresetId: 'custom',
          multiAccent: value,
        },
      })
      return
    }
    setC({
      bgType: 'multi',
      multiPresetId: 'custom',
      ...(key === 'text' ? { textColor: value } : { backgroundColor: value }),
    })
  }

  // -- Image -------------------------------------------------------------
  const setMode = (next: FullPageMode) => {
    if (next === 'single') {
      // Restore the ink Single owns. Without this, coming back from a dark
      // Multi scheme would leave a pale accent on white paper.
      const owned = c?.singleAccent ?? defaultAccent
      updateSettings({
        accentColor: owned,
        colors: { ...baseColors(), bgType: 'single', singleAccent: owned },
      })
      return
    }
    if (next === 'multi') {
      const owned = c?.multiAccent ?? activeMulti.accent
      updateSettings({
        accentColor: owned,
        colors: {
          ...baseColors(),
          bgType: 'multi',
          multiPresetId: c?.multiPresetId === 'custom' ? 'custom' : activeMulti.id,
          multiAccent: owned,
          backgroundColor: c?.backgroundColor ?? activeMulti.background,
          textColor: c?.textColor ?? activeMulti.text,
        },
      })
      return
    }
    setC({ bgType: 'image', bgImage: c?.bgImage ?? BACKGROUND_GALLERY[0].src })
  }

  const acceptFile = async (
    file: File | undefined,
    slot: 'page' | 'header' | 'border' = 'page',
  ) => {
    if (!file) return
    setUploadError(null)
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setUploadError('Use a PNG, JPEG or WebP image.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Keep the image under 10 MB.')
      return
    }
    setUploading(true)
    try {
      const url = await api.uploadBackground(file)
      if (slot === 'header') {
        setC({ headerType: 'image', headerBgImage: url })
      } else if (slot === 'border') {
        await applyBorderImage(url)
      } else {
        setC({ bgType: 'image', bgImage: url })
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  // -- Header ------------------------------------------------------------
  const activeHeader =
    HEADER_PRESETS.find((p) => p.id === (c?.headerPresetId ?? 'slate')) ?? HEADER_PRESETS[0]
  const headerSingleId = c?.headerSingleId ?? 'none'
  const headerFill = c?.headerBackgroundColor ?? defaultAccent
  const headerSingleCaption =
    headerSingleId === 'none'
      ? 'No header fill'
      : headerSingleId === 'default'
        ? `Template default · ${defaultAccent.toUpperCase()}`
        : headerSingleId === 'custom'
          ? `Custom · ${headerFill.toUpperCase()}`
          : `${SINGLE_ACCENTS.find((a) => a.id === headerSingleId)?.label ?? 'Accent'} · ${headerFill.toUpperCase()}`

  const applyHeaderSingle = (value: string, id: string) => {
    if (id === 'none') {
      // Clear the band without touching the accent: the page keeps the ink it
      // already has, and only the fill goes away.
      setC({ headerType: 'single', headerSingleId: 'none', headerBackgroundColor: undefined })
      return
    }
    updateSettings({
      accentColor: value,
      colors: {
        ...baseColors(),
        headerType: 'single',
        headerSingleId: id,
        headerSingleColor: value,
        headerBackgroundColor: value,
        headerTextColor: contrastInk(value),
        headerAccentColor: value,
      },
    })
  }

  const applyHeaderMulti = (p: HeaderPreset) =>
    updateSettings({
      accentColor: p.accent,
      colors: {
        ...baseColors(),
        headerType: 'multi',
        headerPresetId: p.id,
        headerBackgroundColor: p.background,
        headerTextColor: p.text,
        headerAccentColor: p.accent,
      },
    })

  const openHeaderCustom = () => {
    const seed = isPlainHex(c?.headerBackgroundColor) ? c.headerBackgroundColor : activeHeader.background
    setC({
      headerType: 'multi',
      headerPresetId: 'custom',
      headerBackgroundColor: seed,
      headerTextColor: c?.headerTextColor ?? activeHeader.text,
      headerAccentColor: c?.headerAccentColor ?? doc.settings.accentColor,
    })
  }

  const setHeaderColor = (
    row: 'header' | 'page',
    key: 'text' | 'background' | 'accent',
    value: string,
  ) => {
    if (row === 'header' && key === 'accent') {
      updateSettings({
        accentColor: value,
        colors: {
          ...baseColors(),
          headerType: 'multi',
          headerPresetId: 'custom',
          headerAccentColor: value,
        },
      })
      return
    }
    if (row === 'header') {
      setC({
        headerType: 'multi',
        headerPresetId: 'custom',
        ...(key === 'text' ? { headerTextColor: value } : { headerBackgroundColor: value }),
      })
      return
    }
    setC({
      headerType: 'multi',
      headerPresetId: 'custom',
      ...(key === 'text'
        ? { headerPageTextColor: value }
        : key === 'background'
          ? { headerPageBackgroundColor: value }
          : { headerPageAccentColor: value }),
    })
  }

  const setHeaderMode = (next: FullPageMode) => {
    if (next === 'single') {
      // Restore the fill Single owns. The id plus its remembered colour means a
      // detour into Multi cannot leave a scheme's band behind.
      const id = c?.headerSingleId ?? 'none'
      const fill =
        id === 'none'
          ? undefined
          : id === 'default'
            ? defaultAccent
            : id === 'custom'
              ? c?.headerSingleColor ?? headerFill
              : SINGLE_ACCENTS.find((a) => a.id === id)?.value ?? c?.headerSingleColor
      if (fill) {
        updateSettings({
          accentColor: fill,
          colors: {
            ...baseColors(),
            headerType: 'single',
            headerSingleId: id,
            headerSingleColor: fill,
            headerBackgroundColor: fill,
            headerTextColor: contrastInk(fill),
            headerAccentColor: fill,
          },
        })
      } else {
        setC({ headerType: 'single', headerSingleId: 'none', headerBackgroundColor: undefined })
      }
      return
    }
    if (next === 'multi') {
      const owned = c?.headerAccentColor ?? activeHeader.accent
      updateSettings({
        accentColor: owned,
        colors: {
          ...baseColors(),
          headerType: 'multi',
          headerPresetId: c?.headerPresetId === 'custom' ? 'custom' : activeHeader.id,
          headerBackgroundColor: c?.headerBackgroundColor ?? activeHeader.background,
          headerTextColor: c?.headerTextColor ?? activeHeader.text,
          headerAccentColor: owned,
        },
      })
      return
    }
    setC({ headerType: 'image', headerBgImage: c?.headerBgImage ?? BACKGROUND_GALLERY[0].src })
  }

  // -- Border ------------------------------------------------------------
  const borderMode: BorderMode = c?.borderType === 'image' ? 'image' : 'single'
  const borderSize: BorderSize = c?.borderSize ?? 'M'
  const borderSides = c?.borderSides ?? { top: true, right: true, bottom: true, left: true }
  const borderFill = c?.borderSingleColor ?? doc.settings.accentColor
  const borderId = c?.borderSingleId ?? 'none'
  const borderPalette = c?.borderPalette ?? []
  const selectedBorderGallery = BACKGROUND_GALLERY.find((b) => b.src === c?.borderBgImage)
  const borderCaption =
    borderMode === 'image'
      ? selectedBorderGallery?.label ?? (c?.borderBgImage ? 'Uploaded image' : 'No image')
      : borderId === 'none' || !c?.borderSingleColor
        ? 'No border'
        : borderId === 'custom'
          ? `Custom · ${borderFill.toUpperCase()}`
          : `${SINGLE_ACCENTS.find((a) => a.id === borderId)?.label ?? 'Accent'} · ${borderFill.toUpperCase()}`

  /**
   * Apply a border image and measure its palette. The frame is shown at once,
   * then the suggestions fill in when sampling finishes; the late write reads
   * the store again so it can never overwrite edits made in between.
   */
  const applyBorderImage = async (src: string) => {
    setC({ borderType: 'image', borderBgImage: src, borderPalette: [] })
    setPaletteBusy(true)
    try {
      const palette = await extractPalette(src, 9)
      const latest = useEditor.getState().doc?.settings.colors
      if (!latest || latest.borderBgImage !== src) return
      updateSettings({
        colors: {
          ...latest,
          borderType: 'image',
          borderBgImage: src,
          borderPalette: palette,
        },
      })
    } finally {
      setPaletteBusy(false)
    }
  }

  const setBorderMode = (next: BorderMode) => {
    if (next === 'single') {
      // Return to the fill Single owns; an Image detour must not erase it.
      setC({
        borderType: 'single',
        borderSingleId: c?.borderSingleId ?? 'none',
        borderSingleColor: c?.borderSingleColor,
      })
      return
    }
    const src = c?.borderBgImage ?? BACKGROUND_GALLERY[0].src
    if (src === c?.borderBgImage && (c?.borderPalette?.length ?? 0) > 0) {
      setC({ borderType: 'image' })
      return
    }
    void applyBorderImage(src)
  }

  const applyBorderSingle = (value: string, id: string) => {
    if (id === 'none') {
      // Clear the frame without touching the accent the page already uses.
      setC({ borderType: 'single', borderSingleId: 'none', borderSingleColor: undefined })
      return
    }
    updateSettings({
      accentColor: value,
      colors: {
        ...baseColors(),
        borderType: 'single',
        borderSingleId: id,
        borderSingleColor: value,
      },
    })
  }

  /** A suggestion colours the document and is remembered as Single's fill. */
  const applyBorderSuggestion = (value: string) => {
    updateSettings({
      accentColor: value,
      colors: {
        ...baseColors(),
        borderType: 'image',
        borderSingleId: 'custom',
        borderSingleColor: value,
      },
    })
  }

  const toggleBorderSide = (side: keyof typeof borderSides) =>
    setC({ borderSides: { ...borderSides, [side]: !borderSides[side] } })

  const gallery = BACKGROUND_GALLERY.filter((b) =>
    b.label.toLowerCase().includes(query.trim().toLowerCase()),
  )
  const selectedGallery = BACKGROUND_GALLERY.find((b) => b.src === c?.bgImage)
  const tint = c?.bgImageTint ?? 0.38
  const selectedHeaderGallery = BACKGROUND_GALLERY.find((b) => b.src === c?.headerBgImage)
  const headerTint = c?.headerBgImageTint ?? 0.38
  const storedBackground = c?.backgroundColor
  const customBackground = isPlainHex(storedBackground) ? storedBackground : activeMulti.solid
  const headerCustomBackground = isPlainHex(c?.headerBackgroundColor)
    ? c.headerBackgroundColor
    : activeHeader.background
  const headerCustomText = c?.headerTextColor ?? activeHeader.text
  const headerCustomAccent = c?.headerAccentColor ?? doc.settings.accentColor
  const pageCustomText = c?.headerPageTextColor ?? c?.textColor ?? '#0f172a'
  const pageCustomBackground = isPlainHex(c?.headerPageBackgroundColor)
    ? c.headerPageBackgroundColor
    : isPlainHex(c?.backgroundColor)
      ? c.backgroundColor
      : '#f8fafc'
  const pageCustomAccent = c?.headerPageAccentColor ?? doc.settings.accentColor

  return (
    <section className="style-section">
      <p className="eyebrow style-section-title">Colors</p>

      {/* -- Target selector: choose what the colours apply to ---------- */}
      <div className="color-target-tabs" role="tablist" aria-label="Colour target">
        {COLOR_TARGETS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={target === t.id}
            className="color-target-tab"
            data-active={target === t.id}
            onClick={() => chooseTarget(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {target === 'border' && (
        <>
          {/* -- Treatment selector: a painted frame or a photo frame ------ */}
          <div className="mode-tabs mode-tabs-2" role="tablist" aria-label="Border treatment">
            {BORDER_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={borderMode === m.id}
                className="mode-tab"
                data-active={borderMode === m.id}
                onClick={() => setBorderMode(m.id)}
              >
                <span className={`mode-preview mode-border-${m.id}`} aria-hidden="true" />
                <span className="mode-tab-label">{m.label}</span>
              </button>
            ))}
          </div>

          {/* -- Single: one accent draws the frame ------------------------ */}
          {borderMode === 'single' && (
            <div className="color-panel">
              <div className="color-panel-head">
                <p className="eyebrow">Accent color</p>
                <span className="color-panel-caption">{borderCaption}</span>
              </div>
              <div className="accent-grid" role="radiogroup" aria-label="Border accent colour">
                <button
                  type="button"
                  className="accent-tile accent-none"
                  data-active={borderId === 'none'}
                  aria-label="No border"
                  title="No border"
                  onClick={() => applyBorderSingle('', 'none')}
                >
                  <span aria-hidden="true">—</span>
                </button>
                <button
                  type="button"
                  className="accent-tile accent-default"
                  data-active={borderId === 'default'}
                  aria-label="Template default accent"
                  title="Template default accent"
                  onClick={() => applyBorderSingle(defaultAccent, 'default')}
                >
                  <span style={{ color: defaultAccent }}>A</span>
                </button>
                {SINGLE_ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="accent-tile"
                    style={{ background: a.value, color: contrastInk(a.value) }}
                    data-active={borderId === a.id}
                    aria-label={a.label}
                    title={a.label}
                    onClick={() => applyBorderSingle(a.value, a.id)}
                  >
                    {borderId === a.id && <CheckIcon />}
                  </button>
                ))}
                <label
                  className="accent-tile accent-custom"
                  data-active={borderId === 'custom'}
                  style={{ background: borderFill, color: contrastInk(borderFill) }}
                  title="Custom border colour"
                >
                  <input
                    type="color"
                    value={borderFill}
                    onChange={(e) => applyBorderSingle(e.target.value, 'custom')}
                    aria-label="Custom border colour"
                  />
                  {borderId === 'custom' ? <CheckIcon /> : <Plus />}
                </label>
              </div>
            </div>
          )}

          {/* -- Image: a photographed frame plus measured suggestions ----- */}
          {borderMode === 'image' && (
            <div className="color-panel">
              <div className="color-panel-head">
                <p className="eyebrow">Border image</p>
                <span className="color-panel-caption">
                  {selectedBorderGallery?.label ?? (c?.borderBgImage ? 'Uploaded image' : 'No image')}
                </span>
              </div>

              {c?.borderBgImage && (
                <div className="bg-selected">
                  <span
                    className="bg-selected-thumb"
                    style={{ backgroundImage: `url(${JSON.stringify(c.borderBgImage)})` }}
                    aria-hidden="true"
                  />
                  <span className="bg-selected-text">
                    <span className="bg-selected-name">
                      {selectedBorderGallery?.label ?? 'Uploaded image'}
                    </span>
                    <span className="bg-selected-hint">Frame only · page stays visible</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    aria-label="Remove border image"
                    title="Remove border image"
                    onClick={() =>
                      setC({ borderType: 'single', borderBgImage: undefined, borderPalette: [] })
                    }
                  >
                    <Trash />
                  </button>
                </div>
              )}

              <label
                className="bg-upload"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  void acceptFile(e.dataTransfer.files[0], 'border')
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    void acceptFile(e.target.files?.[0], 'border')
                    e.currentTarget.value = ''
                  }}
                />
                <Plus />
                <span className="bg-upload-title">{uploading ? 'Uploading…' : 'Upload image'}</span>
                <span className="bg-upload-hint">PNG, JPEG or WebP · up to 10 MB · or drop it here</span>
              </label>
              {uploadError && <p className="bg-upload-error">{uploadError}</p>}

              <input
                type="search"
                className="text-input bg-search"
                placeholder="Search border images"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search border images"
              />

              <div className="bg-gallery">
                {gallery.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="bg-tile"
                    data-active={c?.borderBgImage === b.src}
                    onClick={() => void applyBorderImage(b.src)}
                    title={b.label}
                    aria-label={b.label}
                  >
                    <img src={b.src} alt="" loading="lazy" />
                    <span className="bg-tile-name">{b.label}</span>
                    {c?.borderBgImage === b.src && (
                      <span className="bg-tile-check" aria-hidden="true">
                        <CheckIcon />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {gallery.length === 0 && (
                <p className="bg-empty">No backgrounds match “{query}”.</p>
              )}

              <div className="border-palette">
                <div className="color-panel-head">
                  <p className="eyebrow">Colors suggested based on your image</p>
                  <span className="color-panel-caption">
                    {paletteBusy
                      ? 'Sampling…'
                      : borderPalette.length > 0
                        ? `${borderPalette.length} colours`
                        : 'No suggestions'}
                  </span>
                </div>
                {borderPalette.length > 0 ? (
                  <div
                    className="accent-grid border-palette-grid"
                    role="radiogroup"
                    aria-label="Suggested accent colours"
                  >
                    {borderPalette.map((hex) => {
                      const active =
                        borderId === 'custom' &&
                        (c?.borderSingleColor ?? '').toLowerCase() === hex.toLowerCase()
                      return (
                        <button
                          key={hex}
                          type="button"
                          className="accent-tile"
                          style={{ background: hex, color: contrastInk(hex) }}
                          data-active={active}
                          aria-label={`Use ${hex}`}
                          title={hex}
                          onClick={() => applyBorderSuggestion(hex)}
                        >
                          {active && <CheckIcon />}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="bg-empty">
                    {paletteBusy
                      ? 'Reading colours from your image…'
                      : c?.borderBgImage
                        ? 'This image has no readable colours.'
                        : 'Choose an image to see suggested colours.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* -- Frame geometry: shared by both treatments ---------------- */}
          <div className="color-panel border-frame-panel">
            <div className="color-panel-head">
              <p className="eyebrow">Border size</p>
              <span className="color-panel-caption">
                {BORDER_SIZES.find((s) => s.id === borderSize)?.mm ?? 5} mm
              </span>
            </div>
            <div className="border-size-grid" role="radiogroup" aria-label="Border size">
              {BORDER_SIZES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="border-size-tile"
                  data-active={borderSize === s.id}
                  aria-label={`Border size ${s.label}`}
                  onClick={() => setC({ borderSize: s.id })}
                >
                  <span className="border-size-letter">{s.label}</span>
                  <span className="border-size-mm">{s.mm} mm</span>
                </button>
              ))}
            </div>

            <div className="apply-accent">
              <p className="eyebrow apply-accent-title">Show Border</p>
              <div className="sides-grid">
                {[1, 2].map((col) => (
                  <div key={col}>
                    {(
                      [
                        { column: 1, side: 'top', label: 'Top' },
                        { column: 1, side: 'bottom', label: 'Bottom' },
                        { column: 2, side: 'right', label: 'Right' },
                        { column: 2, side: 'left', label: 'Left' },
                      ] as const
                    )
                      .filter((o) => o.column === col)
                      .map((o) => (
                        <Check
                          key={o.side}
                          label={o.label}
                          checked={borderSides[o.side]}
                          onChange={() => toggleBorderSide(o.side)}
                        />
                      ))}
                  </div>
                ))}
              </div>
            </div>

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
          </div>
        </>
      )}

      {target === 'header' && (
        <>
          {/* -- Treatment selector -------------------------------------- */}
          <div className="mode-tabs" role="tablist" aria-label="Header treatment">
            {FULL_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={headerMode === m.id}
                className="mode-tab"
                data-active={headerMode === m.id}
                onClick={() => setHeaderMode(m.id)}
              >
                <span className={`mode-preview mode-${m.id}`} aria-hidden="true" />
                <span className="mode-tab-label">{m.label}</span>
              </button>
            ))}
          </div>

          {/* -- Single: one accent fills the identity band --------------- */}
          {headerMode === 'single' && (
            <div className="color-panel">
              <div className="color-panel-head">
                <p className="eyebrow">Accent color</p>
                <span className="color-panel-caption">{headerSingleCaption}</span>
              </div>
              <div className="accent-grid" role="radiogroup" aria-label="Header accent colour">
                <button
                  type="button"
                  className="accent-tile accent-none"
                  data-active={headerSingleId === 'none'}
                  aria-label="No header fill"
                  title="No header fill"
                  onClick={() => applyHeaderSingle('', 'none')}
                >
                  <span aria-hidden="true">—</span>
                </button>
                <button
                  type="button"
                  className="accent-tile accent-default"
                  data-active={headerSingleId === 'default'}
                  aria-label="Template default accent"
                  title="Template default accent"
                  onClick={() => applyHeaderSingle(defaultAccent, 'default')}
                >
                  <span style={{ color: defaultAccent }}>A</span>
                </button>
                {SINGLE_ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="accent-tile"
                    style={{ background: a.value, color: contrastInk(a.value) }}
                    data-active={headerSingleId === a.id}
                    aria-label={a.label}
                    title={a.label}
                    onClick={() => applyHeaderSingle(a.value, a.id)}
                  >
                    {headerSingleId === a.id && <CheckIcon />}
                  </button>
                ))}
                <label
                  className="accent-tile accent-custom"
                  data-active={headerSingleId === 'custom'}
                  style={{ background: headerFill, color: contrastInk(headerFill) }}
                  title="Custom header colour"
                >
                  <input
                    type="color"
                    value={headerFill}
                    onChange={(e) => applyHeaderSingle(e.target.value, 'custom')}
                    aria-label="Custom header colour"
                  />
                  {headerSingleId === 'custom' ? <CheckIcon /> : <Plus />}
                </label>
              </div>

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
            </div>
          )}

          {/* -- Multi: header scheme + optional page row ----------------- */}
          {headerMode === 'multi' && (
            <div className="color-panel">
              <div className="color-panel-head">
                <p className="eyebrow">Header schemes</p>
                <span className="color-panel-caption">
                  {c?.headerPresetId === 'custom' ? 'Custom' : activeHeader.label}
                </span>
              </div>
              <div className="multi-grid">
                {HEADER_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="multi-tile"
                    data-active={c?.headerPresetId === p.id}
                    onClick={() => applyHeaderMulti(p)}
                    title={p.label}
                  >
                    <span className="multi-preview" style={{ background: p.background }}>
                      <span className="multi-aa" style={{ color: p.text }}>T</span>
                      <span className="multi-dot" style={{ background: p.accent }} />
                    </span>
                    <span className="multi-label">{p.label}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="preset-custom"
                data-active={c?.headerPresetId === 'custom'}
                onClick={openHeaderCustom}
              >
                <Plus />
                Custom
              </button>

              {c?.headerPresetId === 'custom' && (
                <div className="color-rows">
                  <div className="color-row-group">
                    <p className="eyebrow color-row-group-title">Header</p>
                    <ColorRow
                      label="Text"
                      value={headerCustomText}
                      onChange={(v) => setHeaderColor('header', 'text', v)}
                    />
                    <ColorRow
                      label="Background"
                      value={headerCustomBackground}
                      onChange={(v) => setHeaderColor('header', 'background', v)}
                    />
                    <ColorRow
                      label="Accent"
                      value={headerCustomAccent}
                      onChange={(v) => setHeaderColor('header', 'accent', v)}
                    />
                  </div>
                  <div className="color-row-group">
                    <p className="eyebrow color-row-group-title">Page</p>
                    <ColorRow
                      label="Text"
                      value={pageCustomText}
                      onChange={(v) => setHeaderColor('page', 'text', v)}
                    />
                    <ColorRow
                      label="Background"
                      value={pageCustomBackground}
                      onChange={(v) => setHeaderColor('page', 'background', v)}
                    />
                    <ColorRow
                      label="Accent"
                      value={pageCustomAccent}
                      onChange={(v) => setHeaderColor('page', 'accent', v)}
                    />
                  </div>
                </div>
              )}

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
            </div>
          )}

          {/* -- Image: photo over the header band (or the side column) ---- */}
          {headerMode === 'image' && (
            <div className="color-panel">
              <div className="color-panel-head">
                <p className="eyebrow">Header image</p>
                <span className="color-panel-caption">
                  {doc.settings.columnLayout === 'two' &&
                  (doc.settings.headerPosition ?? 'top') !== 'top'
                    ? 'Covers the side column'
                    : 'Covers the header only'}
                </span>
              </div>

              {c?.headerBgImage && (
                <div className="bg-selected">
                  <span
                    className="bg-selected-thumb"
                    style={{ backgroundImage: `url(${JSON.stringify(c.headerBgImage)})` }}
                    aria-hidden="true"
                  />
                  <span className="bg-selected-text">
                    <span className="bg-selected-name">
                      {selectedHeaderGallery?.label ?? 'Uploaded image'}
                    </span>
                    <span className="bg-selected-hint">Header band · body stays white</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    aria-label="Remove header image"
                    title="Remove header image"
                    onClick={() =>
                      setC({
                        headerType: 'single',
                        headerSingleId: 'none',
                        headerBackgroundColor: undefined,
                        headerBgImage: undefined,
                      })
                    }
                  >
                    <Trash />
                  </button>
                </div>
              )}

              <label
                className="bg-upload"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  void acceptFile(e.dataTransfer.files[0], 'header')
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    void acceptFile(e.target.files?.[0], 'header')
                    e.currentTarget.value = ''
                  }}
                />
                <Plus />
                <span className="bg-upload-title">{uploading ? 'Uploading…' : 'Upload image'}</span>
                <span className="bg-upload-hint">PNG, JPEG or WebP · up to 10 MB · or drop it here</span>
              </label>
              {uploadError && <p className="bg-upload-error">{uploadError}</p>}

              <input
                type="search"
                className="text-input bg-search"
                placeholder="Search backgrounds"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search backgrounds"
              />

              <div className="bg-gallery">
                {gallery.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="bg-tile"
                    data-active={c?.headerBgImage === b.src}
                    onClick={() => setC({ headerType: 'image', headerBgImage: b.src })}
                    title={b.label}
                    aria-label={b.label}
                  >
                    <img src={b.src} alt="" loading="lazy" />
                    <span className="bg-tile-name">{b.label}</span>
                    {c?.headerBgImage === b.src && (
                      <span className="bg-tile-check" aria-hidden="true">
                        <CheckIcon />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {gallery.length === 0 && (
                <p className="bg-empty">No backgrounds match “{query}”.</p>
              )}

              <div className="bg-tint">
                <Slider
                  label="Image tint"
                  value={Math.round(headerTint * 100)}
                  min={10}
                  max={65}
                  step={1}
                  unit="%"
                  onChange={(v) => setC({ headerBgImageTint: v / 100 })}
                />
              </div>
            </div>
          )}
        </>
      )}

      {target === 'full' && (
        <>
          {/* -- Treatment selector -------------------------------------- */}
          <div className="mode-tabs" role="tablist" aria-label="Full page treatment">
            {FULL_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={mode === m.id}
                className="mode-tab"
                data-active={mode === m.id}
                onClick={() => setMode(m.id)}
              >
                <span className={`mode-preview mode-${m.id}`} aria-hidden="true" />
                <span className="mode-tab-label">{m.label}</span>
              </button>
            ))}
          </div>

          {/* -- Single: accent only, never the sheet --------------------- */}
          {mode === 'single' && (
            <div className="color-panel">
              <div className="color-panel-head">
                <p className="eyebrow">Accent color</p>
                <span className="color-panel-caption">{singleCaption}</span>
              </div>
              <div className="accent-grid" role="radiogroup" aria-label="Accent colour">
                <button
                  type="button"
                  className="accent-tile accent-default"
                  data-active={singleActive === 'default'}
                  aria-label="Template default accent"
                  title="Template default accent"
                  onClick={() => applyAccent(defaultAccent, 'default')}
                >
                  <span style={{ color: defaultAccent }}>A</span>
                </button>
                {SINGLE_ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="accent-tile"
                    style={{ background: a.value, color: contrastInk(a.value) }}
                    data-active={singleActive === a.id}
                    aria-label={a.label}
                    title={a.label}
                    onClick={() => applyAccent(a.value, a.id)}
                  >
                    {singleActive === a.id && <CheckIcon />}
                  </button>
                ))}
                <label
                  className="accent-tile accent-custom"
                  data-active={singleActive === 'custom'}
                  style={{ background: accent, color: contrastInk(accent) }}
                  title="Custom accent colour"
                >
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => applyAccent(e.target.value, 'custom')}
                    aria-label="Custom accent colour"
                  />
                  {singleActive === 'custom' ? <CheckIcon /> : <Plus />}
                </label>
              </div>

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
            </div>
          )}

          {/* -- Multi: preset schemes repaint the sheet ------------------ */}
          {mode === 'multi' && (
            <div className="color-panel">
              <div className="color-panel-head">
                <p className="eyebrow">Preset schemes</p>
                <span className="color-panel-caption">
                  {c?.multiPresetId === 'custom' ? 'Custom' : activeMulti.label}
                </span>
              </div>
              <div className="multi-grid">
                {MULTI_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="multi-tile"
                    data-active={c?.multiPresetId === p.id}
                    onClick={() => applyMulti(p)}
                    title={p.label}
                  >
                    <span className="multi-preview" style={{ background: p.background }}>
                      <span className="multi-aa" style={{ color: p.text }}>Aa</span>
                      <span className="multi-dot" style={{ background: p.accent }} />
                    </span>
                    <span className="multi-label">{p.label}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="preset-custom"
                data-active={c?.multiPresetId === 'custom'}
                onClick={openMultiCustom}
              >
                <Plus />
                Custom
              </button>

              {c?.multiPresetId === 'custom' && (
                <div className="color-rows">
                  <ColorRow
                    label="Text"
                    value={c?.textColor ?? '#0f172a'}
                    onChange={(v) => setMultiColor('text', v)}
                  />
                  <ColorRow
                    label="Background"
                    value={customBackground}
                    onChange={(v) => setMultiColor('background', v)}
                  />
                  <ColorRow
                    label="Accent"
                    value={accent}
                    onChange={(v) => setMultiColor('accent', v)}
                  />
                </div>
              )}

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
            </div>
          )}

          {/* -- Image: photo backdrop, white ink, soft dark tint --------- */}
          {mode === 'image' && (
            <div className="color-panel">
              <div className="color-panel-head">
                <p className="eyebrow">Background image</p>
                <span className="color-panel-caption">Text turns white</span>
              </div>

              {c?.bgImage && (
                <div className="bg-selected">
                  <span
                    className="bg-selected-thumb"
                    style={{ backgroundImage: `url(${JSON.stringify(c.bgImage)})` }}
                    aria-hidden="true"
                  />
                  <span className="bg-selected-text">
                    <span className="bg-selected-name">
                      {selectedGallery?.label ?? 'Uploaded image'}
                    </span>
                    <span className="bg-selected-hint">Covers the full sheet</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    aria-label="Remove background image"
                    title="Remove background image"
                    onClick={() => setC({ bgType: 'single', bgImage: undefined })}
                  >
                    <Trash />
                  </button>
                </div>
              )}

              <label
                className="bg-upload"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  void acceptFile(e.dataTransfer.files[0])
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    void acceptFile(e.target.files?.[0])
                    e.currentTarget.value = ''
                  }}
                />
                <Plus />
                <span className="bg-upload-title">{uploading ? 'Uploading…' : 'Upload image'}</span>
                <span className="bg-upload-hint">PNG, JPEG or WebP · up to 10 MB · or drop it here</span>
              </label>
              {uploadError && <p className="bg-upload-error">{uploadError}</p>}

              <input
                type="search"
                className="text-input bg-search"
                placeholder="Search backgrounds"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search backgrounds"
              />

              <div className="bg-gallery">
                {gallery.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="bg-tile"
                    data-active={c?.bgImage === b.src}
                    onClick={() => setC({ bgType: 'image', bgImage: b.src })}
                    title={b.label}
                    aria-label={b.label}
                  >
                    <img src={b.src} alt="" loading="lazy" />
                    <span className="bg-tile-name">{b.label}</span>
                    {c?.bgImage === b.src && (
                      <span className="bg-tile-check" aria-hidden="true">
                        <CheckIcon />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {gallery.length === 0 && (
                <p className="bg-empty">No backgrounds match “{query}”.</p>
              )}

              <div className="bg-tint">
                <Slider
                  label="Image tint"
                  value={Math.round(tint * 100)}
                  min={10}
                  max={65}
                  step={1}
                  unit="%"
                  onChange={(v) => setC({ bgImageTint: v / 100 })}
                />
              </div>
            </div>
          )}
        </>
      )}
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

/* -------------------------------------------------------------------------
   Template browsing
   The sidebar can't list nineteen designs without becoming a scroll tunnel,
   so it shows the current pick plus the two next in the catalogue and hands
   the full set to a gallery dialog.
   ---------------------------------------------------------------------- */

const BROWSE_FILTERS: (TemplateTag | 'all')[] = ['all', 'popular', 'simple', 'modern', 'creative']

const BROWSE_LABELS: Record<TemplateTag | 'all', string> = {
  all: 'All Templates',
  popular: 'Popular',
  simple: 'Simple',
  modern: 'Modern',
  professional: 'Professional',
  creative: 'Creative',
  photo: 'Photo',
  twocol: 'Two Column',
  executive: 'Executive',
  technical: 'Technical',
  academic: 'Academic',
}

/** The pane always shows the same three starting points -- one classic, one
    design-led, one original ATS -- so the row doesn't reshuffle itself just
    because a design was applied. Everything else lives behind Browse all. */
const SHORTLIST_IDS: TemplateId[] = ['classic-pro', 'portal-pro', 'ats-classic']

function TemplateShortlist({
  current,
  accent,
  onPick,
  onBrowse,
}: {
  current: TemplateId
  accent: string
  onPick: (id: TemplateId) => void
  onBrowse: () => void
}) {
  const picks = SHORTLIST_IDS.flatMap((id) => TEMPLATES.filter((t) => t.id === id))

  return (
    <div className="template-grid">
      {picks.map((template) => (
        <button
          className="template-card"
          key={template.id}
          data-active={current === template.id}
          onClick={() => onPick(template.id)}
        >
          <TemplateThumb id={template.id} accent={MINI_ACCENTS[template.id] ?? accent} />
          <span className="template-meta">
            <span className="template-name">{template.name}</span>
            <span className="tag" data-ats={template.atsSafe ? 'true' : 'false'}>
              {template.atsSafe ? 'ATS-safe' : 'Design-led'}
            </span>
          </span>
        </button>
      ))}

      {/* Fourth cell: the way out of the shortlist. */}
      <button type="button" className="template-card template-browse-tile" onClick={onBrowse}>
        <span className="template-browse-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="template-meta">
          <span className="template-name">Browse all</span>
          <span className="tag">{TEMPLATES.length} designs</span>
        </span>
      </button>
    </div>
  )
}

/** The full catalogue, rendered as real miniatures so a design is judged by
    the page it produces rather than by a schematic. */
function TemplateBrowser({
  current,
  onPick,
  onClose,
}: {
  current: TemplateId
  onPick: (id: TemplateId) => void
  onClose: () => void
}) {
  const [filter, setFilter] = useState<TemplateTag | 'all'>('all')

  // Escape closes the dialog, like every other overlay in the editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const visible = TEMPLATES.filter((t) => filter === 'all' || t.tags.includes(filter))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-label="Design templates"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2 className="modal-title">Design Templates</h2>
            <p className="hint">Update your entire resume design with one click.</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="tp-filters" role="tablist" aria-label="Template categories">
          {BROWSE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className="chip"
              data-active={filter === f}
              onClick={() => setFilter(f)}
            >
              {BROWSE_LABELS[f]}
            </button>
          ))}
        </div>

        <div className="modal-body tp-grid">
          {visible.map((t) => (
            <button
              key={t.id}
              type="button"
              className="tp-card"
              data-current={current === t.id}
              onClick={() => onPick(t.id)}
              aria-label={`Use ${t.name}`}
            >
              <div className="tp-card-thumb">
                <ResumeThumb doc={demoDocument(t.id)} />
              </div>
              <span className="tp-meta">
                <span className="tp-name">{t.name}</span>
                {current === t.id ? (
                  <span className="tp-current">Current</span>
                ) : (
                  <span className="tag tag-sm" data-ats={t.atsSafe ? 'true' : 'false'}>
                    {t.atsSafe ? 'ATS-safe' : 'Design-led'}
                  </span>
                )}
              </span>
            </button>
          ))}
          {visible.length === 0 && <p className="hint">Nothing in this category yet.</p>}
        </div>

        <div className="modal-foot tp-foot">
          <span className="hint">Click a design to apply it.</span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
