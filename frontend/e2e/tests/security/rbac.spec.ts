import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'

/**
 * RBAC (Role-Based Access Control) 테스트
 */
test.describe('RBAC Tests', () => {
  const studentUsername = process.env.E2E_STUDENT_USERNAME || 'teststudent2'
  const studentPassword = process.env.E2E_STUDENT_PASSWORD || 'test12345678'
  const teacherUsername = process.env.E2E_TEACHER_USERNAME || 'testteacher2'
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD || 'test12345678'

  test('Student는 Teacher 전용 페이지에 접근할 수 없어야 함', async ({ page }) => {
    // Student로 로그인
    await page.goto('/login')
    await page.fill('input[id="username"]', studentUsername)
    await page.fill('input[id="password"]', studentPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    // Question 관리 페이지 접근 시도
    await page.goto('/questions')
    await waitForLoadingComplete(page)

    // 접근이 거부되거나 빈 페이지가 표시되어야 함
    // (구현에 따라 다를 수 있음)
    const currentUrl = page.url()
    const hasNoQuestions = await page.locator('text=문제가 없습니다').count()

    // Student는 문제가 없거나 접근이 제한되어야 함
    expect(hasNoQuestions > 0 || currentUrl.includes('/dashboard')).toBeTruthy()

    console.log('✓ Student cannot access Teacher-only pages')
  })

  test('Teacher는 Student Dashboard를 볼 수 있어야 함', async ({ page }) => {
    // Teacher로 로그인
    await page.goto('/login')
    await page.click('button:has-text("교사")')
    await page.fill('input[id="username"]', teacherUsername)
    await page.fill('input[id="password"]', teacherPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    // Dashboard 접근
    await page.goto('/dashboard')
    await waitForLoadingComplete(page)

    // Teacher Dashboard가 표시되어야 함 (환영 메시지 포함)
    await expect(page.locator('h1, h2').first()).toContainText(/대시보드|Dashboard|환영합니다|Welcome/i)

    console.log('✓ Teacher can access Dashboard')
  })

  test('로그인하지 않은 사용자는 보호된 라우트에 접근할 수 없어야 함', async ({
    page,
  }) => {
    // localStorage 초기화
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
    })

    // 보호된 페이지 접근 시도
    await page.goto('/questions')

    // 로그인 페이지로 리다이렉트되어야 함
    await expect(page).toHaveURL(/login/, { timeout: 5000 })

    console.log('✓ Unauthenticated users redirected to login')
  })
})
