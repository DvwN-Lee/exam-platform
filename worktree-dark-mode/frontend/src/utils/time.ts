/**
 * 밀리초를 HH:MM:SS 형식으로 변환
 */
export function formatTime(ms: number): string {
  if (ms <= 0) return '00:00:00'

  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * 초를 MM:SS 형식으로 변환
 */
export function formatSeconds(seconds: number): string {
  if (seconds <= 0) return '00:00'

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 남은 시간 계산 및 포맷
 */
export function getTimeRemaining(endTime: string | Date): {
  text: string
  isUrgent: boolean
  isExpired: boolean
} {
  const end = new Date(endTime)
  const now = new Date()
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) {
    return { text: '종료됨', isUrgent: false, isExpired: true }
  }

  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)

  // 1시간 미만이면 긴급
  const isUrgent = diff < 3600000

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return { text: `${days}일 남음`, isUrgent: false, isExpired: false }
  }

  if (hours > 0) {
    return { text: `${hours}시간 ${minutes}분 남음`, isUrgent, isExpired: false }
  }

  return { text: `${minutes}분 남음`, isUrgent: true, isExpired: false }
}

/**
 * 날짜를 한국어 형식으로 포맷
 */
export function formatKoreanDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ko-KR')
}

/**
 * 날짜+시간을 한국어 형식으로 포맷
 */
export function formatKoreanDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('ko-KR')
}

/**
 * 상대적 시간 표시 (예: 3분 전, 2시간 전)
 */
export function getRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diff = now.getTime() - target.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`

  return formatKoreanDate(date)
}
