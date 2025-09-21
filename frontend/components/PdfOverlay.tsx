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
        return (
          <div
            key={overlay.clause.id}
            className={`pdf-overlay-box category-${overlay.clause.category.toLowerCase()}${isHighlighted ? ' highlight' : ''}`}
            style={{
              position: 'absolute',
              left, top, width, height,
              border: `2px solid ${overlay.color}`,
              background: `${overlay.color}22`,
              borderRadius: 4,
              pointerEvents: 'auto',
              transition: 'box-shadow 0.2s',
              boxShadow: isHighlighted ? `0 0 0 4px ${overlay.color}88` : undefined,
              zIndex: 20 + (isHighlighted ? 1 : 0),
              cursor: 'pointer',
            }}
            tabIndex={0}
            aria-label={`Clause ${overlay.clause.id}: ${overlay.clause.text.slice(0, 60)}`}
            aria-selected={isHighlighted}
            onMouseEnter={() => onHover(overlay.clause.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick(overlay.clause.id)}
            onFocus={() => onHover(overlay.clause.id)}
            onBlur={() => onHover(null)}
            role="button"
          >
            {/* Tooltip/annotation preview */}
            {isHighlighted && (
              <div className="pdf-overlay-tooltip" role="tooltip">
                <div className="tooltip-title">{overlay.clause.text.slice(0, 120)}{overlay.clause.text.length > 120 ? '…' : ''}</div>
                <div className="tooltip-score">Score: {overlay.clause.score.toFixed(2)} | Category: {overlay.clause.category}</div>
                {annotations[overlay.clause.id] && (
                  <div className="tooltip-note">Note: {annotations[overlay.clause.id]}</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PdfOverlay;
