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
 * @deprecated Use getStatusBadgeVariant instead
 */
export const STATUS_BADGE_CLASSES: Record<ExaminationStatus, string> = {
  upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ongoing: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  completed: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
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
 * @deprecated Use getStatusBadgeVariant instead
 */
export function getStatusBadgeClass(status: ExaminationStatus): string {
  return STATUS_BADGE_CLASSES[status]
}

/**
 * 상태 뱃지 variant 반환
 */
export function getStatusBadgeVariant(
  status: ExaminationStatus
): 'info-soft' | 'success-soft' | 'muted-soft' {
  const variantMap: Record<ExaminationStatus, 'info-soft' | 'success-soft' | 'muted-soft'> = {
    upcoming: 'info-soft',
    ongoing: 'success-soft',
    completed: 'muted-soft',
  }
  return variantMap[status]
}
