import { useEffect, useRef, useState, useCallback } from 'react';
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf';
import type { Clause } from '@/lib/api';

// Set workerSrc for pdfjs with fallback options
if (typeof window !== 'undefined' && GlobalWorkerOptions) {
  // Try multiple CDN sources for better reliability
  const workerSources = [
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/build/pdf.worker.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js',
    'https://unpkg.com/pdfjs-dist@4.2.67/build/pdf.worker.min.js'
  ];
  
  GlobalWorkerOptions.workerSrc = workerSources[0];
  
  // Add error handling for worker loading
  const originalWorkerSrc = GlobalWorkerOptions.workerSrc;
  let workerIndex = 0;
  
  const tryNextWorker = () => {
    workerIndex++;
    if (workerIndex < workerSources.length) {
      console.warn(`PDF worker failed, trying fallback ${workerIndex + 1}/${workerSources.length}`);
      GlobalWorkerOptions.workerSrc = workerSources[workerIndex];
    }
  };
  
  // Store fallback function globally for error handling
  (window as any).pdfWorkerFallback = tryNextWorker;
}

export interface PdfPageData {
  page: PDFPageProxy;
  pageNumber: number;
  viewport: ReturnType<PDFPageProxy['getViewport']>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  overlayRef: React.RefObject<HTMLDivElement>;
}

export interface OverlayBox {
  clause: Clause;
  rect: { left: number; top: number; width: number; height: number } | null;
  color: string;
  pageNumber: number;
  error?: string;
}

export interface UsePdfViewerOptions {
  pdfUrl: string;
  clauses: Clause[];
  initialScale?: number;
}

export function usePdfViewer({ pdfUrl, clauses, initialScale = 1.0 }: UsePdfViewerOptions) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageData, setPageData] = useState<PdfPageData[]>([]);
  const [scale, setScale] = useState(initialScale);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [highlightedClauseId, setHighlightedClauseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]); // clause ids
  const [searchIndex, setSearchIndex] = useState(0);
  const [annotations, setAnnotations] = useState<Record<string, string>>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('pdfClauseNotes') || '{}');
      } catch {
        return {};
      }
    }
    return {};
  });
  const [overlays, setOverlays] = useState<Record<number, OverlayBox[]>>({});

  // Load PDF with timeout handling
  useEffect(() => {
    let cancelled = false;
    let timeoutId: NodeJS.Timeout;
    
    setLoading(true);
    setError(null);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('PDF loading timed out after 30 seconds. Please check your file, network, or try a different PDF.'));
      }, 30000); // 30 second timeout
    });
    
    // Add debugging
    console.log('Loading PDF from URL:', pdfUrl);
    console.log('PDF.js worker source:', GlobalWorkerOptions.workerSrc);
    
    // Validate PDF URL first
    if (!pdfUrl || pdfUrl.trim() === '') {
      setError('No PDF URL provided. Please upload a PDF file first.');
      setLoading(false);
      return;
    }
    
    // Test if URL is accessible
    fetch(pdfUrl, { method: 'HEAD' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`PDF file not accessible: ${response.status} ${response.statusText}`);
        }
        console.log('PDF URL is accessible, content-type:', response.headers.get('content-type'));
      })
      .catch(fetchError => {
        console.warn('PDF URL accessibility check failed:', fetchError);
        // Continue anyway, as some servers don't support HEAD requests
      });
    
    // Load PDF with timeout
    Promise.race([
      getDocument({
        url: pdfUrl,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/standard_fonts/',
        // Add additional options for better loading
        disableAutoFetch: false,
        disableStream: false,
        disableRange: false,
        // Add progress callback for debugging
        onProgress: (progress: any) => {
          if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            console.log(`PDF loading progress: ${percent}% (${progress.loaded}/${progress.total} bytes)`);
          }
        },
      }).promise,
      timeoutPromise
    ]).then((doc: PDFDocumentProxy) => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      setPdf(doc);
      setNumPages(doc.numPages);
      setLoading(false);
    }).catch((e: any) => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      
      let errorMessage = 'Failed to load PDF: ';
      
      if (e.message?.includes('timed out')) {
        errorMessage += e.message + '\n\nTry a different browser or PDF file. If you see errors in the console, share them for support. Check network tab for PDF worker and file fetch issues.';
      } else if (e.name === 'InvalidPDFException') {
        errorMessage += 'Invalid PDF file. Please ensure the file is a valid PDF document.';
      } else if (e.name === 'MissingPDFException') {
        errorMessage += 'PDF file not found. Please check the file path or try uploading again.';
      } else if (e.name === 'UnexpectedResponseException') {
        errorMessage += 'Network error loading PDF. Please check your internet connection and try again.';
      } else {
        errorMessage += e.message || 'Unknown error occurred while loading PDF.';
      }
      
      setError(errorMessage);
      setLoading(false);
    });
    
    return () => { 
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pdfUrl]);

  // Prepare page data
  useEffect(() => {
    if (!pdf) return;
    const data: PdfPageData[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      data.push({
        pageNumber: i,
        page: null as any, // will be filled after getPage
        viewport: null as any,
        canvasRef: { current: null } as React.RefObject<HTMLCanvasElement>,
        overlayRef: { current: null } as React.RefObject<HTMLDivElement>,
      });
    }
    setPageData(data);
  }, [pdf]);

  // Map overlays for each page
  useEffect(() => {
    if (!pdf || !clauses) return;
    const overlayMap: Record<number, OverlayBox[]> = {};
    clauses.forEach(clause => {
      const pageNum = clause.page_number;
      if (!overlayMap[pageNum]) overlayMap[pageNum] = [];
      let rect: OverlayBox['rect'] = null;
      let error: string | undefined = undefined;
      if (clause.bounding_box && clause.ocr_page_width && clause.ocr_page_height) {
        // Find the page viewport size
        // We'll use scale=1 for mapping, then scale by current scale
        // (pdf.js viewport may have rotation)
        // We'll recalc on render
        rect = { left: 0, top: 0, width: 0, height: 0 };
      } else {
        error = 'No bounding box or OCR size';
      }
      overlayMap[pageNum].push({
        clause,
        rect,
        color: clause.category === 'Red' ? '#ef4444' : clause.category === 'Yellow' ? '#facc15' : '#22c55e',
        pageNumber: pageNum,
        error,
      });
    });
    setOverlays(overlayMap);
  }, [clauses, pdf]);

  // Search logic
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      setSearchIndex(0);
      return;
    }
    const lower = searchTerm.toLowerCase();
    const matches = clauses.filter(c => c.text.toLowerCase().includes(lower)).map(c => c.id);
    setSearchResults(matches);
    setSearchIndex(0);
  }, [searchTerm, clauses]);

  // Annotation persistence
  const addAnnotation = useCallback((clauseId: string, note: string) => {
    setAnnotations(prev => {
      const next = { ...prev, [clauseId]: note };
      if (typeof window !== 'undefined') {
        localStorage.setItem('pdfClauseNotes', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'n') {
        // Next clause
        setSearchIndex(idx => Math.min(idx + 1, searchResults.length - 1));
      } else if (e.key === 'p') {
        setSearchIndex(idx => Math.max(idx - 1, 0));
      } else if (e.key === 'Enter' && searchResults.length > 0) {
        setHighlightedClauseId(searchResults[searchIndex]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchResults, searchIndex]);

  // Zoom/resize observer (for overlays)
  // (Implement in PdfViewer for actual DOM size)

  return {
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
  };
}
