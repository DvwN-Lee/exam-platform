import { useState, useCallback, useMemo } from 'react'

interface UseLegendToggleOptions<T extends { name: string }> {
  data: T[]
  initialHidden?: string[]
}

interface UseLegendToggleResult<T extends { name: string }> {
  visibleData: T[]
  hiddenSeries: Set<string>
  toggleSeries: (name: string) => void
  isHidden: (name: string) => boolean
  resetHidden: () => void
}

export function useLegendToggle<T extends { name: string }>({
  data,
  initialHidden = [],
}: UseLegendToggleOptions<T>): UseLegendToggleResult<T> {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(
    new Set(initialHidden)
  )

  const toggleSeries = useCallback((name: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }, [])

  const isHidden = useCallback(
    (name: string) => hiddenSeries.has(name),
    [hiddenSeries]
  )

  const resetHidden = useCallback(() => {
    setHiddenSeries(new Set())
  }, [])

  const visibleData = useMemo(
    () => data.filter((item) => !hiddenSeries.has(item.name)),
    [data, hiddenSeries]
  )

  return {
    visibleData,
    hiddenSeries,
    toggleSeries,
    isHidden,
    resetHidden,
  }
}
