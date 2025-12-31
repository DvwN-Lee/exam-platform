import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number // 0-100
  showLabel?: boolean
  height?: 'sm' | 'md' | 'lg'
}

const heightClasses = {
  sm: 'h-2',
  md: 'h-2.5',
  lg: 'h-4',
}

export function Progress({
  value,
  showLabel = false,
  height = 'md',
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, value))

  return (
    <div className={cn('w-full', className)} {...props}>
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">{percentage}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-gray-200',
          heightClasses[height]
        )}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export interface LearningProgressProps {
  subject: string
  percentage: number
  completed: number
  total: number
}

export function LearningProgress({
  subject,
  percentage,
  completed,
  total,
}: LearningProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">{subject}</span>
        <span className="text-sm font-semibold text-primary">
          {percentage}%
        </span>
      </div>
      <Progress value={percentage} height="sm" />
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>
          {completed}/{total} 강의 완료
        </span>
        <span>{total - completed}개 남음</span>
      </div>
    </div>
  )
}
