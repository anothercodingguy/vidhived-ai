import React from 'react';
import type { OverlayBox } from '@/hooks/usePdfViewer';

interface PdfOverlayProps {
  overlays: OverlayBox[];
  scale: number;
  onHover: (clauseId: string | null) => void;
  onClick: (clauseId: string) => void;
  highlightedClauseId: string | null;
  annotations: Record<string, string>;
  showOverlays: boolean;
}

export const PdfOverlay: React.FC<PdfOverlayProps> = ({
  overlays,
  scale,
  onHover,
  onClick,
  highlightedClauseId,
  annotations,
  showOverlays
}) => {
  return (
    <div className="pdf-overlay-layer" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 10 }}>
      {showOverlays && overlays.map((overlay, idx) => {
        if (!overlay.clause.bounding_box || !overlay.clause.ocr_page_width || !overlay.clause.ocr_page_height) {
          // No overlay possible
          return null;
        }
        // Map vertices to rect (assume axis-aligned for now)
        const verts = overlay.clause.bounding_box.vertices;
        const scaleX = scale * (overlay.clause.ocr_page_width ? 1 : 1); // will be set in parent
        const scaleY = scale * (overlay.clause.ocr_page_height ? 1 : 1);
        const xs = verts.map(v => v.x * scaleX);
        const ys = verts.map(v => v.y * scaleY);
        const left = Math.min(...xs);
        const top = Math.min(...ys);
        const width = Math.max(...xs) - left;
        const height = Math.max(...ys) - top;
        const isHighlighted = highlightedClauseId === overlay.clause.id;

        // Gradient color calculation: Red intensity based on score
        const opacity = Math.max(0.1, overlay.clause.score * 0.5); // 0.1 to 0.5 opacity
        const bgColor = overlay.clause.category === 'Red'
          ? `rgba(239, 68, 68, ${opacity})`
          : overlay.clause.category === 'Yellow'
            ? `rgba(234, 179, 8, ${opacity})`
            : `rgba(34, 197, 94, ${opacity})`;

        return (
          <div
            key={overlay.clause.id}
            className={`pdf-overlay-box group ${isHighlighted ? 'z-50' : 'z-20'}`}
            style={{
              position: 'absolute',
              left, top, width, height,
              border: `2px solid ${overlay.color}`,
              background: bgColor,
              borderRadius: 4,
              pointerEvents: 'auto',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              boxShadow: isHighlighted ? `0 0 0 4px ${overlay.color}88` : 'none',
            }}
            onMouseEnter={() => onHover(overlay.clause.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(overlay.clause.id)}
          >
            {/* Rich Interactive Tooltip */}
            <div className="hidden group-hover:block absolute left-0 -top-2 transform -translate-y-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-[300px] z-50 text-left">

              {/* Header */}
              <div className="flex justify-between items-start mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${overlay.clause.category === 'Red' ? 'bg-red-100 text-red-800' :
                    overlay.clause.category === 'Yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}>
                  {overlay.clause.type}
                </span>
                <span className="text-xs text-gray-500 font-mono">Risk: {(overlay.clause.score * 100).toFixed(0)}%</span>
              </div>

              {/* Summary */}
              {overlay.clause.summary && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Summary</div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{overlay.clause.summary}</p>
                </div>
              )}

              {/* Entities */}
              {overlay.clause.entities && overlay.clause.entities.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Key Entities</div>
                  <div className="flex flex-wrap gap-1">
                    {overlay.clause.entities.map((e, i) => (
                      <span key={i} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                        {e.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Legal Terms */}
              {overlay.clause.legal_terms && overlay.clause.legal_terms.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Definitions</div>
                  <ul className="space-y-1">
                    {overlay.clause.legal_terms.slice(0, 2).map((t, i) => (
                      <li key={i} className="text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{t.term}:</span>
                        <span className="text-gray-600 dark:text-gray-400 ml-1">{t.definition}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* User Annotation */}
              {annotations[overlay.clause.id] && (
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-xs font-semibold text-gray-500">Note:</div>
                  <p className="text-xs italic text-gray-600 dark:text-gray-400">{annotations[overlay.clause.id]}</p>
                </div>
              )}

            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PdfOverlay;
