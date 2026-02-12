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

// ── API Functions ───────────────────────────────────────────────────

export async function uploadPDF(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Upload failed')
  }
  return data
}

export async function getDocumentStatus(documentId: string): Promise<DocumentAnalysis> {
  const response = await fetch(`${API_URL}/document/${documentId}`)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch document')
  }
  return data
}

export async function getPDFUrl(documentId: string): Promise<{ pdfUrl: string }> {
  return { pdfUrl: `${API_URL}/pdf/${documentId}` }
}

export async function askQuestion(documentId: string, query: string): Promise<AskResult> {
  const response = await fetch(`${API_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, query }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Failed to get answer')
  }
  return data
}

export async function textToSpeech(text: string, language: string = 'en-IN'): Promise<TTSResult> {
  const response = await fetch(`${API_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Voice generation failed')
  }
  return data
}

export async function getTTSStatus(): Promise<TTSStatus> {
  try {
    const response = await fetch(`${API_URL}/tts/status`)
    return await response.json()
  } catch {
    return { available: false, provider: null }
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
  const response = await fetch(`${API_URL}/notebooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to create notebook')
  return data
}

export async function listNotebooks(): Promise<Notebook[]> {
  const response = await fetch(`${API_URL}/notebooks`)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to list notebooks')
  return data
}

export async function getNotebook(notebookId: string): Promise<Notebook> {
  const response = await fetch(`${API_URL}/notebook/${notebookId}`)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to get notebook')
  return data
}

export async function deleteNotebook(notebookId: string): Promise<void> {
  const response = await fetch(`${API_URL}/notebook/${notebookId}`, { method: 'DELETE' })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to delete notebook')
  }
}

export async function addNote(notebookId: string, title: string, content: string): Promise<NoteItem> {
  const response = await fetch(`${API_URL}/notebook/${notebookId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to add note')
  return data
}

export async function uploadNoteFile(notebookId: string, file: File): Promise<NoteItem> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_URL}/notebook/${notebookId}/notes/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to upload PDF')
  return data
}

export async function updateNote(notebookId: string, noteId: string, updates: { title?: string; content?: string }): Promise<NoteItem> {
  const response = await fetch(`${API_URL}/notebook/${notebookId}/note/${noteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to update note')
  return data
}

export async function deleteNote(notebookId: string, noteId: string): Promise<void> {
  const response = await fetch(`${API_URL}/notebook/${notebookId}/note/${noteId}`, { method: 'DELETE' })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to delete note')
  }
}

export async function askNotebook(notebookId: string, query: string): Promise<NotebookAskResult> {
  const response = await fetch(`${API_URL}/notebook/${notebookId}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to get answer')
  return data
}