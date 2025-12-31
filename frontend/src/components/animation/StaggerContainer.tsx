import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { staggerContainerVariants, STAGGER } from '@/lib/animations'
import { useReducedMotion } from '@/lib/animations/hooks'
import { cn } from '@/lib/utils'

interface StaggerContainerProps {
  children: ReactNode
  className?: string
  /** Delay before starting the stagger animation (default: 0.1) */
  delay?: number
  /** Time between each child animation (default: 0.1) */
  staggerDelay?: number
  /** Whether to use viewport trigger (default: false) */
  once?: boolean
}

/**
 * Container component that staggers the animation of its children
 * Children should use StaggerItem component for proper animation
 */
export function StaggerContainer({
  children,
  className,
  delay = 0.1,
  staggerDelay = STAGGER.normal,
  once = true,
}: StaggerContainerProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={cn('w-full', className)}
      initial="hidden"
      animate="visible"
      viewport={once ? { once: true } : undefined}
      variants={{
        hidden: staggerContainerVariants.hidden,
        visible: {
          ...staggerContainerVariants.visible,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}
