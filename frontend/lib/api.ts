const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export interface UploadResponse {
  documentId: string
  pdfUrl: string
  message: string
}

export interface Clause {
  id: string
  page_number: number
  text: string
  bounding_box: {
    vertices: Array<{ x: number; y: number }>
  }
  ocr_page_width: number
  ocr_page_height: number
  score: number
  category: 'Red' | 'Yellow' | 'Green'
  type: string
  explanation: string
}

export interface DocumentAnalysis {
  documentId: string
  status: 'processing' | 'completed' | 'failed'
  fullText?: string
  analysis?: Clause[]
  message?: string
}

export interface AskResponse {
  answer: string
  documentId: string
}

export async function uploadPDF(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  return response.json()
}

export async function getDocumentStatus(documentId: string): Promise<DocumentAnalysis> {
  const response = await fetch(`${API_URL}/document/${documentId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get document status')
  }

  return response.json()
}

export async function getPDFUrl(documentId: string): Promise<{ pdfUrl: string }> {
  const response = await fetch(`${API_URL}/pdf/${documentId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get PDF URL')
  }

  return response.json()
}

export async function askQuestion(documentId: string, query: string): Promise<AskResponse> {
  const response = await fetch(`${API_URL}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documentId, query }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to ask question')
  }

  return response.json()
}