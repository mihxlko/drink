import { useEffect, useState } from 'react'
import { chromePlatform } from '../platform'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── app ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [remaining, setRemaining] = useState<number | null>(null)

  // Sync theme preference to <html> so tokens.css dark overrides take effect
  useEffect(() => {
    chromePlatform.getPrefs().then(({ theme }) => {
      const html = document.documentElement
      if (theme === 'system') html.removeAttribute('data-theme')
      else html.setAttribute('data-theme', theme)
    })
  }, [])

  // Poll alarm every second to keep countdown accurate
  useEffect(() => {
    async function tick() {
      const alarm = await chrome.alarms.get('sip-reminder')
      setRemaining(alarm ? alarm.scheduledTime - Date.now() : null)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  function openSettings() {
    chromePlatform.openSettings()
  }

  const display = remaining === null ? '--:--' : fmtCountdown(remaining)

  return (
    <div className="w-[280px] bg-surface-base p-pad-lg font-sans antialiased flex flex-col gap-gap-sm">

      {/* logo */}
      <span className="self-start text-md font-semibold text-brand-primary">Drink</span>

      {/* countdown */}
      <div className="flex flex-col items-center gap-xs py-gap-sm">
        {/* letter-spacing 0.06em — no positive tracking token */}
        <span className="text-sm font-medium text-text-muted" style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Next drink in
        </span>
        {/* 36px — no token between text-lg (17px) and text-xl (80px) */}
        <span className="font-semibold text-text-primary" style={{ fontSize: 36, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          {display}
        </span>
      </div>

      {/* open settings */}
      <button
        onClick={openSettings}
        className="w-full cursor-pointer bg-surface-elevated border-0.5 border-border-default rounded-md shadow-subtle py-pad-sm text-md font-medium text-text-secondary outline-none appearance-none"
      >
        Open Settings
      </button>
    </div>
  )
}
