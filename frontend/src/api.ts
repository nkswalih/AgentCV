import type { ExtractResult } from './importDoc'
import type { Resume, ResumeDocument, ResumeSummary, TemplateId } from './types'

// Same-origin: Vite proxies /api to the backend in dev, and the backend serves
// the built frontend in production.
const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    throw new Error((await readError(res)) ?? `Request failed (${res.status})`)
  }
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>)
}

/** FastAPI reports errors as {detail}, which may be a string or a list. */
async function readError(res: Response): Promise<string | null> {
  try {
    const { detail } = await res.json()
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d) => d.msg ?? String(d)).join('; ')
    return null
  } catch {
    return null
  }
}

export interface ExportOptions {
  paperSize?: 'A4' | 'Letter'
  compress?: boolean
}

export interface DownloadedFile {
  blob: Blob
  filename: string
}

export const api = {
  list: () => request<ResumeSummary[]>('/resumes'),

  get: (id: string) => request<Resume>(`/resumes/${id}`),

  create: (name?: string, template?: TemplateId) =>
    request<Resume>('/resumes', {
      method: 'POST',
      body: JSON.stringify({ name: name ?? 'Untitled Resume', template }),
    }),

  update: (id: string, patch: { name?: string; document?: ResumeDocument }) =>
    request<Resume>(`/resumes/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),

  duplicate: (id: string) => request<Resume>(`/resumes/${id}/duplicate`, { method: 'POST' }),

  remove: (id: string) => request<void>(`/resumes/${id}`, { method: 'DELETE' }),

  /**
   * Read an uploaded resume into editable content.
   *
   * The file is posted as-is and nothing is stored: the response is a draft
   * for review, and only the author's confirmation writes a resume.
   */
  async extractResume(file: File): Promise<ExtractResult> {
    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`${BASE}/import/extract`, { method: 'POST', body })
    if (!res.ok) {
      throw new Error((await readError(res)) ?? `Could not read that file (${res.status})`)
    }
    return (await res.json()) as ExtractResult
  },

  /** Upload a full-page resume backdrop. Returns the stored, same-origin URL. */
  async uploadBackground(file: File): Promise<string> {
    const body = new FormData()
    body.append('file', file)
    const res = await fetch(`${BASE}/uploads/background`, { method: 'POST', body })
    if (!res.ok) {
      throw new Error((await readError(res)) ?? `Upload failed (${res.status})`)
    }
    const { url } = (await res.json()) as { url: string }
    return url
  },

  /** POSTs an export request and returns the file without saving it. */
  async fetchExport(path: string, body: unknown, fallbackName: string): Promise<DownloadedFile> {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error((await readError(res)) ?? `Export failed (${res.status})`)
    }

    const blob = await res.blob()
    // The backend already derived a safe filename from the resume name.
    const match = res.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)
    return { blob, filename: match?.[1] ?? fallbackName }
  },

  /** POSTs an export request and saves the returned file to disk. */
  async download(path: string, body: unknown, fallbackName: string): Promise<void> {
    const file = await api.fetchExport(path, body, fallbackName)
    const url = URL.createObjectURL(file.blob)
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = file.filename
      a.click()
    } finally {
      URL.revokeObjectURL(url)
    }
  },

  exportPdf: (id: string, options: ExportOptions = {}) =>
    api.download(`/resumes/${id}/export/pdf`, options, 'resume.pdf'),

  exportPdfFile: (id: string, options: ExportOptions = {}) =>
    api.fetchExport(`/resumes/${id}/export/pdf`, options, 'resume.pdf'),

  exportDocx: (id: string, options: ExportOptions = {}) =>
    api.download(
      `/resumes/${id}/export/docx`,
      { paperSize: options.paperSize },
      'resume.docx',
    ),

  exportTex: (id: string, options: ExportOptions = {}) =>
    api.download(`/resumes/${id}/export/tex`, { paperSize: options.paperSize }, 'resume.tex'),
}
