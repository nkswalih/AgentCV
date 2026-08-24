/**
 * Icons drawn on the resume document itself (contact line, links).
 *
 * They are inline SVG rather than an icon font so they survive PDF export
 * unchanged, and they inherit `currentColor` so each template's contact colour
 * applies to them for free. Field icons are stroke-based; brand marks are the
 * standard fill paths.
 */

import type { ReactNode } from 'react'

export type DocIconName =
  | 'mail'
  | 'phone'
  | 'pin'
  | 'globe'
  | 'link'
  | 'linkedin'
  | 'github'
  | 'instagram'
  | 'x'
  | 'user'
  | 'briefcase'
  | 'gradcap'
  | 'gear'
  | 'folder'
  | 'award'
  | 'file'

const STROKE_ICONS: Partial<Record<DocIconName, ReactNode>> = {
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </>
  ),
  briefcase: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M2 13h20" />
    </>
  ),
  gradcap: (
    <>
      <path d="m22 9-10-5L2 9l10 5 10-5z" />
      <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  folder: (
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="m8.5 14-1.5 8 5-3 5 3-1.5-8" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  ),
  pin: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </>
  ),
}

const FILL_ICONS: Partial<Record<DocIconName, string>> = {
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  instagram:
    'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
}

/**
 * Solid silhouettes for the section-heading icons, so the heading "Filled"
 * style renders a true filled glyph instead of the outline drawing with a
 * colour poured into it. Each entry mirrors its STROKE_ICONS counterpart;
 * shapes with interior holes (gear teeth, globe meridians) rely on evenodd
 * fill so the hole stays transparent.
 */
const SECTION_ICON_FILLS: Partial<Record<DocIconName, ReactNode>> = {
  user: (
    <>
      <circle cx="12" cy="7.2" r="4.4" />
      <path d="M12 13.6c-4.6 0-8 2.7-8 6.9 0 .28.22.5.5.5h15a.5.5 0 0 0 .5-.5c0-4.2-3.4-6.9-8-6.9Z" />
    </>
  ),
  briefcase: (
    <>
      <path d="M10.2 3h3.6a1.7 1.7 0 0 1 1.7 1.7V7h-1.6V4.9a.3.3 0 0 0-.3-.3h-3.2a.3.3 0 0 0-.3.3V7H8.5V4.7A1.7 1.7 0 0 1 10.2 3Z" />
      <path d="M3.6 8.6A1.6 1.6 0 0 1 5.2 7h13.6a1.6 1.6 0 0 1 1.6 1.6v9.3a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6Z" />
    </>
  ),
  gradcap: (
    <>
      <path d="m11.05 3.9-8.4 3.73a.8.8 0 0 0 0 1.47l8.4 3.72c.31.14.66.14.97 0l8.4-3.72a.8.8 0 0 0 0-1.47l-8.4-3.73a1.27 1.27 0 0 0-1.02 0Z" />
      <path d="M5.6 11.6v3.55c0 1.86 2.86 3.35 6.4 3.35s6.4-1.49 6.4-3.35V11.6l-5.43 2.41a2.87 2.87 0 0 1-2.31 0L5.6 11.6Z" />
    </>
  ),
  gear: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M19.14 12.94c.04-.31.06-.62.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58a7.6 7.6 0 0 0 0 1.88l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54a7.03 7.03 0 0 0 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58ZM12 15.6A3.61 3.61 0 1 1 15.61 12 3.6 3.6 0 0 1 12 15.6Z"
    />
  ),
  folder: (
    <path d="M3.7 3.5h5.16c.53 0 1.04.21 1.41.59l1.32 1.32c.19.18.44.29.71.29h8A1.7 1.7 0 0 1 22 7.4v11.1a1.7 1.7 0 0 1-1.7 1.7H3.7A1.7 1.7 0 0 1 2 18.5V5.2a1.7 1.7 0 0 1 1.7-1.7Z" />
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6.2" />
      <path d="M8.06 13.9 6.75 22l5.25-3.15L17.25 22l-1.31-8.1a6.18 6.18 0 0 1-7.88 0Z" />
    </>
  ),
  globe: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm0 1.8c2.55 1.45 4.05 4.2 4.05 7.7S14.55 18.25 12 19.7C9.45 18.25 7.95 15.5 7.95 12S9.45 5.75 12 4.3Zm-9.2 6.8h18.4v1.8H2.8Z"
    />
  ),
  file: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M13.5 2.5H6.75A1.75 1.75 0 0 0 5 4.25v15.5A1.75 1.75 0 0 0 6.75 21.5h10.5a1.75 1.75 0 0 0 1.75-1.75V8L13.5 2.5Zm-.3 2.2 3.6 3.6h-3.6V4.7Z"
    />
  ),
}

