// Card 07, matched to the approved portfolio recording (drink-time-card.mp4):
// digits travel 40px in 190ms, typed or stepped, and replaced digits leave
// downward. Recentering also settles in 190ms. The field clips the travel, so
// only part of the 40px path is ever visible.
export const TIME_CARD_MOTION = {
  easing: 'cubic-bezier(.22, 1, .36, 1)',
  layoutDuration: 190,
  paddingExitDuration: 150,
  input: {
    enterDistancePx: 40,
    exitDistancePx: 40,
    travelTimeMs: 190,
    stepDurationMs: 190,
    stepEasing: 'cubic-bezier(.22, 1, .36, 1)',
    linkExitToEntry: true,
    deleteDownward: true,
    stepExitDownward: true,
  },
  footer: { distance: 20, slideDuration: 290, wordingDuration: 200 },
} as const
