/**
 * 차트 관련 타입 정의
 */

export interface ChartDataItem {
  name: string
  value: number
  color?: string
  [key: string]: unknown
}

export interface ChartClickEvent<T = ChartDataItem> {
  data: T
  index: number
  event?: React.MouseEvent
}

export interface BaseChartProps {
  data: ChartDataItem[]
  height?: number | string
  className?: string
  emptyMessage?: string
  onClick?: (event: ChartClickEvent) => void
}

export interface PieChartDataItem extends ChartDataItem {
  displayValue?: number
  actualValue?: number
  isZero?: boolean
}

export interface ScoreTrendDataItem {
  date: string
  score: number
  total_score: number
  percentage: number
  exam_name: string
  examination_id?: number
}
