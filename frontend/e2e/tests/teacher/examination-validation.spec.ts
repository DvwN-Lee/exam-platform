import { test, expect } from '@playwright/test'
import { loginAsTeacher } from '../../helpers/auth.helper'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import {
  apiLogin,
  apiCreateTestPaper,
  apiDeleteTestPaper,
  apiCreateQuestion,
  apiDeleteQuestion,
  apiGetSubjects,
} from '../../helpers/api.helper'

/**
 * Teacher Examination Backend Validation 에러 Toast 검증
 *
 * Backend validation 에러가 올바르게 사용자에게 Toast로 표시되는지 검증
 */
test.describe('Teacher Examination Backend Validation', () => {
  const teacherUsername = process.env.E2E_TEACHER_USERNAME || 'testteacher2'
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD || 'test12345678'

  let teacherToken: string
  let subjectId: number
  const createdQuestionIds: number[] = []
  const createdTestPaperIds: number[] = []

  test.beforeAll(async () => {
    // Teacher 로그인하여 토큰 얻기
    const loginResponse = await apiLogin(teacherUsername, teacherPassword)
    teacherToken = loginResponse.access

    // 과목 조회
    const subjects = await apiGetSubjects()
    subjectId = subjects[0]?.id || 1

    // 테스트용 문제 1개 생성
    const question = await apiCreateQuestion(teacherToken, {
      subject_id: subjectId,
      name: `Validation 테스트용 문제 ${Date.now()}`,
      score: 10,
      tq_type: 'xz',
      tq_degree: 'zd',
      options: [
        { option: '옵션 1', is_right: true },
        { option: '옵션 2', is_right: false },
      ],
    })
    createdQuestionIds.push(question.id)

    // 테스트용 시험지 생성
    const testPaper = await apiCreateTestPaper(teacherToken, {
      name: `Validation 테스트용 시험지 ${Date.now()}`,
      subject_id: subjectId,
      question_ids: [question.id],
    })
    createdTestPaperIds.push(testPaper.id)
  })

  test.afterAll(async () => {
    // 생성된 리소스 정리
    for (const id of createdTestPaperIds) {
      try {
        await apiDeleteTestPaper(teacherToken, id)
      } catch (error) {
        console.warn(`Failed to delete test paper ${id}:`, error)
      }
    }

    for (const id of createdQuestionIds) {
      try {
        await apiDeleteQuestion(teacherToken, id)
      } catch (error) {
        console.warn(`Failed to delete question ${id}:`, error)
      }
    }
  })

  test.beforeEach(async ({ page }) => {
    // Teacher 로그인
    await loginAsTeacher(page, teacherUsername, teacherPassword)
    await waitForLoadingComplete(page)

    // 시험 생성 페이지로 이동
    await page.goto('/examinations/new')
    await waitForLoadingComplete(page)
  })

  test('과거 시작 시간 입력 시 validation 에러 Toast 표시', async ({ page }) => {
    // 시험명 입력
    await page.fill('#exam_name', `Validation 테스트 ${Date.now()}`)

    // 시험지 선택 대기
    await page.waitForFunction(
      (selectId) => {
        const select = document.querySelector(selectId) as HTMLSelectElement
        return select && select.options.length > 1
      },
      '#testpaper_id',
      { timeout: 10000 }
    )

    // 시험지 선택
    await page.selectOption('#testpaper_id', { index: 1 })

    // 과거 시간으로 설정 (2024년 1월 1일)
    await page.fill('#start_time', '2024-01-01T10:00')

    // 종료 시간도 설정
    await page.fill('#end_time', '2024-01-01T11:00')

    // 시험 생성 버튼 클릭
    await page.click('button:has-text("시험 생성")')

    // Toast 메시지 확인 (Sonner 사용)
    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible({ timeout: 5000 })

    // Toast 텍스트 확인
    const toastText = await toast.textContent()
    expect(toastText).toContain('시작 시간은 현재 시간 이후여야 합니다.')

    // Toast 자동 닫힘 확인 (약 5초 후)
    await expect(toast).not.toBeVisible({ timeout: 8000 })
  })

  test('duration = 0 입력 시 validation 에러 Toast 표시', async ({ page }) => {
    // 시험명 입력
    await page.fill('#exam_name', `Validation 테스트 ${Date.now()}`)

    // 시험지 선택 대기
    await page.waitForFunction(
      (selectId) => {
        const select = document.querySelector(selectId) as HTMLSelectElement
        return select && select.options.length > 1
      },
      '#testpaper_id',
      { timeout: 10000 }
    )

    // 시험지 선택
    await page.selectOption('#testpaper_id', { index: 1 })

    // 미래 시간으로 설정
    const now = new Date()
    const futureDate = new Date(now.getTime() + 60 * 60 * 1000)
    const startTime = futureDate.toISOString().slice(0, 16)
    await page.fill('#start_time', startTime)

    // 종료 시간을 시작 시간과 동일하게 설정 (duration = 0)
    await page.fill('#end_time', startTime)

    // 시험 생성 버튼 클릭
    await page.click('button:has-text("시험 생성")')

    // Toast 메시지 확인
    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible({ timeout: 5000 })

    // Toast 텍스트 확인
    const toastText = await toast.textContent()
    expect(toastText).toContain('시험 시간은 0보다 커야 합니다.')

    // Toast 자동 닫힘 확인
    await expect(toast).not.toBeVisible({ timeout: 8000 })
  })

  test('여러 필드 에러 발생 시 모든 메시지 쉼표로 연결하여 표시', async ({ page }) => {
    // 시험명 입력
    await page.fill('#exam_name', `Validation 테스트 ${Date.now()}`)

    // 시험지 선택 대기
    await page.waitForFunction(
      (selectId) => {
        const select = document.querySelector(selectId) as HTMLSelectElement
        return select && select.options.length > 1
      },
      '#testpaper_id',
      { timeout: 10000 }
    )

    // 시험지 선택
    await page.selectOption('#testpaper_id', { index: 1 })

    // 과거 시간으로 설정하고 duration = 0으로 설정하여 두 개의 validation 에러 발생
    await page.fill('#start_time', '2024-01-01T10:00')
    await page.fill('#end_time', '2024-01-01T10:00')

    // 시험 생성 버튼 클릭
    await page.click('button:has-text("시험 생성")')

    // Toast 메시지 확인
    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible({ timeout: 5000 })

    // Toast 텍스트 확인 - 여러 메시지가 쉼표로 연결되어야 함
    const toastText = await toast.textContent()
    expect(toastText).toContain('시작 시간은 현재 시간 이후여야 합니다.')
    expect(toastText).toContain('시험 시간은 0보다 커야 합니다.')
    expect(toastText).toContain(',')

    // Toast 자동 닫힘 확인
    await expect(toast).not.toBeVisible({ timeout: 8000 })
  })

  test('validation 성공 시 Toast 에러가 나타나지 않음', async ({ page }) => {
    // 시험명 입력
    await page.fill('#exam_name', `Validation 테스트 ${Date.now()}`)

    // 시험지 선택 대기
    await page.waitForFunction(
      (selectId) => {
        const select = document.querySelector(selectId) as HTMLSelectElement
        return select && select.options.length > 1
      },
      '#testpaper_id',
      { timeout: 10000 }
    )

    // 시험지 선택
    await page.selectOption('#testpaper_id', { index: 1 })

    // 올바른 미래 시간으로 설정
    const now = new Date()
    const startTime = new Date(now.getTime() + 60 * 60 * 1000)
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)

    await page.fill('#start_time', startTime.toISOString().slice(0, 16))
    await page.fill('#end_time', endTime.toISOString().slice(0, 16))

    // 시험 생성 버튼 클릭
    await page.click('button:has-text("시험 생성")')

    // 성공 Toast 또는 리다이렉트 확인
    // 에러 Toast가 없어야 함
    const errorToast = page.locator('[data-sonner-toast]')
    const errorToastCount = await errorToast.count()

    if (errorToastCount > 0) {
      const toastText = await errorToast.first().textContent()
      // validation 에러 메시지가 없어야 함
      expect(toastText).not.toContain('시작 시간은 현재 시간 이후여야 합니다.')
      expect(toastText).not.toContain('시험 시간은 0보다 커야 합니다.')
    }

    // 성공 시 리스트 페이지로 리다이렉트 확인 또는 성공 메시지 확인
    await page.waitForURL(/\/examinations/, { timeout: 10000 })
  })

  test('Toast 자동 닫힘 동작 확인', async ({ page }) => {
    // 시험명 입력
    await page.fill('#exam_name', `Validation 테스트 ${Date.now()}`)

    // 시험지 선택 대기
    await page.waitForFunction(
      (selectId) => {
        const select = document.querySelector(selectId) as HTMLSelectElement
        return select && select.options.length > 1
      },
      '#testpaper_id',
      { timeout: 10000 }
    )

    // 시험지 선택
    await page.selectOption('#testpaper_id', { index: 1 })

    // 과거 시간으로 설정
    await page.fill('#start_time', '2024-01-01T10:00')
    await page.fill('#end_time', '2024-01-01T11:00')

    // 시험 생성 버튼 클릭
    await page.click('button:has-text("시험 생성")')

    // Toast가 나타남
    const toast = page.locator('[data-sonner-toast]').first()
    await expect(toast).toBeVisible({ timeout: 5000 })

    // Toast가 표시되는 시간 기록
    const startTime = Date.now()

    // Toast가 사라질 때까지 대기
    await expect(toast).not.toBeVisible({ timeout: 8000 })

    // Toast가 사라지는데 걸린 시간 확인 (약 5초 내외여야 함)
    const duration = Date.now() - startTime
    expect(duration).toBeGreaterThan(3000) // 최소 3초
    expect(duration).toBeLessThan(10000) // 최대 10초
  })
})
