'use client'

import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { Clause } from '@/lib/api'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

interface PDFViewerProps {
  pdfUrl: string
  clauses: Clause[]
  highlightedClause?: string
}

export default function PDFViewer({ pdfUrl, clauses, highlightedClause }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pdf, setPdf] = useState<any>(null)
  const [pages, setPages] = useState<HTMLCanvasElement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPDF()
  }, [pdfUrl])

  useEffect(() => {
    if (highlightedClause && pages.length > 0) {
      scrollToClause(highlightedClause)
    }
  }, [highlightedClause, pages])

  const loadPDF = async () => {
    try {
      setLoading(true)
      setError('')

      const loadingTask = pdfjsLib.getDocument(pdfUrl)
      const pdfDoc = await loadingTask.promise
      setPdf(pdfDoc)

      // Render all pages
      const pageElements: HTMLCanvasElement[] = []
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum)
        const canvas = await renderPage(page, pageNum)
        pageElements.push(canvas)
      }
      setPages(pageElements)
    } catch (err) {
      console.error('Error loading PDF:', err)
      setError('Failed to load PDF')
    } finally {
      setLoading(false)
    }
  }

  const renderPage = async (page: any, pageNum: number): Promise<HTMLCanvasElement> => {
    const viewport = page.getViewport({ scale: 1.5 })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!

    canvas.height = viewport.height
    canvas.width = viewport.width
    canvas.id = `pdf-page-${pageNum}`

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    }

    await page.render(renderContext).promise
    return canvas
  }

  const scrollToClause = (clauseId: string) => {
    const clause = clauses.find(c => c.id === clauseId)
    if (!clause || !containerRef.current) return

    const pageElement = containerRef.current.querySelector(`#pdf-page-${clause.page_number}`)
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      // Highlight the clause temporarily
      setTimeout(() => {
        const bboxElement = containerRef.current?.querySelector(`[data-clause-id="${clauseId}"]`)
        if (bboxElement) {
          bboxElement.classList.add('highlight')
          setTimeout(() => {
            bboxElement.classList.remove('highlight')
          }, 2000)
        }
      }, 500)
    }
  }

  const renderBoundingBoxes = () => {
    if (!pages.length) return null

    return clauses.map(clause => {
      const pageCanvas = pages[clause.page_number - 1]
      if (!pageCanvas) return null

      const canvasRect = pageCanvas.getBoundingClientRect()
      const scaleX = canvasRect.width / clause.ocr_page_width
      const scaleY = canvasRect.height / clause.ocr_page_height

      const vertices = clause.bounding_box.vertices
      if (!vertices || vertices.length < 4) return null

      const left = Math.min(...vertices.map(v => v.x)) * scaleX
      const top = Math.min(...vertices.map(v => v.y)) * scaleY
      const right = Math.max(...vertices.map(v => v.x)) * scaleX
      const bottom = Math.max(...vertices.map(v => v.y)) * scaleY

      return (
        <div
          key={clause.id}
          data-clause-id={clause.id}
          className="pdf-bbox"
          style={{
            left: `${left}px`,
            top: `${top}px`,
            width: `${right - left}px`,
            height: `${bottom - top}px`,
          }}
          title={`${clause.type}: ${clause.text.substring(0, 100)}...`}
        />
      )
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600">
          <p className="text-lg font-medium">Error loading PDF</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="pdf-container h-full overflow-auto bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {pages.map((canvas, index) => (
          <div key={index} className="pdf-page mb-4 relative bg-white shadow-lg">
            <div
              ref={el => {
                if (el && canvas.parentNode !== el) {
                  el.appendChild(canvas)
                }
              }}
              className="relative"
            />
            {renderBoundingBoxes()}
          </div>
        ))}
      </div>
    </div>
  )
}