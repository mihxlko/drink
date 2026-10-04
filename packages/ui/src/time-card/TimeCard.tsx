import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import { createTimeCardMotion, type ClockUpdate } from './clock-motion'
import { createTimeCardFooter } from './footer-motion'
import { formatClock, formatDraft, intervalWords, MAX_MINUTES, normalizeDraft, parseDraft, rawClock } from './value'
import './time-card.css'

interface Props { minutes: number; onChange: (minutes: number) => void }

export default function TimeCard({ minutes, onChange }: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const clock = useRef<HTMLSpanElement>(null)
  const footer = useRef<HTMLSpanElement>(null)
  const motion = useRef<ReturnType<typeof createTimeCardMotion>>()
  const labelMotion = useRef<ReturnType<typeof createTimeCardFooter>>()
  const saved = useRef(minutes)
  const focused = useRef(false)
  const invalid = useRef(false)
  const firstClick = useRef(false)
  const cancelled = useRef(false)
  const [error, setError] = useState('')
  const [draftMinutes, setDraftMinutes] = useState<number | null>(minutes)

  const paint = useCallback((options: ClockUpdate = {}) => {
    if (!input.current) return
    const padding = !focused.current && !invalid.current ? Math.max(0, 4 - rawClock(saved.current).length) : 0
    motion.current?.update(input.current.value, { padding, ...options })
  }, [])

  const renderSaved = useCallback((step = false) => {
    if (!input.current) return
    invalid.current = false
    setError('')
    input.current.value = focused.current ? formatDraft(rawClock(saved.current)) : formatClock(saved.current)
    setDraftMinutes(saved.current)
    paint({ step })
    labelMotion.current?.update(intervalWords(saved.current))
  }, [paint])

  // React owns the field's lifecycle, not its character buffer. Native editing
  // keeps selection and paste intact; the separate mirror owns only paint.
  useLayoutEffect(() => {
    motion.current = createTimeCardMotion(clock.current!)
    labelMotion.current = createTimeCardFooter(footer.current!)
    paint()
    labelMotion.current.update(intervalWords(saved.current))
    let live = true
    void document.fonts.ready.then(() => {
      if (!live) return
      paint() // Remeasure in CSS pixels, preserving any active draft.
      labelMotion.current?.destroy()
      labelMotion.current = createTimeCardFooter(footer.current!)
      labelMotion.current.update(intervalWords(saved.current))
    })
    return () => {
      live = false
      motion.current?.destroy()
      labelMotion.current?.destroy()
    }
  }, [paint])

  useLayoutEffect(() => {
    if (saved.current === minutes) return // Local commits have already painted.
    saved.current = minutes
    labelMotion.current?.update(intervalWords(minutes))
    if (!focused.current && !invalid.current) renderSaved()
  }, [minutes, renderSaved])

  function save(next: number, step = false) {
    saved.current = next
    renderSaved(step)
    onChange(next)
  }

  function step(delta: number) {
    const draft = parseDraft(input.current?.value ?? '')
    save(Math.min(MAX_MINUTES, Math.max(1, (draft ?? saved.current) + delta)), true)
  }

  return (
    <section className="sip-time-card" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="sip-time-title">Timing</h2>
      <div className="sip-time-row">
        <div className="sip-time-field" data-invalid={!!error || undefined}>
          <div className="sip-time-clock">
            <span ref={clock} className="clock-motion" aria-hidden="true" />
            <input
              ref={input}
              className="sip-time-input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              defaultValue={formatClock(minutes)}
              aria-label="Reminder interval, hours and minutes"
              aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
              aria-invalid={!!error}
              onFocus={event => {
                focused.current = true
                if (!invalid.current) event.currentTarget.value = formatDraft(rawClock(saved.current))
                paint()
                const end = event.currentTarget.value.length
                event.currentTarget.setSelectionRange(end, end)
              }}
              onPointerDown={() => { firstClick.current = document.activeElement !== input.current }}
              onPointerCancel={() => { firstClick.current = false }}
              onClick={event => {
                if (firstClick.current) {
                  const end = event.currentTarget.value.length
                  event.currentTarget.setSelectionRange(end, end)
                }
                firstClick.current = false
              }}
              onChange={event => {
                const el = event.currentTarget
                const next = normalizeDraft(el.value, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length)
                el.value = next.text
                el.setSelectionRange(next.start, next.end)
                invalid.current = false
                setError('')
                setDraftMinutes(parseDraft(next.text))
                paint({
                  cursorIndex: next.text.slice(0, next.start).replace(/\D/g, '').length,
                  deleting: (event.nativeEvent as InputEvent).inputType?.startsWith('delete'),
                })
              }}
              onKeyDown={event => {
                if (event.nativeEvent.isComposing) return
                if (event.key === 'Escape') {
                  event.preventDefault()
                  event.stopPropagation()
                  cancelled.current = true
                  event.currentTarget.blur()
                  return
                }
                if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); return }
                if (event.metaKey || event.ctrlKey || event.altKey) return
                const el = event.currentTarget, start = el.selectionStart ?? 0
                if (start !== el.selectionEnd) return
                // Skip the generated colon so one keystroke removes one digit.
                if (event.key === 'Backspace' && el.value[start - 1] === ':') el.setSelectionRange(start - 1, start - 1)
                if (event.key === 'Delete' && el.value[start] === ':') el.setSelectionRange(start + 1, start + 1)
              }}
              onBlur={() => {
                focused.current = false
                if (cancelled.current) { cancelled.current = false; renderSaved(); return }
                const value = parseDraft(input.current!.value)
                // Old Sip allowed 24:00. Preserve an untouched legacy interval;
                // new values still use the approved 00:01–23:59 range.
                if (input.current!.value === formatDraft(rawClock(saved.current))) { renderSaved(); return }
                if (value === null) {
                  invalid.current = true
                  setError('Enter a time from 00:01 to 23:59.')
                } else save(value)
              }}
            />
          </div>
        </div>
        <div className="sip-time-buttons">
          {[5, -5].map(delta => (
            <button
              key={delta}
              type="button"
              aria-label={delta > 0 ? 'Add 5 minutes' : 'Subtract 5 minutes'}
              disabled={draftMinutes !== null && (delta > 0 ? draftMinutes >= MAX_MINUTES : draftMinutes <= 1)}
              onPointerDown={event => {
                event.currentTarget.setAttribute('data-pressed', '')
                if (focused.current) event.preventDefault() // Step the draft without committing a blur first.
              }}
              onPointerUp={event => event.currentTarget.removeAttribute('data-pressed')}
              onPointerCancel={event => event.currentTarget.removeAttribute('data-pressed')}
              onPointerLeave={event => event.currentTarget.removeAttribute('data-pressed')}
              onClick={() => step(delta)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                <path d="M5 12h14" />
                {delta > 0 && <path d="M12 5v14" />}
              </svg>
            </button>
          ))}
        </div>
      </div>
      <div className="sip-time-footer"><span>Every:</span><span ref={footer} className="sip-time-label" /></div>
      <span id={`${id}-help`} className="footer-label-sr">Type hours and minutes, for example 130 for 1 hour 30 minutes. Enter saves; Escape cancels. The buttons adjust by 5 minutes.</span>
      {error && <p id={`${id}-error`} className="sip-time-error" role="status">{error}</p>}
    </section>
  )
}
