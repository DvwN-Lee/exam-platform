import type { ExaminationStatus } from '@/types/testpaper'

/**
 * 시험 상태 라벨
 */
export const STATUS_LABELS: Record<ExaminationStatus, string> = {
  upcoming: '예정',
  ongoing: '진행중',
  completed: '완료',
} as const

/**
 * 시험 상태별 뱃지 스타일 클래스
 */
export const STATUS_BADGE_CLASSES: Record<ExaminationStatus, string> = {
  upcoming: 'bg-blue-100 text-blue-700',
  ongoing: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-700',
} as const

/**
 * 시험 상태 계산
 */
export function getExamStatus(startTime: string | Date, endTime: string | Date): ExaminationStatus {
  const now = new Date()
  const start = new Date(startTime)
  const end = new Date(endTime)

  if (now < start) return 'upcoming'
  if (now > end) return 'completed'
  return 'ongoing'
}

/**
 * 상태 뱃지 클래스 반환
 */
export function getStatusBadgeClass(status: ExaminationStatus): string {
  return STATUS_BADGE_CLASSES[status]
}
