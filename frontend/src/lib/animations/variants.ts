import type { Variants } from 'framer-motion'
import { DURATION, EASING, STAGGER } from './transitions'

// Page transition variants
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: DURATION.fast,
      ease: EASING.easeIn,
    },
  },
}

// Fade in variants
export const fadeInVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
}

// Slide up variants
export const slideUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
}

// Slide in from left variants
export const slideInLeftVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -30,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
}

// Stagger container variants
export const staggerContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.normal,
      delayChildren: 0.1,
    },
  },
}

// Fast stagger container variants
export const staggerContainerFastVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.fast,
      delayChildren: 0.05,
    },
  },
}

// Stagger item variants
export const staggerItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
}

// Stagger item with scale variants
export const staggerItemScaleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
}

// Card hover variants
// GPU 가속을 위해 boxShadow 대신 transform(scale)만 사용
// boxShadow는 CSS transition + Tailwind 클래스로 처리 권장
export const cardHoverVariants: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: DURATION.fast,
      ease: EASING.easeOut,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: DURATION.instant,
    },
  },
}

// Scale hover variants (for buttons, icons)
export const scaleHoverVariants: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: DURATION.fast,
      ease: EASING.easeOut,
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: DURATION.instant,
    },
  },
}

// List item hover variants
// GPU 가속을 위해 backgroundColor 대신 opacity 기반 오버레이 사용 권장
// CSS hover:bg-muted/50 + transition-colors 조합으로 대체 가능
export const listItemHoverVariants: Variants = {
  rest: {
    opacity: 1,
  },
  hover: {
    opacity: 0.96,
    transition: {
      duration: DURATION.fast,
    },
  },
}

// Progress bar variants
// GPU 가속을 위해 width 대신 scaleX 사용 (레이아웃 시프트 방지)
export const progressBarVariants: Variants = {
  hidden: {
    scaleX: 0,
    originX: 0,
  },
  visible: (progress: number) => ({
    scaleX: progress / 100,
    originX: 0,
    transition: {
      duration: DURATION.slow,
      ease: EASING.easeOut,
    },
  }),
}

// Tab indicator variants
export const tabIndicatorVariants: Variants = {
  inactive: {
    opacity: 0,
  },
  active: {
    opacity: 1,
    transition: {
      duration: DURATION.fast,
    },
  },
}

// Modal/Dialog variants
export const modalOverlayVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION.fast,
    },
  },
}

export const modalContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: DURATION.fast,
      ease: EASING.easeIn,
    },
  },
}

// Sidebar nav item variants
export const navItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.easeOut,
    },
  },
}
