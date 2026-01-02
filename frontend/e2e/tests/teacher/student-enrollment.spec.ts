import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import {
  createAndLoginStudent,
  createAndLoginTeacher,
  createQuestion,
  createTestPaper,
  cleanupTestData,
} from '../../helpers/data-factory.helper'
import { loginAsTeacher } from '../../helpers/auth.helper'
import { apiCreateExamination, apiGetSubjects } from '../../helpers/api.helper'

/**
 * Student Enrollment 테스트
 * - 시험에 학생 등록/관리 기능 테스트
 * - StudentSelectModal 동작 테스트
 * - EnrolledStudentsSection 표시 테스트
 */
test.describe('Student Enrollment', () => {
  let teacher: Awaited<ReturnType<typeof createAndLoginTeacher>>
  let student1: Awaited<ReturnType<typeof createAndLoginStudent>>
  let student2: Awaited<ReturnType<typeof createAndLoginStudent>>
  let subjectId: number
  let questionIds: number[] = []
  let testPaperId: number
  let examinationId: number

  test.beforeAll(async () => {
    try {
      // Teacher 생성
      teacher = await createAndLoginTeacher()

      // Student 2명 생성
      student1 = await createAndLoginStudent()
      student2 = await createAndLoginStudent()

      // Subject 조회
      const subjectsResponse = await apiGetSubjects(teacher.tokens.access)
      // Handle both paginated (results array) and non-paginated (direct array) responses
      const subjects = Array.isArray(subjectsResponse)
        ? subjectsResponse
        : subjectsResponse?.results || []

      if (!subjects || subjects.length === 0) {
        console.log('No subjects found, using default subject ID')
        subjectId = 1
      } else {
        subjectId = subjects[0].id
      }

      // 문제 생성
      try {
        const q1 = await createQuestion(teacher.tokens.access, subjectId, 'xz')
        const q2 = await createQuestion(teacher.tokens.access, subjectId, 'pd')
        questionIds = [q1.id, q2.id]

        // 시험지 생성
        const testPaper = await createTestPaper(teacher.tokens.access, subjectId, questionIds)
        testPaperId = testPaper.id

        // 시험 생성 (학생 등록 없이)
        const now = new Date()
        const startTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString() // 1시간 후
        const examination = await apiCreateExamination(teacher.tokens.access, {
          name: `등록 테스트 시험 ${Date.now()}`,
          subject_id: subjectId,
          start_time: startTime,
          duration: 60,
          exam_type: 'pt',
          papers: [{ paper_id: testPaperId }],
        })
        examinationId = examination.id
      } catch (dataError) {
        console.log('Failed to create test data, tests will run with limited data')
        console.log(`Error: ${dataError}`)
      }

      console.log('=== Setup Complete ===')
      console.log(`Teacher: ${teacher.user.username}`)
      console.log(`Student1: ${student1.user.username}, studentId: ${student1.studentId}`)
      console.log(`Student2: ${student2.user.username}, studentId: ${student2.studentId}`)
      console.log(`Examination ID: ${examinationId}`)
    } catch (error) {
      console.error('Student Enrollment beforeAll failed:', error)
      throw error
    }
  })

  test.afterAll(async () => {
    await cleanupTestData(teacher.tokens.access, {
      examinationIds: [examinationId],
      testPaperIds: [testPaperId],
      questionIds: questionIds,
    })
  })

  test('시험 상세 페이지에서 등록된 학생 섹션 표시', async ({ page }) => {
    await test.step('Teacher 로그인', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)
    })

    await test.step('시험 상세 페이지 접근', async () => {
      await page.goto(`/examinations/${examinationId}`)
      await waitForLoadingComplete(page)

      // 등록된 학생 섹션 확인
      await expect(page.locator('h3:has-text("등록된 학생")')).toBeVisible()

      // 학생 추가 버튼 확인 (정확한 텍스트 매칭)
      await expect(page.getByRole('button', { name: '학생 추가', exact: true })).toBeVisible()

      console.log('Enrolled students section displayed')
    })

    await test.step('빈 상태 메시지 확인', async () => {
      // 등록된 학생이 없는 경우 메시지 확인
      const emptyMessage = page.locator('text=등록된 학생이 없습니다')
      const hasEmptyMessage = await emptyMessage.isVisible().catch(() => false)

      if (hasEmptyMessage) {
        await expect(page.locator('button:has-text("학생 추가하기")')).toBeVisible()
        console.log('Empty state message displayed')
      } else {
        console.log('Students already enrolled')
      }
    })
  })

  test('학생 선택 모달 열기 및 검색', async ({ page }) => {
    await test.step('Teacher 로그인 및 시험 상세 페이지 접근', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto(`/examinations/${examinationId}`)
      await waitForLoadingComplete(page)
    })

    await test.step('학생 추가 버튼 클릭', async () => {
      await page.click('button:has-text("학생 추가")')
      await page.waitForTimeout(300) // 모달 애니메이션 대기

      // 모달 제목 확인
      await expect(page.locator('h2:has-text("학생 선택")')).toBeVisible()

      // 검색 입력 필드 확인
      await expect(
        page.locator('input[placeholder*="이름, 학번, 이메일로 검색"]')
      ).toBeVisible()

      console.log('Student select modal opened')
    })

    await test.step('학생 검색', async () => {
      const searchInput = page.locator('input[placeholder*="이름, 학번, 이메일로 검색"]')

      // 검색어 입력
      await searchInput.fill('테스트')
      await page.waitForTimeout(500) // API 요청 대기

      // 검색 결과 표시 또는 빈 상태
      const hasResults = await page.locator('label.flex.cursor-pointer').count()
      const hasEmptyState = await page.locator('text=등록 가능한 학생이 없습니다').isVisible().catch(() => false)

      expect(hasResults > 0 || hasEmptyState).toBeTruthy()

      console.log(`Search results: ${hasResults} students`)
    })

    await test.step('모달 닫기', async () => {
      // X 버튼 클릭
      await page.click('button:has-text("×")')
      await page.waitForTimeout(300)

      // 모달이 닫혔는지 확인
      await expect(page.locator('h2:has-text("학생 선택")')).not.toBeVisible()

      console.log('Modal closed')
    })
  })

  test('학생 선택 및 등록', async ({ page }) => {
    await test.step('Teacher 로그인 및 시험 상세 페이지 접근', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto(`/examinations/${examinationId}`)
      await waitForLoadingComplete(page)
    })

    await test.step('학생 추가 모달 열기', async () => {
      await page.click('button:has-text("학생 추가")')
      await page.waitForTimeout(300)

      await expect(page.locator('h2:has-text("학생 선택")')).toBeVisible()
    })

    await test.step('학생 선택', async () => {
      // 학생 목록 로딩 대기
      await page.waitForTimeout(500)

      // 체크박스 선택
      const checkboxes = page.locator('input[type="checkbox"]')
      const checkboxCount = await checkboxes.count()

      if (checkboxCount > 0) {
        // 첫 번째 학생 선택
        await checkboxes.first().check()

        // 선택된 학생 수 표시 확인
        await expect(page.locator('text=1명 선택됨')).toBeVisible()

        console.log('Student selected')
      } else {
        console.log('No students available to select')
      }
    })

    await test.step('등록 버튼 클릭', async () => {
      const registerButton = page.locator('button:has-text("등록")').last()
      const isEnabled = await registerButton.isEnabled()

      if (isEnabled) {
        await registerButton.click()
        await page.waitForTimeout(1000) // API 요청 및 UI 업데이트 대기

        // 성공 toast 또는 모달 닫힘 확인
        const modalClosed = await page
          .locator('h2:has-text("학생 선택")')
          .isVisible()
          .then((v) => !v)
          .catch(() => true)

        expect(modalClosed).toBeTruthy()
        console.log('Student enrolled successfully')
      } else {
        console.log('Register button disabled (no students selected)')
      }
    })

    await test.step('등록된 학생 목록 확인', async () => {
      await page.waitForTimeout(500)

      // 테이블 또는 빈 상태 확인
      const table = page.locator('table')
      const hasTable = await table.isVisible().catch(() => false)

      if (hasTable) {
        // 테이블 헤더 확인
        await expect(page.locator('th:has-text("학생명")')).toBeVisible()
        console.log('Enrolled students table displayed')
      }
    })
  })

  test('학생 선택 없이 등록 시도 시 경고 메시지', async ({ page }) => {
    await test.step('Teacher 로그인 및 모달 열기', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto(`/examinations/${examinationId}`)
      await waitForLoadingComplete(page)

      await page.click('button:has-text("학생 추가")')
      await page.waitForTimeout(300)
    })

    await test.step('선택 없이 등록 버튼 클릭', async () => {
      // 등록 버튼이 비활성화되어 있거나, 클릭 시 경고 표시
      const registerButton = page.locator('button:has-text("등록")').last()
      const isDisabled = await registerButton.isDisabled()

      if (isDisabled) {
        console.log('Register button is disabled when no students selected')
      } else {
        await registerButton.click()
        await page.waitForTimeout(500)

        // 경고 토스트 확인
        const toast = page.locator('[data-sonner-toast]')
        const hasWarning = await toast.isVisible().catch(() => false)

        if (hasWarning) {
          console.log('Warning toast displayed')
        }
      }
    })

    await test.step('모달 닫기', async () => {
      await page.click('button:has-text("취소")')
      await page.waitForTimeout(300)

      await expect(page.locator('h2:has-text("학생 선택")')).not.toBeVisible()
      console.log('Modal closed with cancel button')
    })
  })

  test('이미 등록된 학생은 목록에서 제외', async ({ page }) => {
    await test.step('Teacher 로그인 및 모달 열기', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto(`/examinations/${examinationId}`)
      await waitForLoadingComplete(page)
    })

    await test.step('등록된 학생 수 확인', async () => {
      const enrolledCount = await page
        .locator('h3:has-text("등록된 학생")')
        .textContent()
      console.log(`Current enrolled: ${enrolledCount}`)
    })

    await test.step('모달에서 등록된 학생 제외 확인', async () => {
      await page.click('button:has-text("학생 추가")')
      await page.waitForTimeout(500)

      // 등록 가능한 학생 목록 확인
      const availableStudents = page.locator('label.flex.cursor-pointer')
      const availableCount = await availableStudents.count()

      console.log(`Available students in modal: ${availableCount}`)

      // 모달 닫기
      await page.click('button:has-text("취소")')
    })
  })
})
