'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadPDF } from '@/lib/api'
import ThemeToggle from '@/components/ThemeToggle'
import Logo from '@/components/Logo'
import HeroArt from '@/components/HeroArt'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB, the same limit the backend enforces

// If an upload has not finished after this long, explain the likely reason.
const SLOW_UPLOAD_MS = 6000

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const FEATURES = [
  {
    title: 'Risk Scoring',
    text: 'AI categorizes every clause as high, medium, or low risk.',
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
  {
    title: 'Clause Summaries',
    text: 'Complex legalese translated into plain English.',
    icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
  },
  {
    title: 'Document Q&A',
    text: 'Ask questions about your contract in plain language.',
    icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  },
  {
    title: 'Voice Playback',
    text: 'Listen to summaries and explanations in natural speech.',
    icon: <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>,
  },
]

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [slow, setSlow] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const validateFile = (f: File): string | null => {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      return 'Please select a PDF file.'
    }
    if (f.size > MAX_FILE_SIZE) {
      return `File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 20 MB.`
    }
    return null
  }

  const handleFileSelect = useCallback((selectedFile: File) => {
    const err = validateFile(selectedFile)
    if (err) {
      setError(err)
      return
    }
    setFile(selectedFile)
    setError('')
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFileSelect(f)
    // Clear the input so choosing the same file again still fires a change event.
    e.target.value = ''
  }

  const openFilePicker = () => inputRef.current?.click()

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (uploading) return
    const f = e.dataTransfer.files?.[0]
    if (f) handleFileSelect(f)
  }, [handleFileSelect, uploading])

  // While uploading, switch to a longer explanation if the server is slow to answer.
  useEffect(() => {
    if (!uploading) {
      setSlow(false)
      return
    }
    const timer = setTimeout(() => setSlow(true), SLOW_UPLOAD_MS)
    return () => clearTimeout(timer)
  }, [uploading])

  const handleUpload = async () => {
    if (!file || uploading) return

    setUploading(true)
    setError('')

    try {
      const result = await uploadPDF(file)
      // Stay in the "uploading" state until the next page replaces this one.
      router.push(`/document/${result.documentId}`)
    } catch (err: any) {
      setError(err?.message || 'Upload failed. Please try again.')
      setUploading(false)
    }
  }

  return (
    <div className="min-h-app bg-canvas p-3 sm:p-4 md:p-8">
      <div className="relative mx-auto w-full max-w-[1440px] overflow-hidden rounded-3xl border border-line bg-surface shadow-card md:rounded-[2rem]">

        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8 sm:py-6">
          <Logo />
          <ThemeToggle />
        </header>

        <main>
          <section className="mx-auto flex w-full max-w-7xl flex-col items-center pt-6 sm:pt-8">
            <div className="relative z-10 w-full max-w-3xl px-5 text-center">
              <h1 className="mb-5 font-serif text-[2.75rem] font-normal leading-[1.05] tracking-tight text-ink sm:text-6xl md:text-7xl">
                Intelligence for<br />Legal Documents
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-ink-secondary md:text-xl">
                Transform legal documents into actionable insights with{' '}
                <br className="hidden md:block" />
                AI-powered risk scoring, entity extraction, and smart Q&amp;A.
              </p>

              {/* Upload: a normal, flat form. It works with a mouse, a keyboard and drag and drop. */}
              <div
                className={`dropzone mx-auto w-full max-w-xl p-5 sm:p-6 ${dragActive ? 'dropzone-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={inputRef}
                  id="file-upload"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleInputChange}
                  hidden
                  data-testid="file-input"
                />

                {file ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 text-left">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 break-all text-sm font-semibold text-ink" title={file.name}>{file.name}</p>
                        <p className="text-xs text-ink-muted">{formatSize(file.size)}</p>
                      </div>
                      <button type="button" onClick={openFilePicker} disabled={uploading} className="btn-ghost text-sm font-medium">
                        Replace
                      </button>
                    </div>

                    <button type="button" onClick={handleUpload} disabled={uploading} className="btn btn-primary btn-lg w-full">
                      {uploading ? (
                        <>
                          <span aria-hidden="true" className="spinner h-5 w-5 border-white/30 border-t-white" />
                          Uploading…
                        </>
                      ) : (
                        'Analyze document'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface text-ink-secondary">
                      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <p className="text-base font-semibold text-ink">Drop a contract PDF here</p>
                    <button type="button" onClick={openFilePicker} className="btn btn-primary btn-lg">
                      Choose a PDF
                    </button>
                  </div>
                )}

                {/* Screen readers are told about upload progress and errors as they happen. */}
                <div aria-live="polite" className="empty:hidden mt-4 flex flex-col gap-3 text-left">
                  {uploading && (
                    <div>
                      <div className="progress-indeterminate" />
                      <p className="mt-2 text-sm text-ink-secondary">
                        {slow
                          ? 'Still uploading. The server runs on free hosting and can take about a minute to wake up.'
                          : 'Uploading your PDF and starting the analysis…'}
                      </p>
                    </div>
                  )}
                  {error && (
                    <div role="alert" className="notice notice-error">
                      <svg aria-hidden="true" className="mt-0.5 shrink-0 text-risk-high" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </div>

              <p className="mx-auto mt-3 max-w-xl text-sm text-ink-muted">
                PDF only, up to 20 MB. Scanned PDFs are not supported. Not legal advice.
              </p>
            </div>

            <HeroArt />
          </section>

          <section aria-labelledby="features-heading" className="mx-auto w-full max-w-6xl px-4 pb-12 sm:pb-16">
            <h2 id="features-heading" className="sr-only">What Vidhived does</h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(feature => (
                <li key={feature.title} className="card flex flex-col items-start p-6">
                  <svg aria-hidden="true" className="mb-4 h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {feature.icon}
                  </svg>
                  <h3 className="mb-2 text-base font-semibold text-ink">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-secondary">{feature.text}</p>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </div>
  )
}
