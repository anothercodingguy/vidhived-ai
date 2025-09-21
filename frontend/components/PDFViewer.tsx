import React, { useRef, useEffect, useState } from 'react';
import { usePdfViewer } from '@/hooks/usePdfViewer';
import PdfOverlay from './PdfOverlay';
import type { Clause } from '@/lib/api';

interface PdfViewerProps {
  pdfUrl: string;
  clauses: Clause[];
  onClauseClick?: (clauseId: string) => void;
  initialScale?: number;
  showOverlays?: boolean;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfUrl,
  clauses,
  onClauseClick,
  initialScale = 1.0,
  showOverlays = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const {
    pdf,
    numPages,
    pageData,
    scale,
    setScale,
    loading,
    error,
    overlays,
    highlightedClauseId,
    setHighlightedClauseId,
    searchTerm,
    setSearchTerm,
    searchResults,
    searchIndex,
    setSearchIndex,
    addAnnotation,
    annotations,
  } = usePdfViewer({ pdfUrl, clauses, initialScale });

  // Resize observer for container
  useEffect(() => {
    if (!containerRef.current) return;
    const handleResize = () => {
      setContainerWidth(containerRef.current!.offsetWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render PDF pages
  useEffect(() => {
    if (!pdf || !pageData.length) return;
    pageData.forEach(async (pd, idx) => {
      const page = await pdf.getPage(pd.pageNumber);
      const viewport = page.getViewport({ scale });
      pd.page = page;
      pd.viewport = viewport;
      // Render canvas
      if (pd.canvasRef.current) {
        const canvas = pd.canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context!, viewport } as any).promise;
      }
    });
  }, [pdf, pageData, scale]);

  // Overlay hover/click handlers
  const handleOverlayHover = (clauseId: string | null) => {
    setHighlightedClauseId(clauseId);
  };
  const handleOverlayClick = (clauseId: string) => {
    setHighlightedClauseId(clauseId);
    if (onClauseClick) onClauseClick(clauseId);
  };

  if (loading) return <div className="pdf-loading">Loading PDF…</div>;
  if (error) return <div className="pdf-error">{error}</div>;

  return (
    <div className="pdf-viewer-container" ref={containerRef}>
      <div className="pdf-toolbar">
        <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>-</button>
        <span>{(scale * 100).toFixed(0)}%</span>
        <button onClick={() => setScale(s => Math.min(3, s + 0.1))}>+</button>
        <input
          type="text"
          placeholder="Search clauses…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pdf-search-box"
        />
        {searchResults.length > 0 && (
          <span className="pdf-search-nav">
            <button onClick={() => setSearchIndex(i => Math.max(0, i - 1))}>&uarr;</button>
            <span>{searchIndex + 1}/{searchResults.length}</span>
            <button onClick={() => setSearchIndex(i => Math.min(searchResults.length - 1, i + 1))}>&darr;</button>
          </span>
        )}
        <label style={{ marginLeft: 16 }}>
          <input type="checkbox" checked={showOverlays} readOnly /> Overlays
        </label>
      </div>
      <div className="pdf-pages">
        {pageData.map((pd, idx) => (
          <div
            key={pd.pageNumber}
            className="pdf-page-container"
            style={{ position: 'relative', margin: '0 auto 24px', width: pd.viewport?.width, height: pd.viewport?.height }}
          >
            <canvas ref={pd.canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
            {/* Overlay for this page */}
            {overlays[pd.pageNumber] && (
              <PdfOverlay
                overlays={overlays[pd.pageNumber]}
                scale={scale}
                onHover={handleOverlayHover}
                onClick={handleOverlayClick}
                highlightedClauseId={highlightedClauseId}
                annotations={annotations}
                showOverlays={showOverlays}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PdfViewer;