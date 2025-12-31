import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { staggerContainerVariants, STAGGER } from '@/lib/animations'
import { useReducedMotion } from '@/lib/animations/hooks'
import { cn } from '@/lib/utils'

interface StaggerTableBodyProps {
  children: ReactNode
  className?: string
  /** Delay before starting the stagger animation (default: 0.1) */
  delay?: number
  /** Time between each child animation (default: 0.05) */
  staggerDelay?: number
}

/**
 * Table body component that staggers the animation of its row children
 * Renders motion.tbody for proper HTML table structure
 * Children should use StaggerTableRow component for proper animation
 */
export function StaggerTableBody({
  children,
  className,
  delay = 0.1,
  staggerDelay = STAGGER.fast,
}: StaggerTableBodyProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <tbody className={className}>{children}</tbody>
  }

  return (
    <motion.tbody
      className={cn(className)}
      initial="hidden"
      animate="visible"
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
    </motion.tbody>
  )
}
