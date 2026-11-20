'use client'

import { useState, useMemo, useEffect, useId } from 'react'
import { Clause } from '@/lib/api'
import AudioPlayer, { VoiceUnavailableNote } from './AudioPlayer'
import RichText from './RichText'

interface AnalysisSidebarProps {
  clauses: Clause[]
  onClauseClick: (clauseId: string) => void
  onAskAboutClause?: (clause: Clause) => void
  documentSummary?: string
  fullAnalysis?: string
  highlightedClauseId?: string | null
}

type RiskFilter = 'all' | Clause['category']

// One place that maps the backend's Red/Yellow/Green to labels and token classes.
const RISK = {
  Red: { label: 'High', badge: 'badge-red', dot: 'dot-high', bar: 'bg-risk-high', text: 'text-risk-high' },
  Yellow: { label: 'Medium', badge: 'badge-yellow', dot: 'dot-medium', bar: 'bg-risk-medium', text: 'text-risk-medium' },
  Green: { label: 'Low', badge: 'badge-green', dot: 'dot-low', bar: 'bg-risk-low', text: 'text-risk-low' },
} as const

const riskOf = (category: string) => RISK[category as keyof typeof RISK] ?? RISK.Yellow

const sectionLabel = 'text-xs font-semibold uppercase tracking-wider text-ink-muted'

