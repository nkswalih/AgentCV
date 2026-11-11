import type { Settings, TemplateId } from './types'

export interface CustomTemplate {
  id: string
  name: string
  baseTemplate: TemplateId
  /** Snapshot of visual/layout settings only — content is never stored. */
  settings: Pick<
    Settings,
    | 'fontFamily'
    | 'nameFont'
    | 'titleFont'
    | 'accentColor'
    | 'fontSize'
    | 'lineHeight'
    | 'sectionSpacing'
    | 'marginX'
    | 'marginY'
    | 'columnLayout'
    | 'headerPosition'
    | 'columnWidth'
    | 'showPhoto'
    | 'showIcons'
    | 'nameSize'
    | 'titleSize'
    | 'headingSize'
    | 'entrySize'
    | 'contactSize'
    | 'photoLayout'
    | 'headingStyle'
    | 'headerStyle'
    | 'linkStyle'
    | 'colors'
  >
  createdAt: number
}

const STORAGE_KEY = 'agentcv-custom-templates'
export const MAX_CUSTOM_TEMPLATES = 20

export function loadCustomTemplates(): CustomTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCustomTemplate(
  name: string,
  settings: Settings,
): CustomTemplate | null {
  const existing = loadCustomTemplates()
  if (existing.length >= MAX_CUSTOM_TEMPLATES) return null

  const tpl: CustomTemplate = {
    id: `custom-${crypto.randomUUID().slice(0, 8)}`,
    name: name.trim(),
    baseTemplate: settings.template,
    settings: {
      fontFamily: settings.fontFamily,
      nameFont: settings.nameFont,
      titleFont: settings.titleFont,
      accentColor: settings.accentColor,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      sectionSpacing: settings.sectionSpacing,
      marginX: settings.marginX,
      marginY: settings.marginY,
      columnLayout: settings.columnLayout,
      headerPosition: settings.headerPosition,
      columnWidth: settings.columnWidth,
      showPhoto: settings.showPhoto,
      showIcons: settings.showIcons,
      nameSize: settings.nameSize,
      titleSize: settings.titleSize,
      headingSize: settings.headingSize,
      entrySize: settings.entrySize,
      contactSize: settings.contactSize,
      photoLayout: { ...settings.photoLayout },
      headingStyle: { ...settings.headingStyle },
      headerStyle: settings.headerStyle ? { ...settings.headerStyle } : undefined,
      linkStyle: settings.linkStyle ? { ...settings.linkStyle } : undefined,
      colors: settings.colors ? { ...settings.colors } : undefined,
    },
    createdAt: Date.now(),
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, tpl]))
  return tpl
}

export function removeCustomTemplate(id: string): void {
  const all = loadCustomTemplates().filter((t) => t.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

/** Build a full Settings patch from a custom template's snapshot. */
export function applyCustomTemplate(
  tpl: CustomTemplate,
  currentSections: { id: string }[],
): Partial<Settings> {
  const patch: Partial<Settings> = {
    template: tpl.baseTemplate,
    ...tpl.settings,
  }

  if (tpl.settings.columnLayout === 'two') {
    const all = currentSections.map((s) => s.id)
    const mid = Math.ceil(all.length / 2)
    patch.leftColumn = all.slice(0, mid)
    patch.rightColumn = all.slice(mid)
  } else {
    patch.leftColumn = []
    patch.rightColumn = []
  }

  return patch
}
