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

const MIN_SCALE = 0.25
const MAX_SCALE = 3
const ZOOM_STEP = 0.2
const PAGE_PADDING = 16 // px of space around the page inside the scroll area

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const RISK_LABEL: Record<string, string> = { Red: 'High', Yellow: 'Medium', Green: 'Low' }
const RISK_VAR: Record<string, string> = {
  Red: 'var(--color-risk-high)',
  Yellow: 'var(--color-risk-medium)',
  Green: 'var(--color-risk-low)',
}

export default function PdfViewer({
  pdfUrl,
  clauses,
  onClauseClick,
  highlightedClauseId,
  onGoToPageReady,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageInput, setPageInput] = useState('1')

  // Zoom: "fit" follows the width of the panel, "manual" is whatever the +/- buttons set.
  const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit')
  const [manualScale, setManualScale] = useState(1)
  const [containerWidth, setContainerWidth] = useState(0)
  // What is actually on screen after the last render: the scale and the page size in CSS pixels.
  const [rendered, setRendered] = useState<{ scale: number; width: number; height: number } | null>(null)

  // Load the PDF document
  useEffect(() => {
    if (!pdfUrl) return
    let cancelled = false
    let loadingTask: any

    setStatus('loading')
    setPdfDoc(null)
    setRendered(null)

    ;(async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

        loadingTask = pdfjsLib.getDocument(pdfUrl)
        const pdf = await loadingTask.promise
        if (cancelled) return
        setPdfDoc(pdf)
        setPageCount(pdf.numPages)
        setCurrentPage(1)
        setPageInput('1')
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()

    return () => {
      cancelled = true
      loadingTask?.destroy?.()
    }
  }, [pdfUrl, reloadKey])

  // Track the width of the scroll area, so "fit" can follow it (window resize, phone rotation, tab switch).
  useEffect(() => {
    const el = scrollRef.current
    if (!el || status !== 'ready' || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(entries => {
      setContainerWidth(Math.floor(entries[0].contentRect.width))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [status])

  // In manual zoom the panel width does not matter, so it should not trigger a re-render.
  const fitWidth = zoomMode === 'fit' ? containerWidth : -1

  // Render the current page
  useEffect(() => {
    if (!pdfDoc) return
    let cancelled = false
    let renderTask: any

    ;(async () => {
      const page = await pdfDoc.getPage(currentPage)
      if (cancelled) return

      let scale = manualScale
      if (fitWidth !== -1) {
        // The width is 0 while the viewer is hidden (the Document tab on a phone). Wait until it is shown.
        if (!fitWidth) return
        const naturalWidth = page.getViewport({ scale: 1 }).width
        scale = clamp(fitWidth / naturalWidth, MIN_SCALE, MAX_SCALE)
      }

      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return

      // Draw at the screen's pixel density (capped at 2x) so text stays sharp on phones and Retina displays.
      const density = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(viewport.width * density)
      canvas.height = Math.floor(viewport.height * density)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      renderTask = page.render({
        canvasContext: ctx,
        viewport,
        transform: density !== 1 ? [density, 0, 0, density, 0, 0] : undefined,
      })
      await renderTask.promise
      if (!cancelled) setRendered({ scale, width: viewport.width, height: viewport.height })
    })().catch(err => {
      if (!cancelled && err?.name !== 'RenderingCancelledException') {
        console.error(`Failed to render page ${currentPage}:`, err)
      }
    })

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdfDoc, currentPage, manualScale, fitWidth])

  // Navigation
  const goToPage = useCallback((page: number) => {
    const p = clamp(page, 1, Math.max(1, pageCount))
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

  // Left/Right change page, but only while the PDF area itself has focus.
  // Up/Down are left alone so they keep scrolling.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'ArrowLeft') { e.preventDefault(); prevPage() }
    if (e.key === 'ArrowRight') { e.preventDefault(); nextPage() }
  }

  const zoomBy = (delta: number) => {
    const from = rendered?.scale ?? manualScale
    setManualScale(clamp(Math.round((from + delta) * 10) / 10, MIN_SCALE, MAX_SCALE))
    setZoomMode('manual')
  }

  // Bring the selected clause's box into view once its page is on screen.
  useEffect(() => {
    if (!highlightedClauseId || !rendered) return
    const box = scrollRef.current?.querySelector<HTMLElement>(`[data-clause-id="${CSS.escape(highlightedClauseId)}"]`)
    box?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [highlightedClauseId, rendered, currentPage])

  if (status === 'loading') {
    return (
      <div className="flex h-full flex-1 items-center justify-center p-6" role="status">
        <div className="text-center">
          <span aria-hidden="true" className="spinner mb-3 h-10 w-10" />
          <p className="text-sm text-ink-secondary">Loading PDF…</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex h-full flex-1 items-center justify-center p-6">
        <div className="max-w-xs text-center" role="alert">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-risk-high/10 text-risk-high">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="mb-1 text-sm font-semibold text-ink">Could not load the PDF</p>
          <p className="mb-4 text-sm text-ink-secondary">The file could not be fetched or opened.</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReloadKey(k => k + 1)}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  // Clause boxes for the current page, placed using the size of the rendered page.
  const pageClauses = rendered
    ? clauses.filter(c => c.page_number === currentPage && c.bounding_box && c.ocr_page_width && c.ocr_page_height)
    : []

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-2 py-1.5" role="toolbar" aria-label="PDF controls">
        <div className="flex items-center gap-1">
          <button type="button" onClick={prevPage} disabled={currentPage <= 1} className="btn-ghost btn-icon h-9 w-9" title="Previous page" aria-label="Previous page">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="text"
              inputMode="numeric"
              aria-label="Page number"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageInputSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handlePageInputSubmit()}
              className="h-8 w-10 rounded-md border border-line-strong bg-surface-raised text-center text-xs font-medium text-ink"
            />
            <span className="whitespace-nowrap text-ink-secondary">of {pageCount}</span>
          </div>

          <button type="button" onClick={nextPage} disabled={currentPage >= pageCount} className="btn-ghost btn-icon h-9 w-9" title="Next page" aria-label="Next page">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button type="button" onClick={() => zoomBy(-ZOOM_STEP)} disabled={(rendered?.scale ?? 1) <= MIN_SCALE} className="btn-ghost btn-icon h-9 w-9" title="Zoom out" aria-label="Zoom out">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <span className="w-11 text-center text-xs font-medium tabular-nums text-ink-secondary" aria-live="polite">
            <span className="sr-only">Zoom </span>{rendered ? `${Math.round(rendered.scale * 100)}%` : '…'}
          </span>
          <button type="button" onClick={() => zoomBy(ZOOM_STEP)} disabled={(rendered?.scale ?? 1) >= MAX_SCALE} className="btn-ghost btn-icon h-9 w-9" title="Zoom in" aria-label="Zoom in">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <button
            type="button"
            onClick={() => setZoomMode('fit')}
            aria-pressed={zoomMode === 'fit'}
            className={`btn-ghost h-9 text-xs font-medium ${zoomMode === 'fit' ? 'bg-primary/10 text-primary' : ''}`}
            title="Fit page to width"
          >
            Fit<span className="sr-only"> page to width</span>
          </button>
        </div>
      </div>

      {/* Single page. The scroll area can take focus so the keyboard can scroll it and turn pages. */}
      <div
        ref={scrollRef}
        tabIndex={0}
        role="group"
        aria-label={`PDF page ${currentPage} of ${pageCount}. Use the left and right arrow keys to change page.`}
        onKeyDown={handleKeyDown}
        className="flex-1 overflow-auto bg-canvas [scrollbar-gutter:stable]"
        style={{ padding: PAGE_PADDING }}
      >
        {/* mx-auto + w-max centres the page, and unlike flex centring it stays fully scrollable when zoomed in. */}
        <div className="relative mx-auto w-max bg-white shadow-elevated">
          <canvas ref={canvasRef} className="block" />

          {rendered && pageClauses.map(clause => {
            const sx = rendered.width / clause.ocr_page_width!
            const sy = rendered.height / clause.ocr_page_height!
            const v = clause.bounding_box!.vertices
            const isHighlighted = highlightedClauseId === clause.id
            const risk = RISK_LABEL[clause.category] ?? 'Medium'

            return (
              <button
                key={clause.id}
                type="button"
                data-clause-id={clause.id}
                className="pdf-overlay-box"
                aria-pressed={isHighlighted}
                aria-label={`${clause.type} clause, ${risk.toLowerCase()} risk. Show details.`}
                title={`${clause.type}: ${clause.explanation}`}
                onClick={() => onClauseClick?.(clause.id)}
                style={{
                  left: v[0].x * sx,
                  top: v[0].y * sy,
                  width: (v[1].x - v[0].x) * sx,
                  height: (v[3].y - v[0].y) * sy,
                  ['--overlay-color' as any]: RISK_VAR[clause.category] ?? RISK_VAR.Yellow,
                }}
              >
                {isHighlighted && (
                  <span aria-hidden="true" className="absolute -top-6 left-0 whitespace-nowrap rounded bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">
                    {clause.type} · {risk} risk
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
