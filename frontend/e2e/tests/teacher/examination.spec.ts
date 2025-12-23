import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'

/**
 * Teacher Examination 관리 테스트
 */
test.describe('Teacher Examination Management', () => {
  const teacherUsername = process.env.E2E_TEACHER_USERNAME || 'testteacher2'
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD || 'test12345678'

  test.beforeEach(async ({ page }) => {
    // Teacher로 로그인
    await page.goto('/login')
    await page.click('button:has-text("교사")')
    await page.fill('input[id="username"]', teacherUsername)
    await page.fill('input[id="password"]', teacherPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('Examination 목록 페이지가 렌더링되어야 함', async ({ page }) => {
    // Examination 관리 페이지로 이동
    await page.goto('/examinations')
    await waitForLoadingComplete(page)

    // 페이지 제목 확인
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
    // Examination 목록 페이지로 이동
    await page.goto('/examinations')
    await waitForLoadingComplete(page)

    // 페이지네이션 또는 빈 메시지, 또는 리스트 카드가 있어야 함
    const hasContent =
      (await page.locator('.rounded-lg.border.bg-card').count()) > 0 ||
      (await page.locator('text=등록된 시험이 없습니다').count()) > 0 ||
      (await page.locator('button:has-text("이전")').count()) > 0

    expect(hasContent).toBeTruthy()

    console.log('✓ Examination list displayed correctly')
  })
})
