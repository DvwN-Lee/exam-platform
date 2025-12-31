import { BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChartEmptyStateProps {
  message?: string
  height?: number | string
  className?: string
  icon?: React.ElementType
}

export function ChartEmptyState({
  message = '표시할 데이터가 없습니다',
  height = 300,
  className,
  icon: Icon = BarChart3,
}: ChartEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-3 text-muted-foreground',
        className
      )}
      style={{ height }}
    >
      <Icon className="h-12 w-12 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
