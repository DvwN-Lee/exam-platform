import type { TooltipProps } from 'recharts'
import { useChartTheme } from '../hooks/useChartTheme'

interface ChartTooltipProps
  extends Omit<TooltipProps<number, string>, 'formatter'> {
  formatter?: (value: number, name: string, payload: unknown) => [string, string]
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: ChartTooltipProps) {
  const { styles } = useChartTheme()

  if (!active || !payload || payload.length === 0) {
    return null
  }

  return (
    <div style={styles.tooltip} className="text-sm shadow-lg">
      {label && (
        <div className="mb-2 font-semibold text-foreground">{label}</div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry, index) => {
          const [displayValue, displayName] = formatter
            ? formatter(entry.value as number, entry.name as string, entry.payload)
            : [String(entry.value), entry.name]

          return (
            <div key={index} className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{displayName}:</span>
              <span className="font-medium text-foreground">{displayValue}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
