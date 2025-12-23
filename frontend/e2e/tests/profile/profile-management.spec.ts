import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import {
  createAndLoginStudent,
  createAndLoginTeacher,
} from '../../helpers/data-factory.helper'
import { loginAsStudent, loginAsTeacher } from '../../helpers/auth.helper'

/**
 * 프로필 관리 통합 테스트
 */
test.describe('Profile Management', () => {
  let student: Awaited<ReturnType<typeof createAndLoginStudent>>
  let teacher: Awaited<ReturnType<typeof createAndLoginTeacher>>

  test.beforeAll(async () => {
    // Student & Teacher 계정 생성
    student = await createAndLoginStudent()
    teacher = await createAndLoginTeacher()

    console.log(`=== Setup Complete ===`)
    console.log(`Student: ${student.user.username}`)
    console.log(`Teacher: ${teacher.user.username}`)
  })

  test('Student 프로필 조회 및 수정', async ({ page }) => {
    await test.step('Student 로그인', async () => {
      await loginAsStudent(page, {
        username: student.user.username,
        password: student.user.password,
      })
      await waitForLoadingComplete(page)

      console.log('✓ Student logged in')
    })

    await test.step('프로필 페이지 접근', async () => {
      await page.goto('/profile')
      await waitForLoadingComplete(page)

      // 페이지 제목 확인
      await expect(page.locator('h1:has-text("프로필")')).toBeVisible()

      // 기본 정보 표시 확인
      await expect(page.locator('text=아이디')).toBeVisible()
      await expect(page.locator('text=사용자 유형')).toBeVisible()
      await expect(page.locator('text=가입일')).toBeVisible()

      console.log('✓ Profile page loaded')
    })

    await test.step('프로필 정보 확인', async () => {
      // 사용자명 확인
      await expect(page.locator(`text=${student.user.username}`)).toBeVisible()

      // 사용자 유형 확인 (학생)
      await expect(page.locator('text=학생')).toBeVisible()

      // Email 확인
      const emailValue = await page.locator('#email').inputValue()
      expect(emailValue).toContain('@')

      // 닉네임 확인
      const nickNameValue = await page.locator('#nick_name').inputValue()
      expect(nickNameValue.length).toBeGreaterThan(0)

      console.log('✓ Profile information verified')
    })

    const newNickName = `수정된닉네임${Date.now()}`

    await test.step('프로필 수정', async () => {
      // 닉네임 변경
      await page.fill('#nick_name', newNickName)

      // dialog 핸들러
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('프로필이 업데이트되었습니다')
        await dialog.accept()
      })

      // 프로필 업데이트 버튼 클릭
      await page.click('button:has-text("프로필 업데이트")')

      // 업데이트 대기
      await page.waitForTimeout(1000)

      // 변경된 닉네임 확인
      const updatedNickName = await page.locator('#nick_name').inputValue()
      expect(updatedNickName).toBe(newNickName)

      console.log(`✓ Profile updated with new nickname: ${newNickName}`)
    })
  })

  test('Teacher 프로필 조회', async ({ page }) => {
    await test.step('Teacher 로그인', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      console.log('✓ Teacher logged in')
    })

    await test.step('프로필 페이지 접근', async () => {
      await page.goto('/profile')
      await waitForLoadingComplete(page)

      // 페이지 제목 확인
      await expect(page.locator('h1:has-text("프로필")')).toBeVisible()

      console.log('✓ Profile page loaded')
    })

    await test.step('Teacher 정보 확인', async () => {
      // 사용자명 확인
      await expect(page.locator(`text=${teacher.user.username}`)).toBeVisible()

      // 사용자 유형 확인 (교사)
      await expect(page.locator('text=교사')).toBeVisible()

      console.log('✓ Teacher profile verified')
    })
  })

  test('비밀번호 변경 페이지 접근 및 유효성 검사', async ({ page }) => {
    await test.step('Student 로그인', async () => {
      await loginAsStudent(page, {
        username: student.user.username,
        password: student.user.password,
      })
      await waitForLoadingComplete(page)
    })

    await test.step('비밀번호 변경 페이지 접근', async () => {
      await page.goto('/profile')
      await waitForLoadingComplete(page)

      // 비밀번호 변경 버튼 클릭
      await page.click('button:has-text("비밀번호 변경")')

      // URL 변경 확인
      await page.waitForURL('/profile/change-password')
      await waitForLoadingComplete(page)

      // 페이지 제목 확인
      await expect(page.locator('h1:has-text("비밀번호 변경")')).toBeVisible()

      console.log('✓ Change password page loaded')
    })

    await test.step('필수 필드 유효성 검사', async () => {
      // 빈 폼 제출
      await page.click('button:has-text("비밀번호 변경")')
      await page.waitForTimeout(500)

      // 유효성 검사 에러 확인
      const errorMessages = await page.locator('.text-destructive').allTextContents()
      expect(errorMessages.length).toBeGreaterThan(0)

      console.log('✓ Validation errors displayed')
    })

    await test.step('새 비밀번호 불일치 검사', async () => {
      await page.fill('#old_password', 'current_password')
      await page.fill('#new_password', 'new_password123')
      await page.fill('#new_password2', 'different_password')

      await page.click('button:has-text("비밀번호 변경")')
      await page.waitForTimeout(500)

      // 비밀번호 불일치 에러 확인
      await expect(
        page.locator('.text-destructive:has-text("Password가 일치하지 않습니다")')
      ).toBeVisible()

      console.log('✓ Password mismatch error displayed')
    })

    await test.step('취소 버튼 동작', async () => {
      await page.click('button:has-text("취소")')

      // 프로필 페이지로 이동 확인
      await page.waitForURL('/profile')

      console.log('✓ Cancel button works')
    })
  })

  test('비밀번호 변경 성공 및 새 비밀번호로 로그인', async ({ page }) => {
    const originalPassword = student.user.password
    const newPassword = 'new_password_123'

    await test.step('Student 로그인', async () => {
      await loginAsStudent(page, {
        username: student.user.username,
        password: originalPassword,
      })
      await waitForLoadingComplete(page)
    })

    await test.step('비밀번호 변경', async () => {
      await page.goto('/profile/change-password')
      await waitForLoadingComplete(page)

      // 비밀번호 변경 폼 작성
      await page.fill('#old_password', originalPassword)
      await page.fill('#new_password', newPassword)
      await page.fill('#new_password2', newPassword)

      // dialog 핸들러
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('비밀번호가 변경되었습니다')
        await dialog.accept()
      })

      // 비밀번호 변경 버튼 클릭
      await page.click('button:has-text("비밀번호 변경")')

      // 프로필 페이지로 이동 대기
      await page.waitForURL('/profile')

      console.log('✓ Password changed successfully')
    })

    await test.step('로그아웃', async () => {
      // dialog 핸들러 없음 (로그아웃은 confirm 없이 진행)
      await page.click('button:has-text("로그아웃")')

      // 로그인 페이지로 이동 확인
      await page.waitForURL('/login')

      console.log('✓ Logged out')
    })

    await test.step('새 비밀번호로 로그인', async () => {
      await waitForLoadingComplete(page)

      // 새 비밀번호로 로그인
      await page.fill('#username', student.user.username)
      await page.fill('#password', newPassword)

      await page.click('button:has-text("로그인")')

      // Dashboard로 이동 대기
      await page.waitForURL(/\/(dashboard|exams)/, { timeout: 10000 })
      await waitForLoadingComplete(page)

      console.log('✓ Login successful with new password')
    })

    await test.step('비밀번호 원복', async () => {
      // 다른 테스트를 위해 비밀번호 원복
      await page.goto('/profile/change-password')
      await waitForLoadingComplete(page)

      await page.fill('#old_password', newPassword)
      await page.fill('#new_password', originalPassword)
      await page.fill('#new_password2', originalPassword)

      page.once('dialog', async (dialog) => {
        await dialog.accept()
      })

      await page.click('button:has-text("비밀번호 변경")')
      await page.waitForURL('/profile')

      console.log('✓ Password restored')
    })
  })

  test('로그아웃 기능', async ({ page }) => {
    await test.step('Student 로그인', async () => {
      await loginAsStudent(page, {
        username: student.user.username,
        password: student.user.password,
      })
      await waitForLoadingComplete(page)
    })

    await test.step('프로필 페이지에서 로그아웃', async () => {
      await page.goto('/profile')
      await waitForLoadingComplete(page)

      // 로그아웃 버튼 클릭
      await page.click('button:has-text("로그아웃")')

      // 로그인 페이지로 이동 확인
      await page.waitForURL('/login')

      console.log('✓ Logged out successfully')
    })

    await test.step('보호된 페이지 접근 불가 확인', async () => {
      // 프로필 페이지 직접 접근 시도
      await page.goto('/profile')

      // 로그인 페이지로 리다이렉트
      await page.waitForURL('/login')

      console.log('✓ Protected page redirects to login')
    })
  })
})
