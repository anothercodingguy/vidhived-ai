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
  documentSummary?: string
  fullAnalysis?: string
  keyTerms?: string[]
  entities?: string[]
  advancedAnalysis?: AdvancedAnalysis
  message?: string
}

export interface AdvancedAnalysis {
  status: string
  clauses: Record<string, AdvancedClause>
  html_visualization: string
  summary: AnalysisSummary
  total_clauses: number
  analysis_features: {
    entity_extraction: boolean
    phrase_scoring: boolean
    clause_summarization: boolean
    html_rendering: boolean
  }
}

export interface AdvancedClause {
  text: string
  entities: {
    dates: string[]
    parties: string[]
    money: string[]
  }
  phrases: Record<string, {
    score: number
    hex: string
  }>
  summary?: string
}

export interface AnalysisSummary {
  total_clauses: number
  high_risk_clauses: number
  medium_risk_clauses: number
  low_risk_clauses: number
  unique_dates: number
  unique_money_amounts: number
  unique_parties: number
  all_dates: string[]
  all_money: string[]
  all_parties: string[]
}

export interface AskResponse {
  answer: string
  documentId: string
  hasAI?: boolean
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

export async function analyzeClauses(clauses: Record<string, string>): Promise<AdvancedAnalysis> {
  const response = await fetch(`${API_URL}/analyze-clauses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ clauses }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to analyze clauses')
  }

  return response.json()
}

export async function extractEntities(text: string): Promise<{entities: Record<string, string[]>, text: string}> {
  const response = await fetch(`${API_URL}/extract-entities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to extract entities')
  }

  return response.json()
}

export async function scoreImportance(text: string): Promise<{text: string, importance_score: number, risk_level: string}> {
  const response = await fetch(`${API_URL}/score-importance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to score importance')
  }

  return response.json()
}

export async function summarizeText(text: string): Promise<{original_text: string, summary: string}> {
  const response = await fetch(`${API_URL}/summarize-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to summarize text')
  }

  return response.json()
}