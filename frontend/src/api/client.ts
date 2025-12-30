import axios, { AxiosError } from 'axios'
import { translateErrorMessage } from '@/utils/errorMessages'

/**
 * LocalStorage 안전하게 읽기
 * Private Browsing 모드 또는 Storage 접근 불가 시 null 반환
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * LocalStorage 안전하게 쓰기
 * Storage 용량 초과 또는 접근 불가 시 false 반환
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * LocalStorage 안전하게 삭제
 */
function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // 무시
  }
}

/**
 * Backend 에러 응답 형식
 * { error: { code, message, details } }
 */
interface BackendErrorResponse {
  error?: {
    code: string
    message: string
    details: Record<string, unknown>
  }
}

/**
 * 정규화된 에러 응답 형식
 * Frontend에서 일관되게 사용할 수 있는 형식
 */
export interface NormalizedErrorResponse {
  detail: string
  code?: string
  [key: string]: unknown
}

/**
 * Backend 에러 응답을 Frontend 형식으로 변환
 * 영문 에러 메시지를 한글로 자동 변환
 */
function normalizeErrorResponse(data: BackendErrorResponse): NormalizedErrorResponse {
  if (data?.error) {
    const { code, message, details } = data.error
    return {
      ...details,
      code,
      detail: translateErrorMessage(message),
    }
  }

  // 직접 detail이 있는 경우도 변환 (DRF 기본 응답 형식)
  if (typeof data === 'object' && data !== null && 'detail' in data) {
    const originalData = data as unknown as { detail: string }
    return {
      ...originalData,
      detail: translateErrorMessage(originalData.detail),
    } as NormalizedErrorResponse
  }

  return data as unknown as NormalizedErrorResponse
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - JWT 토큰 자동 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = safeGetItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - 토큰 만료 시 자동 갱신 및 에러 정규화
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<BackendErrorResponse>) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    // 로그인/회원가입 API는 토큰 갱신 로직에서 제외
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/token') ||
                           originalRequest?.url?.includes('/auth/register')

    // 401 에러이고 재시도하지 않은 요청인 경우 (인증 API 제외)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true

      try {
        const refreshToken = safeGetItem('refresh_token')
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        // 토큰 갱신 API 호출
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/token/refresh/`,
          { refresh: refreshToken }
        )

        const { access } = response.data
        safeSetItem('access_token', access)

        // 원래 요청에 새 토큰 적용
        originalRequest.headers.Authorization = `Bearer ${access}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        // 토큰 갱신 실패 시 로그아웃 처리
        safeRemoveItem('access_token')
        safeRemoveItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    // Backend 에러 응답을 정규화하여 Frontend에서 일관되게 처리
    if (error.response?.data) {
      error.response.data = normalizeErrorResponse(
        error.response.data
      ) as unknown as BackendErrorResponse
    }

    return Promise.reject(error)
  }
)

export default apiClient
