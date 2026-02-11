'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDocumentStatus, getPDFUrl, DocumentAnalysis, Clause } from '@/lib/api'
import PdfViewer from '@/components/PDFViewer'
import AnalysisSidebar from '@/components/AnalysisSidebar'
import AskPanel from '@/components/AskPanel'
import ThemeToggle from '@/components/ThemeToggle'

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'analysis' | 'chat'>('analysis')
  const [highlightedClauseId, setHighlightedClauseId] = useState<string | null>(null)
  const scrollToClauseRef = useRef<((clauseId: string) => void) | null>(null)

  useEffect(() => {
    if (!documentId) return
    loadDocument()
    const interval = setInterval(checkStatus, 3000)
    return () => clearInterval(interval)
  }, [documentId])

  const loadDocument = async () => {
    try {
      setLoading(true)
      setError('')

      const pdfResult = await getPDFUrl(documentId)
      setPdfUrl(pdfResult.pdfUrl)

      await checkStatus()
    } catch (err: any) {
      setError(err.message || 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  const checkStatus = async () => {
    try {
      const result = await getDocumentStatus(documentId)
      setAnalysis(result)
      if (result.status === 'failed') {
        setError(result.message || 'Document processing failed')
      }
    } catch (err: any) {
      if (!analysis) throw err
    }
  }

  const handleClauseHighlight = useCallback((clauseId: string) => {
    setHighlightedClauseId(clauseId)
    if (scrollToClauseRef.current) {
      scrollToClauseRef.current(clauseId)
    }
  }, [])

  const handleAskAboutClause = useCallback((clause: Clause) => {
    setActiveTab('chat')
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--color-bg))' }}>
        <div className="text-center animate-fadeIn">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 animate-spin" style={{ borderColor: 'rgb(var(--color-border))', borderTopColor: 'rgb(var(--color-primary))' }} />
          </div>
          <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>Loading document...</p>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>This may take a moment</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--color-bg))' }}>
        <div className="card p-8 max-w-md text-center animate-fadeIn">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>Something went wrong</h2>
          <p className="text-sm mb-6" style={{ color: 'rgb(var(--color-text-secondary))' }}>{error}</p>
          <button onClick={() => router.push('/')} className="btn btn-primary">
            ← Back to Upload
          </button>
        </div>
      </div>
    )
  }

  const isProcessing = analysis?.status === 'processing'
  const isCompleted = analysis?.status === 'completed'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'rgb(var(--color-bg))' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b" style={{ background: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="btn-ghost btn-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary-500 flex items-center justify-center text-white font-bold text-xs">V</div>
            <span className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>
              {analysis?.filename || 'Document Analysis'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgb(var(--color-risk-medium) / .1)', color: 'rgb(var(--color-risk-medium))' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'rgb(var(--color-risk-medium))' }} />
              Analyzing...
            </div>
          )}
          {isCompleted && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgb(var(--color-risk-low) / .1)', color: 'rgb(var(--color-risk-low))' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
              Complete
            </div>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer — Left */}
        <div className="w-1/2 border-r flex flex-col" style={{ borderColor: 'rgb(var(--color-border))' }}>
          {pdfUrl ? (
            <PdfViewer
              pdfUrl={pdfUrl}
              clauses={analysis?.analysis || []}
              onClauseClick={setHighlightedClauseId}
              highlightedClauseId={highlightedClauseId}
              onScrollToClauseReady={(fn) => { scrollToClauseRef.current = fn }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p style={{ color: 'rgb(var(--color-text-muted))' }}>Loading PDF...</p>
            </div>
          )}
        </div>

        {/* Right Panel — Analysis / Chat */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b px-4" style={{ background: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
            {(['analysis', 'chat'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative px-4 py-3 text-sm font-medium capitalize transition-colors"
                style={{
                  color: activeTab === tab ? 'rgb(var(--color-primary))' : 'rgb(var(--color-text-secondary))',
                }}
              >
                {tab === 'analysis' ? '📊 Analysis' : '💬 Chat'}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: 'rgb(var(--color-primary))' }} />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'analysis' ? (
              isCompleted && analysis?.analysis ? (
                <AnalysisSidebar
                  clauses={analysis.analysis}
                  onClauseClick={handleClauseHighlight}
                  onAskAboutClause={handleAskAboutClause}
                  documentSummary={analysis.documentSummary}
                  fullAnalysis={analysis.fullAnalysis}
                  highlightedClauseId={highlightedClauseId}
                />
              ) : isProcessing ? (
                <div className="flex-1 flex items-center justify-center h-full p-8">
                  <div className="text-center">
                    <div className="relative w-12 h-12 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-full border-2 animate-spin" style={{ borderColor: 'rgb(var(--color-border))', borderTopColor: 'rgb(var(--color-primary))' }} />
                    </div>
                    <p className="font-medium text-sm mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                      {analysis?.message || 'Analyzing document...'}
                    </p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      AI is extracting and scoring clauses
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center h-full">
                  <p style={{ color: 'rgb(var(--color-text-muted))' }}>Waiting for analysis...</p>
                </div>
              )
            ) : (
              isCompleted ? (
                <AskPanel documentId={documentId} />
              ) : (
                <div className="flex-1 flex items-center justify-center h-full">
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                    Chat will be available after analysis completes
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}