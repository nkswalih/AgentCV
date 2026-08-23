/** Small controlled inputs shared by the section forms. */

import type { ChangeEvent } from 'react'

import { looksLikeList, parseSkillList, type ParsedSkills } from '../skills'

interface TextProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'url'
}

export function Text({ label, value, onChange, placeholder, type = 'text' }: TextProps) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      <input
        className="input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      />
    </label>
  )
}

export function Area({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: TextProps & { rows?: number }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      <textarea
        className="textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function Check({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

/**
 * A one-of-N choice rendered as a joined row of buttons. Used where a select
 * would hide the options behind a click -- two to four short choices read
 * better all visible.
 */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="segmented" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            className="segmented-btn"
            data-active={option.value === value}
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        <span className="field-value">
          {value.toFixed(step < 1 ? 2 : 1).replace(/\.0+$/, '')}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

/**
 * A start/end pair with a "current" toggle. When current is on the end date is
 * hidden rather than disabled -- the field stops being a question at all.
 */
export function DateRange({
  start,
  end,
  current,
  onChange,
}: {
  start: string
  end: string
  current?: boolean
  onChange: (patch: Record<string, unknown>) => void
}) {
  return (
    <>
      <div className="two-col">
        <Text label="Start" value={start} placeholder="Jan 2023" onChange={(v) => onChange({ startDate: v })} />
        {!current && (
          <Text label="End" value={end} placeholder="Mar 2025" onChange={(v) => onChange({ endDate: v })} />
        )}
      </div>
      {current !== undefined && (
        <div className="field">
          <Check label="I currently work here" checked={current} onChange={(v) => onChange({ current: v })} />
        </div>
      )}
    </>
  )
}

/**
 * Editable list of achievement bullets. Enter at the end of a line adds the
 * next one, so writing several in a row never needs the mouse.
 */
export function Bullets({
  bullets,
  onChange,
}: {
  bullets: string[]
  onChange: (bullets: string[]) => void
}) {
  const set = (i: number, v: string) => onChange(bullets.map((b, j) => (j === i ? v : b)))

  return (
    <div className="field">
      <span className="field-label">
        Highlights
        <span className="field-value">{bullets.filter((b) => b.trim()).length}</span>
      </span>
      <div className="bullet-list">
        {bullets.map((b, i) => (
          <div className="bullet-row" key={i}>
            <span className="bullet-dot" aria-hidden="true" />
            <textarea
              className="textarea bullet-input"
              rows={2}
              value={b}
              placeholder="Cut deploy time 40% by…"
              onChange={(e) => set(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onChange([...bullets.slice(0, i + 1), '', ...bullets.slice(i + 1)])
                }
              }}
            />
            <button
              className="btn btn-ghost btn-icon"
              aria-label="Remove highlight"
              onClick={() => onChange(bullets.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="btn btn-sm" onClick={() => onChange([...bullets, ''])}>
        Add highlight
      </button>
    </div>
  )
}

/**
 * Comma-separated entry for skill lists. Typing "Python, Go, SQL" is far faster
 * than adding three rows, and the stored value is still a real array.
 */
export function TagInput({
  label,
  values,
  onChange,
  placeholder,
  onPasteList,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  /** Fired when a paste was split into a list, for the things this input cannot
      know about -- the group's category, the section's layout. */
  onPasteList?: (parsed: ParsedSkills) => void
}) {
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text')
    // A plain single-word paste is left to the browser; there is nothing to split.
    if (!looksLikeList(pasted)) return

    e.preventDefault()
    const el = e.currentTarget
    // Splice the paste in at the cursor before parsing, so pasting over a
    // selection replaces it and pasting at the end appends -- the same result
    // the browser would produce, just split up afterwards.
    const merged =
      el.value.slice(0, el.selectionStart ?? el.value.length) +
      pasted +
      el.value.slice(el.selectionEnd ?? el.value.length)

    const parsed = parseSkillList(merged)
    onChange(parsed.skills)
    onPasteList?.(parsed)
  }

  return (
    <label className="field">
      <span className="field-label">
        {label}
        <span className="field-value">{values.length}</span>
      </span>
      <input
        className="input"
        value={values.join(', ')}
        placeholder={placeholder}
        onPaste={handlePaste}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              // Trailing empty entry is kept out of the document, but the user
              // can still type the comma before the next word.
              .map((s) => s.trimStart())
              .filter((s, i, arr) => s !== '' || i === arr.length - 1),
          )
        }
      />
    </label>
  )
}
