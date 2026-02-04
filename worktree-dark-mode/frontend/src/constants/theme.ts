/**
 * 차트 색상 팔레트
 * Tailwind CSS 색상 기반
 */
export const CHART_COLORS = {
  // 기본 Pie 차트 색상
  pie: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'] as const,

  // 난이도별 색상 (쉬움/보통/어려움)
  difficulty: ['#22c55e', '#f59e0b', '#ef4444'] as const,

  // 점수 분포 색상
  score: ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'] as const,

  // 단일 색상
  primary: '#10b981',
  secondary: '#3b82f6',
  accent: '#f59e0b',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
} as const

/**
 * 차트 공통 스타일
 */
export const CHART_STYLES = {
  tooltip: {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    padding: '8px 12px',
  },
  axis: {
    tick: { fill: '#6b7280', fontSize: 12 },
    tickLine: { stroke: '#e5e7eb' },
    axisLine: { stroke: '#e5e7eb' },
  },
  grid: {
    stroke: '#f3f4f6',
    strokeDasharray: '3 3',
  },
} as const

/**
 * 애니메이션 설정
 */
export const CHART_ANIMATION = {
  duration: 800,
  easing: 'ease-out' as const,
} as const
