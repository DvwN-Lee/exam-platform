import { AxiosError } from 'axios'
import { translateErrorMessage } from './errorMessages'

interface ApiErrorData {
  detail?: string
  message?: string
  [key: string]: unknown
}

/**
 * Axios 에러인지 확인하는 Type Guard
 */
export function isAxiosError(error: unknown): error is AxiosError<ApiErrorData> {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  )
}

/**
 * 에러에서 사용자에게 표시할 메시지 추출
 * @param error - 에러 객체
 * @param fallback - 기본 메시지
 * @returns 사용자에게 표시할 에러 메시지
 */
export function getErrorMessage(
  error: unknown,
  fallback: string = '요청에 실패했습니다.'
): string {
  if (isAxiosError(error)) {
    const data = error.response?.data
    const message = data?.message || data?.detail
    if (message) {
      return translateErrorMessage(message)
    }
    return fallback
  }
  if (error instanceof Error) {
    return translateErrorMessage(error.message)
  }
  return fallback
}

/**
 * 배열 형태 필드 에러 응답 처리
 * 예: { old_password: ["현재 비밀번호가 일치하지 않습니다."] }
 * @param error - 에러 객체
 * @param fieldName - 필드명
 * @param fallback - 기본 메시지
 */
export function getFieldErrorMessage(
  error: unknown,
  fieldName: string,
  fallback: string
): string {
  if (isAxiosError(error)) {
    const data = error.response?.data
    const fieldValue = data?.[fieldName]
    if (Array.isArray(fieldValue) && fieldValue.length > 0) {
      return translateErrorMessage(fieldValue[0])
    }
    return data?.detail ? translateErrorMessage(data.detail) : fallback
  }
  return fallback
}
