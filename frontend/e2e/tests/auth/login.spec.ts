import { test, expect } from '@playwright/test'
import { login, loginAsTeacher, loginAsStudent, logout } from '../../helpers/auth.helper'
import {
  expectToBeOnDashboard,
  expectToBeOnLoginPage,
  expectToBeLoggedIn,
  expectToBeLoggedOut,
  waitForLoadingComplete,
} from '../../helpers/assertions.helper'
import { selectors } from '../../helpers/selectors'
import { createAndLoginStudent, createAndLoginTeacher } from '../../helpers/data-factory.helper'

// 테스트에서 사용할 동적 계정 정보
let testStudent: Awaited<ReturnType<typeof createAndLoginStudent>> | null = null
let testTeacher: Awaited<ReturnType<typeof createAndLoginTeacher>> | null = null

test.describe('Login Page', () => {
  test.beforeAll(async () => {
    // 테스트에 사용할 계정을 미리 생성
    testStudent = await createAndLoginStudent()
    testTeacher = await createAndLoginTeacher()
    console.log(`Test accounts created: ${testStudent.user.username}, ${testTeacher.user.username}`)
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('로그인 페이지가 렌더링되어야 함', async ({ page }) => {
    // URL 확인
    await expect(page).toHaveURL('/login')

    // 핵심 UI 요소 확인
    await expect(page.locator(selectors.auth.login.usernameInput)).toBeVisible()
    await expect(page.locator(selectors.auth.login.passwordInput)).toBeVisible()
    await expect(page.locator(selectors.auth.login.submitButton)).toBeVisible()
    await expect(page.locator(selectors.auth.login.registerLink)).toBeVisible()

    // 역할 선택 버튼 확인
    await expect(page.locator(selectors.auth.login.studentRoleButton)).toBeVisible()
    await expect(page.locator(selectors.auth.login.teacherRoleButton)).toBeVisible()
  })

  test('Student 역할이 기본 선택되어야 함', async ({ page }) => {
    const studentButton = page.locator(selectors.auth.login.studentRoleButton)

    // 기본 선택 상태 확인 (border-primary 클래스가 있는지 확인)
    await expect(studentButton).toHaveClass(/border-primary/)
  })

  test('역할 선택 버튼이 동작해야 함', async ({ page }) => {
    const studentButton = page.locator(selectors.auth.login.studentRoleButton)
    const teacherButton = page.locator(selectors.auth.login.teacherRoleButton)

    // Teacher 버튼 클릭
    await teacherButton.click()

    // Teacher 버튼이 선택되었는지 확인
    await expect(teacherButton).toHaveClass(/border-primary/)

    // Student 버튼 다시 클릭
    await studentButton.click()

    // Student 버튼이 선택되었는지 확인
    await expect(studentButton).toHaveClass(/border-primary/)
  })

  test('유효한 Student 자격증명으로 로그인 성공해야 함', async ({ page }) => {
    // 동적으로 생성된 Student 계정으로 로그인
    await loginAsStudent(page, {
      username: testStudent!.user.username,
      password: testStudent!.user.password,
    })

    // Dashboard로 리다이렉트 확인
    await waitForLoadingComplete(page)
    await expectToBeOnDashboard(page)

    console.log('✓ Student login successful')
  })

  test('유효한 Teacher 자격증명으로 로그인 성공해야 함', async ({ page }) => {
    // Teacher 역할 선택
    await page.click(selectors.auth.login.teacherRoleButton)

    // 동적으로 생성된 Teacher 계정으로 로그인
    await loginAsTeacher(page, {
      username: testTeacher!.user.username,
      password: testTeacher!.user.password,
    })

    // Dashboard로 리다이렉트 확인
    await waitForLoadingComplete(page)
    await expectToBeOnDashboard(page)

    console.log('✓ Teacher login successful')
  })

  test('잘못된 자격증명으로 로그인 실패해야 함', async ({ page }) => {
    // Dialog 핸들러 등록 (alert 처리)
    let alertMessage = ''
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message()
      await dialog.accept()
    })

    // 잘못된 자격증명으로 로그인 시도
    await page.fill(selectors.auth.login.usernameInput, 'wronguser')
    await page.fill(selectors.auth.login.passwordInput, 'wrongpass')
    await page.click(selectors.auth.login.submitButton)

    // 에러 메시지 또는 alert 확인
    await page.waitForTimeout(1000)

    // 여전히 로그인 페이지에 있어야 함
    await expect(page).toHaveURL(/login/)

    console.log('✓ Login failed with invalid credentials')
  })

  test('빈 필드로 로그인 시도 시 유효성 검사 에러 표시', async ({ page }) => {
    // 빈 상태로 제출
    await page.click(selectors.auth.login.submitButton)

    // Zod 유효성 검사 에러 메시지 확인 (React Hook Form 사용)
    // "아이디를 입력해주세요" 또는 "Password를 입력해주세요" 메시지가 표시되어야 함
    const errorMessages = page.locator('p.text-destructive, .text-destructive')

    // 에러 메시지가 최소 1개 이상 표시되어야 함
    await expect(errorMessages.first()).toBeVisible({ timeout: 2000 })

    // 여전히 로그인 페이지에 있어야 함
    await expect(page).toHaveURL(/login/)

    console.log('✓ Validation error shown for empty fields')
  })

  test('회원가입 링크가 동작해야 함', async ({ page }) => {
    await page.click(selectors.auth.login.registerLink)

    // 회원가입 페이지로 이동 확인
    await expect(page).toHaveURL(/register/)

    console.log('✓ Register link navigates to registration page')
  })
})

test.describe('Logout', () => {
  let logoutTestStudent: Awaited<ReturnType<typeof createAndLoginStudent>> | null = null

  test.beforeAll(async () => {
    // Logout 테스트용 계정 생성
    logoutTestStudent = await createAndLoginStudent()
    console.log(`Logout test account created: ${logoutTestStudent.user.username}`)
  })

  test('로그인 후 로그아웃이 동작해야 함', async ({ page }) => {
    // 동적으로 생성된 Student 계정으로 로그인
    await page.goto('/login')
    await loginAsStudent(page, {
      username: logoutTestStudent!.user.username,
      password: logoutTestStudent!.user.password,
    })

    await waitForLoadingComplete(page)
    await expectToBeLoggedIn(page)

    // 로그아웃
    await logout(page)

    // 로그인 페이지로 리다이렉트 확인
    await expectToBeOnLoginPage(page)

    console.log('✓ Logout successful')
  })
})
