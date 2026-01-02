import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import {
  createFullExamFlow,
  cleanupTestData,
  createAndLoginStudent,
  createAndLoginTeacher,
} from '../../helpers/data-factory.helper'
import { apiGetSubjects } from '../../helpers/api.helper'
import { loginAsStudent } from '../../helpers/auth.helper'

/**
 * Student 시험 응시 테스트
 */
test.describe('Student Exam Taking', () => {
  let teacher: Awaited<ReturnType<typeof createAndLoginTeacher>>
  let student: Awaited<ReturnType<typeof createAndLoginStudent>>
  let examData: Awaited<ReturnType<typeof createFullExamFlow>>
  let subjectId: number

  test.beforeAll(async () => {
    // Teacher & Student 계정 생성
    teacher = await createAndLoginTeacher()
    student = await createAndLoginStudent()

    // 과목 조회
    const subjects = await apiGetSubjects()
    subjectId = subjects[0]?.id || 1

    // 시험 생성
    examData = await createFullExamFlow(teacher.tokens.access, subjectId, [student.studentId])

    console.log(`Exam created: ${examData.examination.id}`)
  })

  test.afterAll(async () => {
    // 테스트 데이터 정리
    await cleanupTestData(teacher.tokens.access, {
      questionIds: examData.questions.map((q) => q.id),
      testPaperIds: [examData.testPaper.id],
      examinationIds: [examData.examination.id],
    })
  })

  test('Dashboard에 시험이 표시되어야 함', async ({ page }) => {
    // Student로 로그인 (UI Flow 사용)
    await loginAsStudent(page, {
      username: student.user.username,
      password: student.user.password,
    })
    await waitForLoadingComplete(page)

    // Dashboard에서 시험 확인
    const examTitle = examData.examination.name
    await expect(page.locator(`text=${examTitle}`).first()).toBeVisible({ timeout: 10000 })

    console.log('✓ Exam visible on Student Dashboard')
  })

  test('내 시험 페이지에서 시험 목록을 확인할 수 있어야 함', async ({ page }) => {
    // Student로 로그인 (UI Flow 사용)
    await loginAsStudent(page, {
      username: student.user.username,
      password: student.user.password,
    })

    // 내 시험 페이지로 이동
    await page.goto('/exams')
    await waitForLoadingComplete(page)

    // 페이지 제목 확인
    await expect(page.locator('h1')).toContainText('응시 가능한 시험')

    console.log('✓ My Exams page rendered successfully')
  })

  test('시험 결과 페이지가 렌더링되어야 함', async ({ page }) => {
    // Student로 로그인 (UI Flow 사용)
    await loginAsStudent(page, {
      username: student.user.username,
      password: student.user.password,
    })

    // 성적 조회 페이지로 이동
    await page.goto('/exams/results')
    await waitForLoadingComplete(page)

    // 페이지 제목 확인
    await expect(page.locator('h1')).toContainText('내 시험 결과')

    console.log('✓ Exam Results page rendered successfully')
  })
})
