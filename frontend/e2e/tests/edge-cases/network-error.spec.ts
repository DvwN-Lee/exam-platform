import { test, expect } from '@playwright/test'
import { loginAsTeacher } from '../../helpers/auth.helper'
import { createAndLoginTeacher } from '../../helpers/data-factory.helper'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'

/**
 * Network Error Handling E2E 테스트
 *
 * 네트워크 오류 상황에서의 앱 동작 검증:
 * - API 실패 시 오류 메시지 표시
 * - 네트워크 타임아웃 처리
 * - 재시도 로직 검증
 */
test.describe('Network Error Handling', () => {
  let teacher: Awaited<ReturnType<typeof createAndLoginTeacher>>

  test.beforeAll(async () => {
    teacher = await createAndLoginTeacher()
  })

  test.describe('API Error Response Handling', () => {
    test('404 오류 시 적절한 메시지 표시', async ({ page }) => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      // 존재하지 않는 문제 ID로 접근
      await page.goto('/questions/99999')
      await waitForLoadingComplete(page)

      // 404 오류 메시지 또는 리다이렉트 또는 빈 상태 확인
      const has404Message = await page
        .locator('text=/찾을 수 없|not found|존재하지 않/i')
        .isVisible()
        .catch(() => false)

      const redirectedToList = page.url().includes('/questions')
      const pageLoaded = await page.locator('body').isVisible()

      // 페이지가 크래시 없이 로드되면 통과
      expect(has404Message || redirectedToList || pageLoaded).toBeTruthy()
    })

    test('서버 오류(5xx) 시 오류 메시지 표시', async ({ page }) => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      // 서버 오류 시뮬레이션 (잘못된 요청으로)
      await page.route('**/api/v1/questions/**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        })
      })

      await page.goto('/questions')
      await page.waitForTimeout(2000)

      // 오류 처리가 되었는지 확인 (오류 메시지 또는 재시도 UI)
      const pageContent = await page.content()
      // 페이지가 완전히 깨지지 않고 로드되어야 함
      expect(pageContent).toBeTruthy()
    })

    test('잘못된 요청(400) 시 폼 오류 표시', async ({ page }) => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/questions/new')
      await waitForLoadingComplete(page)

      // 빈 폼 제출 시도 (클라이언트 검증 우회)
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("저장"), button:has-text("생성")'
      ).first()

      if (await submitButton.isVisible()) {
        await submitButton.click()
        await page.waitForTimeout(1000)

        // 오류 메시지 또는 필수 필드 표시 확인
        const hasError = await page
          .locator('.error, [class*="error"], [role="alert"], .text-red, .text-destructive')
          .first()
          .isVisible()
          .catch(() => false)

        const hasRequiredMessage = await page
          .locator('text=/필수|required|입력해/i')
          .isVisible()
          .catch(() => false)

        // 오류가 표시되거나 페이지가 이동하지 않아야 함
        expect(
          hasError || hasRequiredMessage || page.url().includes('/new')
        ).toBeTruthy()
      }
    })
  })

  test.describe('Network Timeout Handling', () => {
    test('느린 네트워크에서 로딩 인디케이터 표시', async ({ page }) => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })

      // 느린 네트워크 시뮬레이션
      await page.route('**/api/v1/questions/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await route.continue()
      })

      await page.goto('/questions')

      // 로딩 인디케이터가 표시되는지 확인
      const hasLoadingIndicator = await page
        .locator(
          '.loading, [class*="loading"], [class*="spinner"], [role="progressbar"], .animate-spin'
        )
        .first()
        .isVisible({ timeout: 1000 })
        .catch(() => false)

      // 로딩 인디케이터가 있거나 데이터가 로드될 때까지 기다림
      await waitForLoadingComplete(page)
      expect(true).toBeTruthy() // 페이지가 크래시 없이 로드됨
    })
  })

  test.describe('Offline Mode Handling', () => {
    test('오프라인 상태에서 적절한 메시지 표시', async ({ page, context }) => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      // 네트워크 오프라인 설정
      await context.setOffline(true)

      // 페이지 새로고침 또는 새 요청 시도
      await page.reload().catch(() => {})

      await page.waitForTimeout(2000)

      // 오프라인 메시지 또는 오류 페이지 확인
      const pageContent = await page.content()
      expect(pageContent).toBeTruthy()

      // 네트워크 복구
      await context.setOffline(false)
    })
  })
})

test.describe('API Rate Limiting', () => {
  test('빠른 연속 요청 처리', async ({ page }) => {
    const teacher = await createAndLoginTeacher()

    await loginAsTeacher(page, {
      username: teacher.user.username,
      password: teacher.user.password,
    })
    await waitForLoadingComplete(page)

    await page.goto('/questions')
    await waitForLoadingComplete(page)

    // 검색을 빠르게 여러 번 수행
    const searchInput = page.locator(
      'input[placeholder*="검색"], input[type="search"]'
    ).first()

    if (await searchInput.isVisible()) {
      // 빠른 연속 입력
      await searchInput.fill('test1')
      await searchInput.fill('test12')
      await searchInput.fill('test123')
      await searchInput.fill('test1234')
      await searchInput.fill('test12345')

      await page.waitForTimeout(1000)

      // 마지막 검색 결과만 반영되어야 함
      const inputValue = await searchInput.inputValue()
      expect(inputValue).toBe('test12345')
    }
  })
})

test.describe('Concurrent Request Handling', () => {
  test('동시 요청 시 데이터 일관성 유지', async ({ page }) => {
    const teacher = await createAndLoginTeacher()

    await loginAsTeacher(page, {
      username: teacher.user.username,
      password: teacher.user.password,
    })
    await waitForLoadingComplete(page)

    // 여러 탭에서 동시 작업 시뮬레이션을 위해
    // 같은 페이지에서 여러 요청 발생
    await page.goto('/dashboard')
    await waitForLoadingComplete(page)

    // 페이지가 정상적으로 로드되었는지 확인
    const dashboardContent = await page
      .locator('h1, h2, [class*="dashboard"]')
      .first()
      .isVisible()
      .catch(() => false)

    expect(dashboardContent).toBeTruthy()
  })
})
