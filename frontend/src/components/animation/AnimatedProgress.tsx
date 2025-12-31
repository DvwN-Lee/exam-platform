import { motion } from 'framer-motion'
import { DURATION, EASING } from '@/lib/animations'
import { useReducedMotion } from '@/lib/animations/hooks'
import { cn } from '@/lib/utils'

interface AnimatedProgressProps {
  /** Progress value (0-100) */
  value: number
  /** Optional label to display */
  label?: string
  /** Height of the progress bar */
  height?: 'sm' | 'md' | 'lg'
  /** Color of the progress bar */
  color?: string
  className?: string
}

const heightMap = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
}

/**
 * Progress bar with animated width fill
 */
export function AnimatedProgress({
  value,
  label,
  height = 'md',
  color = 'bg-primary',
  className,
}: AnimatedProgressProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between text-sm mb-1">
          <span>{label}</span>
          <span>{value}%</span>
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', heightMap[height])}>
        {prefersReducedMotion ? (
          <div
            className={cn('h-full rounded-full', color)}
            style={{ width: `${value}%` }}
          />
        ) : (
          <motion.div
            className={cn('h-full rounded-full', color)}
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{
              duration: DURATION.slower,
              ease: EASING.easeOut,
              delay: 0.2,
            }}
          />
        )}
      </div>
    </div>
  )
}
