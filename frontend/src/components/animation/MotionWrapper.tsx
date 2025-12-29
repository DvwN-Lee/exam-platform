import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { pageVariants, DURATION, EASING } from '@/lib/animations'
import { useReducedMotion } from '@/lib/animations/hooks'
import { cn } from '@/lib/utils'

interface MotionWrapperProps {
  children: ReactNode
  className?: string
}

/**
 * Wrapper component for page transition animations
 * Applies fade-in and slide-up animation on mount
 */
export function MotionWrapper({ children, className }: MotionWrapperProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={cn('w-full', className)}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{
        duration: DURATION.normal,
        ease: EASING.easeOut,
      }}
    >
      {children}
    </motion.div>
  )
}
