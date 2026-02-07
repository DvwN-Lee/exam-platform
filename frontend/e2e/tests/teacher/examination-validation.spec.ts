import { test, expect, type Page } from '@playwright/test'
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
 * Teacher Examination Validation 검증
 *
 * ExaminationForm의 Zod validation이 DateTimePicker UI를 통해 올바르게 동작하는지 검증.
 * DateTimePicker는 Popover + Calendar + time number inputs로 구성되어 있으며,
 * minDate prop으로 과거 날짜 선택이 UI 레벨에서 차단되므로 과거 시간 관련 테스트는 제외.
 */
test.describe('Teacher Examination Validation', () => {
  const teacherUsername = process.env.E2E_TEACHER_USERNAME || 'testteacher2'
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD || 'test12345678'

  let teacherToken: string
  let subjectId: number
  const createdQuestionIds: number[] = []
  const createdTestPaperIds: number[] = []
  const createdExaminationIds: number[] = []

  test.beforeAll(async () => {
    const loginResponse = await apiLogin(teacherUsername, teacherPassword)
    teacherToken = loginResponse.access

    const subjects = await apiGetSubjects()
    subjectId = subjects[0]?.id || 1

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

    const testPaper = await apiCreateTestPaper(teacherToken, {
      name: `Validation 테스트용 시험지 ${Date.now()}`,
      subject_id: subjectId,
      question_ids: [question.id],
    })
    createdTestPaperIds.push(testPaper.id)
  })

  test.afterAll(async () => {
    for (const examId of createdExaminationIds) {
      try {
        await fetch(`http://localhost:8000/api/v1/examinations/${examId}/`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${teacherToken}` },
        })
      } catch {
        // cleanup
      }
    }

    for (const id of createdTestPaperIds) {
      try {
        await apiDeleteTestPaper(teacherToken, id)
      } catch {
        // cleanup
      }
    }

    for (const id of createdQuestionIds) {
      try {
        await apiDeleteQuestion(teacherToken, id)
      } catch {
        // cleanup
      }
    }
  })

  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page, { username: teacherUsername, password: teacherPassword })
    await waitForLoadingComplete(page)

    await page.goto('/examinations/new')
    await waitForLoadingComplete(page)
  })

  /**
   * DateTimePicker Popover를 열고 시간(hours, minutes)을 설정하는 Helper.
   * Label 텍스트로 해당 DateTimePicker Section을 식별한다.
   */
  async function setDateTimePickerTime(
    page: Page,
    label: string,
    hours: number,
    minutes: number
  ) {
    const triggerButton = page.getByText(label, { exact: true }).locator('..').locator('button')
    await triggerButton.click()
    await page.waitForTimeout(300)

    const popover = page.locator('[data-state="open"]').last()
    await expect(popover).toBeVisible()

    const timeInputs = popover.locator('input[type="number"]')
    await timeInputs.first().fill(String(hours))
    await timeInputs.nth(1).fill(String(minutes))

    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  }

  /**
   * 시험지 Select option 로드를 대기하고 첫 번째 시험지를 선택하는 Helper.
   */
  async function waitAndSelectTestPaper(page: Page) {
    await page.waitForFunction(
      (selectId) => {
        const select = document.querySelector(selectId) as HTMLSelectElement
        return select && select.options.length > 1
      },
      '#testpaper_id',
      { timeout: 10000 }
    )
    await page.selectOption('#testpaper_id', { index: 1 })
  }

  test('종료 시간을 시작 시간과 동일하게 설정 시 validation 에러 표시', async ({ page }) => {
    // DateTimePicker 기본값이 자정 전후로 날짜가 달라질 수 있어 skip
    const currentHour = new Date().getHours()
    test.skip(currentHour >= 22 || currentHour <= 1, 'Near midnight: default dates may differ')

    await page.fill('#exam_name', `Validation 테스트 ${Date.now()}`)
    await waitAndSelectTestPaper(page)

    // start_time, end_time 모두 23:00으로 설정 (duration = 0)
    await setDateTimePickerTime(page, '시작 시간', 23, 0)
    await setDateTimePickerTime(page, '종료 시간', 23, 0)

    await page.click('button:has-text("시험 생성")')

    const inlineError = page.locator('.text-destructive')
    await expect(inlineError).toBeVisible({ timeout: 5000 })
    await expect(inlineError).toContainText('종료 시간은 시작 시간 이후여야 합니다')
  })

  test('종료 시간이 시작 시간 이전일 때 validation 에러 표시', async ({ page }) => {
    const currentHour = new Date().getHours()
    test.skip(currentHour >= 22 || currentHour <= 1, 'Near midnight: default dates may differ')

    await page.fill('#exam_name', `Validation 테스트 ${Date.now()}`)
    await waitAndSelectTestPaper(page)

    // start_time을 23:30, end_time을 23:00으로 설정 (end < start)
    await setDateTimePickerTime(page, '시작 시간', 23, 30)
    await setDateTimePickerTime(page, '종료 시간', 23, 0)

    await page.click('button:has-text("시험 생성")')

    const inlineError = page.locator('.text-destructive')
    await expect(inlineError).toBeVisible({ timeout: 5000 })
    await expect(inlineError).toContainText('종료 시간은 시작 시간 이후여야 합니다')
  })

  test('유효한 입력으로 시험 생성 성공', async ({ page }) => {
    await page.fill('#exam_name', `Validation 테스트 ${Date.now()}`)
    await waitAndSelectTestPaper(page)

    // DateTimePicker 기본값 사용 (start: now+1h, end: now+2h)

    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/examinations/') && response.request().method() === 'POST'
    )

    await page.click('button:has-text("시험 생성")')

    const response = await responsePromise
    const responseData = await response.json()

    if (response.status() === 201 && responseData.id) {
      createdExaminationIds.push(responseData.id)
    }

    // 성공 시 목록 페이지로 리다이렉트
    await page.waitForURL(/\/examinations/, { timeout: 10000 })
  })
})
