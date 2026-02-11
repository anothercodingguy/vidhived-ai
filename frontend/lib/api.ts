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