'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDocumentStatus, getPDFUrl, DocumentAnalysis } from '@/lib/api'
import PDFViewer from '@/components/PDFViewer'
import AnalysisSidebar from '@/components/AnalysisSidebar'
import AskPanel from '@/components/AskPanel'

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [highlightedClause, setHighlightedClause] = useState<string>()

  useEffect(() => {
    if (documentId) {
      loadDocument()
      const interval = setInterval(checkStatus, 3000) // Poll every 3 seconds
      return () => clearInterval(interval)
    }
  }, [documentId])

  const loadDocument = async () => {
    try {
      setLoading(true)
      setError('')

      console.log('Loading document:', documentId)

      // Get PDF URL
      try {
        const pdfResult = await getPDFUrl(documentId)
        setPdfUrl(pdfResult.pdfUrl)
        console.log('PDF URL loaded:', pdfResult.pdfUrl)
      } catch (pdfErr) {
        console.error('PDF URL error:', pdfErr)
        setError(`Failed to get PDF URL: ${pdfErr instanceof Error ? pdfErr.message : String(pdfErr)}`)
        return
      }

      // Get analysis status
      try {
        await checkStatus()
        console.log('Status check completed')
      } catch (statusErr) {
        console.error('Status check error:', statusErr)
        setError(`Failed to get document status: ${statusErr instanceof Error ? statusErr.message : String(statusErr)}`)
        return
      }

    } catch (err) {
      setError(`Failed to load document: ${err instanceof Error ? err.message : String(err)}`)
      console.error('Load document error:', err)
    } finally {
      setLoading(false)
    }
  }

  const checkStatus = async () => {
    try {
      console.log('Checking status for:', documentId)
      const result = await getDocumentStatus(documentId)
      console.log('Status result:', result)
      setAnalysis(result)
      
      if (result.status === 'failed') {
        setError(result.message || 'Document processing failed')
      }
    } catch (err) {
      console.error('Status check error:', err)
      throw err // Re-throw to be caught by loadDocument
    }
  }

  const handleClauseClick = (clauseId: string) => {
    setHighlightedClause(clauseId)
  }

  const handleBackToUpload = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={handleBackToUpload}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Back to Upload
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToUpload}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              Vidhived.ai - Document Analysis
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {analysis?.status === 'processing' && (
              <div className="flex items-center text-yellow-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                <span className="text-sm">Processing...</span>
              </div>
            )}
            {analysis?.status === 'completed' && (
              <div className="flex items-center text-green-600">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Analysis Complete</span>
              </div>
            )}
            {analysis?.status === 'failed' && (
              <div className="flex items-center text-red-600">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">Processing Failed</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* PDF Viewer - Left Half */}
        <div className="w-1/2 border-r border-gray-200">
          {pdfUrl ? (
            <PDFViewer
              pdfUrl={pdfUrl}
              clauses={analysis?.analysis || []}
              highlightedClause={highlightedClause}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Loading PDF...</p>
            </div>
          )}
        </div>

        {/* Analysis & Chat - Right Half */}
        <div className="w-1/2 flex flex-col">
          {/* Analysis Sidebar */}
          <div className="flex-1 overflow-hidden">
            {analysis?.status === 'completed' && analysis.analysis ? (
              <AnalysisSidebar
                clauses={analysis.analysis}
                onClauseClick={handleClauseClick}
                documentSummary={analysis.documentSummary}
                fullAnalysis={analysis.fullAnalysis}
              />
            ) : analysis?.status === 'processing' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">
                    {analysis.message || 'Analyzing document...'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Waiting for analysis...</p>
              </div>
            )}
          </div>

          {/* Ask Panel */}
          {analysis?.status === 'completed' && (
            <AskPanel 
              documentId={documentId} 
              documentSummary={analysis.documentSummary || analysis.fullAnalysis}
            />
          )}
        </div>
      </div>
    </div>
  )
}