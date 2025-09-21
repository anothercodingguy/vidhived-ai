# Frontend-Backend Connection Test

## ✅ Backend Endpoints (app_simple.py)

### Core Endpoints:
- `GET /health` - Health check
- `POST /upload` - Upload PDF file
- `GET /pdf-file/<doc_id>` - Serve PDF file with CORS headers
- `GET /pdf/<doc_id>` - Get PDF URL
- `GET /document/<doc_id>` - Get document analysis status
- `POST /ask` - Ask questions about document
- `GET /debug` - Debug information

### Advanced Endpoints (Stubs):
- `POST /analyze-clauses` - Returns 501 (not implemented)
- `POST /extract-entities` - Returns 501 (not implemented)
- `POST /score-importance` - Returns 501 (not implemented)
- `POST /summarize-text` - Returns 501 (not implemented)

## ✅ Frontend API Calls (lib/api.ts)

### Used by Components:
- `uploadPDF()` → `POST /upload` ✅
- `getDocumentStatus()` → `GET /document/<id>` ✅
- `getPDFUrl()` → `GET /pdf/<id>` ✅
- `askQuestion()` → `POST /ask` ✅

### Advanced Features (Not Used in Simple Mode):
- `analyzeClauses()` → `POST /analyze-clauses` (returns 501)
- `extractEntities()` → `POST /extract-entities` (returns 501)
- `scoreImportance()` → `POST /score-importance` (returns 501)
- `summarizeText()` → `POST /summarize-text` (returns 501)

## ✅ Data Structure Compatibility

### Backend Returns:
```json
{
  "documentId": "uuid",
  "status": "completed",
  "analysis": [
    {
      "id": "1",
      "page_number": 1,
      "text": "clause text",
      "bounding_box": { "vertices": [...] },
      "ocr_page_width": 612,
      "ocr_page_height": 792,
      "score": 0.8,
      "category": "Green|Yellow|Red",
      "type": "clause type",
      "explanation": "explanation text"
    }
  ],
  "documentSummary": "summary text",
  "fullAnalysis": "full analysis text"
}
```

### Frontend Expects (Clause interface):
```typescript
interface Clause {
  id: string
  page_number: number
  text: string
  bounding_box: { vertices: Array<{x: number, y: number}> }
  ocr_page_width: number
  ocr_page_height: number
  score: number
  category: 'Red' | 'Yellow' | 'Green'
  type: string
  explanation: string
}
```

## ✅ Component Flow

1. **Upload Flow:**
   - User uploads PDF → `uploadPDF()` → `POST /upload`
   - Backend saves file and returns `{documentId, pdfUrl, message}`
   - Frontend redirects to `/document/[id]`

2. **Document Page Flow:**
   - `getPDFUrl(id)` → `GET /pdf/<id>` → Returns PDF URL
   - `getDocumentStatus(id)` → `GET /document/<id>` → Returns analysis
   - PDFViewer loads PDF from URL
   - AnalysisSidebar displays clauses

3. **Ask Questions Flow:**
   - User types question → `askQuestion(id, query)` → `POST /ask`
   - Backend returns sample answer based on keywords
   - AskPanel displays the answer

## ✅ All Connections Verified

The frontend and backend are now properly connected with:
- ✅ Matching API endpoints
- ✅ Compatible data structures
- ✅ Proper CORS headers
- ✅ Error handling
- ✅ Sample data for demonstration