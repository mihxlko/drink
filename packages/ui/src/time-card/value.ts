export const MAX_MINUTES = 23 * 60 + 59

export function rawClock(minutes: number): string {
  return String(Math.floor(minutes / 60) * 100 + minutes % 60)
}

export function formatDraft(raw: string): string {
  return raw.length > 2 ? `${raw.slice(0, -2)}:${raw.slice(-2)}` : raw
}

export function formatClock(minutes: number): string {
  return formatDraft(rawClock(minutes).padStart(4, '0'))
}

export function parseDraft(text: string): number | null {
  if (!/^\d{1,4}$/.test(text.replace(/:/g, ''))) return null
  const raw = text.replace(/:/g, '')
  const minutes = Number(raw.slice(-2))
  const hours = Number(raw.slice(0, -2))
  const total = hours * 60 + minutes
  return minutes <= 59 && total >= 1 && total <= MAX_MINUTES ? total : null
}

// Native selection is measured in characters; animation identity uses digits.
export function normalizeDraft(text: string, start: number, end = start) {
  const raw = text.replace(/\D/g, '').slice(0, 4)
  const caret = (position: number) => {
    const count = Math.min(raw.length, text.slice(0, position).replace(/\D/g, '').length)
    return count + (raw.length > 2 && count > raw.length - 2 ? 1 : 0)
  }
  return { text: formatDraft(raw), start: caret(start), end: caret(end) }
}

export function intervalWords(total: number): string {
  const h = Math.floor(total / 60), m = total % 60
  return [h ? `${h} ${h === 1 ? 'Hour' : 'Hours'}` : '', m ? `${m} ${m === 1 ? 'Minute' : 'Minutes'}` : ''].filter(Boolean).join(' ')
}
