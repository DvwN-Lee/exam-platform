/**
 * E2E 테스트 Mock 시간 제어 Helper.
 *
 * Backend의 Mock 시간 API를 호출하여 시간을 제어.
 * E2E_MOCK_TIME_ENABLED=true 환경에서만 동작.
 */

import { createApiClient } from './api.helper'

interface MockTimeResponse {
  current_time: string
  is_mocked?: boolean
  detail?: string
}

/**
 * Backend Mock 시간 설정.
 *
 * @param datetime ISO 8601 형식의 시간 문자열
 * @returns 설정된 현재 시간
 */
export async function setMockTime(datetime: string): Promise<MockTimeResponse> {
  const client = createApiClient()
  const response = await client.post('/e2e/time/set/', { datetime })
  return response.data
}

/**
 * Backend Mock 시간 전진.
 *
 * @param options 전진할 시간 (seconds, minutes, hours, days)
 * @returns 전진된 현재 시간
 */
export async function advanceMockTime(options: {
  seconds?: number
  minutes?: number
  hours?: number
  days?: number
}): Promise<MockTimeResponse> {
  const client = createApiClient()
  const response = await client.post('/e2e/time/advance/', options)
  return response.data
}

/**
 * Backend Mock 시간 초기화 (실제 시간 사용으로 복귀).
 */
export async function resetMockTime(): Promise<MockTimeResponse> {
  const client = createApiClient()
  const response = await client.post('/e2e/time/reset/')
  return response.data
}

/**
 * 현재 Backend 시간 조회.
 *
 * @returns 현재 시간 및 mock 여부
 */
export async function getCurrentServerTime(): Promise<{
  current_time: string
  is_mocked: boolean
}> {
  const client = createApiClient()
  const response = await client.get('/e2e/time/')
  return response.data
}

/**
 * 시험 시작 시간으로 Mock 시간 설정.
 * 시험이 즉시 응시 가능하도록 시작 시간으로 설정.
 *
 * @param examStartTime 시험 시작 시간 (ISO 8601)
 */
export async function setTimeForExamStart(examStartTime: string): Promise<void> {
  await setMockTime(examStartTime)
}

/**
 * 시험 종료 직전 시간으로 Mock 시간 설정.
 * 시험 시간 초과 테스트용.
 *
 * @param examEndTime 시험 종료 시간 (ISO 8601)
 * @param secondsBefore 종료 전 몇 초로 설정할지 (기본값: 10초)
 */
export async function setTimeBeforeExamEnd(
  examEndTime: string,
  secondsBefore: number = 10
): Promise<void> {
  const endTime = new Date(examEndTime)
  endTime.setSeconds(endTime.getSeconds() - secondsBefore)
  await setMockTime(endTime.toISOString())
}

/**
 * 시험 종료 시간 이후로 Mock 시간 설정.
 * 시험 자동 제출 테스트용.
 *
 * @param examEndTime 시험 종료 시간 (ISO 8601)
 * @param minutesAfter 종료 후 몇 분으로 설정할지 (기본값: 1분)
 */
export async function setTimeAfterExamEnd(
  examEndTime: string,
  minutesAfter: number = 1
): Promise<void> {
  const endTime = new Date(examEndTime)
  endTime.setMinutes(endTime.getMinutes() + minutesAfter)
  await setMockTime(endTime.toISOString())
}

/**
 * Mock 시간 API 사용 가능 여부 확인.
 * E2E_MOCK_TIME_ENABLED가 false인 환경에서는 403 반환.
 *
 * @returns Mock 시간 사용 가능 여부
 */
export async function isMockTimeAvailable(): Promise<boolean> {
  try {
    const client = createApiClient()
    await client.get('/e2e/time/')
    return true
  } catch {
    return false
  }
}
