'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { uploadPDF } from '@/lib/api'
import ThemeToggle from '@/components/ThemeToggle'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Risk Scoring',
    desc: 'AI categorizes every clause as high, medium, or low risk.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: 'Clause Summaries',
    desc: 'Complex legalese translated into plain English.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Document Q&A',
    desc: 'Ask questions about your contract and get instant answers.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      </svg>
    ),
    title: 'Voice Playback',
    desc: 'Listen to summaries and explanations in natural speech.',
  },
]

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
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

  const handleFileSelect = (selectedFile: File) => {
    const err = validateFile(selectedFile)
    if (err) {
      setError(err)
      return
    }
    setFile(selectedFile)
    setError('')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFileSelect(f)
  }

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
    const f = e.dataTransfer.files?.[0]
    if (f) handleFileSelect(f)
  }, [])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    setUploadProgress(10)

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 15, 85))
      }, 400)

      const result = await uploadPDF(file)
      clearInterval(progressInterval)
      setUploadProgress(100)

      setTimeout(() => {
        router.push(`/document/${result.documentId}`)
      }, 300)
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'rgb(var(--color-bg))' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: 'rgb(var(--color-primary))' }}>V</div>
          <span className="text-lg font-bold tracking-tight" style={{ color: 'rgb(var(--color-text))' }}>Vidhived.ai</span>
        </div>
        <ThemeToggle />
      </nav>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center mb-16 animate-fadeIn">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
            style={{ background: 'rgb(var(--color-primary) / .08)', color: 'rgb(var(--color-primary))', border: '1px solid rgb(var(--color-primary) / .12)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" /></svg>
            AI-Powered Legal Intelligence
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5" style={{ color: 'rgb(var(--color-text))', letterSpacing: '-0.02em' }}>
            Understand Any Legal<br />Document in Minutes
          </h1>
          <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            Upload a contract, NDA, or agreement. Get instant AI analysis with risk scoring,
            clause summaries, and interactive Q&A.
          </p>
        </div>

        {/* Upload Card */}
        <div className="max-w-2xl mx-auto mb-20 animate-fadeIn" style={{ animationDelay: '.1s' }}>
          <div className="glass p-8" style={{ boxShadow: 'var(--shadow-lg), var(--shadow-glow)' }}>
            <div
              className={`dropzone ${dragActive ? 'dropzone-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleInputChange}
                className="hidden"
                id="file-upload"
              />

              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgb(var(--color-primary) / .1)', border: '1px solid rgb(var(--color-primary) / .15)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgb(var(--color-primary))' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{file.name}</p>
                    <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB · Click or drag to replace
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgb(var(--color-surface-hover))' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                      Drop your PDF here, or <span style={{ color: 'rgb(var(--color-primary))' }}>browse</span>
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      PDF files up to 20 MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {uploading && (
              <div className="mt-4">
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-xs mt-2 text-center" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  Uploading and starting analysis...
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 rounded-lg text-sm font-medium"
                style={{
                  background: 'rgb(var(--color-risk-high) / .06)',
                  color: 'rgb(var(--color-risk-high))',
                  border: '1px solid rgb(var(--color-risk-high) / .15)',
                }}>
                {error}
              </div>
            )}

            {/* Upload button */}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn btn-primary w-full mt-6 py-3"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing Document...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Analyze Document
                </>
              )}
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto animate-fadeIn" style={{ animationDelay: '.2s' }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="glass p-5 group">
              <div className="mb-3" style={{ color: 'rgb(var(--color-primary))' }}>{f.icon}</div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'rgb(var(--color-text))' }}>{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
          Powered by Groq AI & Sarvam AI · Built for legal professionals
        </div>
      </main>
    </div>
  )
}