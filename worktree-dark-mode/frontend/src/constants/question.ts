import type { QuestionType, QuestionDegree } from '@/types/question'

/**
 * 문제 유형 라벨
 */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  xz: '객관식',
  pd: '주관식',
  tk: '빈칸채우기',
} as const

/**
 * 문제 난이도 라벨
 */
export const QUESTION_DEGREE_LABELS: Record<QuestionDegree, string> = {
  jd: '쉬움',
  zd: '보통',
  kn: '어려움',
} as const

/**
 * 문제 유형 옵션 (select용)
 */
export const QUESTION_TYPE_OPTIONS = [
  { value: 'xz', label: '객관식' },
  { value: 'pd', label: '주관식' },
  { value: 'tk', label: '빈칸채우기' },
] as const

/**
 * 문제 난이도 옵션 (select용)
 */
export const QUESTION_DEGREE_OPTIONS = [
  { value: 'jd', label: '쉬움' },
  { value: 'zd', label: '보통' },
  { value: 'kn', label: '어려움' },
] as const
