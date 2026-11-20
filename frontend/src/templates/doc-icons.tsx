/**
 * Icons drawn on the resume document itself (contact line, links).
 *
 * They are inline SVG rather than an icon font so they survive PDF export
 * unchanged, and they inherit `currentColor` so each template's contact colour
 * applies to them for free. Field icons are stroke-based; brand marks are the
 * standard fill paths.
 */

import type { ReactNode } from 'react'
import { BRAND_LABELS, BRAND_PATHS, type BrandIconName } from './brand-icons'

export type DocIconName =
  | 'mail'
  | 'phone'
  | 'pin'
  | 'globe'
  | 'link'
  | 'user'
  | 'briefcase'
  | 'gradcap'
  | 'gear'
  | 'folder'
  | 'award'
  | 'file'
  | BrandIconName

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

/**
 * Solid field glyphs for the contact line. The old strokes read as thin
 * outlines at print size; these silhouettes carry the same optical weight as
 * the brand marks beside them, so a row of contact entries is one texture.
 * The envelope and pin keep their interior cut-outs by winding/evenodd.
 */
const CONTACT_SOLID: Partial<Record<DocIconName, ReactNode>> = {
  mail: (
    <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z" />
  ),
  phone: (
    <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.57 1 1 0 0 1-.25 1.02Z" />
  ),
  pin: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"
    />
  ),
  globe: (
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm0 1.8c2.55 1.45 4.05 4.2 4.05 7.7S14.55 18.25 12 19.7C9.45 18.25 7.95 15.5 7.95 12S9.45 5.75 12 4.3Zm-9.2 6.8h18.4v1.8H2.8Z"
    />
  ),
  link: (
    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1ZM8 13h8v-2H8v2Zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4a5 5 0 0 0 0-10Z" />
  ),
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
   *  Omitted (contact line, links): brands and field glyphs are solid by
   *  nature, everything else is stroked. */
  variant?: 'outline' | 'fill'
}) {
  // A brand mark or a contact glyph is solid; asking for the section-icon
  // fill swaps in the heading silhouette; asking for outline falls back to
  // the stroked drawing used by the editor's style buttons.
  const solid: ReactNode =
    variant === 'outline'
      ? undefined
      : (variant === 'fill' ? SECTION_ICON_FILLS[name] : undefined) ??
        CONTACT_SOLID[name] ??
        (name in BRAND_PATHS ? <path d={BRAND_PATHS[name as BrandIconName]} /> : undefined)
  return (
    <svg
      className={className ?? 'doc-icon'}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={solid ? 'currentColor' : 'none'}
      stroke={solid ? 'none' : 'currentColor'}
      strokeWidth={solid ? undefined : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {solid ?? STROKE_ICONS[name]}
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

/** Sites the resume knows how to draw. Hosts are matched with the leading
 *  `www.` removed, so bare domains and deep links both resolve. */
interface BrandSite {
  icon: BrandIconName
  hosts: RegExp
  aliases?: string[]
}

/**
 * Brand marks a pasted link can resolve to. The list covers the places people
 * put a portfolio-link on a resume -- social profiles, code hosts, writing
 * platforms, design portfolios and competitive-programming judges. Anything
 * not listed keeps the generic link glyph.
 */
const BRAND_SITES: BrandSite[] = [
  { icon: 'linkedin', hosts: /(^|\.)linkedin\.[a-z.]+$/, aliases: ['ln'] },
  { icon: 'github', hosts: /(^|\.)github\.[a-z.]+$/, aliases: ['gh'] },
  { icon: 'youtube', hosts: /(^|\.)(youtube\.[a-z.]+|youtu\.be)$/, aliases: ['yt'] },
  { icon: 'behance', hosts: /(^|\.)behance\.[a-z.]+$/ },
  { icon: 'instagram', hosts: /(^|\.)instagram\.[a-z.]+$/, aliases: ['ig'] },
  { icon: 'x', hosts: /(^|\.)(x\.com|twitter\.com)$/, aliases: ['twitter'] },
  { icon: 'dribbble', hosts: /(^|\.)dribbble\.[a-z.]+$/ },
  { icon: 'medium', hosts: /(^|\.)medium\.[a-z.]+$/ },
  {
    icon: 'stackoverflow',
    hosts: /(^|\.)stackoverflow\.[a-z.]+$/,
    aliases: ['stack overflow', 'so'],
  },
  { icon: 'gitlab', hosts: /(^|\.)gitlab\.[a-z.]+$/ },
  { icon: 'bitbucket', hosts: /(^|\.)bitbucket\.[a-z.]+$/, aliases: ['bit bucket'] },
  { icon: 'facebook', hosts: /(^|\.)(facebook\.[a-z.]+|fb\.com)$/, aliases: ['fb'] },
  { icon: 'telegram', hosts: /(^|\.)(t\.me|telegram\.[a-z.]+)$/, aliases: ['tg'] },
  { icon: 'whatsapp', hosts: /(^|\.)(wa\.me|whatsapp\.[a-z.]+)$/, aliases: ['wa'] },
  { icon: 'threads', hosts: /(^|\.)threads\.(net|com)$/ },
  { icon: 'tiktok', hosts: /(^|\.)tiktok\.[a-z.]+$/, aliases: ['tik tok'] },
  { icon: 'discord', hosts: /(^|\.)(discord\.[a-z.]+|discord\.gg)$/ },
  { icon: 'codepen', hosts: /(^|\.)codepen\.[a-z.]+$/, aliases: ['code pen'] },
  { icon: 'figma', hosts: /(^|\.)figma\.[a-z.]+$/ },
  { icon: 'kaggle', hosts: /(^|\.)kaggle\.[a-z.]+$/ },
  { icon: 'leetcode', hosts: /(^|\.)leetcode\.(com|cn)$/, aliases: ['leet code'] },
  { icon: 'hackerrank', hosts: /(^|\.)hackerrank\.[a-z.]+$/, aliases: ['hacker rank'] },
  { icon: 'devdotto', hosts: /(^|\.)dev\.to$/, aliases: ['devto', 'dev.to', 'dev'] },
  { icon: 'npm', hosts: /(^|\.)(npmjs\.(com|org)|npm\.im)$/ },
  { icon: 'codeforces', hosts: /(^|\.)codeforces\.(com|org)$/, aliases: ['code forces'] },
  { icon: 'codechef', hosts: /(^|\.)codechef\.[a-z.]+$/, aliases: ['code chef'] },
  { icon: 'hackerearth', hosts: /(^|\.)hackerearth\.[a-z.]+$/, aliases: ['hacker earth'] },
  { icon: 'replit', hosts: /(^|\.)replit\.(com|app)$/ },
  { icon: 'vercel', hosts: /(^|\.)vercel\.(app|com)$/ },
  { icon: 'netlify', hosts: /(^|\.)netlify\.(app|com)$/ },
  { icon: 'substack', hosts: /(^|\.)substack\.com$/ },
  { icon: 'reddit', hosts: /(^|\.)reddit\.[a-z.]+$/ },
  { icon: 'bluesky', hosts: /(^|\.)(bsky\.app|bsky\.social)$/, aliases: ['bsky'] },
  {
    icon: 'mastodon',
    hosts: /(^|\.)(mastodon\.[a-z.]+|mstdn\.[a-z.]+|fosstodon\.org)$/,
  },
  { icon: 'pinterest', hosts: /(^|\.)pinterest\.[a-z.]+$/ },
  { icon: 'twitch', hosts: /(^|\.)twitch\.tv$/ },
  { icon: 'soundcloud', hosts: /(^|\.)soundcloud\.[a-z.]+$/, aliases: ['sound cloud'] },
  { icon: 'spotify', hosts: /(^|\.)spotify\.com$/ },
  {
    icon: 'googlescholar',
    hosts: /(^|\.)scholar\.google\.[a-z.]+$/,
    aliases: ['scholar', 'google scholar', 'scholar google'],
  },
  { icon: 'orcid', hosts: /(^|\.)orcid\.org$/ },
  { icon: 'researchgate', hosts: /(^|\.)researchgate\.net$/, aliases: ['research gate'] },
  { icon: 'upwork', hosts: /(^|\.)upwork\.[a-z.]+$/ },
  { icon: 'fiverr', hosts: /(^|\.)fiverr\.[a-z.]+$/ },
]

function brandFor(icon: BrandIconName): { icon: DocIconName; name: string } {
  return { icon, name: BRAND_LABELS[icon] }
}

/** Whether a label names a site in the catalogue (canonical name or alias). */
function labelMatches(label: string, site: BrandSite): boolean {
  const value = label.trim().toLowerCase()
  if (!value) return false
  if (BRAND_LABELS[site.icon].toLowerCase() === value) return true
  return (site.aliases ?? []).some((alias) => alias === value)
}

/**
 * The brand behind a link, from its label or its host -- "LinkedIn",
 * "github.com/ada", "https://www.x.com/…" all resolve. Null for anything else.
 */
export function linkBrand(label: string, url: string): { icon: DocIconName; name: string } | null {
  const named = BRAND_SITES.find((site) => labelMatches(label, site))
  if (named) return brandFor(named.icon)
  const host = hostOf(url)
  if (!host) return null
  const hosted = BRAND_SITES.find((site) => site.hosts.test(host))
  return hosted ? brandFor(hosted.icon) : null
}

/** Pick a brand icon for a link from its label or URL; anything else is generic. */
export function iconForLink(label: string, url: string): DocIconName {
  return linkBrand(label, url)?.icon ?? 'link'
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
