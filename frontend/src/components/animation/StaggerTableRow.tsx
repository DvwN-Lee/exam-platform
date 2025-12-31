import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { slideUpVariants, DURATION, EASING } from '@/lib/animations'
import { useReducedMotion } from '@/lib/animations/hooks'
import { cn } from '@/lib/utils'

interface StaggerTableRowProps {
  children: ReactNode
  className?: string
}

/**
 * Table row component that animates as part of a StaggerTableBody
 * Renders motion.tr for proper HTML table structure
 * Must be used as a child of StaggerTableBody for animation to work
 */
export function StaggerTableRow({ children, className }: StaggerTableRowProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <tr className={className}>{children}</tr>
  }

  return (
    <motion.tr
      className={cn(className)}
      variants={slideUpVariants}
      transition={{
        duration: DURATION.normal,
        ease: EASING.easeOut,
      }}
    >
      {children}
    </motion.tr>
  )
}
