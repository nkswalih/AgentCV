import type { Resume, ResumeDocument, ResumeSummary } from './types'

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

export const api = {
  list: () => request<ResumeSummary[]>('/resumes'),

  get: (id: string) => request<Resume>(`/resumes/${id}`),

  create: (name?: string) =>
    request<Resume>('/resumes', {
      method: 'POST',
      body: JSON.stringify({ name: name ?? 'Untitled Resume' }),
    }),

  update: (id: string, patch: { name?: string; document?: ResumeDocument }) =>
    request<Resume>(`/resumes/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),

  duplicate: (id: string) => request<Resume>(`/resumes/${id}/duplicate`, { method: 'POST' }),

  remove: (id: string) => request<void>(`/resumes/${id}`, { method: 'DELETE' }),

  /** Asks the backend to print the resume, then saves the returned PDF. */
  async exportPdf(id: string): Promise<void> {
    const res = await fetch(`${BASE}/resumes/${id}/export/pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!res.ok) {
      throw new Error((await readError(res)) ?? `Export failed (${res.status})`)
    }

    const blob = await res.blob()
    // The backend already derived a safe filename from the resume name.
    const match = res.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)
    const url = URL.createObjectURL(blob)
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = match?.[1] ?? 'resume.pdf'
      a.click()
    } finally {
      URL.revokeObjectURL(url)
    }
  },
}
