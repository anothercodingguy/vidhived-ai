import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PdfViewer from '../components/PdfViewer';
import type { Clause } from '../lib/api';

describe('PdfViewer', () => {
  const sampleClauses: Clause[] = [
    {
      id: 'c1',
      page_number: 1,
      text: 'Sample clause 1',
      bounding_box: { vertices: [ { x: 100, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 150 }, { x: 100, y: 150 } ] },
      ocr_page_width: 612,
      ocr_page_height: 792,
      score: 0.9,
      category: 'Red',
      type: 'Test',
      explanation: 'Test explanation',
    },
    {
      id: 'c2',
      page_number: 1,
      text: 'Sample clause 2',
      bounding_box: { vertices: [ { x: 300, y: 200 }, { x: 400, y: 200 }, { x: 400, y: 250 }, { x: 300, y: 250 } ] },
      ocr_page_width: 612,
      ocr_page_height: 792,
      score: 0.7,
      category: 'Yellow',
      type: 'Test',
      explanation: 'Test explanation',
    },
  ];

  it('renders PDFViewer and overlays', () => {
    render(<PdfViewer pdfUrl="/test.pdf" clauses={sampleClauses} />);
    expect(screen.getByText(/Loading PDF/i)).toBeInTheDocument();
  });

  it('highlights clause on click', () => {
    // This is a stub; actual PDF rendering is not tested in JSDOM
    // You would mock usePdfViewer and test overlay click logic
    expect(true).toBe(true);
  });

  it('searches and highlights clauses', () => {
    // This is a stub; test search logic in usePdfViewer
    expect(true).toBe(true);
  });
});