export function DocIcon({
  name,
  className,
  variant,
}: {
  name: DocIconName
  className?: string
  /** 'fill' forces the solid silhouette, 'outline' the stroked drawing.
   *  Omitted (contact line, links): brands are solid by nature, everything
   *  else is stroked. */
  variant?: 'outline' | 'fill'
}) {
  const brandPath = FILL_ICONS[name]
  const sectionFill = variant === 'fill' ? SECTION_ICON_FILLS[name] : undefined
  const fillNode =
    sectionFill ?? (variant === 'outline' ? undefined : brandPath && <path d={brandPath} />)
  return (
    <svg
      className={className ?? 'doc-icon'}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={fillNode ? 'currentColor' : 'none'}
      stroke={fillNode ? 'none' : 'currentColor'}
      strokeWidth={fillNode ? undefined : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {fillNode ?? STROKE_ICONS[name]}
    </svg>
  )
}

/** Hostname of a URL the author typed bare or complete; '' when unparseable. */
function hostOf(url: string): string {
  try {
    const value = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

/** Brands the resume knows how to draw, matched by hostname. */
const BRANDS: { icon: DocIconName; name: string; match: RegExp }[] = [
  { icon: 'linkedin', name: 'LinkedIn', match: /(^|\.)linkedin\.[a-z.]+$/ },
  { icon: 'github', name: 'GitHub', match: /(^|\.)github\.[a-z.]+$/ },
  { icon: 'instagram', name: 'Instagram', match: /(^|\.)instagram\.[a-z.]+$/ },
  { icon: 'x', name: 'X', match: /(^|\.)(x|twitter)\.[a-z.]+$/ },
]

/**
 * The brand behind a link, from its label or its host -- "LinkedIn",
 * "github.com/ada", "https://www.x.com/…" all resolve. Null for anything else.
 */
export function linkBrand(label: string, url: string): { icon: DocIconName; name: string } | null {
  const host = hostOf(url)
  const named = BRANDS.find((b) => b.name.toLowerCase() === label.trim().toLowerCase())
  if (named) return { icon: named.icon, name: named.name }
  const hosted = BRANDS.find((b) => b.match.test(host))
  return hosted ? { icon: hosted.icon, name: hosted.name } : null
}

/** Pick a brand icon for a link from its label or URL; anything else is generic. */
export function iconForLink(label: string, url: string): DocIconName {
  return linkBrand(label, url)?.icon ?? 'link'
}

/** Label a pasted URL suggests ("linkedin.com/in/you" -> "LinkedIn"), if any. */
export function suggestLinkLabel(url: string): string | null {
  const host = hostOf(url)
  return BRANDS.find((b) => b.match.test(host))?.name ?? null
}

/** Whether a label was auto-filled by suggestion, and so may be re-filled. */
export function isKnownLinkLabel(label: string): boolean {
  return BRANDS.some((b) => b.name.toLowerCase() === label.trim().toLowerCase())
}

/** Icon mapping for section headings. */
export const SECTION_ICONS: Record<string, DocIconName> = {
  summary: 'user',
  experience: 'briefcase',
  education: 'gradcap',
  skills: 'gear',
  projects: 'folder',
  certifications: 'award',
  languages: 'globe',
  custom: 'file',
}
