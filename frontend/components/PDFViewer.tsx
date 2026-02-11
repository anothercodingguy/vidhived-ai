'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Clause } from '@/lib/api'

interface PDFViewerProps {
  pdfUrl: string
  clauses: Clause[]
  onClauseClick?: (clauseId: string) => void
  highlightedClauseId?: string | null
  onScrollToClauseReady?: (fn: (clauseId: string) => void) => void
}

export default function PdfViewer({
  pdfUrl,
  clauses,
  onClauseClick,
  highlightedClauseId,
  onScrollToClauseReady,
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<HTMLCanvasElement[]>([])
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const pdfDocRef = useRef<any>(null)
  const pageCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const pageContainerRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const renderedPagesRef = useRef<Set<number>>(new Set())

  // Load PDF.js and document
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
      setIsLoading(false)
    } catch (err: any) {
      setError('Failed to load PDF')
      setIsLoading(false)
    }
  }

  // Render visible pages
  useEffect(() => {
    if (!pdfDocRef.current || pageCount === 0) return

    const renderPage = async (pageNum: number) => {
      if (renderedPagesRef.current.has(pageNum)) return
      renderedPagesRef.current.add(pageNum)

      try {
        const page = await pdfDocRef.current.getPage(pageNum)
        const viewport = page.getViewport({ scale })
        const canvas = pageCanvasRefs.current.get(pageNum)

        if (!canvas) return

        canvas.width = viewport.width
        canvas.height = viewport.height

        const container = pageContainerRefs.current.get(pageNum)
        if (container) {
          container.style.width = `${viewport.width}px`
          container.style.height = `${viewport.height}px`
        }

        const ctx = canvas.getContext('2d')
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise
        }
      } catch (err) {
        console.error(`Failed to render page ${pageNum}:`, err)
      }
    }

    // Render all pages
    for (let i = 1; i <= pageCount; i++) {
      renderPage(i)
    }
  }, [pageCount, scale])

  // Re-render on scale change
  useEffect(() => {
    renderedPagesRef.current.clear()
  }, [scale])

  // Scroll tracking
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const scrollTop = containerRef.current.scrollTop
    let currentP = 1

    pageContainerRefs.current.forEach((el, num) => {
      if (el.offsetTop <= scrollTop + 100) {
        currentP = num
      }
    })

    setCurrentPage(currentP)
  }, [])

  // Scroll-to-clause function
  const scrollToClause = useCallback((clauseId: string) => {
    const clause = clauses.find(c => c.id === clauseId)
    if (!clause) return

    const pageContainer = pageContainerRefs.current.get(clause.page_number)
    if (pageContainer && containerRef.current) {
      const pageRect = pageContainer.getBoundingClientRect()
      const containerRect = containerRef.current.getBoundingClientRect()

      // Calculate clause position on page
      if (clause.bounding_box && clause.ocr_page_height) {
        const scaleY = pageRect.height / clause.ocr_page_height
        const y = clause.bounding_box.vertices[0].y * scaleY

        containerRef.current.scrollTo({
          top: pageContainer.offsetTop + y - 100,
          behavior: 'smooth',
        })
        return
      }

      // Fallback: scroll to page
      pageContainer.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [clauses])

  // Expose scroll function to parent
  useEffect(() => {
    if (onScrollToClauseReady) {
      onScrollToClauseReady(scrollToClause)
    }
  }, [scrollToClause, onScrollToClauseReady])

  // Get clause overlays for a specific page
  const getPageClauses = useCallback((pageNum: number) => {
    return clauses.filter(c => c.page_number === pageNum && c.bounding_box)
  }, [clauses])

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
          <p className="text-sm" style={{ color: 'rgb(var(--color-risk-high))' }}>⚠️ {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ background: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
        <div className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
          Page {currentPage} / {pageCount}
        </div>
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

      {/* PDF Pages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4"
        style={{ background: 'rgb(var(--color-bg))' }}
        onScroll={handleScroll}
      >
        <div className="flex flex-col items-center gap-4">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map(pageNum => (
            <div
              key={pageNum}
              className="relative shadow-lg"
              ref={(el) => { if (el) pageContainerRefs.current.set(pageNum, el) }}
              style={{ background: '#fff', minHeight: 200 }}
            >
              <canvas
                ref={(el) => { if (el) pageCanvasRefs.current.set(pageNum, el) }}
              />

              {/* Clause overlays */}
              {getPageClauses(pageNum).map(clause => {
                if (!clause.bounding_box || !clause.ocr_page_width || !clause.ocr_page_height) return null
                const container = pageContainerRefs.current.get(pageNum)
                if (!container) return null

                const containerWidth = container.clientWidth || clause.ocr_page_width * scale
                const containerHeight = container.clientHeight || clause.ocr_page_height * scale

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
                        {clause.type} — {clause.category} Risk
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}