import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { fadeInVariants, slideUpVariants, slideInLeftVariants, DURATION } from '@/lib/animations'
import { useReducedMotion } from '@/lib/animations/hooks'
import { cn } from '@/lib/utils'

type AnimationType = 'fade' | 'slideUp' | 'slideLeft'

interface FadeInProps {
  children: ReactNode
  className?: string
  /** Animation type (default: 'fade') */
  type?: AnimationType
  /** Delay before animation starts */
  delay?: number
  /** Duration of animation */
  duration?: number
  /** Whether to trigger only once when in viewport */
  once?: boolean
}

const variantMap = {
  fade: fadeInVariants,
  slideUp: slideUpVariants,
  slideLeft: slideInLeftVariants,
}

/**
 * Component that fades in its children with various animation types
 */
export function FadeIn({
  children,
  className,
  type = 'fade',
  delay = 0,
  duration = DURATION.normal,
  once = true,
}: FadeInProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  const variants = variantMap[type]

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      animate="visible"
      viewport={once ? { once: true } : undefined}
      variants={variants}
      transition={{
        delay,
        duration,
      }}
    >
      {children}
    </motion.div>
  )
}
