import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90',
        warning: 'bg-orange-500 text-white hover:bg-orange-500/90',
        success: 'bg-green-600 text-white hover:bg-green-600/90',
        error: 'bg-red-500 text-white hover:bg-red-500/90',
        primary: 'bg-primary/10 text-primary hover:bg-primary/20',
        secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
        outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
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
