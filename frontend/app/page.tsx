'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { uploadPDF } from '@/lib/api'
import ThemeToggle from '@/components/ThemeToggle'
import Hero from '@/components/chatsheet/Hero'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

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
    if (!file) {
      // If no file is selected, trigger the file input dialog
      document.getElementById('file-upload')?.click();
      return;
    }
    
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] flex flex-col items-center p-4 md:p-8 transition-colors duration-300">
      {/* Background container holding everything */}
      <div className="w-full max-w-[1440px] bg-white dark:bg-[#09090b] rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative pb-16 transition-colors duration-300">
        
        {/* Navbar merged into page.tsx so ThemeToggle can be included if desired, and to remove My Notebooks / Links as requested */}
        <nav className="w-full flex items-center justify-between px-8 py-6 max-w-7xl mx-auto z-10 relative">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full border-[3px] border-blue-500 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-blue-500" />
            </div>
            <span className="text-[22px] font-serif text-slate-800 dark:text-slate-100 font-medium tracking-tight">Vidhived.ai</span>
          </div>

          {/* Right side controls (no text links or 'my notebooks') */}
          <div className="flex items-center gap-4">
             <ThemeToggle />
          </div>
        </nav>

        {/* We use the styling from the Hero, but we need to inject the File Upload logic into the action button or the page */}
        <section className="relative w-full overflow-hidden pt-8 pb-32 flex flex-col items-center max-w-7xl mx-auto">
          
          {/* Text Content */}
          <div className="text-center max-w-3xl px-4 z-10 relative">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif text-slate-900 dark:text-slate-50 tracking-tight leading-[1.1] mb-6">
              Intelligence for<br />Legal Documents
            </h1>
            <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
              Transform legal documents into actionable insights with<br className="hidden md:block" />
              AI-powered risk scoring, entity extraction, and smart Q&A.
            </p>
            
            {/* Primary Action Button Below Text */}
            <div className="flex justify-center">
              <button 
                onClick={handleUpload}
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-full shadow-lg flex items-center justify-center gap-2 transition-transform hover:-translate-y-1 disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none text-lg">
                 {uploading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Uploading...
                    </>
                  ) : file ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      Analyze {file.name.substring(0, 15)}{file.name.length > 15 ? '...' : ''}
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Upload PDF
                    </>
                  )}
              </button>
            </div>
          </div>

          {/* Abstract Graphic Area containing the Upload logic */}
          <div className="relative w-full h-[600px] mt-12 perspective-1000 flex justify-center">
            
            {/* Glow effect behind hub */}
            <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

            {/* The Graphic Container (rotated isometrically) */}
            <div className="relative w-full max-w-4xl h-full" style={{ transform: 'rotateX(55deg) rotateZ(-40deg)', transformStyle: 'preserve-3d' }}>
              
              {/* Base Grid / Connecting Lines */}
              <svg className="absolute inset-0 w-full h-full overflow-visible" style={{ transform: 'translateZ(-1px)' }}>
                <path d="M 400 300 Q 200 300 100 500" fill="none" stroke="#93c5fd" strokeWidth="2" strokeDasharray="6 6" className="animate-pulse" />
                <path d="M 400 300 Q 400 100 600 50" fill="none" stroke="#93c5fd" strokeWidth="2" strokeDasharray="6 6" />
                <path d="M 100 500 Q 50 600 -50 650" fill="none" stroke="#93c5fd" strokeWidth="2" strokeDasharray="6 6" />
                <path d="M 400 300 Q 500 500 700 600" fill="none" stroke="#93c5fd" strokeWidth="2" strokeDasharray="6 6" />
                <path d="M 700 600 Q 800 650 900 600" fill="none" stroke="#93c5fd" strokeWidth="2" strokeDasharray="6 6" />
              </svg>

              {/* Central Hub */}
              <div className="absolute top-[200px] left-[300px] w-64 h-64 rounded-full bg-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-[#3b82f6] flex items-center justify-center transform-gpu" style={{ transform: 'translateZ(20px)' }}>
                 <div className="w-56 h-56 rounded-full border-4 border-blue-400 flex items-center justify-center">
                    <div className="w-40 h-40 rounded-full bg-blue-500 flex items-center justify-center shadow-inner">
                       <div className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-white" />
                       </div>
                    </div>
                 </div>
                 <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-[#f8fafc] rounded-full" />
              </div>

              {/* App Nodes */}
              <div className="absolute top-[450px] left-[50px] w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center transform-gpu hover:-translate-y-2 transition-transform" style={{ transform: 'translateZ(30px)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-indigo-500">
                   <path d="M7 20h10" />
                   <path d="M12 2v18" />
                   <path d="M3 11l9-9 9 9" />
                   <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                   <path d="M3 11v8a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-8" />
                </svg>
              </div>

              <div className="absolute top-[350px] left-[150px] w-14 h-14 bg-white rounded-xl shadow-lg flex items-center justify-center" style={{ transform: 'translateZ(40px)' }}>
                 <div className="text-red-500 font-bold text-xl border-2 border-red-500 rounded px-1">PDF</div>
              </div>

              <div className="absolute top-[280px] left-[250px] w-12 h-12 bg-white rounded-lg shadow-md flex items-center justify-center" style={{ transform: 'translateZ(20px)' }}>
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-emerald-500">
                   <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                   <line x1="12" y1="22" x2="12" y2="15.5" />
                   <polyline points="22 8.5 12 15.5 2 8.5" />
                   <polyline points="2 15.5 12 8.5 22 15.5" />
                   <line x1="12" y1="2" x2="12" y2="8.5" />
                 </svg>
              </div>

              <div className="absolute top-[480px] left-[280px] w-14 h-14 bg-white rounded-xl shadow-lg flex items-center justify-center" style={{ transform: 'translateZ(35px)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-blue-500">
                   <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>

              <div className="absolute top-[600px] left-[200px] w-14 h-14 bg-white rounded-xl shadow-lg flex items-center justify-center" style={{ transform: 'translateZ(25px)' }}>
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-amber-500">
                    <path d="M12 2v20" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                 </svg>
              </div>

              <div className="absolute top-[450px] left-[450px] w-12 h-12 bg-white rounded-lg shadow-md flex items-center justify-center" style={{ transform: 'translateZ(10px)' }}>
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-slate-500">
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                 </svg>
              </div>
              
              {/* Floating Upload UI Card */}
              <div 
                className={`absolute top-[200px] left-[550px] w-80 h-[280px] bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border transition-colors ${dragActive ? 'border-blue-500 bg-blue-50/90 dark:bg-blue-900/20' : 'border-white/50 dark:border-slate-800'}`} 
                style={{ transform: 'translateZ(60px)' }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                 {/* Fake Grid */}
                 <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:1rem_1rem]" />
                 
                 <input
                  type="file"
                  accept=".pdf"
                  onChange={handleInputChange}
                  className="hidden"
                  id="file-upload"
                 />

                 {/* Dropzone Content inside the card */}
                 <div className="absolute inset-x-6 top-6 bottom-24 flex flex-col items-center justify-center text-center">
                    {file ? (
                      <div className="flex flex-col items-center gap-2 z-10">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 border border-blue-200">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-500">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate w-full px-2" title={file.name}>{file.name}</p>
                        <p className="text-xs text-slate-500 cursor-pointer hover:underline" onClick={() => document.getElementById('file-upload')?.click()}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB · Replace
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 z-10">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer" onClick={() => document.getElementById('file-upload')?.click()}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        </div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Drop PDF here</p>
                        <p className="text-xs text-slate-500">or click to browse</p>
                      </div>
                    )}

                    {error && (
                      <div className="mt-2 text-red-500 text-xs font-medium z-10 px-2 leading-tight">
                        {error}
                      </div>
                    )}
                 </div>

                 {/* Upload Progress Bar Layer */}
                 {uploading && (
                  <div className="absolute bottom-20 left-6 right-6 h-1 bg-slate-100 rounded-full overflow-hidden z-10">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                 )}

                 {/* Action Button */}
                 <div className="absolute bottom-6 left-6 right-6 z-10">
                    <button 
                      onClick={handleUpload}
                      disabled={uploading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-75 disabled:cursor-not-allowed">
                       {uploading ? (
                          <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Uploading...
                          </>
                        ) : file ? (
                          'Analyze Document'
                        ) : (
                          'Upload PDF'
                        )}
                    </button>
                 </div>
                 
                 {/* Arrow path leading out */}
                 <svg className="absolute -left-12 top-1/2 w-32 h-20 overflow-visible text-blue-400 -z-10 pointer-events-none">
                    <path d="M 0 0 C 20 10, 80 10, 100 -20" fill="none" stroke="currentColor" strokeDasharray="4 4" strokeWidth="2" markerEnd="url(#arrow)" />
                    <defs>
                       <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                       </marker>
                    </defs>
                 </svg>
              </div>

            </div>

            <style dangerouslySetInnerHTML={{__html: `
              .perspective-1000 {
                perspective: 1000px;
              }
            `}} />
          </div>

        </section>

        {/* Features List Section */}
        <section className="w-full max-w-6xl mx-auto px-4 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Feature 1 */}
            <div className="bg-[#0f0f11] dark:bg-[#0f0f11] border border-slate-800 rounded-2xl p-6 flex flex-col items-start transition-all hover:border-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-indigo-500 mb-4">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <h3 className="text-white font-medium text-base mb-2">Risk Scoring</h3>
              <p className="text-slate-400 text-sm leading-relaxed">AI categorizes every clause as high, medium, or low risk.</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#0f0f11] dark:bg-[#0f0f11] border border-slate-800 rounded-2xl p-6 flex flex-col items-start transition-all hover:border-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-indigo-500 mb-4">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <h3 className="text-white font-medium text-base mb-2">Clause Summaries</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Complex legalese translated into plain English.</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#0f0f11] dark:bg-[#0f0f11] border border-slate-800 rounded-2xl p-6 flex flex-col items-start transition-all hover:border-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-indigo-500 mb-4">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <h3 className="text-white font-medium text-base mb-2">Document Q&A</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Ask questions about your contract and get instant answers.</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#0f0f11] dark:bg-[#0f0f11] border border-slate-800 rounded-2xl p-6 flex flex-col items-start transition-all hover:border-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-indigo-500 mb-4">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
              <h3 className="text-white font-medium text-base mb-2">Voice Playback</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Listen to summaries and explanations in natural speech.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}