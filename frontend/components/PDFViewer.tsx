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

  if (loading) return (
    <div className="pdf-loading flex flex-col items-center justify-center h-full text-gray-600 dark:text-dark-text-secondary">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 dark:border-dark-text-secondary mb-4"></div>
      <div>Loading PDF…</div>
      <div className="text-sm mt-2">This may take up to 30 seconds for large files</div>
    </div>
  );
  
  if (error) return (
    <div className="pdf-error flex flex-col items-center justify-center h-full text-red-600 dark:text-red-400 p-8">
      <div className="text-center max-w-2xl w-full">
        <div className="text-lg font-semibold mb-4">PDF Loading Error</div>
        <div className="text-sm whitespace-pre-line mb-6">{error}</div>
        <div className="flex gap-4 justify-center mb-6">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
          >
            Retry Loading
          </button>
          <button 
            onClick={() => console.log('PDF URL:', pdfUrl, 'Error details:', error)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm"
          >
            Log Debug Info
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-4">
          <div className="mb-2">Troubleshooting steps:</div>
          <ul className="text-left list-disc list-inside space-y-1">
            <li>Check browser console (F12) for detailed error messages</li>
            <li>Try refreshing the page or clearing browser cache</li>
            <li>Ensure stable internet connection</li>
            <li>Try a different browser or incognito mode</li>
            <li>Verify the PDF file is not corrupted</li>
            <li>Check if ad blockers are interfering with PDF loading</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pdf-viewer-container bg-white dark:bg-black" ref={containerRef}>
      <div className="pdf-toolbar flex items-center gap-2 p-3 bg-gray-50 dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border">
        <button 
          onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
          className="px-2 py-1 bg-gray-200 dark:bg-dark-card hover:bg-gray-300 dark:hover:bg-dark-border rounded text-gray-700 dark:text-dark-text-secondary"
        >-</button>
        <span className="text-sm text-gray-600 dark:text-dark-text-secondary min-w-[50px] text-center">{(scale * 100).toFixed(0)}%</span>
        <button 
          onClick={() => setScale(s => Math.min(3, s + 0.1))}
          className="px-2 py-1 bg-gray-200 dark:bg-dark-card hover:bg-gray-300 dark:hover:bg-dark-border rounded text-gray-700 dark:text-dark-text-secondary"
        >+</button>
        <input
          type="text"
          placeholder="Search clauses…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pdf-search-box px-2 py-1 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text rounded text-sm"
        />
        {searchResults.length > 0 && (
          <span className="pdf-search-nav flex items-center gap-1">
            <button 
              onClick={() => setSearchIndex(i => Math.max(0, i - 1))}
              className="px-1 py-1 bg-gray-200 dark:bg-dark-card hover:bg-gray-300 dark:hover:bg-dark-border rounded text-xs text-gray-700 dark:text-dark-text-secondary"
            >&uarr;</button>
            <span className="text-xs text-gray-600 dark:text-dark-text-secondary">{searchIndex + 1}/{searchResults.length}</span>
            <button 
              onClick={() => setSearchIndex(i => Math.min(searchResults.length - 1, i + 1))}
              className="px-1 py-1 bg-gray-200 dark:bg-dark-card hover:bg-gray-300 dark:hover:bg-dark-border rounded text-xs text-gray-700 dark:text-dark-text-secondary"
            >&darr;</button>
          </span>
        )}
        <label className="flex items-center gap-1 text-sm text-gray-600 dark:text-dark-text-secondary ml-4">
          <input type="checkbox" checked={showOverlays} readOnly className="rounded" /> Overlays
        </label>
      </div>
      <div className="pdf-pages overflow-auto p-4 bg-gray-100 dark:bg-black">
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