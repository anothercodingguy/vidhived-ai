'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface NoteEditorProps {
    content: string
    title: string
    onChange: (updates: { title?: string; content?: string }) => void
    readOnly?: boolean
    noteType?: 'text' | 'pdf'
}

export default function NoteEditor({ content, title, onChange, readOnly = false, noteType = 'text' }: NoteEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [localTitle, setLocalTitle] = useState(title)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        setLocalTitle(title)
    }, [title])

    // Set content when it changes externally
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== content) {
            editorRef.current.innerHTML = content || ''
        }
    }, [content])

    const debouncedSave = useCallback((updates: { title?: string; content?: string }) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = setTimeout(() => {
            onChange(updates)
        }, 800)
    }, [onChange])

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalTitle(e.target.value)
        debouncedSave({ title: e.target.value })
    }

    const handleContentInput = () => {
        if (editorRef.current) {
            debouncedSave({ content: editorRef.current.innerHTML })
        }
    }

    const execCommand = (cmd: string, value?: string) => {
        document.execCommand(cmd, false, value)
        editorRef.current?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey) {
            switch (e.key) {
                case 'b':
                    e.preventDefault()
                    execCommand('bold')
                    break
                case 'i':
                    e.preventDefault()
                    execCommand('italic')
                    break
                case 'u':
                    e.preventDefault()
                    execCommand('underline')
                    break
            }
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Title */}
            <div className="px-6 pt-5 pb-2">
                <input
                    type="text"
                    value={localTitle}
                    onChange={handleTitleChange}
                    placeholder="Note title..."
                    disabled={readOnly}
                    className="w-full text-xl font-bold bg-transparent outline-none border-none"
                    style={{ color: 'rgb(var(--color-text))' }}
                />
            </div>

            {/* Toolbar */}
            {!readOnly && noteType === 'text' && (
                <div className="note-editor-toolbar px-6 py-2 flex items-center gap-1 border-b" style={{ borderColor: 'var(--glass-border)' }}>
                    <button onClick={() => execCommand('bold')} className="note-toolbar-btn" title="Bold (⌘B)">
                        <strong>B</strong>
                    </button>
                    <button onClick={() => execCommand('italic')} className="note-toolbar-btn" title="Italic (⌘I)">
                        <em>I</em>
                    </button>
                    <button onClick={() => execCommand('underline')} className="note-toolbar-btn" title="Underline (⌘U)">
                        <span style={{ textDecoration: 'underline' }}>U</span>
                    </button>
                    <div className="w-px h-4 mx-1" style={{ background: 'rgb(var(--color-border))' }} />
                    <button onClick={() => execCommand('formatBlock', 'h2')} className="note-toolbar-btn text-xs" title="Heading">
                        H2
                    </button>
                    <button onClick={() => execCommand('formatBlock', 'h3')} className="note-toolbar-btn text-xs" title="Subheading">
                        H3
                    </button>
                    <div className="w-px h-4 mx-1" style={{ background: 'rgb(var(--color-border))' }} />
                    <button onClick={() => execCommand('insertUnorderedList')} className="note-toolbar-btn" title="Bullet List">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                        </svg>
                    </button>
                    <button onClick={() => execCommand('insertOrderedList')} className="note-toolbar-btn" title="Numbered List">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
                            <path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
                        </svg>
                    </button>
                </div>
            )}

            {/* PDF badge */}
            {noteType === 'pdf' && (
                <div className="px-6 py-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: 'rgb(var(--color-primary) / .08)', color: 'rgb(var(--color-primary))' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                        </svg>
                        Extracted from PDF
                    </span>
                </div>
            )}

            {/* Editor */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                <div
                    ref={editorRef}
                    contentEditable={!readOnly}
                    onInput={handleContentInput}
                    onKeyDown={handleKeyDown}
                    className="note-editor-content outline-none min-h-[300px]"
                    style={{
                        color: 'rgb(var(--color-text))',
                        fontSize: '0.9rem',
                        lineHeight: '1.75',
                    }}
                    suppressContentEditableWarning
                    data-placeholder="Start writing your note..."
                />
            </div>
        </div>
    )
}
