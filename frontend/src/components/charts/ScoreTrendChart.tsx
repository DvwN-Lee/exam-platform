import { useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { ChartContainer } from './base/ChartContainer'
import { ChartEmptyState } from './base/ChartEmptyState'
import { useChartTheme } from './hooks/useChartTheme'
import { CHART_COLORS, CHART_ANIMATION } from '@/constants/theme'
import type { ScoreTrendDataItem } from '@/types/chart'
import { cn } from '@/lib/utils'
import { TrendingUp } from 'lucide-react'

interface ScoreTrendChartProps {
  data: ScoreTrendDataItem[]
  title?: string
  height?: number
  showPercentage?: boolean
  showAverageLine?: boolean
  emptyMessage?: string
  className?: string
  onPointClick?: (data: ScoreTrendDataItem) => void
}

export function ScoreTrendChart({
  data,
  title,
  height = 300,
  showPercentage = true,
  showAverageLine = true,
  emptyMessage = '아직 응시 기록이 없습니다',
  className,
  onPointClick,
}: ScoreTrendChartProps) {
  const { styles } = useChartTheme()

  // Process data for chart
  const chartData = data.map((item) => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    }),
    displayValue: showPercentage ? item.percentage : item.score,
  }))

  // Calculate average
  const average =
    chartData.length > 0
      ? chartData.reduce((sum, d) => sum + d.displayValue, 0) / chartData.length
      : 0

  // Handle point click
  const handlePointClick = useCallback(
    (payload: ScoreTrendDataItem) => {
      if (onPointClick) {
        onPointClick(payload)
      }
    },
    [onPointClick]
  )

  if (data.length === 0) {
    return (
      <div className={cn('rounded-lg border bg-card p-6', className)}>
        {title && <h2 className="mb-4 text-xl font-semibold">{title}</h2>}
        <ChartEmptyState
          message={emptyMessage}
          height={height}
          icon={TrendingUp}
        />
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border bg-card p-6', className)}>
      {title && <h2 className="mb-4 text-xl font-semibold">{title}</h2>}
      <ChartContainer height={height}>
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray={styles.grid.strokeDasharray}
            stroke={styles.grid.stroke}
          />
          <XAxis
            dataKey="displayDate"
            tick={styles.axis.tick}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={showPercentage ? [0, 100] : ['auto', 'auto']}
            tick={styles.axis.tick}
            axisLine={false}
            tickLine={false}
            unit={showPercentage ? '%' : '점'}
            width={50}
          />
          <Tooltip
            isAnimationActive={true}
            animationDuration={200}
            contentStyle={styles.tooltip}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null

              const item = payload[0].payload as ScoreTrendDataItem & {
                displayValue: number
              }

              return (
                <div style={styles.tooltip} className="text-sm shadow-lg">
                  <p className="mb-1 font-semibold text-foreground">
                    {item.exam_name}
                  </p>
                  <p className="text-muted-foreground">
                    {item.score}/{item.total_score}점 ({item.percentage.toFixed(1)}
                    %)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )
            }}
          />
          {showAverageLine && (
            <ReferenceLine
              y={average}
              stroke={CHART_COLORS.warning}
              strokeDasharray="5 5"
              label={{
                value: `평균 ${average.toFixed(1)}${showPercentage ? '%' : '점'}`,
                position: 'right',
                fill: CHART_COLORS.warning,
                fontSize: 12,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="displayValue"
            stroke={CHART_COLORS.primary}
            strokeWidth={2}
            dot={{
              fill: CHART_COLORS.primary,
              strokeWidth: 2,
              r: 4,
              cursor: onPointClick ? 'pointer' : undefined,
            }}
            activeDot={{
              r: 6,
              fill: CHART_COLORS.primary,
              stroke: 'white',
              strokeWidth: 2,
              onClick: (_, data: { payload?: ScoreTrendDataItem }) =>
                data.payload && handlePointClick(data.payload),
              cursor: onPointClick ? 'pointer' : undefined,
            }}
            isAnimationActive={true}
            animationDuration={CHART_ANIMATION.duration}
            animationEasing={CHART_ANIMATION.easing}
          />
        </LineChart>
      </ChartContainer>
    </div>
  )
}
