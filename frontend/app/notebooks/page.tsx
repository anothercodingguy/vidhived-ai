'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { listNotebooks, createNotebook, deleteNotebook, Notebook } from '@/lib/api'
import ThemeToggle from '@/components/ThemeToggle'

export default function NotebooksPage() {
    const router = useRouter()
    const [notebooks, setNotebooks] = useState<Notebook[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [newTitle, setNewTitle] = useState('')
    const [newDesc, setNewDesc] = useState('')
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState('')
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const fetchNotebooks = useCallback(async () => {
        try {
            const data = await listNotebooks()
            setNotebooks(data)
        } catch (e: any) {
            setError(e.message || 'Failed to load notebooks')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchNotebooks()
    }, [fetchNotebooks])

    const handleCreate = async () => {
        if (!newTitle.trim()) return
        setCreating(true)
        try {
            await createNotebook(newTitle.trim(), newDesc.trim())
            setNewTitle('')
            setNewDesc('')
            setShowCreate(false)
            fetchNotebooks()
        } catch (e: any) {
            setError(e.message)
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteNotebook(id)
            setDeleteId(null)
            fetchNotebooks()
        } catch (e: any) {
            setError(e.message)
        }
    }

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        })
    }

    return (
        <div className="min-h-screen" style={{ background: 'rgb(var(--color-bg))' }}>
            {/* Nav */}
            <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
                <div className="flex items-center gap-2.5">
                    <button onClick={() => router.push('/')} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: 'rgb(var(--color-primary))' }}>V</div>
                        <span className="text-lg font-bold tracking-tight" style={{ color: 'rgb(var(--color-text))' }}>Vidhived.ai</span>
                    </button>
                </div>
                <ThemeToggle />
            </nav>

            <main className="max-w-6xl mx-auto px-6 pt-8 pb-24">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 animate-fadeIn">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'rgb(var(--color-text))', letterSpacing: '-0.02em' }}>
                            My Notebooks
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                            Create notebooks, add notes & PDFs, and ask AI questions
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="btn btn-primary"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Notebook
                    </button>
                </div>

                {/* Create Form */}
                {showCreate && (
                    <div className="glass p-6 mb-8 animate-fadeIn" style={{ boxShadow: 'var(--shadow-lg), var(--shadow-glow)' }}>
                        <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Create New Notebook</h3>
                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Notebook title"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="input"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />
                            <input
                                type="text"
                                placeholder="Description (optional)"
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                className="input"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />
                            <div className="flex gap-3 pt-1">
                                <button onClick={handleCreate} disabled={!newTitle.trim() || creating} className="btn btn-primary">
                                    {creating ? 'Creating...' : 'Create'}
                                </button>
                                <button onClick={() => { setShowCreate(false); setNewTitle(''); setNewDesc('') }} className="btn btn-ghost">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-6 p-3 rounded-lg text-sm font-medium animate-fadeIn"
                        style={{ background: 'rgb(var(--color-risk-high) / .06)', color: 'rgb(var(--color-risk-high))', border: '1px solid rgb(var(--color-risk-high) / .15)' }}>
                        {error}
                        <button onClick={() => setError('')} className="ml-2 opacity-60 hover:opacity-100">×</button>
                    </div>
                )}

                {/* Loading */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="glass p-6 space-y-3">
                                <div className="skeleton h-5 w-2/3" />
                                <div className="skeleton h-3 w-full" />
                                <div className="skeleton h-3 w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : notebooks.length === 0 ? (
                    /* Empty state */
                    <div className="text-center py-20 animate-fadeIn">
                        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
                            style={{ background: 'rgb(var(--color-primary) / .08)', border: '1px solid rgb(var(--color-primary) / .12)' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgb(var(--color-primary))' }}>
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>No notebooks yet</h3>
                        <p className="text-sm mb-6" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                            Create your first notebook to start building your knowledge base
                        </p>
                        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
                            Create Your First Notebook
                        </button>
                    </div>
                ) : (
                    /* Notebooks Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
                        {notebooks.map((nb) => (
                            <div
                                key={nb.id}
                                className="glass p-6 cursor-pointer group relative"
                                onClick={() => router.push(`/notebook/${nb.id}`)}
                                style={{ boxShadow: 'var(--shadow-sm)' }}
                            >
                                {/* Delete button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteId(deleteId === nb.id ? null : nb.id) }}
                                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity btn-ghost btn-icon"
                                    style={{ color: 'rgb(var(--color-text-muted))' }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                </button>

                                {/* Delete confirm */}
                                {deleteId === nb.id && (
                                    <div className="absolute top-12 right-4 glass p-3 rounded-lg z-10 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                                        <p className="text-xs mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>Delete this notebook?</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleDelete(nb.id)} className="text-xs px-3 py-1 rounded font-medium"
                                                style={{ background: 'rgb(var(--color-risk-high) / .1)', color: 'rgb(var(--color-risk-high))' }}>
                                                Delete
                                            </button>
                                            <button onClick={() => setDeleteId(null)} className="text-xs px-3 py-1 rounded font-medium btn-ghost">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Notebook icon */}
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                                    style={{ background: 'rgb(var(--color-primary) / .08)', border: '1px solid rgb(var(--color-primary) / .12)' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgb(var(--color-primary))' }}>
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                    </svg>
                                </div>

                                <h3 className="font-semibold text-sm mb-1 truncate" style={{ color: 'rgb(var(--color-text))' }}>
                                    {nb.title}
                                </h3>
                                {nb.description && (
                                    <p className="text-xs mb-3 line-clamp-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                                        {nb.description}
                                    </p>
                                )}
                                <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgb(var(--color-border) / .5)' }}>
                                    <span className="text-xs flex items-center gap-1" style={{ color: 'rgb(var(--color-text-muted))' }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                                        </svg>
                                        {nb.noteCount} {nb.noteCount === 1 ? 'note' : 'notes'}
                                    </span>
                                    <span className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                                        {formatDate(nb.updatedAt || nb.createdAt)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
