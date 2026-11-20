'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ApiError, getTTSStatus, textToSpeech } from '@/lib/api'

/*
 * ── Is voice playback available? ───────────────────────────────────
 * The backend only has text-to-speech when it is configured with a key.
 * GET /tts/status says whether it is. We ask once and share the answer
 * with every AudioPlayer on the page through this tiny store.
 */
export type VoiceAvailability = 'unknown' | 'available' | 'unavailable'

let availability: VoiceAvailability = 'unknown'
let statusRequested = false
const listeners = new Set<() => void>()

function setAvailability(next: VoiceAvailability) {
  availability = next
  listeners.forEach(notify => notify())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useVoiceAvailability(): VoiceAvailability {
  const value = useSyncExternalStore(subscribe, () => availability, () => 'unknown' as VoiceAvailability)

  useEffect(() => {
    if (statusRequested) return
    statusRequested = true
    getTTSStatus().then(status => {
      // null means the check itself failed. Then we stay on 'unknown' and let a click find out.
      if (status) setAvailability(status.available ? 'available' : 'unavailable')
    })
  }, [])

  return value
}

/** Shown once per panel when voice playback is switched off on the server. */
export function VoiceUnavailableNote({ className = '' }: { className?: string }) {
  const voice = useVoiceAvailability()
  if (voice !== 'unavailable') return null
  return (
    <p className={`text-xs text-ink-muted ${className}`}>
      Voice playback is unavailable: it is not set up on this server.
    </p>
  )
}

// ── Player ──────────────────────────────────────────────────────────

interface AudioPlayerProps {
  text: string
  language?: string
  size?: 'sm' | 'md'
  /** What will be read out, for the accessible name: "Listen to the summary". */
  subject?: string
  /** Show the word "Listen" next to the icon. */
  showLabel?: boolean
}

type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export default function AudioPlayer({ text, language = 'en-IN', size = 'sm', subject = 'this text', showLabel = false }: AudioPlayerProps) {
  const [state, setState] = useState<PlayerState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const voice = useVoiceAvailability()

  // Stop the sound if the player is removed from the page (for example a collapsed card),
  // or if the server turns out to have no voice service and the button disappears.
  useEffect(() => () => { audioRef.current?.pause() }, [])
  useEffect(() => {
    if (voice === 'unavailable') audioRef.current?.pause()
  }, [voice])

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
      const audio = new Audio(`data:audio/wav;base64,${result.audio}`)
      audio.onended = () => setState('idle')
      audio.onerror = () => {
        setState('error')
        setErrorMsg('Could not play the audio.')
      }

      audioRef.current = audio
      await audio.play()
      setState('playing')
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'VOICE_NOT_CONFIGURED') {
        // The server has no voice service. Hide every Listen button and show the note instead.
        setAvailability('unavailable')
        setState('idle')
        return
      }
      setState('error')
      setErrorMsg(err instanceof ApiError ? err.message : 'Could not play the audio.')
    }
  }, [state, text, language])

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setState('idle')
  }, [])

  if (voice === 'unavailable') return null

  const icon = size === 'sm' ? 14 : 16
  const actionLabel =
    state === 'loading' ? 'Loading audio…'
      : state === 'playing' ? 'Pause'
        : state === 'paused' ? 'Resume'
          : state === 'error' ? 'Try again'
            : 'Listen'
  const accessibleName = state === 'idle' ? `Listen to ${subject}` : state === 'error' ? `Try listening to ${subject} again` : actionLabel

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={handlePlay}
        disabled={state === 'loading'}
        className={`btn-ghost min-h-8 text-xs font-medium ${showLabel ? '' : 'btn-icon min-w-8'} ${state === 'error' ? 'text-risk-high' : ''}`}
        title={accessibleName}
        aria-label={accessibleName}
      >
        {state === 'loading' ? (
          <span aria-hidden="true" className={`spinner border-2 ${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
        ) : state === 'playing' ? (
          <svg aria-hidden="true" width={icon} height={icon} viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : state === 'error' ? (
          <svg aria-hidden="true" width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        ) : (
          <svg aria-hidden="true" width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
        {showLabel && <span>{actionLabel}</span>}
      </button>

      {state === 'playing' && (
        <button type="button" onClick={handleStop} className="btn-ghost btn-icon min-h-8 min-w-8" title="Stop" aria-label="Stop">
          <svg aria-hidden="true" width={icon - 2} height={icon - 2} viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        </button>
      )}

      {/* The error is written out, not hidden in a tooltip. */}
      <span role="status" className="text-xs text-risk-high empty:hidden">{state === 'error' ? errorMsg : ''}</span>
    </span>
  )
}
