'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Clause } from '@/lib/api'
import AudioPlayer from './AudioPlayer'

interface AnalysisSidebarProps {
  clauses: Clause[]
  onClauseClick: (clauseId: string) => void
  onAskAboutClause?: (clause: Clause) => void
  documentSummary?: string
  fullAnalysis?: string
  highlightedClauseId?: string | null
}

export default function AnalysisSidebar({
  clauses,
  onClauseClick,
  onAskAboutClause,
  documentSummary,
  fullAnalysis,
  highlightedClauseId,
}: AnalysisSidebarProps) {
  const [filter, setFilter] = useState<'all' | 'Red' | 'Yellow' | 'Green'>('all')
  const [expandedSection, setExpandedSection] = useState<'summary' | 'clauses' | null>('summary')
  const clauseListRef = useRef<HTMLDivElement>(null)

  const stats = useMemo(() => {
    const high = clauses.filter(c => c.category === 'Red').length
    const medium = clauses.filter(c => c.category === 'Yellow').length
    const low = clauses.filter(c => c.category === 'Green').length
    const avgScore = clauses.length ? clauses.reduce((s, c) => s + c.score, 0) / clauses.length : 0
    return { high, medium, low, total: clauses.length, avgScore }
  }, [clauses])

  const filtered = useMemo(() => {
    if (filter === 'all') return clauses
    return clauses.filter(c => c.category === filter)
  }, [filter, clauses])

  useEffect(() => {
    if (highlightedClauseId) {
      const el = document.getElementById(`sidebar-${highlightedClauseId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedClauseId])

  const riskColor = stats.avgScore > 0.6 ? 'var(--color-risk-high)' : stats.avgScore > 0.3 ? 'var(--color-risk-medium)' : 'var(--color-risk-low)'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={clauseListRef}>

        {/* Risk Overview */}
        <div className="glass p-4 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Risk Overview
            </h3>
            <div className="text-sm font-bold" style={{ color: `rgb(${riskColor})` }}>
              {(stats.avgScore * 100).toFixed(0)}% risk
            </div>
          </div>

          {/* Risk bar */}
          <div className="flex rounded-full overflow-hidden h-1.5 mb-3" style={{ background: 'rgb(var(--color-border))' }}>
            {stats.total > 0 && (
              <>
                <div style={{ width: `${(stats.high / stats.total) * 100}%`, background: 'rgb(var(--color-risk-high))' }} />
                <div style={{ width: `${(stats.medium / stats.total) * 100}%`, background: 'rgb(var(--color-risk-medium))' }} />
                <div style={{ width: `${(stats.low / stats.total) * 100}%`, background: 'rgb(var(--color-risk-low))' }} />
              </>
            )}
          </div>

          <div className="flex gap-4 text-xs">
            <button onClick={() => setFilter(f => f === 'Red' ? 'all' : 'Red')} className={`flex items-center gap-1.5 transition-opacity ${filter !== 'all' && filter !== 'Red' ? 'opacity-30' : ''}`}>
              <span className="dot dot-high" />
              <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{stats.high} High</span>
            </button>
            <button onClick={() => setFilter(f => f === 'Yellow' ? 'all' : 'Yellow')} className={`flex items-center gap-1.5 transition-opacity ${filter !== 'all' && filter !== 'Yellow' ? 'opacity-30' : ''}`}>
              <span className="dot dot-medium" />
              <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{stats.medium} Medium</span>
            </button>
            <button onClick={() => setFilter(f => f === 'Green' ? 'all' : 'Green')} className={`flex items-center gap-1.5 transition-opacity ${filter !== 'all' && filter !== 'Green' ? 'opacity-30' : ''}`}>
              <span className="dot dot-low" />
              <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{stats.low} Low</span>
            </button>
          </div>
        </div>

        {/* Executive Summary */}
        {documentSummary && (
          <div className="glass animate-fadeIn" style={{ animationDelay: '.05s' }}>
            <button
              onClick={() => setExpandedSection(s => s === 'summary' ? null : 'summary')}
              className="w-full flex items-center justify-between p-4"
            >
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgb(var(--color-primary))' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                Executive Summary
              </h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: expandedSection === 'summary' ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: 'rgb(var(--color-text-muted))' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {expandedSection === 'summary' && (
              <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--glass-border)' }}>
                <div className="pt-3 text-sm leading-relaxed whitespace-pre-line" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {documentSummary}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <AudioPlayer text={documentSummary} size="sm" />
                  <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Listen</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clause List */}
        <div className="animate-fadeIn" style={{ animationDelay: '.1s' }}>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Clauses ({filtered.length})
            </h3>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="text-xs font-medium" style={{ color: 'rgb(var(--color-primary))' }}>
                Show all
              </button>
            )}
          </div>

          <div className="space-y-2">
            {filtered.map((clause, idx) => (
              <ClauseCard
                key={clause.id}
                clause={clause}
                isHighlighted={highlightedClauseId === clause.id}
                onClick={() => onClauseClick(clause.id)}
                onAsk={onAskAboutClause ? () => onAskAboutClause(clause) : undefined}
                index={idx}
              />
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-8 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
                No clauses match this filter
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Clause Card ─────────────────────────────────────────────────────

interface ClauseCardProps {
  clause: Clause
  isHighlighted: boolean
  onClick: () => void
  onAsk?: () => void
  index: number
}

function ClauseCard({ clause, isHighlighted, onClick, onAsk, index }: ClauseCardProps) {
  const [expanded, setExpanded] = useState(false)

  const badgeClass = clause.category === 'Red' ? 'badge-red' : clause.category === 'Yellow' ? 'badge-yellow' : 'badge-green'
  const riskLabel = clause.category === 'Red' ? 'High' : clause.category === 'Yellow' ? 'Medium' : 'Low'
  const dotClass = clause.category === 'Red' ? 'dot-high' : clause.category === 'Yellow' ? 'dot-medium' : 'dot-low'

  return (
    <div
      id={`sidebar-${clause.id}`}
      className={`glass cursor-pointer transition-all ${isHighlighted ? 'glass-active' : ''}`}
      style={{ animationDelay: `${index * 0.02}s` }}
    >
      {/* Header */}
      <div className="p-3 flex items-start gap-3" onClick={onClick}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`badge ${badgeClass}`}>
              <span className={`dot ${dotClass}`} />
              {riskLabel}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{
              background: 'rgb(var(--color-surface-hover))',
              color: 'rgb(var(--color-text-secondary))',
            }}>
              {clause.type}
            </span>
            <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              p.{clause.page_number}
            </span>
          </div>

          {clause.summary && (
            <p className="text-sm font-medium mb-0.5" style={{ color: 'rgb(var(--color-text))' }}>
              {clause.summary}
            </p>
          )}

          <p className="text-xs" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            {clause.explanation}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 pb-2 flex items-center gap-1 border-t" style={{ borderColor: 'var(--glass-border)' }}>
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
          className="btn-ghost py-1 px-2 text-xs"
        >
          {expanded ? 'Less' : 'More'}
        </button>

        <button onClick={(e) => { e.stopPropagation(); onClick() }} className="btn-ghost py-1 px-2 text-xs" title="Highlight in PDF">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </button>

        <AudioPlayer text={clause.explanation || clause.summary || clause.text.slice(0, 200)} size="sm" />

        {onAsk && (
          <button onClick={(e) => { e.stopPropagation(); onAsk() }} className="btn-ghost py-1 px-2 text-xs" title="Ask about this clause">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          </button>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 border-t animate-fadeIn" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="pt-2 space-y-2">
            {/* Full text */}
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Original Text</p>
              <p className="text-xs leading-relaxed p-2 rounded" style={{
                background: 'rgb(var(--color-surface-hover))',
                color: 'rgb(var(--color-text-secondary))',
              }}>
                {clause.text.slice(0, 500)}{clause.text.length > 500 ? '...' : ''}
              </p>
            </div>

            {/* Entities */}
            {clause.entities && clause.entities.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Entities</p>
                <div className="flex flex-wrap gap-1">
                  {clause.entities.map((e, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded" style={{
                      background: 'rgb(var(--color-primary) / .08)',
                      color: 'rgb(var(--color-primary))',
                    }}>
                      {e.text} ({e.type})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Legal terms */}
            {clause.legal_terms && clause.legal_terms.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'rgb(var(--color-text-muted))' }}>Legal Terms</p>
                {clause.legal_terms.map((lt, i) => (
                  <div key={i} className="text-xs mb-1">
                    <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{lt.term}:</span>{' '}
                    <span style={{ color: 'rgb(var(--color-text-secondary))' }}>{lt.definition}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Risk Score */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Risk score:</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--color-border))' }}>
                <div className="h-full rounded-full" style={{
                  width: `${clause.score * 100}%`,
                  background: clause.category === 'Red' ? 'rgb(var(--color-risk-high))' : clause.category === 'Yellow' ? 'rgb(var(--color-risk-medium))' : 'rgb(var(--color-risk-low))',
                }} />
              </div>
              <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                {(clause.score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}