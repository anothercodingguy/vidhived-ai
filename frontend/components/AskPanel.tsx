'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { askQuestion } from '@/lib/api'
import AudioPlayer from './AudioPlayer'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AskPanelProps {
  documentId: string
}

let msgIdCounter = 0
const nextMsgId = () => `msg-${++msgIdCounter}-${Date.now()}`

export default function AskPanel({ documentId }: AskPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = useCallback(async (directQuery?: string) => {
    const q = (directQuery || input).trim()
    if (!q || loading) return

    if (!directQuery) setInput('')

    const userMsg: Message = { id: nextMsgId(), role: 'user', content: q, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const result = await askQuestion(documentId, q)
      const assistantMsg: Message = { id: nextMsgId(), role: 'assistant', content: result.answer, timestamp: new Date() }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      const errorMsg: Message = {
        id: nextMsgId(),
        role: 'assistant',
        content: err.message || 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, documentId])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgb(var(--color-primary) / .08)', border: '1px solid rgb(var(--color-primary) / .12)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'rgb(var(--color-primary))' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="font-medium text-sm mb-1" style={{ color: 'rgb(var(--color-text))' }}>
              Ask about your document
            </p>
            <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Ask questions like &ldquo;What are the termination conditions?&rdquo; or &ldquo;Summarize the payment terms&rdquo;
            </p>

            <div className="flex flex-wrap gap-2 mt-5 max-w-sm justify-center">
              {['What are the key obligations?', 'Summarize the risks', 'Explain payment terms'].map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full transition-colors btn-glass"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className="flex flex-col gap-1.5 max-w-[85%]">
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 ml-0.5">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-white font-bold" style={{ background: 'rgb(var(--color-primary))', fontSize: '9px' }}>V</div>
                  <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>Vidhived</span>
                </div>
              )}
              <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1 ml-1">
                  <AudioPlayer text={msg.content} size="sm" />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 ml-0.5">
                <div className="w-5 h-5 rounded flex items-center justify-center text-white font-bold" style={{ background: 'rgb(var(--color-primary))', fontSize: '9px' }}>V</div>
                <span className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>Vidhived</span>
              </div>
              <div className="chat-bubble chat-bubble-assistant flex items-center gap-1.5 py-3">
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'rgb(var(--color-text-muted))', animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'rgb(var(--color-text-muted))', animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'rgb(var(--color-text-muted))', animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t glass-surface" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this document..."
            className="input input-glass flex-1"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="btn btn-primary py-2.5 px-4"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}