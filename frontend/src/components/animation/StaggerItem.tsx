import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { staggerItemVariants, staggerItemScaleVariants } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface StaggerItemProps {
  children: ReactNode
  className?: string
  /** Animation type: 'slideUp' or 'scale' (default: 'slideUp') */
  variant?: 'slideUp' | 'scale'
}

/**
 * Item component to be used inside StaggerContainer
 * Animates with slide-up or scale effect
 */
export function StaggerItem({ children, className, variant = 'slideUp' }: StaggerItemProps) {
  const variants = variant === 'scale' ? staggerItemScaleVariants : staggerItemVariants

  return (
    <motion.div className={cn(className)} variants={variants}>
      {children}
    </motion.div>
  )
}
