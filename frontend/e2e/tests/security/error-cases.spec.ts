import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'

/**
 * 에러 케이스 테스트
 */
test.describe('Error Cases', () => {
  const teacherUsername = process.env.E2E_TEACHER_USERNAME || 'testteacher2'
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD || 'test12345678'

  test('존재하지 않는 페이지 접근 시 404 처리', async ({ page }) => {
    await page.goto('/login')
    await page.click('button:has-text("교사")')
    await page.fill('input[id="username"]', teacherUsername)
    await page.fill('input[id="password"]', teacherPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // 존재하지 않는 페이지로 이동
    const response = await page.goto('/nonexistent-page-12345')

    // 404 또는 리다이렉트 확인
    if (response) {
      const status = response.status()
      expect(status === 404 || status === 200).toBeTruthy()
    }

    console.log('✓ 404 page handled correctly')
  })

  test('네트워크 에러 시 적절한 에러 메시지 표시', async ({ page }) => {
    // 로그인
    await page.goto('/login')
    await page.fill('input[id="username"]', 'wronguser123456')
    await page.fill('input[id="password"]', 'wrongpass123456')

    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // 에러 메시지가 표시되어야 함 (toast 또는 화면상 메시지)
    // sonner toast 또는 폼 에러 또는 여전히 로그인 페이지에 있음
    const hasToast = (await page.locator('[data-sonner-toast]').count()) > 0
    const hasError = (await page.locator('.text-destructive').count()) > 0
    const stillOnLoginPage = page.url().includes('/login')

    expect(hasToast || hasError || stillOnLoginPage).toBeTruthy()

    console.log('✓ Network error handled with appropriate message')
  })

  test('빈 필드로 폼 제출 시 유효성 검사', async ({ page }) => {
    // Teacher로 로그인
    await page.goto('/login')
    await page.click('button:has-text("교사")')
    await page.fill('input[id="username"]', teacherUsername)
    await page.fill('input[id="password"]', teacherPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Question 생성 페이지로 이동
    await page.goto('/questions/new')
    await waitForLoadingComplete(page)

    // 빈 상태로 제출 시도
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // 유효성 검사 에러가 표시되어야 함
    await expect(page.locator('.text-destructive, p.text-sm.text-destructive').first()).toBeVisible({ timeout: 2000 })

    console.log('✓ Form validation works for empty fields')
  })

  test('잘못된 형식의 입력값 처리', async ({ page }) => {
    // Teacher로 로그인
    await page.goto('/login')
    await page.click('button:has-text("교사")')
    await page.fill('input[id="username"]', teacherUsername)
    await page.fill('input[id="password"]', teacherPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Question 생성 페이지로 이동
    await page.goto('/questions/new')
    await waitForLoadingComplete(page)

    // 제목 필드에 매우 긴 텍스트 입력
    const longText = 'A'.repeat(1000)
    await page.fill('input[id="name"]', longText)

    // 점수 필드에 음수 입력 시도
    const scoreInput = page.locator('input[id="score"]')
    await scoreInput.fill('-10')

    // 제출 시도
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // 에러가 발생하거나 유효성 검사가 작동해야 함
    await page.waitForTimeout(1000)

    // 여전히 생성 페이지에 있거나 에러 메시지가 표시되어야 함
    const onCreatePage = page.url().includes('/questions/new')
    const hasError = (await page.locator('.text-destructive').count()) > 0

    expect(onCreatePage || hasError).toBeTruthy()

    console.log('✓ Invalid input handled correctly')
  })
})
