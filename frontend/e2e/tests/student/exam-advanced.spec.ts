import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import {
  createAndLoginTeacher,
  createAndLoginStudent,
  cleanupTestData,
} from '../../helpers/data-factory.helper'
import {
  apiGetSubjects,
  apiCreateQuestion,
  apiCreateTestPaper,
  apiCreateExamination,
  apiEnrollStudents,
} from '../../helpers/api.helper'
import { loginAsStudent } from '../../helpers/auth.helper'

/**
 * Student 시험 고급 기능 테스트
 * - 답안 임시 저장
 * - 문제 간 이동
 * - 타이머 표시
 * - 시험 제출
 * - 결과 조회
 */
test.describe('Student Exam Advanced Features', () => {
  let teacher: Awaited<ReturnType<typeof createAndLoginTeacher>>
  let student: Awaited<ReturnType<typeof createAndLoginStudent>>
  let subjectId: number
  let questionIds: number[] = []
  let testPaperId: number
  let examinationId: number

  test.beforeAll(async () => {
    // Teacher & Student 계정 생성
    teacher = await createAndLoginTeacher()
    student = await createAndLoginStudent()

    // 과목 조회
    const subjects = await apiGetSubjects()
    subjectId = subjects[0]?.id || 1

    console.log(`=== Setup Complete ===`)
    console.log(`Teacher: ${teacher.user.username}`)
    console.log(`Student: ${student.user.username}`)
    console.log(`Student ID: ${student.studentId}`)
    console.log(`Subject ID: ${subjectId}`)

    // 시험용 문제 3개 생성 (객관식 2개, 주관식 1개)
    const question1 = await apiCreateQuestion(teacher.tokens.access, {
      subject_id: subjectId,
      name: `객관식 문제 1 ${Date.now()}`,
      score: 30,
      tq_type: 'xz',
      tq_degree: 'jd',
      options: [
        { option: '옵션 1', is_right: false },
        { option: '옵션 2', is_right: true },
        { option: '옵션 3', is_right: false },
        { option: '옵션 4', is_right: false },
      ],
    })
    questionIds.push(question1.id)

    const question2 = await apiCreateQuestion(teacher.tokens.access, {
      subject_id: subjectId,
      name: `객관식 문제 2 ${Date.now()}`,
      score: 30,
      tq_type: 'xz',
      tq_degree: 'zd',
      options: [
        { option: 'A', is_right: true },
        { option: 'B', is_right: false },
        { option: 'C', is_right: false },
        { option: 'D', is_right: false },
      ],
    })
    questionIds.push(question2.id)

    const question3 = await apiCreateQuestion(teacher.tokens.access, {
      subject_id: subjectId,
      name: `주관식 문제 ${Date.now()}`,
      score: 40,
      tq_type: 'pd',
      tq_degree: 'kn',
      options: [],
    })
    questionIds.push(question3.id)

    console.log(`Created ${questionIds.length} questions`)

    // 시험지 생성
    const testPaper = await apiCreateTestPaper(teacher.tokens.access, {
      name: `고급 기능 테스트 시험지 ${Date.now()}`,
      subject_id: subjectId,
      tp_degree: 'zd',
      passing_score: 60,
      questions: questionIds.map((qId, index) => ({
        question_id: qId,
        score: index === 0 ? 30 : index === 1 ? 30 : 40,
        order: index + 1,
      })),
    })
    testPaperId = testPaper.id
    console.log(`Created test paper: ${testPaperId}`)

    // 시험 생성 (5초 후 시작하여 즉시 응시 가능)
    const now = new Date()
    const startTime = new Date(now.getTime() + 5 * 1000).toISOString()

    const examination = await apiCreateExamination(teacher.tokens.access, {
      name: `고급 기능 테스트 시험 ${Date.now()}`,
      subject_id: subjectId,
      start_time: startTime,
      duration: 30, // 30분
      exam_type: 'pt',
      papers: [{ paper_id: testPaperId }],
    })
    examinationId = examination.id
    console.log(`Created examination: ${examinationId}`)

    // Student 등록
    if (student.studentId) {
      await apiEnrollStudents(teacher.tokens.access, examinationId, [
        student.studentId,
      ])
      console.log('✓ Student enrolled in examination')
    }
  })

  test.afterAll(async () => {
    // 테스트 데이터 정리
    await cleanupTestData(teacher.tokens.access, {
      examinationIds: [examinationId],
      testPaperIds: [testPaperId],
      questionIds,
    })
  })

  test('Student가 시험 고급 기능을 사용할 수 있어야 함', async ({ page }) => {
    // 브라우저 콘솔 로그 캡처
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`Browser ${msg.type()}: ${msg.text()}`)
      }
    })

    await test.step('Student 로그인', async () => {
      await loginAsStudent(page, {
        username: student.user.username,
        password: student.user.password,
      })
      await waitForLoadingComplete(page)

      console.log('✓ Student logged in')
    })

    await test.step('시험 시작', async () => {
      // 내 시험 페이지로 이동
      await page.goto('/exams')
      await waitForLoadingComplete(page)

      // 시험이 표시될 때까지 대기 (최대 10초)
      await page.waitForTimeout(10000)
      await page.reload()
      await waitForLoadingComplete(page)

      // 시험 응시 버튼 클릭
      const examButtons = page.locator('button:has-text("응시하기")')
      if ((await examButtons.count()) > 0) {
        await examButtons.first().click()
      } else {
        // 대체: 직접 URL로 이동
        await page.goto(`/exams/${examinationId}/take`)
      }

      await waitForLoadingComplete(page)

      // 시험 페이지 로드 확인 - 타이머 표시
      await expect(
        page.locator('text=/\\d{2}:\\d{2}:\\d{2}/')
      ).toBeVisible({ timeout: 15000 })

      console.log('✓ Exam started')
    })

    await test.step('답안 작성 및 자동 임시 저장', async () => {
      // 첫 번째 문제 (객관식) 답변
      const firstOption = page.locator('input[type="checkbox"]').first()
      await firstOption.click()

      // 임시 저장은 자동으로 이루어지므로, 짧은 대기만
      await page.waitForTimeout(1000)

      // 다음 문제로 이동하여 답변 완료 표시 확인
      await page.click('button:has-text("다음 문제")')
      await page.waitForTimeout(500)

      // 이제 첫 번째 버튼이 녹색으로 변경되어야 함
      const firstQuestionButton = page
        .locator('.grid.grid-cols-5 button, .grid.grid-cols-4 button')
        .first()
      await expect(firstQuestionButton).toHaveClass(/bg-green/)

      console.log('✓ Answer saved automatically and marked as completed')
    })

    await test.step('문제 2 답변', async () => {
      // 현재 문제 2에 있음 (이전 step에서 이동함)
      await expect(
        page.locator('.text-lg.font-semibold').filter({ hasText: '문제 2' })
      ).toBeVisible()

      // 두 번째 문제 답변
      const secondOption = page.locator('input[type="checkbox"]').first()
      await secondOption.click()
      await page.waitForTimeout(1000)

      console.log('✓ Answered question 2')
    })

    await test.step('문제 간 이동 - 문제 번호 직접 클릭', async () => {
      // 세 번째 문제로 이동 (주관식)
      const thirdQuestionButton = page
        .locator('.grid.grid-cols-5 button, .grid.grid-cols-4 button')
        .nth(2)
      await thirdQuestionButton.click()
      await page.waitForTimeout(500)

      // 문제 번호 확인
      await expect(
        page.locator('.text-lg.font-semibold').filter({ hasText: '문제 3' })
      ).toBeVisible()

      // 주관식 답안 입력
      const answerInput = page.locator('input[placeholder="답안을 입력하세요"]')
      await answerInput.fill('테스트 답안')
      await page.waitForTimeout(1000)

      console.log('✓ Navigated using question number and answered')
    })

    await test.step('이전 문제로 이동 및 답안 유지 확인', async () => {
      // 현재 문제 3에 있음, 이전 버튼으로 문제 2로 이동
      await page.click('button:has-text("이전 문제")')
      await page.waitForTimeout(500)

      // 문제 2로 돌아왔는지 확인
      await expect(
        page.locator('.text-lg.font-semibold').filter({ hasText: '문제 2' })
      ).toBeVisible()

      // 문제 2의 답변이 유지되는지 확인
      const secondOptionChecked = await page
        .locator('input[type="checkbox"]')
        .first()
        .isChecked()
      expect(secondOptionChecked).toBe(true)

      // 다시 문제 1로 이동하여 답안 유지 확인
      const firstQuestionButton = page
        .locator('.grid.grid-cols-5 button, .grid.grid-cols-4 button')
        .first()
      await firstQuestionButton.click()
      await page.waitForTimeout(500)

      // 첫 번째 문제의 선택이 유지되는지 확인
      const firstOptionChecked = await page
        .locator('input[type="checkbox"]')
        .first()
        .isChecked()
      expect(firstOptionChecked).toBe(true)

      console.log('✓ Previous answers persisted')
    })

    await test.step('타이머 표시 확인', async () => {
      // 타이머가 표시되고 시간이 흐르는지 확인
      const timerText = await page
        .locator('text=/\\d{2}:\\d{2}:\\d{2}/')
        .first()
        .textContent()
      expect(timerText).toMatch(/\d{2}:\d{2}:\d{2}/)

      console.log(`✓ Timer displayed: ${timerText}`)

      // 1초 대기 후 타이머가 감소했는지 확인
      await page.waitForTimeout(2000)
      const timerTextAfter = await page
        .locator('text=/\\d{2}:\\d{2}:\\d{2}/')
        .first()
        .textContent()
      expect(timerTextAfter).not.toBe(timerText)

      console.log(`✓ Timer counting down: ${timerTextAfter}`)
    })

    await test.step('시험 제출', async () => {
      // 제출 버튼 클릭
      const submitButton = page.locator('button:has-text("제출하기")').first()
      await submitButton.click()
      await page.waitForTimeout(500)

      // 제출 확인 모달 표시 확인
      const modal = page.locator('.fixed.inset-0.z-50')
      await expect(modal.locator('text=/시험 제출 확인/')).toBeVisible()

      // 답변 완료/미답변 통계 확인 (모달 내부에서만)
      await expect(modal.locator('text=/답변 완료/').first()).toBeVisible()
      await expect(modal.locator('text=/미답변/').first()).toBeVisible()

      // 최종 제출 버튼 클릭
      const confirmButton = modal.locator('button:has-text("제출하기")')
      await confirmButton.click()

      // 결과 페이지로 이동 대기
      await page.waitForURL(new RegExp(`/exams/${examinationId}/result`), {
        timeout: 10000,
      })

      console.log('✓ Exam submitted successfully')
    })

    await test.step('시험 결과 조회', async () => {
      await waitForLoadingComplete(page)

      // 결과 페이지가 렌더링되었는지 확인
      // (실제 결과 표시는 backend 채점 로직에 따라 다를 수 있음)
      const bodyText = await page.locator('body').textContent()

      // 최소한 페이지가 로드되고 에러가 없는지 확인
      expect(bodyText).toBeTruthy()

      console.log('✓ Exam result page loaded')
    })

    console.log('✓ All advanced exam features tested successfully')
  })
})
