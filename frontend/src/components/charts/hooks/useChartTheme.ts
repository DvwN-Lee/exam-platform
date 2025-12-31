import { useTheme } from 'next-themes'
import { useMemo } from 'react'

export interface ChartTheme {
  isDark: boolean
  colors: {
    tooltipBg: string
    tooltipBorder: string
    text: string
    grid: string
    muted: string
  }
  styles: {
    tooltip: React.CSSProperties
    axis: {
      tick: { fill: string; fontSize: number }
      tickLine: { stroke: string }
      axisLine: { stroke: string }
    }
    grid: {
      stroke: string
      strokeDasharray: string
    }
  }
}

export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return useMemo(
    () => ({
      isDark,
      colors: {
        tooltipBg: isDark ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)',
        tooltipBorder: isDark ? 'rgb(75, 85, 99)' : 'rgb(229, 231, 235)',
        text: isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
        grid: isDark ? 'rgb(55, 65, 81)' : 'rgb(243, 244, 246)',
        muted: isDark ? 'rgb(107, 114, 128)' : 'rgb(156, 163, 175)',
      },
      styles: {
        tooltip: {
          backgroundColor: isDark ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)',
          border: `1px solid ${isDark ? 'rgb(75, 85, 99)' : 'rgb(229, 231, 235)'}`,
          borderRadius: '8px',
          boxShadow: isDark
            ? '0 4px 6px -1px rgb(0 0 0 / 0.3)'
            : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          padding: '8px 12px',
          color: isDark ? 'rgb(243, 244, 246)' : 'rgb(31, 41, 55)',
        },
        axis: {
          tick: {
            fill: isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
            fontSize: 12,
          },
          tickLine: { stroke: isDark ? 'rgb(75, 85, 99)' : 'rgb(229, 231, 235)' },
          axisLine: { stroke: isDark ? 'rgb(75, 85, 99)' : 'rgb(229, 231, 235)' },
        },
        grid: {
          stroke: isDark ? 'rgb(55, 65, 81)' : 'rgb(243, 244, 246)',
          strokeDasharray: '3 3',
        },
      },
    }),
    [isDark]
  )
}
