'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { askQuestion } from '@/lib/api'
import AudioPlayer from './AudioPlayer'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AskPanelProps {
  documentId: string
}

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

  const sendMessage = useCallback(async () => {
    const q = input.trim()
    if (!q || loading) return

    setInput('')
    const userMsg: Message = { role: 'user', content: q, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const result = await askQuestion(documentId, q)
      const assistantMsg: Message = { role: 'assistant', content: result.answer, timestamp: new Date() }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      const errorMsg: Message = {
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

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fadeIn">
            <div className="text-3xl mb-3">💬</div>
            <p className="font-medium text-sm mb-1" style={{ color: 'rgb(var(--color-text))' }}>
              Ask about your document
            </p>
            <p className="text-xs max-w-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
              Ask questions like &ldquo;What are the termination conditions?&rdquo; or &ldquo;Summarize the payment terms&rdquo;
            </p>

            <div className="flex flex-wrap gap-2 mt-4 max-w-sm justify-center">
              {['What are the key obligations?', 'Summarize the risks', 'Explain payment terms'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(sendMessage, 100) }}
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                  style={{
                    borderColor: 'rgb(var(--color-border))',
                    color: 'rgb(var(--color-text-secondary))',
                    background: 'rgb(var(--color-surface))',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
            <div className="flex flex-col gap-1 max-w-[85%]">
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
            <div className="chat-bubble chat-bubble-assistant flex items-center gap-1.5 py-3">
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'rgb(var(--color-text-muted))', animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'rgb(var(--color-text-muted))', animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'rgb(var(--color-text-muted))', animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: 'rgb(var(--color-border))', background: 'rgb(var(--color-surface))' }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about this document..."
            className="input flex-1"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
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