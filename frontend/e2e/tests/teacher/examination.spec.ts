import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import { loginAsTeacher } from '../../helpers/auth.helper'

/**
 * Teacher Examination 관리 테스트
 */
test.describe('Teacher Examination Management', () => {
  const teacherUsername = process.env.E2E_TEACHER_USERNAME || 'testteacher2'
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD || 'test12345678'

  test.beforeEach(async ({ page }) => {
    // Teacher로 로그인
    await loginAsTeacher(page, { username: teacherUsername, password: teacherPassword })
    await waitForLoadingComplete(page)
  })

  test('Examination 목록 페이지가 렌더링되어야 함', async ({ page }) => {
    // CI 환경에서 API 응답이 느릴 수 있으므로 timeout 증가
    test.setTimeout(60000)

    // 네트워크 요청 모니터링 (디버깅용)
    page.on('request', (request) => {
      if (request.url().includes('/examinations')) {
        console.log(`>> Request: ${request.method()} ${request.url()}`)
      }
    })
    page.on('response', (response) => {
      if (response.url().includes('/examinations')) {
        console.log(`<< Response: ${response.status()} ${response.url()}`)
      }
    })
    page.on('requestfailed', (request) => {
      if (request.url().includes('/examinations')) {
        console.log(`!! Request failed: ${request.url()} - ${request.failure()?.errorText}`)
      }
    })

    // Examination 관리 페이지로 이동
    await page.goto('/examinations')

    // h1이 나타날 때까지 명시적 대기 (성공 또는 에러 상태 모두 h1 포함)
    await page.locator('h1').waitFor({ state: 'visible', timeout: 50000 })
    await expect(page.locator('h1')).toContainText('시험')

    console.log('✓ Examination list page rendered successfully')
  })

  test('Examination 생성 페이지가 렌더링되어야 함', async ({ page }) => {
    // Examination 생성 페이지로 이동
    await page.goto('/examinations/new')
    await waitForLoadingComplete(page)

    // 페이지 제목 확인
    await expect(page.locator('h1')).toContainText('시험')

    // 폼 필드 확인 (ID 수정: name -> exam_name)
    await expect(page.locator('input[id="exam_name"]')).toBeVisible()

    console.log('✓ Examination creation page rendered successfully')
  })

  test('Examination 목록이 표시되어야 함', async ({ page }) => {
    // CI 환경에서 API 응답이 느릴 수 있으므로 timeout 증가
    test.setTimeout(60000)

    // 네트워크 요청 모니터링 (디버깅용)
    page.on('request', (request) => {
      if (request.url().includes('/examinations')) {
        console.log(`>> Request: ${request.method()} ${request.url()}`)
      }
    })
    page.on('response', (response) => {
      if (response.url().includes('/examinations')) {
        console.log(`<< Response: ${response.status()} ${response.url()}`)
      }
    })
    page.on('requestfailed', (request) => {
      if (request.url().includes('/examinations')) {
        console.log(`!! Request failed: ${request.url()} - ${request.failure()?.errorText}`)
      }
    })

    // Examination 목록 페이지로 이동
    await page.goto('/examinations')

    // h1이 나타날 때까지 명시적 대기 (성공 또는 에러 상태 모두 h1 포함)
    await page.locator('h1').waitFor({ state: 'visible', timeout: 50000 })
    await expect(page.locator('h1')).toContainText('시험')

    // 페이지네이션 또는 빈 메시지, 또는 리스트 카드가 있어야 함
    const hasContent =
      (await page.locator('.rounded-lg.border.bg-card').count()) > 0 ||
      (await page.locator('text=등록된 시험이 없습니다').count()) > 0 ||
      (await page.locator('button:has-text("이전")').count()) > 0

    expect(hasContent).toBeTruthy()

    console.log('✓ Examination list displayed correctly')
  })
})
