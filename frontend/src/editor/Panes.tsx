import { useRef, useState } from 'react'

import { useEditor } from '../store'
import { newId } from '../factories'
import {
  FONT_CHOICES,
  FONT_GROUP_LABELS,
  FONT_GROUPS,
  PHOTO_TEMPLATES,
  TEMPLATES,
} from '../templates/registry'
import { isKnownLinkLabel, suggestLinkLabel } from '../templates/doc-icons'
import { Check, Slider, Text } from './fields'
import { SectionCard, useDragSensors, DRAG_MODIFIERS } from './SectionCard'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Link, SectionType, TemplateId } from '../types'
import { Plus } from './icons'

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

export function LeftPane() {
  const { doc, addSection, moveSection } = useEditor()
  const sensors = useDragSensors()
  if (!doc) return null

  const currentDoc = doc

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const from = currentDoc.sections.findIndex((s) => s.id === e.active.id)
    const to = currentDoc.sections.findIndex((s) => s.id === e.over!.id)
    if (from !== -1 && to !== -1) moveSection(from, to)
  }

  return (
    <aside className="pane pane-left">
      <div className="pane-head">
        <p className="eyebrow">Document structure</p>
      </div>
      <div className="pane-body">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={DRAG_MODIFIERS}
          onDragEnd={onDragEnd}
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

        <div className="add-section-block">
          <p className="eyebrow">Add section</p>
          <div className="add-menu">
            {ADDABLE.map((type) => (
              <button key={type} className="btn btn-sm" onClick={() => addSection(type)}>
                <Plus />
                {type === 'custom' ? 'Custom' : type[0].toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

function PhotoField() {
  const { doc, updateBasics, updateSettings } = useEditor()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      updateSettings({ showPhoto: true })
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
          <button className="btn btn-sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? 'Uploading…' : doc.basics.photoUrl ? 'Replace photo' : 'Upload photo'}
          </button>
          <p className="hint">PNG, JPEG, or WebP · 5MB max</p>
        </div>
      </div>
      {error && <p className="upload-error">{error}</p>}
      {doc.basics.photoUrl && (
        <Check
          label="Show on resume"
          checked={doc.settings.showPhoto}
          onChange={(showPhoto) => updateSettings({ showPhoto })}
        />
      )}
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

/** Per-template default sizes the individual controls return to when unset. */
const SIZE_FALLBACKS: Record<TemplateId, { name: number; title: number; heading: number }> = {
  'ats-classic': { name: 21, title: 11, heading: 11 },
  'ats-modern': { name: 23, title: 11, heading: 10 },
  compact: { name: 18, title: 10, heading: 9.5 },
  sidebar: { name: 19, title: 10, heading: 11 },
  banner: { name: 21, title: 10.5, heading: 10.5 },
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
  if (!doc) return null
  const hasPhoto = PHOTO_TEMPLATES.has(doc.settings.template)

  return (
    <aside className="pane pane-right">
      <div className="pane-head">
        <p className="eyebrow">Type & appearance</p>
      </div>
      <div className="pane-body">
        <section className="style-section">
          <p className="eyebrow style-section-title">Identity</p>
          <PhotoField />
          {!hasPhoto && doc.basics.photoUrl && (
            <p className="hint">Choose Sidebar or Banner to place the photo on the page.</p>
          )}
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
                onClick={() => updateSettings({ template: template.id })}
              >
                <TemplateThumb id={template.id} accent={doc.settings.accentColor} />
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
        </section>

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

        <section className="style-section">
          <p className="eyebrow style-section-title">Ink & page</p>
          <span className="field-label" style={{ marginBottom: 7 }}>
            Accent colour
          </span>
          <div className="swatches">
            {['#2563eb', '#0f766e', '#7c3aed', '#b91c1c', '#c2410c', '#1e293b'].map((color) => (
              <button
                className="swatch"
                key={color}
                style={{ background: color }}
                data-active={doc.settings.accentColor === color}
                aria-label={`Use ${color} accent`}
                onClick={() => updateSettings({ accentColor: color })}
              />
            ))}
          </div>
          <label className="field" style={{ marginTop: 12 }}>
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

function TemplateThumb({ id, accent }: { id: string; accent: string }) {
  // The template id travels on a data attribute, never as a class. As a class
  // it collided with the inner parts' own names: `mini-banner` matched both this
  // container and the strip inside it, and the strip's `position: absolute` won
  // on source order -- which tore the thumbnail out of its card and stretched it
  // across the top of the app, over the topbar.
  return (
    <span className="template-mini" data-tpl={id} aria-hidden="true" style={{ '--mini-accent': accent } as React.CSSProperties}>
      {id === 'sidebar' && <span className="mini-rail" />}
      {id === 'banner' && <span className="mini-banner" />}
      <span className="mini-name" />
      <span className="mini-rule" />
      <span className="mini-lines" />
      <span className="mini-lines short" />
    </span>
  )
}
