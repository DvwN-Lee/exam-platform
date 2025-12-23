import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import { createAndLoginTeacher } from '../../helpers/data-factory.helper'
import { loginAsTeacher } from '../../helpers/auth.helper'

/**
 * 폼 유효성 검사 통합 테스트
 */
test.describe('Form Validation', () => {
  let teacher: Awaited<ReturnType<typeof createAndLoginTeacher>>

  test.beforeAll(async () => {
    teacher = await createAndLoginTeacher()
    console.log(`=== Setup Complete ===`)
    console.log(`Teacher: ${teacher.user.username}`)
  })

  test.describe('로그인 폼 유효성 검사', () => {
    test('빈 폼 제출 시 에러 메시지 표시', async ({ page }) => {
      await page.goto('/login')
      await waitForLoadingComplete(page)

      // 빈 폼 제출
      await page.click('button:has-text("로그인")')
      await page.waitForTimeout(500)

      // 유효성 검사 에러 메시지 확인
      const errorMessages = await page.locator('.text-destructive').allTextContents()
      expect(errorMessages.length).toBeGreaterThan(0)

      console.log('✓ Login form validation works')
    })
  })

  test.describe('회원가입 폼 유효성 검사', () => {
    test('필수 필드 미입력 시 에러 메시지', async ({ page }) => {
      await page.goto('/register')
      await waitForLoadingComplete(page)

      // 학생 역할 선택
      await page.click('button:has-text("학생")')
      await page.waitForTimeout(300)

      // 빈 폼 제출
      await page.click('button:has-text("회원가입")')
      await page.waitForTimeout(500)

      // 유효성 검사 에러 메시지 확인
      const errorMessages = await page.locator('.text-destructive').allTextContents()
      expect(errorMessages.length).toBeGreaterThan(0)

      console.log('✓ Register form required field validation works')
    })

    test('Password 최소 길이 검사', async ({ page }) => {
      await page.goto('/register')
      await waitForLoadingComplete(page)

      // 학생 역할 선택
      await page.click('button:has-text("학생")')

      // 짧은 Password 입력
      await page.fill('#password', '1234')
      await page.click('button:has-text("회원가입")')
      await page.waitForTimeout(500)

      // Password 길이 관련 에러 메시지 확인
      await expect(page.locator('.text-destructive')).toContainText(['8자'])

      console.log('✓ Password minimum length validation works')
    })

    test('Password 불일치 검사', async ({ page }) => {
      await page.goto('/register')
      await waitForLoadingComplete(page)

      // 학생 역할 선택
      await page.click('button:has-text("학생")')

      // Password 불일치 입력
      await page.fill('#password', 'test12345678')
      await page.fill('#password2', 'different_password')
      await page.click('button:has-text("회원가입")')
      await page.waitForTimeout(500)

      // 불일치 에러 메시지 확인
      await expect(
        page.locator('.text-destructive:has-text("일치")')
      ).toBeVisible()

      console.log('✓ Password mismatch validation works')
    })
  })

  test.describe('비밀번호 변경 폼 유효성 검사', () => {
    test('필수 필드 미입력 시 에러 메시지', async ({ page }) => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/profile/change-password')
      await waitForLoadingComplete(page)

      // 빈 폼 제출
      await page.click('button:has-text("비밀번호 변경")')
      await page.waitForTimeout(500)

      // 유효성 검사 에러 메시지 확인
      const errorMessages = await page.locator('.text-destructive').allTextContents()
      expect(errorMessages.length).toBeGreaterThan(0)

      console.log('✓ Change password form required field validation works')
    })

    test('새 Password 불일치 검사', async ({ page }) => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/profile/change-password')
      await waitForLoadingComplete(page)

      // Password 불일치 입력
      await page.fill('#old_password', 'current_password')
      await page.fill('#new_password', 'new_password123')
      await page.fill('#new_password2', 'different_password')

      await page.click('button:has-text("비밀번호 변경")')
      await page.waitForTimeout(500)

      // 불일치 에러 메시지 확인
      await expect(
        page.locator('.text-destructive:has-text("일치")')
      ).toBeVisible()

      console.log('✓ New password mismatch validation works')
    })
  })

  test.describe('프로필 폼 유효성 검사', () => {
    test('닉네임 최소 길이 검사', async ({ page }) => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/profile')
      await waitForLoadingComplete(page)

      // 짧은 닉네임 입력
      await page.fill('#nick_name', '가')
      await page.click('button:has-text("프로필 업데이트")')
      await page.waitForTimeout(500)

      // 닉네임 길이 에러 메시지 확인
      await expect(page.locator('.text-destructive')).toContainText(['2자'])

      console.log('✓ Nickname minimum length validation works')
    })
  })
})
