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

/** The AgentCV mark: a white tile with a gradient document and folded corner. */
export const LogoMark = ({ size = 38 }: { size?: number }) => (
  <span className="logo-mark" style={{ width: size, height: size }} aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="agentcv-logo-gradient" x1="4" y1="3" x2="21" y2="20">
          <stop offset="0" stopColor="#f7529d" />
          <stop offset="0.55" stopColor="#fb5f7f" />
          <stop offset="1" stopColor="#ff8153" />
        </linearGradient>
      </defs>
      <path
        d="M7.4 3.6h6.9l4.3 4.3v11.1c0 1.1-.9 2-2 2H7.4c-1.1 0-2-.9-2-2V5.6c0-1.1.9-2 2-2Z"
        fill="url(#agentcv-logo-gradient)"
      />
      <path
        d="M14.1 3.9v3.8h3.9"
        stroke="#fff"
        strokeWidth="1.3"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <path
        d="M8.6 12.1h6.2M8.6 15.3h4.3"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.92"
      />
    </svg>
  </span>
)

/** Three vertical dots -- the tertiary actions menu on a resume card. */
export const Kebab = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <circle cx="8" cy="3.2" r="1.25" />
    <circle cx="8" cy="8" r="1.25" />
    <circle cx="8" cy="12.8" r="1.25" />
  </svg>
)

/** A soft person glyph for the account row. */
export const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <circle cx="8" cy="5.4" r="2.9" />
    <path d="M2.4 14c.5-2.9 2.8-4.6 5.6-4.6s5.1 1.7 5.6 4.6H2.4Z" />
  </svg>
)

export const ChevronDown = () => (
  <svg {...base} aria-hidden="true">
    <path d="m3.5 6 4.5 4.5L12.5 6" />
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
