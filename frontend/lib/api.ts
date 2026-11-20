/**
 * API client for Vidhived.ai backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// ── Types ───────────────────────────────────────────────────────────

export interface Clause {
  id: string
  text: string
  page_number: number
  score: number
  category: 'Red' | 'Yellow' | 'Green'
  type: string
  explanation: string
  summary: string
  entities: { text: string; type: string }[]
  legal_terms: { term: string; definition: string }[]
  bounding_box?: {
    vertices: { x: number; y: number }[]
  }
  ocr_page_width?: number
  ocr_page_height?: number
}

export interface DocumentAnalysis {
  documentId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message?: string
  filename?: string
  fullText?: string
  analysis?: Clause[]
  documentSummary?: string
  fullAnalysis?: string
  pageCount?: number
  fileSize?: number
}

export interface UploadResult {
  documentId: string
  pdfUrl: string
  message: string
}

export interface AskResult {
  answer: string
  documentId: string
  hasAI: boolean
}

export interface TTSResult {
  audio: string  // base64
  format: string
  language: string
}

export interface TTSStatus {
  available: boolean
  provider: string | null
}

// ── Request helper ──────────────────────────────────────────────────

/**
 * Every failed request throws an ApiError, so the UI can tell the cases apart:
 *   kind 'http'     the server answered with an error status (status/code are set)
 *   kind 'timeout'  no answer within the time limit (for example a sleeping server)
 *   kind 'network'  the request never reached the server
 */
export class ApiError extends Error {
  kind: 'http' | 'timeout' | 'network'
  status?: number
  code?: string

  constructor(kind: ApiError['kind'], message: string, details: { status?: number; code?: string } = {}) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = details.status
    this.code = details.code
  }
}

export interface RequestOptions {
  /** Lets the caller cancel the request (for example when a page unmounts). */
  signal?: AbortSignal
  /** Give up after this many milliseconds. */
  timeoutMs?: number
}

interface InternalOptions extends RequestOptions {
  method?: string
  body?: BodyInit
  json?: unknown
  /** Used when the server gives no readable error message. */
  fallback: string
  /** Set to false for calls whose success response has no body we need. */
  parse?: boolean
}

const DEFAULT_TIMEOUT_MS = 30_000

async function readJson(response: Response): Promise<any | null> {
  try {
    return await response.json()
  } catch {
    return null // not JSON (for example an HTML error page from the host)
  }
}

async function request<T>(path: string, options: InternalOptions): Promise<T> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS, method = 'GET', body, json, fallback, parse = true } = options

  // One controller covers both reasons to stop: our timeout and the caller's signal.
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const forwardAbort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  else signal?.addEventListener('abort', forwardAbort)

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: json !== undefined ? JSON.stringify(json) : body,
      signal: controller.signal,
    })

    // Check the status first. Only then decide how to read the body.
    if (!response.ok) {
      const errorBody = await readJson(response)
      const gatewayError = response.status === 502 || response.status === 503 || response.status === 504
      const message =
        errorBody?.error ||
        (gatewayError
          ? 'The server is not ready yet. It may still be waking up. Please try again in a moment.'
          : `${fallback} (the server returned ${response.status}).`)
      throw new ApiError('http', message, { status: response.status, code: errorBody?.code })
    }

    if (!parse) return undefined as T

    const data = await readJson(response)
    if (data === null) {
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
      throw new ApiError('http', `${fallback} (the server sent a response this app could not read).`, { status: response.status })
    }
    return data as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (timedOut) {
      throw new ApiError('timeout', 'The server took too long to respond. It may still be waking up. Please try again.')
    }
    if (signal?.aborted) throw err // cancelled on purpose by the caller, not a failure
    throw new ApiError('network', 'Could not reach the server. Check your connection and try again.')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}

/** True when the error only means "the caller cancelled this request". */
export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

// ── API Functions ───────────────────────────────────────────────────

export async function uploadPDF(file: File, options: RequestOptions = {}): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)

  // Uploads get a long limit: up to 20 MB, possibly to a server that is still waking up.
  return request<UploadResult>('/upload', {
    method: 'POST',
    body: formData,
    fallback: 'Upload failed',
    timeoutMs: 120_000,
    ...options,
  })
}

