import { useState, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { ChartContainer } from './base/ChartContainer'
import { ChartEmptyState } from './base/ChartEmptyState'
import { useChartTheme } from './hooks/useChartTheme'
import { CHART_COLORS, CHART_ANIMATION } from '@/constants/theme'
import type { ChartClickEvent, ChartDataItem } from '@/types/chart'
import { cn } from '@/lib/utils'

interface InteractiveBarChartProps {
  data: ChartDataItem[]
  title?: string
  height?: number
  colors?: readonly string[]
  orientation?: 'vertical' | 'horizontal'
  showGrid?: boolean
  barRadius?: number
  emptyMessage?: string
  className?: string
  unit?: string
  onBarClick?: (event: ChartClickEvent) => void
}

export function InteractiveBarChart({
  data,
  title,
  height = 300,
  colors = CHART_COLORS.difficulty,
  orientation = 'vertical',
  showGrid = true,
  barRadius = 4,
  emptyMessage = '표시할 데이터가 없습니다',
  className,
  unit = '개',
  onBarClick,
}: InteractiveBarChartProps) {
  const { styles } = useChartTheme()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Process data with colors
  const processedData = data.map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length],
  }))

  // Check if all data is empty
  const isEmpty = processedData.every((item) => item.value === 0)

  // Event handlers
  const handleMouseEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setActiveIndex(null)
  }, [])

  const handleClick = useCallback(
    (entry: ChartDataItem, index: number) => {
      if (onBarClick) {
        onBarClick({ data: entry, index })
      }
    },
    [onBarClick]
  )

  const isHorizontal = orientation === 'horizontal'

  if (isEmpty) {
    return (
      <div className={cn('rounded-lg border bg-card p-6', className)}>
        {title && <h2 className="mb-4 text-xl font-semibold">{title}</h2>}
        <ChartEmptyState message={emptyMessage} height={height} />
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      {title && <h2 className="mb-4 text-xl font-semibold">{title}</h2>}
      <ChartContainer height={height}>
        <BarChart
          data={processedData}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray={styles.grid.strokeDasharray}
              stroke={styles.grid.stroke}
              vertical={!isHorizontal}
              horizontal={isHorizontal}
            />
          )}
          {isHorizontal ? (
            <>
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={styles.axis.tick}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={styles.axis.tick}
                width={80}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={styles.axis.tick}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={styles.axis.tick}
              />
            </>
          )}
          <Tooltip
            isAnimationActive={true}
            animationDuration={200}
            cursor={{
              fill: 'rgba(16, 185, 129, 0.1)',
            }}
            contentStyle={styles.tooltip}
            formatter={(value) => [`${value}${unit}`, '값']}
          />
          <Bar
            dataKey="value"
            radius={
              isHorizontal
                ? [0, barRadius, barRadius, 0]
                : [barRadius, barRadius, 0, 0]
            }
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION.duration}
            animationEasing={CHART_ANIMATION.easing}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(entry, index) =>
              handleClick(entry as ChartDataItem, index)
            }
            cursor={onBarClick ? 'pointer' : undefined}
          >
            {processedData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                style={{
                  opacity:
                    activeIndex === null || activeIndex === index ? 1 : 0.5,
                  filter:
                    activeIndex === index ? 'brightness(1.1)' : undefined,
                  transition: 'all 0.2s ease-out',
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}
