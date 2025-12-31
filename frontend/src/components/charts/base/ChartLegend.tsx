import { cn } from '@/lib/utils'

interface LegendItem {
  value: string
  color: string
  inactive?: boolean
  payload?: {
    value: number
    [key: string]: unknown
  }
}

interface ChartLegendProps {
  payload?: LegendItem[]
  onToggle?: (value: string) => void
  hiddenItems?: Set<string>
  className?: string
  layout?: 'horizontal' | 'vertical'
  formatter?: (value: string, item: LegendItem) => string
}

export function ChartLegend({
  payload,
  onToggle,
  hiddenItems,
  className,
  layout = 'horizontal',
  formatter,
}: ChartLegendProps) {
  if (!payload || payload.length === 0) return null

  const isVertical = layout === 'vertical'

  return (
    <div
      className={cn(
        'flex gap-4',
        isVertical ? 'flex-col items-start' : 'flex-wrap justify-center',
        className
      )}
    >
      {payload.map((entry, index) => {
        const isHidden = hiddenItems?.has(entry.value) || entry.inactive
        const displayText = formatter ? formatter(entry.value, entry) : entry.value

        return (
          <div
            key={`legend-item-${index}`}
            className={cn(
              'flex items-center gap-2 text-sm transition-all duration-200',
              onToggle && 'cursor-pointer hover:opacity-80',
              isHidden && 'opacity-40'
            )}
            onClick={() => onToggle?.(entry.value)}
          >
            <div
              className={cn('h-3 w-3 rounded-full transition-colors')}
              style={{
                backgroundColor: isHidden ? '#9ca3af' : entry.color,
              }}
            />
            <span
              className={cn(
                'text-foreground transition-all',
                isHidden && 'line-through'
              )}
            >
              {displayText}
            </span>
          </div>
        )
      })}
    </div>
  )
}