export async function getDocumentStatus(documentId: string, options: RequestOptions = {}): Promise<DocumentAnalysis> {
  return request<DocumentAnalysis>(`/document/${encodeURIComponent(documentId)}`, {
    fallback: 'Failed to fetch document',
    ...options,
  })
}

export function getPDFUrl(documentId: string): string {
  return `${API_URL}/pdf/${encodeURIComponent(documentId)}`
}

export async function askQuestion(documentId: string, query: string, options: RequestOptions = {}): Promise<AskResult> {
  return request<AskResult>('/ask', {
    method: 'POST',
    json: { documentId, query },
    fallback: 'Failed to get an answer',
    timeoutMs: 60_000,
    ...options,
  })
}

export async function textToSpeech(text: string, language: string = 'en-IN', options: RequestOptions = {}): Promise<TTSResult> {
  return request<TTSResult>('/tts', {
    method: 'POST',
    json: { text, language },
    fallback: 'Voice generation failed',
    timeoutMs: 60_000,
    ...options,
  })
}

/** Asks the backend whether text-to-speech is configured. Returns null if that could not be checked. */
export async function getTTSStatus(): Promise<TTSStatus | null> {
  try {
    return await request<TTSStatus>('/tts/status', { fallback: 'Failed to check voice status', timeoutMs: 15_000 })
  } catch {
    return null
  }
}

// ── Notebook Types ──────────────────────────────────────────────────

export interface Notebook {
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt: string
  noteCount: number
  notes?: NoteItem[]
}

export interface NoteItem {
  id: string
  title: string
  content: string
  noteType: 'text' | 'pdf'
  sourceFilename: string
  wordCount: number
  createdAt: string
  updatedAt: string
}

export interface NotebookAskResult {
  answer: string
  sources: { id: string; title: string }[]
  hasAI: boolean
  notebookId: string
}

// ── Notebook API Functions ──────────────────────────────────────────

export async function createNotebook(title: string, description: string = ''): Promise<Notebook> {
  return request<Notebook>('/notebooks', { method: 'POST', json: { title, description }, fallback: 'Failed to create notebook' })
}

export async function listNotebooks(): Promise<Notebook[]> {
  return request<Notebook[]>('/notebooks', { fallback: 'Failed to list notebooks' })
}

export async function getNotebook(notebookId: string): Promise<Notebook> {
  return request<Notebook>(`/notebook/${notebookId}`, { fallback: 'Failed to get notebook' })
}

export async function deleteNotebook(notebookId: string): Promise<void> {
  return request<void>(`/notebook/${notebookId}`, { method: 'DELETE', fallback: 'Failed to delete notebook', parse: false })
}

export async function addNote(notebookId: string, title: string, content: string): Promise<NoteItem> {
  return request<NoteItem>(`/notebook/${notebookId}/notes`, { method: 'POST', json: { title, content }, fallback: 'Failed to add note' })
}

export async function uploadNoteFile(notebookId: string, file: File): Promise<NoteItem> {
  const formData = new FormData()
  formData.append('file', file)
  return request<NoteItem>(`/notebook/${notebookId}/notes/upload`, {
    method: 'POST',
    body: formData,
    fallback: 'Failed to upload PDF',
    timeoutMs: 120_000,
  })
}

export async function updateNote(notebookId: string, noteId: string, updates: { title?: string; content?: string }): Promise<NoteItem> {
  return request<NoteItem>(`/notebook/${notebookId}/note/${noteId}`, { method: 'PUT', json: updates, fallback: 'Failed to update note' })
}

export async function deleteNote(notebookId: string, noteId: string): Promise<void> {
  return request<void>(`/notebook/${notebookId}/note/${noteId}`, { method: 'DELETE', fallback: 'Failed to delete note', parse: false })
}

export async function askNotebook(notebookId: string, query: string): Promise<NotebookAskResult> {
  return request<NotebookAskResult>(`/notebook/${notebookId}/ask`, {
    method: 'POST',
    json: { query },
    fallback: 'Failed to get answer',
    timeoutMs: 60_000,
  })
}
