'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Clause } from '@/lib/api'

interface PDFViewerProps {
  pdfUrl: string
  clauses: Clause[]
  onClauseClick?: (clauseId: string) => void
  highlightedClauseId?: string | null
  onGoToPageReady?: (fn: (page: number) => void) => void
}

export default function PdfViewer({
  pdfUrl,
  clauses,
  onClauseClick,
  highlightedClauseId,
  onGoToPageReady,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.5)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [pageInput, setPageInput] = useState('1')
  const pdfDocRef = useRef<any>(null)
  const renderTaskRef = useRef<number>(0)

  // Load PDF document
  useEffect(() => {
    if (!pdfUrl) return
    loadPdf()
  }, [pdfUrl])

  const loadPdf = async () => {
    setIsLoading(true)
    setError('')

    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

      const pdf = await pdfjsLib.getDocument(pdfUrl).promise
      pdfDocRef.current = pdf
      setPageCount(pdf.numPages)
      setCurrentPage(1)
      setPageInput('1')
      setIsLoading(false)
    } catch (err: any) {
      setError('Failed to load PDF')
      setIsLoading(false)
    }
  }

  // Render current page
  useEffect(() => {
    if (!pdfDocRef.current || pageCount === 0) return
    renderPage(currentPage)
  }, [currentPage, scale, pageCount])

  const renderPage = async (pageNum: number) => {
    const taskId = ++renderTaskRef.current

    try {
      const page = await pdfDocRef.current.getPage(pageNum)
      if (taskId !== renderTaskRef.current) return // Cancelled

      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = viewport.width
      canvas.height = viewport.height

      const ctx = canvas.getContext('2d')
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise
      }
    } catch (err) {
      console.error(`Failed to render page ${pageNum}:`, err)
    }
  }

  // Navigation
  const goToPage = useCallback((page: number) => {
    const p = Math.max(1, Math.min(pageCount, page))
    setCurrentPage(p)
    setPageInput(String(p))
  }, [pageCount])

  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage])
  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage])

  // Expose goToPage to parent
  useEffect(() => {
    if (onGoToPageReady) {
      onGoToPageReady(goToPage)
    }
  }, [goToPage, onGoToPageReady])

  // Handle page input
  const handlePageInputSubmit = () => {
    const p = parseInt(pageInput, 10)
    if (!isNaN(p)) goToPage(p)
    else setPageInput(String(currentPage))
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prevPage() }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); nextPage() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [prevPage, nextPage])

  // Get clause overlays for current page
  const pageClauses = clauses.filter(c => c.page_number === currentPage && c.bounding_box)

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-10 h-10 mx-auto mb-3">
            <div className="absolute inset-0 rounded-full border-2 animate-spin" style={{ borderColor: 'rgb(var(--color-border))', borderTopColor: 'rgb(var(--color-primary))' }} />
          </div>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Loading PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'rgb(var(--color-risk-high) / .1)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgb(var(--color-risk-high))' }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: 'rgb(var(--color-risk-high))' }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="glass-surface flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        {/* Pagination controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="btn-ghost btn-icon"
            title="Previous page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="flex items-center gap-1 text-xs">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageInputSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handlePageInputSubmit()}
              className="w-10 text-center py-1 px-1 rounded text-xs font-medium"
              style={{
                background: 'rgb(var(--color-surface-hover))',
                color: 'rgb(var(--color-text))',
                border: '1px solid rgb(var(--color-border))',
              }}
            />
            <span style={{ color: 'rgb(var(--color-text-muted))' }}>of {pageCount}</span>
          </div>

          <button
            onClick={nextPage}
            disabled={currentPage >= pageCount}
            className="btn-ghost btn-icon"
            title="Next page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.2))}
            className="btn-ghost btn-icon"
            title="Zoom out"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <span className="text-xs font-medium w-12 text-center" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.2))}
            className="btn-ghost btn-icon"
            title="Zoom in"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
        </div>
      </div>

      {/* Single Page Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex items-start justify-center"
        style={{ background: 'rgb(var(--color-bg))' }}
      >
        <div className="relative" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <canvas ref={canvasRef} style={{ display: 'block' }} />

          {/* Clause overlays for current page */}
          {pageClauses.map(clause => {
            if (!clause.bounding_box || !clause.ocr_page_width || !clause.ocr_page_height) return null
            const canvas = canvasRef.current
            if (!canvas) return null

            const containerWidth = canvas.width
            const containerHeight = canvas.height

            const sx = containerWidth / clause.ocr_page_width
            const sy = containerHeight / clause.ocr_page_height

            const v = clause.bounding_box.vertices
            const left = v[0].x * sx
            const top = v[0].y * sy
            const width = (v[1].x - v[0].x) * sx
            const height = (v[3].y - v[0].y) * sy

            const isHighlighted = highlightedClauseId === clause.id
            const color = clause.category === 'Red' ? 'var(--color-risk-high)' : clause.category === 'Yellow' ? 'var(--color-risk-medium)' : 'var(--color-risk-low)'

            return (
              <div
                key={clause.id}
                className="absolute cursor-pointer pdf-overlay-box"
                onClick={() => onClauseClick?.(clause.id)}
                style={{
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  background: `rgb(${color} / ${isHighlighted ? '.2' : '.08'})`,
                  border: `2px solid rgb(${color} / ${isHighlighted ? '.6' : '.25'})`,
                  borderRadius: '4px',
                  zIndex: isHighlighted ? 30 : 10,
                  transition: 'all 0.2s ease',
                }}
                title={`${clause.type}: ${clause.explanation}`}
              >
                {isHighlighted && (
                  <div className="absolute -top-6 left-0 text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap"
                    style={{ background: `rgb(${color})`, color: '#fff', fontSize: '10px' }}>
                    {clause.type} — {clause.category === 'Red' ? 'High' : clause.category === 'Yellow' ? 'Medium' : 'Low'} Risk
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}