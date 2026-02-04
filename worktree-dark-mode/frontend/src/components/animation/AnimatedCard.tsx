import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cardHoverVariants } from '@/lib/animations'
import { useReducedMotion } from '@/lib/animations/hooks'
import { cn } from '@/lib/utils'

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  /** Whether to apply hover animation (default: true) */
  hover?: boolean
  /** Whether to apply tap animation (default: true) */
  tap?: boolean
}

/**
 * Card component with hover and tap animations
 * Scales up on hover and scales down on tap
 */
export function AnimatedCard({
  children,
  className,
  onClick,
  hover = true,
  tap = true,
}: AnimatedCardProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return (
      <div
        className={cn('rounded-lg border bg-card', className)}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={cn('rounded-lg border bg-card', className)}
      initial="rest"
      whileHover={hover ? 'hover' : undefined}
      whileTap={tap ? 'tap' : undefined}
      variants={cardHoverVariants}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </motion.div>
  )
}
