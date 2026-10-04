import assert from 'node:assert/strict'
import test from 'node:test'
import { formatClock, formatDraft, intervalWords, MAX_MINUTES, normalizeDraft, parseDraft, rawClock } from '../src/time-card/value.ts'

test('every supported interval round-trips through focused and resting clocks', () => {
  for (let minutes = 1; minutes <= MAX_MINUTES; minutes++) {
    assert.equal(parseDraft(formatClock(minutes)), minutes)
    assert.equal(parseDraft(formatDraft(rawClock(minutes))), minutes)
  }
})

test('incomplete and out-of-range drafts never become saved intervals', () => {
  for (const text of ['', '0', '0000', '60', '90', '1:60', '24:00', '9999', '12345', '-15', 'NaN']) {
    assert.equal(parseDraft(text), null, text)
  }
  assert.equal(parseDraft('1'), 1)
  assert.equal(parseDraft('23:59'), 1439)
})

test('colon insertion and removal preserve digit-based selection', () => {
  assert.deepEqual(normalizeDraft('130', 3), { text: '1:30', start: 4, end: 4 })
  assert.deepEqual(normalizeDraft('1:3', 3), { text: '13', start: 2, end: 2 })
  assert.deepEqual(normalizeDraft('01:30', 0, 2), { text: '01:30', start: 0, end: 2 })
  assert.deepEqual(normalizeDraft('abc12:34xyz5', 12), { text: '12:34', start: 5, end: 5 })
})

test('footer names hours and minutes without empty units', () => {
  assert.equal(intervalWords(1), '1 Minute')
  assert.equal(intervalWords(15), '15 Minutes')
  assert.equal(intervalWords(60), '1 Hour')
  assert.equal(intervalWords(90), '1 Hour 30 Minutes')
  assert.equal(intervalWords(1439), '23 Hours 59 Minutes')
})
