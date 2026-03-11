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
  const goToPageRef = useRef<((page: number) => void) | null>(null)

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
    // Navigate PDF to the clause's page
    const clause = analysis?.analysis?.find(c => c.id === clauseId)
    if (clause && goToPageRef.current) {
      goToPageRef.current(clause.page_number)
    }
  }, [analysis])

  const handleAskAboutClause = useCallback((clause: Clause) => {
    setActiveTab('chat')
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] flex items-center justify-center transition-colors duration-300">
        <div className="text-center animate-pulse">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-blue-500 shadow-lg animate-spin" />
          </div>
          <p className="font-medium text-slate-800 dark:text-slate-200">Loading document...</p>
          <p className="text-sm mt-1 text-slate-500">This may take a moment</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !analysis) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] flex items-center justify-center p-4 transition-colors duration-300">
        <div className="bg-white dark:bg-[#0f0f11] border border-red-100 dark:border-red-900/30 p-8 rounded-2xl max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center bg-red-50 dark:bg-red-500/10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">Something went wrong</h2>
          <p className="text-sm mb-8 text-slate-500 dark:text-slate-400 leading-relaxed">{error}</p>
          <button onClick={() => router.push('/')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors">
            Back to Upload
          </button>
        </div>
      </div>
    )
  }

  const isProcessing = analysis?.status === 'processing'
  const isCompleted = analysis?.status === 'completed'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] flex flex-col items-center p-0 md:p-4 lg:p-8 transition-colors duration-300 h-screen">
      {/* Container echoing the Landing Page rounded borders on large screens */}
      <div className="w-full max-w-[1440px] h-full bg-white dark:bg-[#09090b] md:rounded-[2rem] shadow-sm border-0 md:border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors duration-300">
        
        {/* Header */}
        <header className="flex-shrink-0 bg-white/50 dark:bg-[#09090b]/50 backdrop-blur-md flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 z-10 transition-colors">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full border-[3px] border-blue-500 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500" />
              </div>
              <span className="font-semibold text-base text-slate-800 dark:text-slate-100 hidden sm:block truncate max-w-[200px] md:max-w-xs">
                {analysis?.filename || 'Document Analysis'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isProcessing && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Analyzing
              </div>
            )}
            {isCompleted && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                Complete
              </div>
            )}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1" />
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden flex-col lg:flex-row relative">
          
          {/* PDF Viewer — Left */}
          <div className="w-full lg:w-1/2 flex-1 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-[#0f0f11]/50 overflow-hidden relative z-0 transition-colors">
            {pdfUrl ? (
              <PdfViewer
                pdfUrl={pdfUrl}
                clauses={analysis?.analysis || []}
                onClauseClick={setHighlightedClauseId}
                highlightedClauseId={highlightedClauseId}
                onGoToPageReady={(fn) => { goToPageRef.current = fn }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-slate-400 text-sm font-medium animate-pulse">Loading Document Viewer...</p>
              </div>
            )}
          </div>

          {/* Right Panel — Analysis / Chat */}
          <div className="w-full lg:w-1/2 flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#09090b] relative z-10 transition-colors h-[50vh] lg:h-auto">
            
            {/* Context-aware Floating Tabs */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/80 dark:bg-[#0f0f11]/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-1 rounded-full flex shadow-sm transition-colors">
              {(['analysis', 'chat'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-6 py-2 text-sm font-semibold capitalize transition-all duration-300 rounded-full flex items-center gap-2 ${
                    activeTab === tab 
                      ? 'bg-blue-600 text-white shadow-md transform scale-100' 
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 scale-95'
                  }`}
                >
                  {tab === 'analysis' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  )}
                  {tab === 'analysis' ? 'Insights' : 'Assistant'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden pt-16">
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
                  <div className="flex-1 flex items-center justify-center h-full p-8 px-4 text-center">
                    <div className="max-w-xs w-full bg-blue-50/50 dark:bg-[#0f0f11] border border-blue-100 dark:border-slate-800 p-8 rounded-3xl shadow-sm transition-colors">
                      <div className="relative w-12 h-12 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-700 border-t-blue-500 animate-spin" />
                      </div>
                      <h3 className="font-semibold text-base mb-2 text-slate-800 dark:text-slate-200">
                        {analysis?.message || 'Analyzing document...'}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        Our AI is extracting key entities and scoring contract clauses for risk.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <p className="text-slate-400 font-medium animate-pulse">Waiting for analysis...</p>
                  </div>
                )
              ) : (
                isCompleted ? (
                  <AskPanel documentId={documentId} />
                ) : (
                  <div className="flex-1 flex items-center justify-center h-full p-8 text-center">
                    <div className="max-w-xs w-full p-6 border border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-[#0f0f11] transition-colors">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      </div>
                      <h3 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Chat Unavailable</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        The AI assistant needs the completed analysis to understand the document context.
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}