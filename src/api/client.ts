// API base URL resolved from Electron backend port
let _baseUrl: string | null = null

export async function getBaseUrl(): Promise<string> {
  if (_baseUrl) return _baseUrl
  try {
    const port = await window.electronAPI?.getBackendPort()
    _baseUrl = `http://127.0.0.1:${port ?? 8000}`
  } catch {
    _baseUrl = 'http://127.0.0.1:8000'
  }
  return _baseUrl
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = await getBaseUrl()
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'API error')
  }
  return res.json()
}

// ── Compartments ──────────────────────────────────────────────────────
import type { Compartment } from '../types/models'

export const compartmentsApi = {
  list: () => apiFetch<Compartment[]>('/api/compartments/'),
  get: (id: string) => apiFetch<Compartment>(`/api/compartments/${id}`),
  create: (data: Partial<Compartment>) =>
    apiFetch<Compartment>('/api/compartments/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Compartment>) =>
    apiFetch<Compartment>(`/api/compartments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ deleted: boolean }>(`/api/compartments/${id}`, { method: 'DELETE' }),
}

// ── Documents ─────────────────────────────────────────────────────────
import type { Document } from '../types/models'

export const documentsApi = {
  list: (compartmentId: string) =>
    apiFetch<Document[]>(`/api/documents/?compartment_id=${compartmentId}`),
  uploadPdf: async (compartmentId: string, file: File, apiKey: string): Promise<Document> => {
    const base = await getBaseUrl()
    const form = new FormData()
    form.append('compartment_id', compartmentId)
    form.append('api_key', apiKey)
    form.append('file', file)
    const res = await fetch(`${base}/api/documents/upload`, { method: 'POST', body: form })
    if (!res.ok) throw new Error('Upload failed')
    return res.json()
  },
  uploadScan: async (compartmentId: string, file: File, apiKey: string): Promise<Document> => {
    const base = await getBaseUrl()
    const form = new FormData()
    form.append('compartment_id', compartmentId)
    form.append('api_key', apiKey)
    form.append('file', file)
    const res = await fetch(`${base}/api/documents/scan`, { method: 'POST', body: form })
    if (!res.ok) throw new Error('Scan upload failed')
    return res.json()
  },
  delete: (id: string) =>
    apiFetch<{ deleted: boolean }>(`/api/documents/${id}`, { method: 'DELETE' }),
}

// ── Chat ─────────────────────────────────────────────────────────────
import type { SourceChunk } from '../types/models'

export const chatApi = {
  send: (compartmentId: string, content: string, apiKey: string) =>
    apiFetch<{ answer: string; sources: SourceChunk[] }>('/api/chat/', {
      method: 'POST',
      body: JSON.stringify({ compartment_id: compartmentId, content, api_key: apiKey }),
    }),
}

// ── Quiz ─────────────────────────────────────────────────────────────
import type { QuizSession, QuizResult } from '../types/models'

export const quizApi = {
  generate: (compartmentId: string, nQuestions: number, quizType: string, apiKey: string) =>
    apiFetch<QuizSession>('/api/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({
        compartment_id: compartmentId,
        n_questions: nQuestions,
        quiz_type: quizType,
        api_key: apiKey,
      }),
    }),
  submit: (sessionId: string, answers: { question_index: number; user_answer: string }[], apiKey: string) =>
    apiFetch<QuizResult>('/api/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, answers, api_key: apiKey }),
    }),
}

// ── Exam ─────────────────────────────────────────────────────────────
import type { Exam } from '../types/models'

export const examApi = {
  generate: (compartmentId: string, apiKey: string) =>
    apiFetch<Exam>('/api/exam/generate', {
      method: 'POST',
      body: JSON.stringify({ compartment_id: compartmentId, api_key: apiKey }),
    }),
}

// ── Contradictions ────────────────────────────────────────────────────
import type { Contradiction } from '../types/models'

export const contradictionsApi = {
  list: (compartmentId: string) =>
    apiFetch<Contradiction[]>(`/api/contradictions/${compartmentId}`),
  markRead: (id: string) =>
    apiFetch<{ marked_read: boolean }>(`/api/contradictions/${id}/read`, { method: 'POST' }),
}

// ── LLM ──────────────────────────────────────────────────────────────
export const llmApi = {
  detectProvider: (apiKey: string) =>
    apiFetch<{ provider: string; model: string; label: string }>('/api/llm/detect-provider', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    }),
}
