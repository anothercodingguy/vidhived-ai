'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getDocumentStatus, getPDFUrl, isAbortError, ApiError, DocumentAnalysis, Clause } from '@/lib/api'
import PdfViewer from '@/components/PDFViewer'
import AnalysisSidebar from '@/components/AnalysisSidebar'
import AskPanel from '@/components/AskPanel'
import ThemeToggle from '@/components/ThemeToggle'
import { LogoMark } from '@/components/Logo'

const POLL_INTERVAL_MS = 3000
// The first request may have to wake a sleeping server, so it gets a long limit.
const FIRST_LOAD_TIMEOUT_MS = 75_000
const POLL_TIMEOUT_MS = 20_000
// After this long without an answer, say why it is slow.
const SLOW_NOTICE_MS = 4000
// How many polls in a row may fail before we stop and ask the user.
const MAX_POLL_FAILURES = 3

type TabId = 'pdf' | 'analysis' | 'chat'
const TABS: { id: TabId; label: string; mobileOnly?: boolean }[] = [
  { id: 'pdf', label: 'Document', mobileOnly: true },
  { id: 'analysis', label: 'Insights' },
  { id: 'chat', label: 'Assistant' },
]

const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

export default function DocumentPage() {
  const params = useParams()
  const documentId = params.id as string

  // What the backend last told us about this document. null = no answer yet.
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  // The first load failed (timeout, network, 404, ...).
  const [loadError, setLoadError] = useState<ApiError | Error | null>(null)
  // The first load is taking long (probably a cold start).
  const [slow, setSlow] = useState(false)
  // We had an answer, but later status checks keep failing.
  const [pollError, setPollError] = useState('')
  // Changing this number restarts loading ("Try again").
  const [attempt, setAttempt] = useState(0)

  // On desktop the PDF is always visible and the right panel has two tabs.
  // Below the lg breakpoint only one of three views is shown: `pane` picks PDF or panel.
  const [pane, setPane] = useState<'pdf' | 'panel'>('panel')
  const [activeTab, setActiveTab] = useState<'analysis' | 'chat'>('analysis')
  const [highlightedClauseId, setHighlightedClauseId] = useState<string | null>(null)
  const [chatDraft, setChatDraft] = useState<{ id: number; text: string } | null>(null)
  const goToPageRef = useRef<((page: number) => void) | null>(null)
  const tabListRef = useRef<HTMLDivElement>(null)

  /*
   * Load the document status, then keep checking every 3 seconds while the
   * analysis is running. Polling stops as soon as the status is "completed"
   * or "failed", and when the page is left.
   */
  useEffect(() => {
    if (!documentId) return

    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let hasAnswer = false
    let failures = 0

    setAnalysis(null)
    setLoadError(null)
    setPollError('')
    setSlow(false)
    const slowTimer = setTimeout(() => setSlow(true), SLOW_NOTICE_MS)

    const check = async () => {
      try {
        const result = await getDocumentStatus(documentId, {
          signal: controller.signal,
          timeoutMs: hasAnswer ? POLL_TIMEOUT_MS : FIRST_LOAD_TIMEOUT_MS,
        })
        hasAnswer = true
        failures = 0
        clearTimeout(slowTimer)
        setSlow(false)
        setAnalysis(result)
        if (result.status === 'completed' || result.status === 'failed') return // finished: stop polling
        timer = setTimeout(check, POLL_INTERVAL_MS)
      } catch (err: any) {
        if (isAbortError(err) || controller.signal.aborted) return // the page was left
        clearTimeout(slowTimer)
        if (!hasAnswer) {
          setLoadError(err)
          return
        }
        failures += 1
        if (failures >= MAX_POLL_FAILURES) {
          setPollError(err?.message || 'Could not check the analysis status.')
          return
        }
        timer = setTimeout(check, POLL_INTERVAL_MS)
      }
    }
    check()

    return () => {
      controller.abort()
      clearTimeout(timer)
      clearTimeout(slowTimer)
    }
  }, [documentId, attempt])

  // If the window grows to desktop width while the phone-only Document tab is selected, select a real tab.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const onChange = () => { if (query.matches) setPane('panel') }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const retry = useCallback(() => setAttempt(n => n + 1), [])

  const handleGoToPageReady = useCallback((fn: (page: number) => void) => {
    goToPageRef.current = fn
  }, [])

  // A clause card was clicked: show that clause in the PDF.
  const handleClauseHighlight = useCallback((clauseId: string) => {
    setHighlightedClauseId(clauseId)
    const clause = analysis?.analysis?.find(c => c.id === clauseId)
    if (clause && goToPageRef.current) {
      goToPageRef.current(clause.page_number)
    }
    if (!isDesktop()) setPane('pdf')
  }, [analysis])

  // A clause box in the PDF was clicked: show its card in Insights.
  const handleOverlayClick = useCallback((clauseId: string) => {
    setHighlightedClauseId(clauseId)
    setActiveTab('analysis')
    setPane('panel')
  }, [])

  const handleAskAboutClause = useCallback((clause: Clause) => {
    const excerpt = clause.text.length > 300 ? `${clause.text.slice(0, 300)}…` : clause.text
    setChatDraft({ id: Date.now(), text: `Explain this clause from page ${clause.page_number}: "${excerpt}"` })
    setActiveTab('chat')
    setPane('panel')
  }, [])

  const selectedTab: TabId = pane === 'pdf' ? 'pdf' : activeTab

  const selectTab = (id: TabId) => {
    if (id === 'pdf') {
      setPane('pdf')
    } else {
      setActiveTab(id)
      setPane('panel')
    }
  }

  // Arrow keys move between tabs, as screen reader and keyboard users expect from a tab list.
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    const tabs = Array.from(tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])
      .filter(tab => tab.offsetParent !== null) // skip the phone-only tab when it is hidden
    const current = tabs.findIndex(tab => tab === document.activeElement)
    if (current === -1) return
    e.preventDefault()
    const next =
      e.key === 'Home' ? 0
        : e.key === 'End' ? tabs.length - 1
          : (current + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    tabs[next].focus()
    selectTab(tabs[next].dataset.tab as TabId)
  }

  // ── First load: nothing from the server yet ───────────────────────
  if (!analysis && !loadError) {
    return (
      <div className="min-h-app flex items-center justify-center bg-canvas p-6">
        <div className="max-w-sm text-center" role="status" aria-live="polite">
          <span aria-hidden="true" className="spinner mb-6 h-14 w-14 border-4" />
          {slow ? (
            <>
              <h1 className="text-lg font-semibold text-ink">Waking the server</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                The backend runs on free hosting and goes to sleep when it is not used. Waking it can take about a minute.
              </p>
            </>
          ) : (
            <h1 className="text-lg font-semibold text-ink">Loading document…</h1>
          )}
        </div>
      </div>
    )
  }

  // ── First load failed ─────────────────────────────────────────────
  if (!analysis && loadError) {
    const api = loadError instanceof ApiError ? loadError : null
    const notFound = api?.status === 404
    const notReady = api?.status === 502 || api?.status === 503 || api?.status === 504
    const title =
      notFound ? 'Document not found'
        : api?.kind === 'timeout' ? 'The server did not respond'
          : api?.kind === 'network' ? 'Could not reach the server'
            : notReady ? 'The server is not ready'
              : 'Something went wrong'
    const detail = notFound
      ? 'There is no document at this address. Check the link, or upload the PDF again.'
      : loadError.message || 'Failed to load the document.'

    return (
      <div className="min-h-app flex items-center justify-center bg-canvas p-4">
        <div className="card w-full max-w-md p-8 text-center" role="alert">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-risk-high/10 text-risk-high">
            <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-ink">{title}</h1>
          <p className="mb-6 text-sm leading-relaxed text-ink-secondary">{detail}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {!notFound && (
              <button type="button" onClick={retry} className="btn btn-primary">Try again</button>
            )}
            <Link href="/" className={`btn ${notFound ? 'btn-primary' : 'btn-secondary'}`}>Back to upload</Link>
          </div>
        </div>
      </div>
    )
  }

  // ── The document is known ─────────────────────────────────────────
  const doc = analysis!
  const clauses = doc.analysis ?? []
  const isCompleted = doc.status === 'completed'
  const isFailed = doc.status === 'failed'
  const isProcessing = !isCompleted && !isFailed // 'processing' or 'pending'
  // Completed with nothing to show: the PDF has no text layer (a scan). The backend has no OCR.
  const noText = isCompleted && clauses.length === 0
  const hasResults = isCompleted && !noText

  return (
    <div className="h-app flex flex-col bg-canvas md:p-3 lg:p-5">
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col overflow-hidden border-line bg-surface md:rounded-3xl md:border md:shadow-card">

        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-3 py-2 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/" aria-label="Back to upload" title="Back to upload" className="btn-ghost btn-icon h-10 w-10 shrink-0">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <LogoMark size={26} />
            <h1 className="truncate text-sm font-semibold text-ink sm:text-base" title={doc.filename}>
              {doc.filename || 'Document Analysis'}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <div role="status">
              {isProcessing && !pollError && (
                <span className="badge badge-blue normal-case tracking-normal">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  Analyzing
                </span>
              )}
              {isProcessing && pollError && <span className="badge badge-red normal-case tracking-normal">Not updating</span>}
              {hasResults && (
                <span className="badge badge-green normal-case tracking-normal">
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  Complete
                </span>
              )}
              {noText && <span className="badge badge-neutral normal-case tracking-normal">No text found</span>}
              {isFailed && <span className="badge badge-red normal-case tracking-normal">Failed</span>}
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/*
          Layout. Phone: one row of three tabs, then the selected view.
          Desktop (lg): two columns. PDF on the left, tabs + panel on the right.
        */}
        <main className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-2">

          {/* Tabs */}
          <div className="row-start-1 flex justify-center border-b border-line px-2 py-2 lg:col-start-2">
            <div
              ref={tabListRef}
              role="tablist"
              aria-label="Document views"
              onKeyDown={handleTabKeyDown}
              className="flex rounded-full border border-line bg-surface-raised p-1"
            >
              {TABS.map(tab => {
                const selected = selectedTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`tab-${tab.id}`}
                    data-tab={tab.id}
                    aria-selected={selected}
                    aria-controls={`panel-${tab.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => selectTab(tab.id)}
                    className={`min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors sm:gap-2 sm:px-5 ${
                      tab.mobileOnly ? 'flex lg:hidden' : 'flex'
                    } ${
                      selected
                        ? 'bg-primary-solid text-on-primary shadow-card'
                        : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
                    }`}
                  >
                    <TabIcon id={tab.id} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* PDF */}
          <section
            id="panel-pdf"
            role="tabpanel"
            aria-labelledby="tab-pdf"
            className={`row-start-2 min-h-0 min-w-0 flex-col border-line lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:flex lg:border-r ${pane === 'pdf' ? 'flex' : 'hidden'}`}
          >
            <PdfViewer
              pdfUrl={getPDFUrl(documentId)}
              clauses={clauses}
              onClauseClick={handleOverlayClick}
              highlightedClauseId={highlightedClauseId}
              onGoToPageReady={handleGoToPageReady}
            />
          </section>

          {/* Insights / Assistant */}
          <div className={`row-start-2 min-h-0 min-w-0 flex-col lg:col-start-2 lg:flex ${pane === 'panel' ? 'flex' : 'hidden'}`}>

            <section
              id="panel-analysis"
              role="tabpanel"
              aria-labelledby="tab-analysis"
              hidden={activeTab !== 'analysis'}
              className="min-h-0 flex-1"
            >
              {hasResults && (
                <AnalysisSidebar
                  clauses={clauses}
                  onClauseClick={handleClauseHighlight}
                  onAskAboutClause={handleAskAboutClause}
                  documentSummary={doc.documentSummary}
                  fullAnalysis={doc.fullAnalysis}
                  highlightedClauseId={highlightedClauseId}
                />
              )}

              {isProcessing && pollError && (
                <PanelMessage
                  tone="error"
                  title="Lost contact with the server"
                  action={<button type="button" onClick={retry} className="btn btn-primary">Check again</button>}
                >
                  <p>The analysis may still be running, but this page can no longer check its progress.</p>
                  <p>{pollError}</p>
                </PanelMessage>
              )}

              {isProcessing && !pollError && (
                <PanelMessage
                  live
                  icon={<span aria-hidden="true" className="spinner h-12 w-12" />}
                  title="Analyzing your document"
                >
                  {doc.message && <p className="font-medium text-ink">{doc.message}</p>}
                  <p>Each clause is being scored for risk. This page updates on its own when the analysis is ready.</p>
                </PanelMessage>
              )}

              {isFailed && (
                <PanelMessage
                  tone="error"
                  title="Analysis failed"
                  action={<Link href="/" className="btn btn-primary">Upload again</Link>}
                >
                  <p>The server could not analyze this document. You can still read the PDF. To try the analysis again, upload the file again.</p>
                  {doc.message && (
                    <p className="rounded-lg border border-line bg-surface-raised p-3 text-left text-xs text-ink-secondary [overflow-wrap:anywhere]">
                      <span className="font-semibold text-ink">Server message:</span> {doc.message}
                    </p>
                  )}
                </PanelMessage>
              )}

              {noText && (
                <PanelMessage
                  title="No text found in this PDF"
                  action={<Link href="/" className="btn btn-primary">Upload a different PDF</Link>}
                >
                  <p>
                    Vidhived reads the text stored inside a PDF, and found no paragraphs to analyze in this one.
                    That usually means the file is a scan or a photo. Scanned PDFs are not supported.
                  </p>
                </PanelMessage>
              )}
            </section>

            <section
              id="panel-chat"
              role="tabpanel"
              aria-labelledby="tab-chat"
              hidden={activeTab !== 'chat'}
              className="min-h-0 flex-1"
            >
              {hasResults && <AskPanel documentId={documentId} draft={chatDraft} />}

              {isProcessing && (
                <PanelMessage title="Assistant not ready yet">
                  <p>The assistant answers from the analyzed document, so it becomes available when the analysis is complete.</p>
                </PanelMessage>
              )}
              {isFailed && (
                <PanelMessage title="Assistant unavailable">
                  <p>The analysis failed, so there is no document text for the assistant to answer from.</p>
                </PanelMessage>
              )}
              {noText && (
                <PanelMessage title="Nothing to ask about">
                  <p>The assistant answers from the text of the document, and no text was found in this PDF.</p>
                </PanelMessage>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

// ── Small pieces used only on this page ─────────────────────────────

function TabIcon({ id }: { id: TabId }) {
  const common = { 'aria-hidden': true, width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (id === 'pdf') {
    return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
  }
  if (id === 'analysis') {
    return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
  }
  return <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
}

/** A centred message that fills a panel: in progress, failed, nothing to show. */
function PanelMessage({
  title,
  children,
  icon,
  action,
  tone = 'neutral',
  live = false,
}: {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
  action?: React.ReactNode
  tone?: 'neutral' | 'error'
  live?: boolean
}) {
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-5">
      <div
        role={tone === 'error' ? 'alert' : live ? 'status' : undefined}
        className={`card w-full max-w-sm p-6 text-center sm:p-8 ${tone === 'error' ? 'border-risk-high/40' : ''}`}
      >
        {icon ? (
          <div className="mb-5 flex justify-center">{icon}</div>
        ) : (
          <div className={`mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full ${tone === 'error' ? 'bg-risk-high/10 text-risk-high' : 'bg-surface-raised text-ink-secondary'}`}>
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        )}
        <h2 className="mb-2 text-base font-semibold text-ink">{title}</h2>
        <div className="space-y-3 text-sm leading-relaxed text-ink-secondary">{children}</div>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  )
}
