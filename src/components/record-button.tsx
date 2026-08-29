'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Hold to talk.
 *
 * Hold rather than tap-to-start-tap-to-stop, because the second one needs
 * you to look at the screen twice. Holding is what a walkie-talkie does and
 * what a voice note does, and everybody already knows it without being
 * told.
 *
 * The Web Speech API is used directly. No SDK, no key, no install — it is
 * already in the browser most people have open, and it is already in the
 * browser in someone's pocket at a mill. Where it is missing, the button
 * becomes a text field, which is also what happens next to a running mill.
 */

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: unknown) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

function getRecognition(): Recognition | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition
    webkitSpeechRecognition?: new () => Recognition
  }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

export function RecordButton({ onText }: { onText: (text: string) => void }) {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [typing, setTyping] = useState(false)
  const [typed, setTyped] = useState('')
  const recRef = useRef<Recognition | null>(null)
  const heardRef = useRef('')

  useEffect(() => {
    const rec = getRecognition()
    setSupported(rec !== null)
    if (!rec) return

    // sw-TZ where the browser has it. Where it does not, English recognition
    // still picks up the numbers, which are the part that matters most, and
    // anything it mangles becomes a note rather than being lost.
    rec.lang = 'sw-TZ'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e) => {
      let text = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript
      }
      heardRef.current = text
      setHeard(text)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)

    recRef.current = rec
    return () => rec.stop()
  }, [])

  const start = () => {
    if (!recRef.current || listening) return
    heardRef.current = ''
    setHeard('')
    setListening(true)
    try {
      recRef.current.start()
    } catch {
      // start() throws if called twice in quick succession. Harmless.
    }
  }

  const stop = () => {
    if (!recRef.current) return
    recRef.current.stop()
    setListening(false)
    const text = heardRef.current.trim()
    if (text) onText(text)
    heardRef.current = ''
    setHeard('')
  }

  if (supported === false || typing) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && typed.trim()) {
              onText(typed.trim())
              setTyped('')
            }
          }}
          placeholder="Type what happened"
          className="h-[52px] flex-1 rounded-md border border-border px-4 text-[15px] outline-none"
        />
        <button
          type="button"
          onClick={() => {
            if (typed.trim()) {
              onText(typed.trim())
              setTyped('')
            }
          }}
          className="h-[52px] rounded-md bg-fg px-5 text-[15px] font-medium text-white"
        >
          Save
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={() => listening && stop()}
        className={`h-[52px] w-full select-none rounded-md text-[15px] font-medium text-white ${
          listening ? 'recording' : ''
        }`}
        style={{ background: listening ? 'var(--color-agent)' : 'var(--color-fg)' }}
      >
        {listening ? 'Listening — let go when done' : 'Hold to record'}
      </button>

      {listening && heard && (
        <p className="mt-3 text-[14px] italic text-fg-muted">{heard}</p>
      )}

      {!listening && (
        <button
          type="button"
          onClick={() => setTyping(true)}
          className="mx-auto mt-2 block text-[12px] text-fg-faint"
        >
          or type it
        </button>
      )}
    </div>
  )
}
