// Approved card 07 / DialKit Version 3. Keep vertical travel separate from
// recentering: typing settles horizontally in 190ms, digits travel for 350ms.
export const TIME_CARD_MOTION = {
  easing: 'cubic-bezier(.22, 1, .36, 1)',
  layoutDuration: 190,
  paddingExitDuration: 150,
  input: {
    enterDistancePx: 20,
    exitDistancePx: 20,
    travelTimeMs: 350,
    stepDurationMs: 350,
    stepEasing: 'cubic-bezier(.22, 1, .36, 1)',
    linkExitToEntry: true,
    deleteDownward: true,
    stepExitDownward: false,
  },
  footer: { distance: 20, slideDuration: 290, wordingDuration: 200 },
} as const
