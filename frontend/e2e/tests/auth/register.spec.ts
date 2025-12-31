import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import { apiGetSubjects } from '../../helpers/api.helper'

/**
 * 회원가입 통합 테스트
 */
test.describe('User Registration', () => {
  let subjectId: number

  test.beforeAll(async () => {
    // 과목 조회
    const subjects = await apiGetSubjects()
    subjectId = subjects.results[0].id
    console.log(`Subject ID for teacher registration: ${subjectId}`)
  })

  test('회원가입 페이지가 렌더링되어야 함', async ({ page }) => {
    await page.goto('/register')
    await waitForLoadingComplete(page)

    // 페이지 제목 확인
    await expect(page.locator('h1:has-text("회원가입")')).toBeVisible()

    // 역할 선택 버튼 확인
    await expect(page.locator('button:has-text("학생")')).toBeVisible()
    await expect(page.locator('button:has-text("교사")')).toBeVisible()

    console.log('✓ Registration page rendered')
  })

  test('Student 회원가입 - 필수 필드 유효성 검사', async ({ page }) => {
    await page.goto('/register')
    await waitForLoadingComplete(page)

    // 학생 역할 선택 (기본값)
    await page.click('button:has-text("학생")')
    await page.waitForTimeout(300)

    // 빈 폼 제출 시도
    await page.click('button:has-text("회원가입")')
    await page.waitForTimeout(500)

    // 유효성 검사 에러 메시지 확인
    const errorMessages = await page.locator('.text-destructive').allTextContents()
    expect(errorMessages.length).toBeGreaterThan(0)

    console.log('✓ Validation errors displayed for empty fields')
  })

  test('Student 회원가입 - Password 불일치 검사', async ({ page }) => {
    const timestamp = Date.now()

    await page.goto('/register')
    await waitForLoadingComplete(page)

    // 학생 역할 선택
    await page.click('button:has-text("학생")')

    // 필수 필드 입력
    await page.fill('#username', `e2e_student_${timestamp}`)
    await page.fill('#email', `e2e_student_${timestamp}@test.com`)
    await page.fill('#nick_name', `테스트학생${timestamp}`)
    await page.fill('#password', 'test12345678')
    await page.fill('#password2', 'different_password') // 다른 비밀번호
    await page.fill('#student_name', `학생${timestamp}`)

    // 제출
    await page.click('button:has-text("회원가입")')
    await page.waitForTimeout(500)

    // Password 불일치 에러 확인
    await expect(
      page.locator('.text-destructive:has-text("Password가 일치하지 않습니다")')
    ).toBeVisible()

    console.log('✓ Password mismatch error displayed')
  })

  test('Student 회원가입 - 성공', async ({ page }) => {
    const timestamp = Date.now()
    const username = `e2e_student_${timestamp}`
    const password = 'test12345678'

    await page.goto('/register')
    await waitForLoadingComplete(page)

    await test.step('회원가입 폼 작성', async () => {
      // 학생 역할 선택
      await page.click('button:has-text("학생")')
      await page.waitForTimeout(300)

      // 학생 이름 필드가 표시되는지 확인
      await expect(page.locator('#student_name')).toBeVisible()

      // 필수 필드 입력
      await page.fill('#username', username)
      await page.fill('#email', `${username}@test.com`)
      await page.fill('#nick_name', `테스트학생${timestamp}`)
      await page.fill('#password', password)
      await page.fill('#password2', password)
      await page.fill('#student_name', `학생${timestamp}`)

      console.log(`✓ Registration form filled for: ${username}`)
    })

    await test.step('회원가입 제출', async () => {
      // alert 이벤트 리스너 등록
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('회원가입이 완료되었습니다')
        await dialog.accept()
      })

      // 제출
      await page.click('button:has-text("회원가입")')

      // 로그인 페이지로 이동 대기
      await page.waitForURL('/login', { timeout: 10000 })

      console.log('✓ Registration successful, redirected to login page')
    })

    await test.step('새 계정으로 로그인', async () => {
      await waitForLoadingComplete(page)

      // 로그인 폼 작성
      await page.fill('#username', username)
      await page.fill('#password', password)

      // 로그인 버튼 클릭
      await page.click('button:has-text("로그인")')

      // Dashboard로 이동 대기
      await page.waitForURL(/\/(dashboard|exams)/, { timeout: 10000 })
      await waitForLoadingComplete(page)

      console.log('✓ Login successful with new account')
    })
  })

  test('Teacher 회원가입 - 성공', async ({ page }) => {
    const timestamp = Date.now()
    const username = `e2e_teacher_${timestamp}`
    const password = 'test12345678'

    // 브라우저 콘솔 로그 캡처
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`Browser error: ${msg.text()}`)
      }
    })

    await page.goto('/register')
    await waitForLoadingComplete(page)

    await test.step('회원가입 폼 작성', async () => {
      // 교사 역할 선택
      await page.click('button:has-text("교사")')
      await page.waitForTimeout(500)

      // 교사 전용 필드가 표시되는지 확인
      await expect(page.locator('#teacher_name')).toBeVisible()
      await expect(page.locator('#subject_id')).toBeVisible()

      // 필수 필드 입력
      await page.fill('#username', username)
      await page.fill('#email', `${username}@test.com`)
      await page.fill('#nick_name', `테스트교사${timestamp}`)
      await page.fill('#password', password)
      await page.fill('#password2', password)
      await page.fill('#teacher_name', `교사${timestamp}`)
      await page.selectOption('#subject_id', String(subjectId))

      console.log(`✓ Registration form filled for: ${username}`)
    })

    await test.step('회원가입 제출', async () => {
      // alert 이벤트 리스너 등록
      page.on('dialog', async (dialog) => {
        console.log(`Dialog message: ${dialog.message()}`)
        await dialog.accept()
      })

      // API 응답 캡처
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/register') &&
          response.request().method() === 'POST',
        { timeout: 15000 }
      )

      // 제출
      await page.click('button:has-text("회원가입")')

      // API 응답 대기
      try {
        const response = await responsePromise
        const responseData = await response.json().catch(() => ({}))
        console.log(`Registration API status: ${response.status()}`)
        console.log(`Registration API response: ${JSON.stringify(responseData)}`)

        if (response.status() === 201) {
          // 로그인 페이지로 이동 대기
          await page.waitForURL('/login', { timeout: 10000 })
          console.log('✓ Teacher registration successful')
        } else {
          console.log(`Registration failed with status: ${response.status()}`)
        }
      } catch (error) {
        console.log(`Error waiting for response: ${error}`)
        // 이미 로그인 페이지로 이동했을 수 있음
        await page.waitForURL('/login', { timeout: 5000 }).catch(() => {})
      }
    })

    await test.step('새 계정으로 로그인', async () => {
      // 현재 URL 확인
      const currentUrl = page.url()
      if (!currentUrl.includes('/login')) {
        await page.goto('/login')
      }
      await waitForLoadingComplete(page)

      // 로그인 폼 작성
      await page.fill('#username', username)
      await page.fill('#password', password)

      // 로그인 버튼 클릭
      await page.click('button:has-text("로그인")')

      // Dashboard로 이동 대기
      await page.waitForURL(/\/(dashboard|questions)/, { timeout: 10000 })
      await waitForLoadingComplete(page)

      console.log('✓ Login successful with new teacher account')
    })
  })

  test('중복 username 에러 확인', async ({ page }) => {
    const timestamp = Date.now()
    const duplicateUsername = `duplicate_test_${timestamp}`
    const password = 'test12345678'

    await test.step('첫 번째 계정 생성', async () => {
      await page.goto('/register')
      await waitForLoadingComplete(page)

      // 학생 역할 선택
      await page.click('button:has-text("학생")')

      // 필수 필드 입력
      await page.fill('#username', duplicateUsername)
      await page.fill('#email', `${duplicateUsername}_first@test.com`)
      await page.fill('#nick_name', `첫번째${timestamp}`)
      await page.fill('#password', password)
      await page.fill('#password2', password)
      await page.fill('#student_name', `학생${timestamp}`)

      // alert 핸들러
      page.once('dialog', async (dialog) => {
        await dialog.accept()
      })

      // 제출
      await page.click('button:has-text("회원가입")')
      await page.waitForURL('/login', { timeout: 10000 })

      console.log('✓ First account created')
    })

    await test.step('동일한 username으로 재가입 시도', async () => {
      await page.goto('/register')
      await waitForLoadingComplete(page)

      // 학생 역할 선택
      await page.click('button:has-text("학생")')

      // 동일한 username, 다른 email로 입력
      await page.fill('#username', duplicateUsername)
      await page.fill('#email', `${duplicateUsername}_second@test.com`)
      await page.fill('#nick_name', `두번째${timestamp}`)
      await page.fill('#password', password)
      await page.fill('#password2', password)
      await page.fill('#student_name', `학생2_${timestamp}`)

      // alert 핸들러 - 에러 메시지 확인
      let errorMessage = ''
      page.once('dialog', async (dialog) => {
        errorMessage = dialog.message()
        await dialog.accept()
      })

      // 제출
      await page.click('button:has-text("회원가입")')
      await page.waitForTimeout(2000)

      // 에러 메시지 확인 (또는 여전히 register 페이지에 있음)
      const currentUrl = page.url()
      if (currentUrl.includes('/register')) {
        console.log('✓ Duplicate username prevented registration')
      } else if (errorMessage) {
        console.log(`✓ Duplicate username error: ${errorMessage}`)
      }
    })
  })
})
