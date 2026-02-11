'use client'

import { useState, useRef, useCallback } from 'react'
import { textToSpeech } from '@/lib/api'

interface AudioPlayerProps {
    text: string
    language?: string
    size?: 'sm' | 'md'
}

export default function AudioPlayer({ text, language = 'en-IN', size = 'sm' }: AudioPlayerProps) {
    const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'error'>('idle')
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [errorMsg, setErrorMsg] = useState('')

    const handlePlay = useCallback(async () => {
        if (state === 'playing') {
            audioRef.current?.pause()
            setState('paused')
            return
        }

        if (state === 'paused' && audioRef.current) {
            audioRef.current.play()
            setState('playing')
            return
        }

        // Load fresh audio
        setState('loading')
        setErrorMsg('')

        try {
            const result = await textToSpeech(text, language)

            // Create audio from base64
            const audioSrc = `data:audio/wav;base64,${result.audio}`
            const audio = new Audio(audioSrc)

            audio.onended = () => setState('idle')
            audio.onerror = () => {
                setState('error')
                setErrorMsg('Playback failed')
            }

            audioRef.current = audio
            await audio.play()
            setState('playing')
        } catch (err: any) {
            setState('error')
            setErrorMsg(err.message || 'Voice unavailable')
        }
    }, [state, text, language])

    const handleStop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
        }
        setState('idle')
    }, [])

    const isSmall = size === 'sm'

    return (
        <div className="inline-flex items-center gap-1.5">
            <button
                onClick={handlePlay}
                disabled={state === 'loading'}
                className={`btn-ghost btn-icon transition-all ${isSmall ? 'p-1' : 'p-1.5'}`}
                title={state === 'playing' ? 'Pause' : state === 'error' ? errorMsg : 'Listen'}
                style={{
                    color: state === 'error' ? 'rgb(var(--color-risk-high))' : 'rgb(var(--color-text-secondary))',
                }}
            >
                {state === 'loading' ? (
                    <svg className="animate-spin" width={isSmall ? 14 : 16} height={isSmall ? 14 : 16} viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                ) : state === 'playing' ? (
                    <svg width={isSmall ? 14 : 16} height={isSmall ? 14 : 16} viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                ) : state === 'error' ? (
                    <svg width={isSmall ? 14 : 16} height={isSmall ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                ) : (
                    <svg width={isSmall ? 14 : 16} height={isSmall ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                )}
            </button>

            {state === 'playing' && (
                <button onClick={handleStop} className="btn-ghost btn-icon p-1" title="Stop">
                    <svg width={isSmall ? 12 : 14} height={isSmall ? 12 : 14} viewBox="0 0 24 24" fill="currentColor" style={{ color: 'rgb(var(--color-text-muted))' }}>
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                    </svg>
                </button>
            )}
        </div>
    )
}
