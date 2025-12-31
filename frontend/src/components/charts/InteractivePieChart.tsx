import { useState, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, Sector } from 'recharts'
import type { PieSectorDataItem } from 'recharts/types/polar/Pie'
import { ChartContainer } from './base/ChartContainer'
import { ChartLegend } from './base/ChartLegend'
import { ChartEmptyState } from './base/ChartEmptyState'
import { useChartTheme } from './hooks/useChartTheme'
import { useLegendToggle } from './hooks/useLegendToggle'
import { CHART_COLORS, CHART_ANIMATION } from '@/constants/theme'
import type { ChartClickEvent, PieChartDataItem } from '@/types/chart'
import { cn } from '@/lib/utils'

interface InteractivePieChartProps {
  data: PieChartDataItem[]
  title?: string
  height?: number
  colors?: readonly string[]
  innerRadius?: number
  outerRadius?: number
  hideZeroValues?: boolean
  enableLegendToggle?: boolean
  legendLayout?: 'horizontal' | 'vertical'
  legendPosition?: 'right' | 'bottom'
  emptyMessage?: string
  className?: string
  onSliceClick?: (event: ChartClickEvent<PieChartDataItem>) => void
}

// Active shape renderer for hover effect
const renderActiveShape = (props: PieSectorDataItem) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={(outerRadius as number) + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={(innerRadius as number) - 4}
        outerRadius={innerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
      />
    </g>
  )
}

export function InteractivePieChart({
  data,
  title,
  height = 300,
  colors = CHART_COLORS.pie,
  innerRadius = 50,
  outerRadius = 90,
  hideZeroValues = true,
  enableLegendToggle = true,
  legendLayout = 'vertical',
  legendPosition = 'right',
  emptyMessage = '표시할 데이터가 없습니다',
  className,
  onSliceClick,
}: InteractivePieChartProps) {
  const { styles } = useChartTheme()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Process data with colors
  const processedData = data.map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length],
    displayValue: item.displayValue ?? item.value,
    actualValue: item.actualValue ?? item.value,
    isZero: item.value === 0,
  }))

  // Legend toggle hook
  const { visibleData, hiddenSeries, toggleSeries } = useLegendToggle({
    data: processedData,
  })

  // Chart data (filter zero values if needed)
  const chartData = hideZeroValues
    ? visibleData.filter((item) => item.value > 0)
    : visibleData

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
    (entry: PieChartDataItem, index: number) => {
      if (onSliceClick) {
        onSliceClick({ data: entry, index })
      }
    },
    [onSliceClick]
  )

  // Legend payload for custom rendering
  const legendPayload = processedData.map((item) => ({
    value: item.name,
    color: item.color,
    inactive: item.isZero,
    payload: { value: item.actualValue },
  }))

  const isVerticalLegend = legendLayout === 'vertical'
  const isRightLegend = legendPosition === 'right'

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
      <div
        className={cn(
          'flex',
          isRightLegend ? 'flex-row items-center' : 'flex-col'
        )}
      >
        <ChartContainer height={height} className={isRightLegend ? 'flex-1' : ''}>
          <PieChart>
            <Pie
              data={chartData}
              cx={isRightLegend ? '50%' : '50%'}
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={chartData.length > 1 ? 2 : 0}
              dataKey="displayValue"
              activeIndex={activeIndex ?? undefined}
              activeShape={renderActiveShape}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={(_, index) => handleClick(chartData[index], index)}
              cursor={onSliceClick ? 'pointer' : undefined}
              isAnimationActive={true}
              animationDuration={CHART_ANIMATION.duration}
              animationEasing={CHART_ANIMATION.easing}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="none"
                  style={{
                    filter:
                      activeIndex === index ? 'brightness(1.1)' : undefined,
                    transition: 'filter 0.2s ease-out',
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              isAnimationActive={true}
              animationDuration={200}
              contentStyle={styles.tooltip}
              formatter={(_, name) => {
                const item = processedData.find((d) => d.name === name)
                return [`${item?.actualValue ?? 0}개`, name]
              }}
            />
          </PieChart>
        </ChartContainer>

        <ChartLegend
          payload={legendPayload}
          onToggle={enableLegendToggle ? toggleSeries : undefined}
          hiddenItems={hiddenSeries}
          layout={legendLayout}
          formatter={(value, item) =>
            `${value}: ${item.payload?.value ?? 0}개`
          }
          className={cn(
            isVerticalLegend && isRightLegend && 'pl-4',
            !isRightLegend && 'mt-4'
          )}
        />
      </div>
    </div>
  )
}
