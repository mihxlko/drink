import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import TimeCard from '../src/time-card/TimeCard'
import '../src/tokens.css'

// A real-browser harness: exercises the production component and WAAPI, without
// mocking layout or animations. Nothing reads or writes application preferences.
const fixture = document.querySelector<HTMLDivElement>('#fixture')!
fixture.style.cssText = 'width:290px;font-family:var(--font-sans);font-synthesis:none'
const style = document.createElement('style')
style.textContent = '*{box-sizing:border-box}body{font-family:system-ui}button,input{font:inherit}h2{margin:0}'
document.head.append(style)
const result = document.querySelector<HTMLPreElement>('#results')!
const run = document.querySelector<HTMLButtonElement>('#run')!
const delay = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
const field = () => fixture.querySelector<HTMLInputElement>('input')!
const plus = () => fixture.querySelector<HTMLButtonElement>('[aria-label="Add 5 minutes"]')!
const minus = () => fixture.querySelector<HTMLButtonElement>('[aria-label="Subtract 5 minutes"]')!
const label = () => fixture.querySelector('.sip-time-label .footer-label-sr')!.textContent
const act = (fn: () => void) => flushSync(fn)
function edit(text: string, inputType = 'insertText', start = text.length) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field(), text)
    field().setSelectionRange(start, start)
    field().dispatchEvent(new InputEvent('input', { bubbles: true, inputType, data: text }))
  })
}
function key(key: string) {
  act(() => field().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })))
}

