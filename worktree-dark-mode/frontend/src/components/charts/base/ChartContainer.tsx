import { ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { DEFAULT_CHART_HEIGHT } from '@/constants'

interface ChartContainerProps {
  children: React.ReactElement
  height?: number | string
  className?: string
  responsive?: boolean
}

export function ChartContainer({
  children,
  height = DEFAULT_CHART_HEIGHT,
  className,
  responsive = true,
}: ChartContainerProps) {
  if (!responsive) {
    return (
      <div className={cn('w-full', className)} style={{ height }}>
        {children}
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}