export default function AnalysisSidebar({
  clauses,
  onClauseClick,
  onAskAboutClause,
  documentSummary,
  highlightedClauseId,
}: AnalysisSidebarProps) {
  const [filter, setFilter] = useState<RiskFilter>('all')
  const [summaryOpen, setSummaryOpen] = useState(true)
  const summaryId = useId()

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

  // When a clause is picked in the PDF, bring its card into view.
  useEffect(() => {
    if (!highlightedClauseId) return
    const el = document.getElementById(`sidebar-${highlightedClauseId}`)
    if (!el) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
  }, [highlightedClauseId])

  const avgRisk = stats.avgScore > 0.6 ? RISK.Red : stats.avgScore > 0.3 ? RISK.Yellow : RISK.Green

  const filters = [
    { key: 'Red', count: stats.high },
    { key: 'Yellow', count: stats.medium },
    { key: 'Green', count: stats.low },
  ] as const

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto flex max-w-2xl flex-col gap-3">

        {/* Risk Overview */}
        <section aria-label="Risk overview" className="card animate-fadeIn p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h2 className={sectionLabel}>Risk Overview</h2>
            {stats.total > 0 && (
              <p className={`text-sm font-semibold ${avgRisk.text}`}>
                Average clause risk {(stats.avgScore * 100).toFixed(0)}%
              </p>
            )}
          </div>

          <div
            role="img"
            aria-label={`${stats.high} high risk, ${stats.medium} medium risk and ${stats.low} low risk clauses`}
            className="mb-3 flex h-2 overflow-hidden rounded-full bg-line"
          >
            {stats.total > 0 && (
              <>
                <div className="bg-risk-high" style={{ width: `${(stats.high / stats.total) * 100}%` }} />
                <div className="bg-risk-medium" style={{ width: `${(stats.medium / stats.total) * 100}%` }} />
                <div className="bg-risk-low" style={{ width: `${(stats.low / stats.total) * 100}%` }} />
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter clauses by risk">
            {filters.map(({ key, count }) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(f => (f === key ? 'all' : key))}
                className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors ${
                  filter === key
                    ? 'border-primary bg-primary/10 text-ink'
                    : 'border-line text-ink-secondary hover:bg-surface-hover hover:text-ink'
                }`}
              >
                <span className={`dot ${RISK[key].dot}`} />
                {count} {RISK[key].label}
              </button>
            ))}
          </div>
        </section>

        {/* Executive Summary */}
        {documentSummary && (
          <section className="card animate-fadeIn overflow-hidden">
            <h2>
              <button
                type="button"
                onClick={() => setSummaryOpen(open => !open)}
                aria-expanded={summaryOpen}
                aria-controls={summaryId}
                className="flex w-full items-center justify-between gap-3 p-4 text-left text-sm font-semibold text-ink transition-colors hover:bg-surface-hover"
              >
                <span className="flex items-center gap-2">
                  <svg aria-hidden="true" className="text-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  Executive Summary
                </span>
                <svg aria-hidden="true" className={`text-ink-muted transition-transform ${summaryOpen ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </h2>
            <div id={summaryId} hidden={!summaryOpen} className="border-t border-line px-4 pb-4 pt-3">
              <RichText text={documentSummary} className="text-sm leading-relaxed text-ink-secondary" />
              <div className="mt-3">
                <AudioPlayer text={documentSummary} subject="the summary" showLabel />
                <VoiceUnavailableNote />
              </div>
            </div>
          </section>
        )}

        {/* Clause List */}
        <section aria-label="Clauses" className="animate-fadeIn">
          <div className="mb-2 flex min-h-8 items-center justify-between px-1">
            <h2 className={sectionLabel}>Clauses ({filtered.length})</h2>
            {filter !== 'all' && (
              <button type="button" onClick={() => setFilter('all')} className="btn-ghost text-xs font-medium text-primary">
                Show all
              </button>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {filtered.map(clause => (
              <ClauseCard
                key={clause.id}
                clause={clause}
                isHighlighted={highlightedClauseId === clause.id}
                onShow={() => onClauseClick(clause.id)}
                onAsk={onAskAboutClause ? () => onAskAboutClause(clause) : undefined}
              />
            ))}
          </ul>

          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-muted">
              No clauses match this filter
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Clause Card ─────────────────────────────────────────────────────

interface ClauseCardProps {
  clause: Clause
  isHighlighted: boolean
  onShow: () => void
  onAsk?: () => void
}

function ClauseCard({ clause, isHighlighted, onShow, onAsk }: ClauseCardProps) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const risk = riskOf(clause.category)

  return (
    <li
      id={`sidebar-${clause.id}`}
      className={`card card-interactive overflow-hidden ${isHighlighted ? 'card-active' : ''}`}
    >
      {/* The whole header is one real button: it shows the clause in the PDF. */}
      <button
        type="button"
        onClick={onShow}
        aria-current={isHighlighted ? 'true' : undefined}
        className="block w-full p-4 text-left transition-colors hover:bg-surface-hover/60"
      >
        <span className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`badge ${risk.badge}`}>
            <span className={`dot ${risk.dot}`} />
            {risk.label}<span className="sr-only"> risk</span>
          </span>
          <span className="rounded bg-surface-raised px-2 py-0.5 text-xs font-medium text-ink-secondary">
            {clause.type}
          </span>
          <span className="ml-auto text-xs text-ink-muted">
            <span className="sr-only">page </span><span aria-hidden="true">p.</span>{clause.page_number}
          </span>
        </span>

        {clause.summary && (
          <span className="mb-1 block text-sm font-medium leading-snug text-ink">
            {clause.summary}
          </span>
        )}

        <span className="line-clamp-2 text-xs leading-relaxed text-ink-secondary">
          {clause.explanation}
        </span>
        <span className="sr-only">. Show this clause in the document.</span>
      </button>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-1 border-t border-line bg-surface-raised/50 px-3 py-1.5">
        <button
          type="button"
          onClick={() => setExpanded(open => !open)}
          aria-expanded={expanded}
          aria-controls={detailsId}
          className="btn-ghost min-h-8 text-xs font-medium"
        >
          {expanded ? 'Less' : 'More'}
          <svg aria-hidden="true" className={`transition-transform ${expanded ? 'rotate-180' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <AudioPlayer
          text={clause.explanation || clause.summary || clause.text.slice(0, 200)}
          subject={`the explanation of this ${clause.type} clause`}
          showLabel
        />

        {onAsk && (
          <button type="button" onClick={onAsk} className="btn-ghost min-h-8 text-xs font-medium">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Ask<span className="sr-only"> about this {clause.type} clause</span>
          </button>
        )}
      </div>

      {/* Expanded content */}
      <div id={detailsId} hidden={!expanded} className="space-y-3 border-t border-line px-4 pb-4 pt-3">
        <div>
          <h3 className="mb-1.5 text-xs font-semibold text-ink-muted">Original Text</h3>
          <p className="rounded-lg border border-line bg-surface-raised p-3 text-xs leading-relaxed text-ink-secondary">
            {clause.text.slice(0, 500)}{clause.text.length > 500 ? '…' : ''}
          </p>
        </div>

        {clause.entities && clause.entities.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-xs font-semibold text-ink-muted">Entities</h3>
            <ul className="flex flex-wrap gap-1.5">
              {clause.entities.map((e, i) => (
                <li key={i} className="rounded border border-primary/25 bg-primary/10 px-2 py-1 text-xs text-ink">
                  {e.text} <span className="ml-1 uppercase text-ink-muted">({e.type})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {clause.legal_terms && clause.legal_terms.length > 0 && (
          <div>
            <h3 className="mb-1.5 text-xs font-semibold text-ink-muted">Legal Terms</h3>
            <dl className="space-y-1.5 text-xs leading-relaxed">
              {clause.legal_terms.map((lt, i) => (
                <div key={i}>
                  <dt className="inline font-semibold text-ink">{lt.term}:</dt>{' '}
                  <dd className="inline text-ink-secondary">{lt.definition}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <span className="text-xs font-medium text-ink-muted">Risk score:</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div className={`h-full rounded-full ${risk.bar}`} style={{ width: `${clause.score * 100}%` }} />
          </div>
          <span className="text-xs font-semibold text-ink">
            {(clause.score * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </li>
  )
}