run.onclick = async () => {
  run.disabled = true
  result.textContent = ''
  const passed = (message: string) => { result.textContent += `PASS ${message}\n` }
  let commits: number[] = [], closed = 0
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) closed++ }
  document.addEventListener('keydown', onKey)
  const originalMatchMedia = window.matchMedia
  let root = createRoot(fixture)
  function App({ initial = 15 }: { initial?: number }) {
    const [minutes, setMinutes] = useState(initial)
    return <TimeCard minutes={minutes} onChange={value => { commits.push(value); setMinutes(value) }} />
  }
  try {
    await document.fonts.ready
    act(() => root.render(<StrictMode><App /></StrictMode>))
    await delay()
    assert(field().value === '00:15' && fixture.querySelectorAll('.clock-motion-group').length === 1, 'StrictMode initialization')
    passed('StrictMode mounts one clock and one footer')
    act(() => field().focus())
    assert(field().value === '15', 'focus removes padding')
    edit('130')
    assert(field().value === '1:30' && field().selectionStart === 4 && commits.length === 0 && label() === '15 Minutes', 'draft/colon/caret')
    key('Enter')
    assert(field().value === '01:30' && commits.at(-1) === 90 && label() === '1 Hour 30 Minutes', 'commit')
    passed('Typing inserts a colon; Enter commits once and restores padding')

    act(() => field().focus())
    edit('1:3', 'deleteContentBackward')
    const deletion = [...fixture.querySelectorAll('[data-exiting]')].flatMap(node => node.getAnimations()).find(animation => animation.effect?.getTiming().duration === 190)
    assert(field().value === '13' && deletion?.effect?.getTiming().duration === 190, 'deletion preserves one-digit editing and timing')
    assert(JSON.stringify((deletion.effect as KeyframeEffect).getKeyframes()).includes('40px'), 'deleted digit exits down')
    key('Escape')
    assert(field().value === '01:30' && commits.length === 1 && closed === 0, 'cancel')
    passed('Deletion slides down; Escape restores the saved value without closing Settings')

    for (const invalid of ['', '0', '90', '24:00']) {
      act(() => field().focus()); edit(invalid); key('Enter')
      assert(field().getAttribute('aria-invalid') === 'true' && commits.length === 1, `invalid ${invalid}`)
    }
    act(() => field().focus()); key('Escape')
    passed('Empty, zero, invalid minutes and 24:00 drafts never persist')

    act(() => field().focus()); edit('1'); key('Enter')
    assert(minus().disabled, 'lower bound')
    act(() => field().focus()); edit('2359'); key('Enter')
    assert(plus().disabled && commits.at(-1) === 1439, 'upper bound')
    passed('Buttons disable at 00:01 and 23:59')

    act(() => field().focus()); edit('20'); key('Enter'); await delay(380)
    act(() => plus().click())
    assert(commits.at(-1) === 25 && field().value === '00:25', 'step')
    const digit = fixture.querySelector('.clock-motion-glyph:last-child')
    const inputAnimations = fixture.querySelector('.clock-motion')!.getAnimations({ subtree: true })
    assert(inputAnimations.some(animation => animation.effect?.getTiming().duration === 190), 'step timing survives React parent commit')
    const footer = fixture.querySelector<HTMLElement>('.sip-time-label')!
    assert(footer.dataset.renderer === 'slide', 'single digit renderer')
    assert(footer.getAnimations({ subtree: true }).some(animation => animation.effect?.getTiming().duration === 290), 'footer slide duration')
    assert(digit, 'visible digits')
    passed('Button digits retain 190ms; a single footer digit slides for 290ms')
    act(() => plus().click()); act(() => plus().click()); act(() => minus().click())
    assert(commits.at(-1) === 30 && label() === '30 Minutes', 'rapid interrupted steps')
    await delay(400)
    assert(!fixture.querySelector('[data-exiting]'), 'exit cleanup')
    passed('Rapid interrupted steps settle correctly and remove old digits')

    act(() => field().focus()); edit('15'); key('Enter'); await delay(380)
    act(() => plus().click())
    assert(footer.dataset.renderer === 'torph', 'two digit fallback')
    passed('Two changed footer digits use the approved Torph fallback')
    act(() => root.unmount())
    assert(!document.querySelector('style[data-torph]'), 'Torph styles cleaned up')
    passed('Unmount cleans up the Torph controller')

    root = createRoot(fixture)
    commits = []
    act(() => root.render(<StrictMode><App initial={1440} /></StrictMode>)); await delay()
    act(() => field().focus()); key('Enter')
    assert(field().value === '24:00' && commits.length === 0, 'legacy interval')
    passed('An untouched legacy 24-hour interval is preserved')
    act(() => root.unmount())
    // Simulate only the OS preference; layout, rendering and WAAPI stay real.
    const listeners = new Set<EventListenerOrEventListenerObject>()
    let reduce = false
    const media = {
      media: '(prefers-reduced-motion: reduce)', get matches() { return reduce }, onchange: null,
      addEventListener: (_: string, listener: EventListenerOrEventListenerObject) => listeners.add(listener),
      removeEventListener: (_: string, listener: EventListenerOrEventListenerObject) => listeners.delete(listener),
      addListener() {}, removeListener() {}, dispatchEvent: () => true,
    } as MediaQueryList
    window.matchMedia = query => query === media.media ? media : originalMatchMedia.call(window, query)
    root = createRoot(fixture)
    act(() => root.render(<StrictMode><App /></StrictMode>)); await delay()
    act(() => plus().click())
    reduce = true
    for (const listener of [...listeners]) {
      const event = { matches: true } as MediaQueryListEvent
      if (typeof listener === 'function') listener(event); else listener.handleEvent(event)
    }
    assert(fixture.getAnimations({ subtree: true }).length === 0, 'dynamic reduced motion cancels all travel')
    act(() => plus().click())
    assert(field().value === '00:25' && label() === '25 Minutes' && fixture.getAnimations({ subtree: true }).length === 0, 'reduced values remain visible')
    passed('Changing reduced motion mid-animation settles all layers; subsequent changes remain instant')
    act(() => root.unmount())
    assert(listeners.size === 0, 'media listener cleanup')
    passed('Unmount removes every reduced-motion listener')
    result.textContent += '\nAll checks passed.\n'
  } catch (error) {
    result.textContent += `FAIL ${error instanceof Error ? error.message : error}\n`
  } finally {
    act(() => root.unmount())
    window.matchMedia = originalMatchMedia
    document.removeEventListener('keydown', onKey)
    run.disabled = false
  }
}
