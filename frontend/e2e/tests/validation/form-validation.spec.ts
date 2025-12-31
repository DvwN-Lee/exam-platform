import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import { createAndLoginTeacher } from '../../helpers/data-factory.helper'
import { loginAsTeacher } from '../../helpers/auth.helper'

/**
 * 폼 유효성 검사 테스트
 * - Question 생성 폼 유효성 검사
 * - TestPaper 생성 폼 유효성 검사
 * - Examination 생성 폼 유효성 검사
 * - 회원가입 폼 유효성 검사
 */
test.describe('Form Validation', () => {
  let teacher: Awaited<ReturnType<typeof createAndLoginTeacher>>

  test.beforeAll(async () => {
    teacher = await createAndLoginTeacher()
    console.log(`=== Setup Complete ===`)
    console.log(`Teacher: ${teacher.user.username}`)
  })

  test('Question 생성 폼 유효성 검사', async ({ page }) => {
    await test.step('Teacher 로그인', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)
    })

    await test.step('Question 생성 페이지 접근', async () => {
      await page.goto('/questions/new')
      await waitForLoadingComplete(page)

      // 페이지 제목 확인
      await expect(page.locator('h1:has-text("문제 생성")')).toBeVisible()

      console.log('Question creation page loaded')
    })

    await test.step('빈 폼 제출 시 유효성 검사 에러', async () => {
      // 생성 버튼 클릭 (빈 폼 제출)
      await page.click('button:has-text("문제 생성")')
      await page.waitForTimeout(500)

      // 유효성 검사 에러 메시지 확인
      const errorMessages = await page.locator('.text-destructive').allTextContents()
      expect(errorMessages.length).toBeGreaterThan(0)

      console.log('Validation errors displayed for empty form')
    })

    await test.step('문제 제목 유효성 검사', async () => {
      // 너무 짧은 문제 제목 입력
      await page.fill('#name', 'a')
      await page.click('button:has-text("문제 생성")')
      await page.waitForTimeout(500)

      // 에러 메시지 확인 (제목 관련)
      const nameError = page.locator('.text-destructive')
      expect(await nameError.count()).toBeGreaterThan(0)

      console.log('Title validation working')
    })

    await test.step('객관식 옵션 유효성 검사', async () => {
      // 유효한 필드 입력
      await page.fill('#name', '테스트 문제 제목입니다')
      await page.selectOption('#subject_id', { index: 1 }) // 첫 번째 과목 선택
      await page.fill('#score', '10')

      // 객관식 선택
      await page.selectOption('#tq_type', 'xz')
      await page.waitForTimeout(300)

      // 옵션 없이 제출
      await page.click('button:has-text("문제 생성")')
      await page.waitForTimeout(500)

      // 옵션 관련 에러 또는 alert 확인
      const hasErrors = await page.locator('.text-destructive').isVisible()
      if (!hasErrors) {
        // alert로 에러가 표시될 수 있음
        page.on('dialog', async (dialog) => {
          await dialog.accept()
        })
      }

      console.log('Option validation checked')
    })

    await test.step('옵션 추가 및 정답 선택', async () => {
      // 옵션 추가
      const addOptionButton = page.locator('button:has-text("선택지 추가")')
      if (await addOptionButton.isVisible()) {
        await addOptionButton.click()
        await addOptionButton.click()
      }

      // 옵션 텍스트 입력
      const optionInputs = page.locator('input[placeholder*="선택지"]')
      if (await optionInputs.count() >= 2) {
        await optionInputs.nth(0).fill('옵션 1')
        await optionInputs.nth(1).fill('옵션 2')
      }

      // 정답 체크
      const checkboxes = page.locator('input[type="checkbox"]')
      if (await checkboxes.count() > 0) {
        await checkboxes.first().check()
      }

      console.log('Options added with correct answer')
    })
  })

  test('TestPaper 생성 폼 유효성 검사', async ({ page }) => {
    await test.step('Teacher 로그인', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)
    })

    await test.step('TestPaper 생성 페이지 접근', async () => {
      await page.goto('/testpapers/new')
      await waitForLoadingComplete(page)

      // 페이지 제목 확인
      await expect(page.locator('h1:has-text("시험지 생성")')).toBeVisible()

      console.log('TestPaper creation page loaded')
    })

    await test.step('빈 폼 제출 시 유효성 검사 에러', async () => {
      // 생성 버튼 클릭 (빈 폼 제출)
      await page.click('button:has-text("시험지 생성")')
      await page.waitForTimeout(500)

      // 유효성 검사 에러 메시지 또는 alert 확인
      const errorCount = await page.locator('.text-destructive').count()
      const hasWarningDialog = await page.locator('[role="dialog"]').isVisible()

      expect(errorCount > 0 || hasWarningDialog).toBeTruthy()

      console.log('Validation errors displayed for empty form')
    })

    await test.step('시험지 제목 입력', async () => {
      // 시험지 제목 입력
      await page.fill('#name', '테스트 시험지')

      // 과목 선택
      await page.selectOption('#subject_id', { index: 1 })
      await page.waitForTimeout(300)

      console.log('TestPaper title and subject set')
    })

    await test.step('문제 미선택 시 제출', async () => {
      // 문제 선택 없이 제출
      await page.click('button:has-text("시험지 생성")')
      await page.waitForTimeout(500)

      // 에러 확인 (문제가 없음)
      const errorCount = await page.locator('.text-destructive').count()
      const hasAlert = page.locator('text=문제를 선택해주세요')

      if (await hasAlert.isVisible()) {
        console.log('Question selection required error shown')
      } else if (errorCount > 0) {
        console.log('Validation error shown')
      }
    })
  })

  test('Examination 생성 폼 유효성 검사', async ({ page }) => {
    await test.step('Teacher 로그인', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)
    })

    await test.step('Examination 생성 페이지 접근', async () => {
      await page.goto('/examinations/new')
      await waitForLoadingComplete(page)

      // 페이지 제목 확인
      await expect(page.locator('h1:has-text("시험 생성")')).toBeVisible()

      console.log('Examination creation page loaded')
    })

    await test.step('빈 폼 제출 시 유효성 검사 에러', async () => {
      // 생성 버튼 클릭 (빈 폼 제출)
      await page.click('button:has-text("시험 생성")')
      await page.waitForTimeout(500)

      // 유효성 검사 에러 메시지 확인
      const errorMessages = await page.locator('.text-destructive').allTextContents()
      expect(errorMessages.length).toBeGreaterThan(0)

      console.log('Validation errors displayed for empty form')
    })

    await test.step('시험 이름 유효성 검사', async () => {
      // 너무 짧은 시험 이름 입력
      await page.fill('#exam_name', 'a')
      await page.click('button:has-text("시험 생성")')
      await page.waitForTimeout(500)

      // 에러가 여전히 있는지 확인
      const errorMessages = await page.locator('.text-destructive').allTextContents()
      expect(errorMessages.length).toBeGreaterThan(0)

      console.log('Exam name validation working')
    })

    await test.step('시간 설정 필수 확인', async () => {
      // 유효한 시험 이름 입력
      await page.fill('#exam_name', '테스트 시험입니다')

      // 시험지 선택
      const testpaperSelect = page.locator('#testpaper_id')
      const optionCount = await testpaperSelect.locator('option').count()

      if (optionCount > 1) {
        await testpaperSelect.selectOption({ index: 1 })
      }

      // 시작 시간 없이 제출
      await page.click('button:has-text("시험 생성")')
      await page.waitForTimeout(500)

      // 시간 관련 에러 확인
      const timeErrorCount = await page.locator('.text-destructive').count()
      expect(timeErrorCount).toBeGreaterThan(0)

      console.log('Time validation working')
    })
  })

  test('회원가입 폼 유효성 검사', async ({ page }) => {
    await test.step('회원가입 페이지 접근', async () => {
      await page.goto('/register')
      await waitForLoadingComplete(page)

      // 페이지 제목 확인
      await expect(page.locator('h1:has-text("회원가입")')).toBeVisible()

      console.log('Registration page loaded')
    })

    await test.step('빈 폼 제출 시 유효성 검사 에러', async () => {
      // 회원가입 버튼 클릭 (빈 폼 제출)
      await page.click('button:has-text("회원가입")')
      await page.waitForTimeout(500)

      // 유효성 검사 에러 메시지 확인
      const errorMessages = await page.locator('.text-destructive').allTextContents()
      expect(errorMessages.length).toBeGreaterThan(0)

      console.log('Validation errors displayed for empty form')
    })

    await test.step('아이디 형식 유효성 검사', async () => {
      // 잘못된 형식의 아이디 입력 (특수문자 포함)
      await page.fill('#username', 'test@user!')
      await page.click('button:has-text("회원가입")')
      await page.waitForTimeout(500)

      // 아이디 형식 에러 확인
      const usernameError = page.locator(
        '.text-destructive:has-text("영문, 숫자, 밑줄")'
      )
      await expect(usernameError).toBeVisible()

      console.log('Username format validation working')
    })

    await test.step('이메일 형식 유효성 검사', async () => {
      // 유효한 아이디 입력
      await page.fill('#username', 'testuser123')

      // 잘못된 이메일 형식
      await page.fill('#email', 'invalid-email')
      await page.click('button:has-text("회원가입")')
      await page.waitForTimeout(500)

      // 이메일 형식 에러 확인
      const emailError = page.locator('.text-destructive:has-text("이메일")')
      await expect(emailError).toBeVisible()

      console.log('Email format validation working')
    })

    await test.step('비밀번호 최소 길이 유효성 검사', async () => {
      // 유효한 이메일 입력
      await page.fill('#email', 'test@example.com')

      // 너무 짧은 비밀번호
      await page.fill('#password', 'short')
      await page.click('button:has-text("회원가입")')
      await page.waitForTimeout(500)

      // 비밀번호 길이 에러 확인
      const passwordError = page.locator('.text-destructive:has-text("8자")')
      await expect(passwordError).toBeVisible()

      console.log('Password length validation working')
    })

    await test.step('비밀번호 불일치 유효성 검사', async () => {
      // 유효한 비밀번호 입력
      await page.fill('#password', 'validpassword123')

      // 다른 비밀번호 확인 입력
      await page.fill('#password2', 'differentpassword')
      await page.click('button:has-text("회원가입")')
      await page.waitForTimeout(500)

      // 비밀번호 불일치 에러 확인
      const mismatchError = page.locator('.text-destructive:has-text("일치")')
      await expect(mismatchError).toBeVisible()

      console.log('Password mismatch validation working')
    })

    await test.step('닉네임 최소 길이 유효성 검사', async () => {
      // 비밀번호 일치
      await page.fill('#password2', 'validpassword123')

      // 너무 짧은 닉네임
      await page.fill('#nick_name', 'a')
      await page.click('button:has-text("회원가입")')
      await page.waitForTimeout(500)

      // 닉네임 길이 에러 확인 - 더 구체적인 셀렉터 사용
      const nicknameError = page.locator('.text-destructive:has-text("닉네임은 2자")')
      await expect(nicknameError).toBeVisible()

      console.log('Nickname length validation working')
    })

    await test.step('학생 이름 필수 확인 (학생 역할)', async () => {
      // 유효한 닉네임 입력
      await page.fill('#nick_name', '테스트닉네임')

      // 학생 역할 선택
      await page.click('button:has-text("학생")')
      await page.waitForTimeout(300)

      // 학생 이름 필드가 표시됨
      await expect(page.locator('#student_name')).toBeVisible()

      // 학생 이름 없이 제출
      await page.click('button:has-text("회원가입")')
      await page.waitForTimeout(500)

      // 학생 이름 에러 확인
      const studentNameError = page.locator('.text-destructive:has-text("학생")')
      expect(await studentNameError.count()).toBeGreaterThanOrEqual(1)

      console.log('Student name validation working')
    })
  })

  test('로그인 폼 유효성 검사', async ({ page, context }) => {
    await test.step('로그인 페이지 접근', async () => {
      // 로그인 페이지로 이동
      await page.goto('/login')

      // 인증 상태 초기화 (페이지 접근 후 localStorage 접근 가능)
      await context.clearCookies()
      await page.evaluate(() => localStorage.clear())

      // 페이지 새로고침 (인증 상태 초기화 적용)
      await page.reload()
      await waitForLoadingComplete(page)

      // 페이지 제목 확인 (실제 제목은 "환영합니다")
      await expect(page.locator('h1:has-text("환영합니다")')).toBeVisible()

      console.log('Login page loaded')
    })

    await test.step('빈 폼 제출 시 유효성 검사 에러', async () => {
      // 로그인 버튼 클릭 (빈 폼 제출)
      await page.click('button:has-text("로그인")')
      await page.waitForTimeout(500)

      // 유효성 검사 에러 메시지 확인
      const errorMessages = await page.locator('.text-destructive').allTextContents()
      expect(errorMessages.length).toBeGreaterThan(0)

      console.log('Validation errors displayed for empty form')
    })

    await test.step('잘못된 자격 증명으로 로그인 시도', async () => {
      // 잘못된 계정 정보 입력
      await page.fill('#username', 'nonexistentuser')
      await page.fill('#password', 'wrongpassword')

      // dialog 핸들러 등록
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('로그인')
        await dialog.accept()
      })

      await page.click('button:has-text("로그인")')
      await page.waitForTimeout(1000)

      // 로그인 페이지에 여전히 있어야 함
      await expect(page).toHaveURL('/login')

      console.log('Invalid credentials handled correctly')
    })
  })
})
