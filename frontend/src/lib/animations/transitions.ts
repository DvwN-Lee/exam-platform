// Animation timing constants
export const DURATION = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
  chart: 0.8,
} as const

// Easing curves (Material Design inspired)
export const EASING = {
  // Standard easing - for elements entering the screen
  easeOut: [0.0, 0.0, 0.2, 1] as const,
  // Decelerate easing - for elements leaving the screen
  easeIn: [0.4, 0.0, 1, 1] as const,
  // Standard easing - for elements moving on screen
  easeInOut: [0.4, 0.0, 0.2, 1] as const,
  // Spring configs
  spring: { type: 'spring' as const, stiffness: 300, damping: 30 },
  springBouncy: { type: 'spring' as const, stiffness: 400, damping: 10 },
  springGentle: { type: 'spring' as const, stiffness: 200, damping: 25 },
} as const

// Stagger delays for sequential animations
export const STAGGER = {
  fast: 0.05,
  normal: 0.1,
  slow: 0.15,
} as const

// Common transition presets
export const TRANSITION = {
  // Default transition
  default: {
    duration: DURATION.normal,
    ease: EASING.easeOut,
  },
  // Fast transition for micro-interactions
  fast: {
    duration: DURATION.fast,
    ease: EASING.easeOut,
  },
  // Slow transition for page elements
  slow: {
    duration: DURATION.slow,
    ease: EASING.easeInOut,
  },
  // Chart animation transition
  chart: {
    duration: DURATION.chart,
    ease: EASING.easeOut,
  },
  // Spring transition
  spring: EASING.spring,
} as const
