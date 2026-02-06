/* eslint-disable react-refresh/only-export-components -- CVA 패턴에서 variant 함수와 유틸리티 함수 export 필요 */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-lg px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90',
        warning: 'bg-orange-500 dark:bg-orange-600 text-white hover:bg-orange-500/90 dark:hover:bg-orange-600/90',
        success: 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-600/90 dark:hover:bg-green-700/90',
        error: 'bg-red-500 dark:bg-red-600 text-white hover:bg-red-500/90 dark:hover:bg-red-600/90',
        primary: 'bg-primary/10 text-primary hover:bg-primary/20',
        secondary: [
          'bg-gray-100 dark:bg-gray-800',
          'text-gray-800 dark:text-gray-200',
          'hover:bg-gray-200 dark:hover:bg-gray-700',
        ].join(' '),
        outline: [
          'border border-gray-300 dark:border-gray-600',
          'text-gray-700 dark:text-gray-300',
          'hover:bg-gray-50 dark:hover:bg-gray-800',
        ].join(' '),
        'success-soft': [
          'bg-green-100 dark:bg-green-900/30',
          'text-green-700 dark:text-green-300',
          'hover:bg-green-200 dark:hover:bg-green-900/30',
        ].join(' '),
        'info-soft': [
          'bg-blue-100 dark:bg-blue-900/30',
          'text-blue-700 dark:text-blue-300',
          'hover:bg-blue-200 dark:hover:bg-blue-900/30',
        ].join(' '),
        'purple-soft': [
          'bg-purple-100 dark:bg-purple-900/30',
          'text-purple-700 dark:text-purple-300',
          'hover:bg-purple-200 dark:hover:bg-purple-900/30',
        ].join(' '),
        'muted-soft': [
          'bg-gray-100 dark:bg-gray-800',
          'text-gray-700 dark:text-gray-300',
          'hover:bg-gray-200 dark:hover:bg-gray-700',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

// D-day 계산 유틸리티 함수
export function calculateDDay(targetDate: string | Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)

  const diffTime = target.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

// D-day Badge 컴포넌트
export function DDayBadge({ targetDate }: { targetDate: string | Date }) {
  const dDay = calculateDDay(targetDate)

  if (dDay < 0) {
    return null // 이미 지난 날짜
  }

  const variant = dDay <= 3 ? 'warning' : 'default'
  const label = `D-${dDay}`

  return <Badge variant={variant}>{label}</Badge>
}
