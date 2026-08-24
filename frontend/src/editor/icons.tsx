/** Inline icons. Stroke-based and sized by font, so they sit on the text baseline. */

const base = {
  width: 14,
  height: 14,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const Grip = () => (
  <svg {...base} aria-hidden="true">
    <circle cx="6" cy="4" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="10" cy="4" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="6" cy="8" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="10" cy="8" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="6" cy="12" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="10" cy="12" r="0.9" fill="currentColor" stroke="none" />
  </svg>
)

export const Eye = () => (
  <svg {...base} aria-hidden="true">
    <path d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4S1.5 8 1.5 8Z" />
    <circle cx="8" cy="8" r="1.7" />
  </svg>
)

export const EyeOff = () => (
  <svg {...base} aria-hidden="true">
    <path d="M6.3 4.3A6.9 6.9 0 0 1 8 4c4.1 0 6.5 4 6.5 4a11 11 0 0 1-1.9 2.3M3.6 5.7A11.4 11.4 0 0 0 1.5 8s2.4 4 6.5 4c.6 0 1.2-.1 1.7-.2" />
    <path d="M2 2l12 12" />
  </svg>
)

export const Chevron = ({ open }: { open: boolean }) => (
  <svg
    {...base}
    aria-hidden="true"
    style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 140ms' }}
  >
    <path d="M6 3.5 10.5 8 6 12.5" />
  </svg>
)

export const Trash = () => (
  <svg {...base} aria-hidden="true">
    <path d="M2.5 4.5h11M6 4.5V3a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1.5M4 4.5l.6 8a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8" />
  </svg>
)

export const Plus = () => (
  <svg {...base} aria-hidden="true">
    <path d="M8 3.5v9M3.5 8h9" />
  </svg>
)

/* -- Home navigation -- */

export const FileIcon = () => (
  <svg {...base} aria-hidden="true">
    <path d="M9.5 1.5H4a.8.8 0 0 0-.8.8v11.4a.8.8 0 0 0 .8.8h8a.8.8 0 0 0 .8-.8V4.8L9.5 1.5Z" />
    <path d="M9.5 1.5v3.3h3.3M5.5 8h5M5.5 10.5h5M5.5 5.5H7" />
  </svg>
)

export const MailIcon = () => (
  <svg {...base} aria-hidden="true">
    <rect x="1.8" y="3.2" width="12.4" height="9.6" rx="1" />
    <path d="m2.2 4.2 5.8 4.3 5.8-4.3" />
  </svg>
)

export const BriefcaseIcon = () => (
  <svg {...base} aria-hidden="true">
    <rect x="1.8" y="4.8" width="12.4" height="8.7" rx="1" />
    <path d="M5.5 4.8V3.4a.9.9 0 0 1 .9-.9h3.2a.9.9 0 0 1 .9.9v1.4M1.8 8.2h12.4M7.2 8.2v1.4h1.6V8.2" />
  </svg>
)
