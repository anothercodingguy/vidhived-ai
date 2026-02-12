'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { askNotebook, NotebookAskResult } from '@/lib/api'

interface Message {
    role: 'user' | 'assistant'
    content: string
    sources?: { id: string; title: string }[]
}

export default function NotebookAskPanel({ notebookId }: { notebookId: string }) {
    const [messages, setMessages] = useState<Message[]>([])
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSubmit = async () => {
        const q = query.trim()
        if (!q || loading) return

        setMessages(prev => [...prev, { role: 'user', content: q }])
        setQuery('')
        setLoading(true)

        try {
            const result = await askNotebook(notebookId, q)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: result.answer,
                sources: result.sources,
            }])
        } catch (e: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: e.message || 'Failed to get answer. Please try again.',
            }])
        } finally {
            setLoading(false)
            inputRef.current?.focus()
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
                                style={{ background: 'rgb(var(--color-primary) / .08)' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgb(var(--color-primary))' }}>
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text))' }}>
                                Ask about your notes
                            </p>
                            <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                                AI answers grounded in your notebook content
                            </p>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-2 pt-2 flex flex-wrap gap-1" style={{ borderTop: '1px solid rgb(var(--color-border) / .3)' }}>
                                        <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>Sources:</span>
                                        {msg.sources.map((s, j) => (
                                            <span key={j} className="text-xs px-2 py-0.5 rounded-full"
                                                style={{ background: 'rgb(var(--color-primary) / .1)', color: 'rgb(var(--color-primary))' }}>
                                                {s.title}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {loading && (
                    <div className="flex justify-start">
                        <div className="chat-bubble chat-bubble-assistant">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgb(var(--color-primary))' }} />
                                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgb(var(--color-primary))', animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgb(var(--color-primary))', animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t" style={{ borderColor: 'var(--glass-border)' }}>
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        placeholder="Ask a question about your notes..."
                        className="input input-glass flex-1"
                        disabled={loading}
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={!query.trim() || loading}
                        className="btn btn-primary px-4"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
