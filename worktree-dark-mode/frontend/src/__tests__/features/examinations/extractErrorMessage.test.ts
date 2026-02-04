import { describe, it, expect } from 'vitest'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { extractErrorMessage } from '@/features/examinations/ExaminationForm'
import type { BackendFieldError } from '@/features/examinations/ExaminationForm'

/**
 * extractErrorMessage 함수 Unit Test
 *
 * Backend validation 에러 응답을 파싱하여 사용자 친화적 메시지로 변환하는 함수 테스트
 */

describe('extractErrorMessage', () => {
  describe('단일 필드 에러', () => {
    it('배열 형식 에러 메시지를 추출해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: {
          start_time: ['시작 시간은 현재 시간 이후여야 합니다.'],
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe('시작 시간은 현재 시간 이후여야 합니다.')
    })

    it('문자열 형식 에러 메시지를 추출해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: {
          detail: '권한이 없습니다.',
        },
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe('권한이 없습니다.')
    })

    it('배열 내 여러 메시지를 모두 추출해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: {
          name: ['이름은 필수 항목입니다.', '이름은 100자 이하여야 합니다.'],
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe('이름은 필수 항목입니다., 이름은 100자 이하여야 합니다.')
    })
  })

  describe('여러 필드 에러', () => {
    it('여러 필드의 에러 메시지를 쉼표로 연결해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: {
          start_time: ['시작 시간은 현재 시간 이후여야 합니다.'],
          duration: ['시험 시간은 0보다 커야 합니다.'],
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toContain('시작 시간은 현재 시간 이후여야 합니다.')
      expect(result).toContain('시험 시간은 0보다 커야 합니다.')
      expect(result).toContain(', ')
    })

    it('배열과 문자열 형식이 혼재된 에러를 모두 처리해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: {
          name: ['이름은 필수 항목입니다.'],
          detail: '서버 에러가 발생했습니다.',
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toContain('이름은 필수 항목입니다.')
      expect(result).toContain('서버 에러가 발생했습니다.')
    })

    it('여러 필드의 여러 메시지를 모두 추출해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: {
          start_time: ['시작 시간은 현재 시간 이후여야 합니다.', '시작 시간 형식이 올바르지 않습니다.'],
          end_time: ['종료 시간은 시작 시간 이후여야 합니다.'],
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toContain('시작 시간은 현재 시간 이후여야 합니다.')
      expect(result).toContain('시작 시간 형식이 올바르지 않습니다.')
      expect(result).toContain('종료 시간은 시작 시간 이후여야 합니다.')
    })
  })

  describe('엣지 케이스', () => {
    it('response가 없으면 빈 문자열을 반환해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      // response가 undefined

      const result = extractErrorMessage(error)
      expect(result).toBe('')
    })

    it('response.data가 없으면 빈 문자열을 반환해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: undefined as unknown as BackendFieldError,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe('')
    })

    it('data가 빈 객체면 빈 문자열을 반환해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: {},
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe('')
    })

    it('data가 null이면 빈 문자열을 반환해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: null as unknown as BackendFieldError,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe('')
    })

    it('data가 배열이면 빈 문자열을 반환해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: ['에러 메시지'] as unknown as BackendFieldError,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe('')
    })

    it('data가 문자열이면 빈 문자열을 반환해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: '에러 메시지' as unknown as BackendFieldError,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe('')
    })

    it('배열 내 비문자열 값은 무시해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: {
          field: ['유효한 메시지', 123, null, undefined, { key: 'value' }] as unknown as string[],
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe('유효한 메시지')
    })

    it('빈 배열은 메시지를 생성하지 않아야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: {
          field: [],
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe('')
    })

    it('비문자열 배열만 있으면 빈 문자열을 반환해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: {
          field: [123, null, undefined] as unknown as string[],
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe('')
    })

    it('객체나 숫자 같은 비정상 값은 무시해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: {
          field1: '유효한 메시지',
          field2: 123 as unknown as string,
          field3: { nested: 'object' } as unknown as string,
          field4: null as unknown as string,
          field5: undefined as unknown as string,
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe('유효한 메시지')
    })
  })

  describe('실제 Backend 응답 시나리오', () => {
    it('과거 시작 시간 validation 에러를 처리해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: {
          start_time: ['시작 시간은 현재 시간 이후여야 합니다.'],
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe('시작 시간은 현재 시간 이후여야 합니다.')
    })

    it('duration = 0 validation 에러를 처리해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: {
          duration: ['시험 시간은 0보다 커야 합니다.'],
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe('시험 시간은 0보다 커야 합니다.')
    })

    it('존재하지 않는 학생 ID validation 에러를 처리해야 한다', () => {
      const error = new AxiosError<BackendFieldError>('Request failed')
      error.response = {
        data: {
          student_ids: ["존재하지 않는 학생 ID: {1, 2, 3}."],
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as unknown as InternalAxiosRequestConfig,
      }

      const result = extractErrorMessage(error)
      expect(result).toBe("존재하지 않는 학생 ID: {1, 2, 3}.")
    })
  })
})
