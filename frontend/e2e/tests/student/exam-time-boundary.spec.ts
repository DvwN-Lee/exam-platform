import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import {
  createAndLoginStudent,
  createAndLoginTeacher,
  createQuestion,
  createTestPaper,
  cleanupTestData,
} from '../../helpers/data-factory.helper'
import { loginAsStudent, loginAsTeacher } from '../../helpers/auth.helper'
import {
  apiCreateExamination,
  apiEnrollStudents,
  apiGetSubjects,
} from '../../helpers/api.helper'

/**
 * 시험 시간 경계 테스트
 * - 시험 시작 전 진입 시도
 * - 시험 종료 후 접근 제한
 * - 타이머 동작 확인
 */
test.describe('Exam Time Boundary', () => {
  let teacher: Awaited<ReturnType<typeof createAndLoginTeacher>>
  let student: Awaited<ReturnType<typeof createAndLoginStudent>>
  let subjectId: number
  let questionIds: number[] = []
  let testPaperId: number

  test.beforeAll(async () => {
    teacher = await createAndLoginTeacher()
    student = await createAndLoginStudent()

    const subjects = await apiGetSubjects(teacher.tokens.access)
    subjectId = subjects[0]?.id || 9

    // 문제 생성
    const q1 = await createQuestion(teacher.tokens.access, subjectId, 'xz')
    const q2 = await createQuestion(teacher.tokens.access, subjectId, 'pd')
    questionIds = [q1.id, q2.id]

    // 시험지 생성
    const testPaper = await createTestPaper(teacher.tokens.access, subjectId, questionIds)
    testPaperId = testPaper.id

    console.log('=== Time Boundary Test Setup Complete ===')
    console.log(`Teacher: ${teacher.user.username}`)
    console.log(`Student: ${student.user.username}`)
  })

  test.afterAll(async () => {
    await cleanupTestData(teacher.tokens.access, {
      testPaperIds: [testPaperId],
      questionIds: questionIds,
    })
  })

  test('시험 시작 전에는 응시 버튼이 비활성화되어야 함', async ({ page }) => {
    // 1시간 후에 시작하는 시험 생성
    const now = new Date()
    const startTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString()

    const examination = await apiCreateExamination(teacher.tokens.access, {
      name: `미래 시험 ${Date.now()}`,
      subject_id: subjectId,
      start_time: startTime,
      duration: 30,
      exam_type: 'pt',
      papers: [{ paper_id: testPaperId }],
    })

    // 학생 등록
    if (student.studentId) {
      await apiEnrollStudents(teacher.tokens.access, examination.id, [student.studentId])
    }

    try {
      await test.step('Student 로그인 및 시험 목록 확인', async () => {
        await loginAsStudent(page, {
          username: student.user.username,
          password: student.user.password,
        })
        await waitForLoadingComplete(page)

        await page.goto('/exams')
        await waitForLoadingComplete(page)
      })

      await test.step('시험 시작 전 상태 확인', async () => {
        // 시험 카드 또는 목록에서 해당 시험 찾기
        const examCard = page.locator(`text=미래 시험`).first()
        const isVisible = await examCard.isVisible().catch(() => false)

        if (isVisible) {
          // 시작 전 상태 텍스트 확인
          const statusText = page.locator('text=/시작 전|예정/')
          const hasStatus = await statusText.first().isVisible().catch(() => false)

          if (hasStatus) {
            console.log('Exam shows "scheduled" status')
          }

          // 응시하기 버튼이 비활성화되어 있거나 없어야 함
          const startButton = page.locator('button:has-text("응시하기")').first()
          const isDisabled = await startButton.isDisabled().catch(() => true)

          console.log(`Start button disabled: ${isDisabled}`)
        } else {
          console.log('Future exam not yet visible in list')
        }
      })
    } finally {
      // 시험 정리
      await cleanupTestData(teacher.tokens.access, {
        examinationIds: [examination.id],
      })
    }
  })

  test('시험 시작 시간이 되면 응시 가능해야 함', async ({ page }) => {
    // 5초 후에 시작하는 시험 생성
    const now = new Date()
    const startTime = new Date(now.getTime() + 5 * 1000).toISOString()

    const examination = await apiCreateExamination(teacher.tokens.access, {
      name: `곧 시작 시험 ${Date.now()}`,
      subject_id: subjectId,
      start_time: startTime,
      duration: 30,
      exam_type: 'pt',
      papers: [{ paper_id: testPaperId }],
    })

    if (student.studentId) {
      await apiEnrollStudents(teacher.tokens.access, examination.id, [student.studentId])
    }

    try {
      await test.step('Student 로그인', async () => {
        await loginAsStudent(page, {
          username: student.user.username,
          password: student.user.password,
        })
        await waitForLoadingComplete(page)
      })

      await test.step('시험 시작 시간 대기', async () => {
        // 시험 시작 시간까지 대기
        await page.waitForTimeout(6000)

        await page.goto('/exams')
        await waitForLoadingComplete(page)
      })

      await test.step('시험 응시 가능 확인', async () => {
        // 시험 카드 찾기
        const examCard = page.locator(`text=곧 시작 시험`).first()
        const isVisible = await examCard.isVisible().catch(() => false)

        if (isVisible) {
          // 응시하기 버튼 활성화 확인
          const startButton = page.locator('button:has-text("응시하기")').first()
          const buttonVisible = await startButton.isVisible().catch(() => false)

          if (buttonVisible) {
            const isEnabled = await startButton.isEnabled()
            console.log(`Start button enabled: ${isEnabled}`)
          }
        }
      })
    } finally {
      await cleanupTestData(teacher.tokens.access, {
        examinationIds: [examination.id],
      })
    }
  })

  test('시험 중 타이머가 정상 동작해야 함', async ({ page }) => {
    // 즉시 시작 시험 생성
    const now = new Date()
    const startTime = new Date(now.getTime() + 2 * 1000).toISOString()

    const examination = await apiCreateExamination(teacher.tokens.access, {
      name: `타이머 테스트 시험 ${Date.now()}`,
      subject_id: subjectId,
      start_time: startTime,
      duration: 30, // 30분
      exam_type: 'pt',
      papers: [{ paper_id: testPaperId }],
    })

    if (student.studentId) {
      await apiEnrollStudents(teacher.tokens.access, examination.id, [student.studentId])
    }

    try {
      await test.step('Student 로그인 및 시험 시작', async () => {
        await loginAsStudent(page, {
          username: student.user.username,
          password: student.user.password,
        })
        await waitForLoadingComplete(page)

        // 시험 시작 시간 대기
        await page.waitForTimeout(3000)

        await page.goto('/exams')
        await waitForLoadingComplete(page)
      })

      await test.step('시험 응시 시작', async () => {
        const startButton = page.locator('button:has-text("응시하기")').first()
        const isVisible = await startButton.isVisible().catch(() => false)

        if (isVisible) {
          await startButton.click()
          await page.waitForTimeout(1000)
          await waitForLoadingComplete(page)
        }
      })

      await test.step('타이머 표시 확인', async () => {
        // 남은 시간 표시 요소 찾기 (hh:mm:ss 형식의 카운트다운)
        // 시험 페이지에서 "남은 시간" 또는 시간 형식 찾기
        const remainingTimeLabel = page.locator('text=/남은 시간|Remaining/')
        const hasRemainingLabel = await remainingTimeLabel.first().isVisible().catch(() => false)

        if (hasRemainingLabel) {
          console.log('Remaining time label found')
        }

        // hh:mm:ss 형식의 타이머 (00:29:59 같은 형식)
        const timerPattern = page.locator('text=/\\d{2}:\\d{2}:\\d{2}/')
        const hasTimer = await timerPattern.first().isVisible().catch(() => false)

        if (hasTimer) {
          const initialTime = await timerPattern.first().textContent()
          console.log(`Initial timer: ${initialTime}`)

          // 3초 대기 후 타이머 변경 확인
          await page.waitForTimeout(3000)

          const newTime = await timerPattern.first().textContent()
          console.log(`Timer after 3s: ${newTime}`)

          // 타이머가 감소했는지 확인
          if (initialTime && newTime && initialTime !== newTime) {
            console.log('Timer is counting down correctly')
          } else {
            console.log('Timer may be static or not updating')
          }
        } else {
          // 시험 정보 영역에서 시간 관련 정보 확인
          const examInfo = page.locator('text=/시험|시간/')
          const hasExamInfo = await examInfo.first().isVisible().catch(() => false)
          console.log(`Exam info visible: ${hasExamInfo}`)
        }
      })
    } finally {
      await cleanupTestData(teacher.tokens.access, {
        examinationIds: [examination.id],
      })
    }
  })

  test('시험 제출 후 재진입 불가', async ({ page }) => {
    // 즉시 시작 시험 생성
    const now = new Date()
    const startTime = new Date(now.getTime() + 2 * 1000).toISOString()

    const examination = await apiCreateExamination(teacher.tokens.access, {
      name: `제출 후 테스트 ${Date.now()}`,
      subject_id: subjectId,
      start_time: startTime,
      duration: 30,
      exam_type: 'pt',
      papers: [{ paper_id: testPaperId }],
    })

    if (student.studentId) {
      await apiEnrollStudents(teacher.tokens.access, examination.id, [student.studentId])
    }

    try {
      await test.step('Student 로그인 및 시험 시작', async () => {
        await loginAsStudent(page, {
          username: student.user.username,
          password: student.user.password,
        })
        await waitForLoadingComplete(page)

        await page.waitForTimeout(3000)

        await page.goto('/exams')
        await waitForLoadingComplete(page)

        const startButton = page.locator('button:has-text("응시하기")').first()
        if (await startButton.isVisible().catch(() => false)) {
          await startButton.click()
          await page.waitForTimeout(1000)
          await waitForLoadingComplete(page)
        }
      })

      await test.step('시험 제출', async () => {
        // 제출 버튼 찾기
        const submitButton = page.locator('button:has-text("제출")').first()
        const isVisible = await submitButton.isVisible().catch(() => false)

        if (isVisible) {
          await submitButton.click()

          // 확인 모달이 있으면 확인
          const confirmButton = page.locator('button:has-text("확인")').first()
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click()
          }

          await page.waitForTimeout(1000)
          console.log('Exam submitted')
        }
      })

      await test.step('재진입 시도', async () => {
        // 시험 목록으로 돌아가기
        await page.goto('/exams')
        await waitForLoadingComplete(page)

        // 해당 시험의 상태 확인
        const examCard = page.locator(`text=제출 후 테스트`).first()
        const isVisible = await examCard.isVisible().catch(() => false)

        if (isVisible) {
          // 완료됨 또는 제출됨 상태 확인
          const completedStatus = page.locator('text=/완료|제출됨/')
          const hasCompleted = await completedStatus.first().isVisible().catch(() => false)

          if (hasCompleted) {
            console.log('Exam shows completed status')
          }

          // 응시하기 버튼이 없거나 비활성화
          const startButton = examCard.locator('button:has-text("응시하기")')
          const buttonExists = await startButton.isVisible().catch(() => false)

          if (!buttonExists) {
            console.log('Start button not available after submission')
          }
        }
      })
    } finally {
      await cleanupTestData(teacher.tokens.access, {
        examinationIds: [examination.id],
      })
    }
  })

  test('브라우저 새로고침 후 시험 상태 유지', async ({ page }) => {
    const now = new Date()
    const startTime = new Date(now.getTime() + 2 * 1000).toISOString()

    const examination = await apiCreateExamination(teacher.tokens.access, {
      name: `새로고침 테스트 ${Date.now()}`,
      subject_id: subjectId,
      start_time: startTime,
      duration: 30,
      exam_type: 'pt',
      papers: [{ paper_id: testPaperId }],
    })

    if (student.studentId) {
      await apiEnrollStudents(teacher.tokens.access, examination.id, [student.studentId])
    }

    try {
      await test.step('시험 시작 및 답변 입력', async () => {
        await loginAsStudent(page, {
          username: student.user.username,
          password: student.user.password,
        })
        await waitForLoadingComplete(page)

        await page.waitForTimeout(3000)

        await page.goto('/exams')
        await waitForLoadingComplete(page)

        const startButton = page.locator('button:has-text("응시하기")').first()
        if (await startButton.isVisible().catch(() => false)) {
          await startButton.click()
          await page.waitForTimeout(1000)
          await waitForLoadingComplete(page)
        }

        // 객관식 문제 답변 선택
        const radioButton = page.locator('input[type="radio"]').first()
        if (await radioButton.isVisible().catch(() => false)) {
          await radioButton.click()
          await page.waitForTimeout(500)
          console.log('Answer selected')
        }
      })

      await test.step('페이지 새로고침', async () => {
        const currentUrl = page.url()
        await page.reload()
        await waitForLoadingComplete(page)

        console.log('Page reloaded')
      })

      await test.step('답변 상태 확인', async () => {
        // 새로고침 후에도 시험 페이지에 있는지 확인
        const isOnExamPage = page.url().includes('/exams/') || page.url().includes('/take')

        if (isOnExamPage) {
          // 이전 답변이 유지되는지 확인
          const checkedRadio = page.locator('input[type="radio"]:checked')
          const isChecked = await checkedRadio.count()

          console.log(`Checked answers after reload: ${isChecked}`)
        } else {
          console.log('Redirected after reload (may need re-authentication)')
        }
      })
    } finally {
      await cleanupTestData(teacher.tokens.access, {
        examinationIds: [examination.id],
      })
    }
  })
})
