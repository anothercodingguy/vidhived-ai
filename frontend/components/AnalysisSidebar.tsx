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
        <div className="bg-white dark:bg-[#0f0f11] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
          <div className="bg-white dark:bg-[#0f0f11] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm animate-fadeIn overflow-hidden" style={{ animationDelay: '.05s' }}>
            <button
              onClick={() => setExpandedSection(s => s === 'summary' ? null : 'summary')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500">
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
              <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20">
                <div className="pt-3 text-sm leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
                  {documentSummary}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <AudioPlayer text={documentSummary} size="sm" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Listen</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Clause List */}
        <div className="animate-fadeIn" style={{ animationDelay: '.1s' }}>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Clauses ({filtered.length})
            </h3>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700">
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
      className={`bg-white dark:bg-[#0f0f11] border rounded-2xl cursor-pointer transition-all hover:shadow-md ${isHighlighted ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'}`}
      style={{ animationDelay: `${index * 0.02}s` }}
    >
      {/* Header */}
      <div className="p-4 flex items-start gap-3" onClick={onClick}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`badge ${badgeClass}`}>
              <span className={`dot ${dotClass}`} />
              {riskLabel}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {clause.type}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
              p.{clause.page_number}
            </span>
          </div>

          {clause.summary && (
            <p className="text-sm font-medium mb-1 text-slate-800 dark:text-slate-200 leading-snug">
              {clause.summary}
            </p>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {clause.explanation}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-2 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#09090b]/50 rounded-b-2xl">
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
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-black/10 animate-fadeIn rounded-b-2xl">
          <div className="pt-3 space-y-3">
            {/* Full text */}
            <div>
              <p className="text-xs font-semibold mb-1.5 text-slate-500 dark:text-slate-400">Original Text</p>
              <p className="text-xs leading-relaxed p-3 rounded-xl bg-slate-100 dark:bg-[#151518] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                {clause.text.slice(0, 500)}{clause.text.length > 500 ? '...' : ''}
              </p>
            </div>

            {/* Entities */}
            {clause.entities && clause.entities.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5 text-slate-500 dark:text-slate-400">Entities</p>
                <div className="flex flex-wrap gap-1.5">
                  {clause.entities.map((e, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                      {e.text} <span className="opacity-60 text-[10px] uppercase ml-1">({e.type})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Legal terms */}
            {clause.legal_terms && clause.legal_terms.length > 0 && (
              <div>
                <p className="text-xs font-semibold mb-1.5 text-slate-500 dark:text-slate-400">Legal Terms</p>
                <div className="space-y-1.5">
                  {clause.legal_terms.map((lt, i) => (
                    <div key={i} className="text-xs leading-relaxed">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{lt.term}:</span>{' '}
                      <span className="text-slate-600 dark:text-slate-400">{lt.definition}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Score */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Risk score:</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${clause.score * 100}%`,
                  background: clause.category === 'Red' ? '#ef4444' : clause.category === 'Yellow' ? '#f59e0b' : '#22c55e',
                }} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {(clause.score * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}