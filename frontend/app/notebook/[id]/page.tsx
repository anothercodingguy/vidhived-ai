'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getNotebook, addNote, uploadNoteFile, updateNote, deleteNote, Notebook, NoteItem } from '@/lib/api'
import NoteEditor from '@/components/NoteEditor'
import NotebookAskPanel from '@/components/NotebookAskPanel'
import ThemeToggle from '@/components/ThemeToggle'

export default function NotebookPage() {
    const params = useParams()
    const router = useRouter()
    const notebookId = params.id as string

    const [notebook, setNotebook] = useState<Notebook | null>(null)
    const [notes, setNotes] = useState<NoteItem[]>([])
    const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [uploading, setUploading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [rightPanel, setRightPanel] = useState<'ask' | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fetchNotebook = useCallback(async () => {
        try {
            const data = await getNotebook(notebookId)
            setNotebook(data)
            setNotes(data.notes || [])
            // Auto-select first note if none selected
            if (!selectedNote && data.notes && data.notes.length > 0) {
                setSelectedNote(data.notes[0])
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load notebook')
        } finally {
            setLoading(false)
        }
    }, [notebookId])

    useEffect(() => {
        fetchNotebook()
    }, [fetchNotebook])

    const handleAddNote = async () => {
        try {
            const newNote = await addNote(notebookId, 'Untitled', '')
            setNotes(prev => [newNote, ...prev])
            setSelectedNote(newNote)
        } catch (e: any) {
            setError(e.message)
        }
    }

    const handleUploadPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            const newNote = await uploadNoteFile(notebookId, file)
            setNotes(prev => [newNote, ...prev])
            setSelectedNote(newNote)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const handleUpdateNote = useCallback(async (updates: { title?: string; content?: string }) => {
        if (!selectedNote) return
        try {
            const updated = await updateNote(notebookId, selectedNote.id, updates)
            setSelectedNote(prev => prev ? { ...prev, ...updated } : null)
            setNotes(prev => prev.map(n => n.id === updated.id ? { ...n, ...updated } : n))
        } catch (e: any) {
            console.error('Failed to save note:', e)
        }
    }, [notebookId, selectedNote])

    const handleDeleteNote = async (noteId: string) => {
        try {
            await deleteNote(notebookId, noteId)
            setNotes(prev => prev.filter(n => n.id !== noteId))
            if (selectedNote?.id === noteId) {
                const remaining = notes.filter(n => n.id !== noteId)
                setSelectedNote(remaining.length > 0 ? remaining[0] : null)
            }
        } catch (e: any) {
            setError(e.message)
        }
    }

    const filteredNotes = searchQuery
        ? notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content?.toLowerCase().includes(searchQuery.toLowerCase()))
        : notes

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--color-bg))' }}>
                <div className="text-center animate-fadeIn">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-2 animate-spin" style={{ borderColor: 'rgb(var(--color-border))', borderTopColor: 'rgb(var(--color-primary))' }} />
                    </div>
                    <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>Loading notebook...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'rgb(var(--color-bg))' }}>
            {/* Header */}
            <header className="glass-surface flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--glass-border)' }}>
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/notebooks')} className="btn-ghost btn-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs" style={{ background: 'rgb(var(--color-primary))' }}>V</div>
                        <span className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>
                            {notebook?.title || 'Notebook'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setRightPanel(rightPanel === 'ask' ? null : 'ask')}
                        className={`btn-ghost btn-icon ${rightPanel === 'ask' ? 'glass-active' : ''}`}
                        title="Ask AI"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </button>
                    <ThemeToggle />
                </div>
            </header>

            {/* Error banner */}
            {error && (
                <div className="px-4 py-2">
                    <div className="p-2 rounded-lg text-xs font-medium"
                        style={{ background: 'rgb(var(--color-risk-high) / .06)', color: 'rgb(var(--color-risk-high))', border: '1px solid rgb(var(--color-risk-high) / .15)' }}>
                        {error}
                        <button onClick={() => setError('')} className="ml-2 opacity-60 hover:opacity-100">×</button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar — Note List */}
                <div className="w-72 border-r flex flex-col" style={{ borderColor: 'var(--glass-border)', background: 'rgb(var(--color-surface))' }}>
                    {/* Actions */}
                    <div className="p-3 space-y-2 border-b" style={{ borderColor: 'var(--glass-border)' }}>
                        <div className="flex gap-2">
                            <button onClick={handleAddNote} className="btn btn-primary flex-1 py-2 text-xs">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Note
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="btn btn-glass flex-1 py-2 text-xs"
                            >
                                {uploading ? (
                                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                )}
                                PDF
                            </button>
                            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleUploadPDF} className="hidden" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input text-xs py-1.5"
                        />
                    </div>

                    {/* Note list */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredNotes.length === 0 ? (
                            <div className="p-4 text-center">
                                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                                    {searchQuery ? 'No matching notes' : 'No notes yet'}
                                </p>
                            </div>
                        ) : (
                            filteredNotes.map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => setSelectedNote(note)}
                                    className={`px-3 py-3 cursor-pointer border-b group relative transition-colors ${selectedNote?.id === note.id ? 'glass-active' : ''}`}
                                    style={{
                                        borderColor: 'var(--glass-border)',
                                        background: selectedNote?.id === note.id ? 'rgb(var(--color-primary) / .05)' : 'transparent',
                                    }}
                                >
                                    {/* Delete button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id) }}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ color: 'rgb(var(--color-text-muted))' }}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>

                                    <div className="flex items-center gap-2 mb-1">
                                        {note.noteType === 'pdf' && (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgb(var(--color-primary))', flexShrink: 0 }}>
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                            </svg>
                                        )}
                                        <span className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                                            {note.title}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                                            {note.wordCount} words
                                        </span>
                                        <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                                            {new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Center — Editor */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {selectedNote ? (
                        <NoteEditor
                            key={selectedNote.id}
                            content={selectedNote.content}
                            title={selectedNote.title}
                            onChange={handleUpdateNote}
                            noteType={selectedNote.noteType}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center"
                                    style={{ background: 'rgb(var(--color-surface-hover))' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                                    Select a note or create a new one
                                </p>
                                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                                    Your notes will appear here for editing
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel — Ask AI */}
                {rightPanel === 'ask' && (
                    <div className="w-96 border-l flex flex-col" style={{ borderColor: 'var(--glass-border)' }}>
                        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--glass-border)' }}>
                            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'rgb(var(--color-text))' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'rgb(var(--color-primary))' }}>
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                                Ask AI
                            </span>
                            <button onClick={() => setRightPanel(null)} className="btn-ghost btn-icon">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <NotebookAskPanel notebookId={notebookId} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
