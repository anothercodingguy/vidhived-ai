'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { askQuestion } from '@/lib/api'
import AudioPlayer from './AudioPlayer'
import RichText from './RichText'
import { LogoMark } from './Logo'

/*
 * A message is one of:
 *   user       what the person typed
 *   assistant  an answer from the backend (can be read aloud)
 *   error      the request failed. Shown as an error with a "Try again" button,
 *              never as if the assistant had said it.
 */
interface Message {
  id: string
  role: 'user' | 'assistant' | 'error'
  content: string
  /** For errors: the question to send again. */
  retryQuery?: string
}

interface AskPanelProps {
  documentId: string
  /** A question to place in the input box (from "Ask" on a clause card). A new `id` means a new draft. */
  draft?: { id: number; text: string } | null
}

const MAX_QUESTION_LENGTH = 2000 // the backend rejects longer questions

const SUGGESTIONS = ['What are the key obligations?', 'Summarize the risks', 'Explain payment terms']

let msgIdCounter = 0
const nextMsgId = () => `msg-${++msgIdCounter}-${Date.now()}`

function Sender() {
  return (
    <div className="ml-0.5 flex items-center gap-2">
      <LogoMark size={16} />
      <span className="text-xs font-medium text-ink-muted">Vidhived</span>
    </div>
  )
}

export default function AskPanel({ documentId, draft }: AskPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the newest message in view.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // "Ask" on a clause card fills the input, so the question can be edited before sending.
  useEffect(() => {
    if (!draft) return
    setInput(draft.text.slice(0, MAX_QUESTION_LENGTH))
    inputRef.current?.focus()
  }, [draft])

  const sendMessage = useCallback(async (directQuery?: string) => {
    const q = (directQuery || input).trim()
    if (!q || loading) return

    if (!directQuery) setInput('')

    setMessages(prev => [...prev, { id: nextMsgId(), role: 'user', content: q }])
    setLoading(true)

    try {
      const result = await askQuestion(documentId, q)
      if (result.hasAI === false) {
        // The backend answers 200 with a setup message when it has no AI key. That is not an answer.
        setMessages(prev => [...prev, {
          id: nextMsgId(),
          role: 'error',
          content: 'The assistant is not available: the AI service is not configured on the server.',
        }])
      } else {
        setMessages(prev => [...prev, { id: nextMsgId(), role: 'assistant', content: result.answer }])
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: nextMsgId(),
        role: 'error',
        content: err?.message || 'Something went wrong. Please try again.',
        retryQuery: q,
      }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, documentId])

  const retry = useCallback((message: Message) => {
    if (!message.retryQuery || loading) return
    // Remove the failed attempt (the question and its error) and send the question again.
    setMessages(prev => {
      const index = prev.findIndex(m => m.id === message.id)
      const start = index > 0 && prev[index - 1].role === 'user' ? index - 1 : index
      return [...prev.slice(0, start), ...prev.slice(index + 1)]
    })
    sendMessage(message.retryQuery)
  }, [loading, sendMessage])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages. role="log" makes screen readers announce new answers. */}
      <div ref={scrollRef} role="log" aria-label="Conversation" className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !loading && (
          <div className="flex h-full animate-fadeIn flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="mb-1 text-sm font-semibold text-ink">
              Ask about your document
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-ink-secondary">
              Ask questions like &ldquo;What are the termination conditions?&rdquo; or &ldquo;Summarize the payment terms&rdquo;
            </p>

            <div className="mt-5 flex max-w-sm flex-wrap justify-center gap-2">
              {SUGGESTIONS.map(q => (
                <button key={q} type="button" onClick={() => sendMessage(q)} className="btn btn-secondary btn-sm rounded-full font-medium">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex animate-fadeIn ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' && (
              <div className="chat-bubble chat-bubble-user">
                <p className="whitespace-pre-wrap"><span className="sr-only">You asked: </span>{msg.content}</p>
              </div>
            )}

            {msg.role === 'assistant' && (
              <div className="flex max-w-[85%] flex-col gap-1.5">
                <Sender />
                <div className="chat-bubble chat-bubble-assistant max-w-none">
                  <RichText text={msg.content} />
                </div>
                <div className="ml-1">
                  <AudioPlayer text={msg.content} subject="this answer" showLabel />
                </div>
              </div>
            )}

            {msg.role === 'error' && (
              <div role="alert" className="chat-bubble chat-bubble-error flex max-w-[85%] gap-2.5">
                <svg aria-hidden="true" className="mt-1 shrink-0 text-risk-high" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p className="font-semibold text-risk-high">Could not get an answer</p>
                  <p>{msg.content}</p>
                  {msg.retryQuery && (
                    <button type="button" onClick={() => retry(msg)} disabled={loading} className="btn btn-secondary btn-sm mt-2">
                      Try again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex animate-fadeIn justify-start" role="status">
            <div className="flex flex-col gap-1.5">
              <Sender />
              <div className="chat-bubble chat-bubble-assistant flex items-center gap-1.5 py-3.5">
                <span className="sr-only">Vidhived is writing an answer…</span>
                <span aria-hidden="true" className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted" />
                <span aria-hidden="true" className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:150ms]" />
                <span aria-hidden="true" className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line bg-surface p-3">
        <label htmlFor="ask-input" className="sr-only">Ask a question about this document</label>
        <input
          id="ask-input"
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this document..."
          maxLength={MAX_QUESTION_LENGTH}
          autoComplete="off"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="btn btn-primary px-4"
          aria-label="Send question"
          title="Send question"
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
