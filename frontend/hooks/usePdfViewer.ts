'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf';
import type { Clause } from '@/lib/api';

// Set workerSrc for pdfjs
if (typeof window !== 'undefined' && GlobalWorkerOptions) {
  GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/build/pdf.worker.min.js';
}

export interface PdfPageData {
  page: PDFPageProxy;
  pageNumber: number;
  viewport: ReturnType<PDFPageProxy['getViewport']>;
  canvasRef: { current: HTMLCanvasElement | null };
  overlayRef: { current: HTMLDivElement | null };
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
  const [highlightedClauseId, setHighlightedClauseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [annotations, setAnnotations] = useState<Record<string, string>>(() => {
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

  // Load PDF
  useEffect(() => {
    let cancelled = false;
    let timeoutId: any;
    
    setLoading(true);
    setError(null);
    
    if (!pdfUrl || pdfUrl.trim() === '') {
      setError('No PDF URL provided. Please upload a PDF file first.');
      setLoading(false);
      return;
    }
    
    console.log('Loading PDF from URL:', pdfUrl);
    
    // Create timeout
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('PDF loading timed out after 30 seconds. Please try refreshing the page.'));
      }, 30000);
    });
    
    // Load PDF
    Promise.race([
      getDocument(pdfUrl).promise,
      timeoutPromise
    ]).then((doc: PDFDocumentProxy) => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      setPdf(doc);
      setNumPages(doc.numPages);
      setLoading(false);
      console.log('PDF loaded successfully');
    }).catch((e: any) => {
      if (cancelled) return;
      clearTimeout(timeoutId);
      
      let errorMessage = 'Failed to load PDF: ';
      if (e.message?.includes('timed out')) {
        errorMessage += 'Loading timed out. Please check your connection and try again.';
      } else {
        errorMessage += e.message || 'Unknown error. Please try again.';
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
        page: null as any,
        viewport: null as any,
        canvasRef: { current: null },
        overlayRef: { current: null },
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
      
      const rect = clause.bounding_box ? { left: 0, top: 0, width: 0, height: 0 } : null;
      const color = clause.category === 'Red' ? '#ef4444' : clause.category === 'Yellow' ? '#facc15' : '#22c55e';
      
      overlayMap[pageNum].push({
        clause,
        rect,
        color,
        pageNumber: pageNum,
        error: clause.bounding_box ? undefined : 'No bounding box data'
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
    setAnnotations((prev: Record<string, string>) => {
      const next = { ...prev, [clauseId]: note };
      if (typeof window !== 'undefined') {
        localStorage.setItem('pdfClauseNotes', JSON.stringify(next));
      }
      return next;
    });
  }, []);

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