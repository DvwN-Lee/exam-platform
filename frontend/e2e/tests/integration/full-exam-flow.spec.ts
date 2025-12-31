import { test, expect } from '@playwright/test'
import {
  createFullExamFlow,
  cleanupTestData,
  setupTestEnvironment,
} from '../../helpers/data-factory.helper'
import { apiGetSubjects } from '../../helpers/api.helper'
import { loginAsStudent, loginAsTeacher } from '../../helpers/auth.helper'
import {
  expectToBeOnDashboard,
  waitForLoadingComplete,
} from '../../helpers/assertions.helper'

/**
 * 통합 E2E 테스트: Teacher가 시험을 생성하고 Student가 응시하는 전체 플로우 검증
 *
 * test.step을 사용하여 단일 브라우저 세션에서 전체 플로우를 테스트합니다.
 * 이 방식으로 인증 상태와 React State가 자연스럽게 유지됩니다.
 */
test.describe('Full Exam Flow Integration Test', () => {
  let teacher: Awaited<ReturnType<typeof setupTestEnvironment>>['teacher']
  let student: Awaited<ReturnType<typeof setupTestEnvironment>>['student']
  let examData: Awaited<ReturnType<typeof createFullExamFlow>>
  let subjectId: number

  test.beforeAll(async () => {
    console.log('=== Setting up test environment ===')

    // 1. Teacher & Student 계정 생성
    const environment = await setupTestEnvironment()
    teacher = environment.teacher
    student = environment.student

    console.log(`Teacher: ${teacher.user.username} (ID: ${teacher.userId})`)
    console.log(`Student: ${student.user.username} (ID: ${student.userId})`)

    // 2. 과목 조회 (첫 번째 과목 사용)
    const subjects = await apiGetSubjects()
    if (!subjects.results || subjects.results.length === 0) {
      throw new Error('No subjects found in database')
    }

    subjectId = subjects.results[0].id
    console.log(`Using subject: ${subjects.results[0].name} (ID: ${subjectId})`)

    // 3. Teacher가 시험 전체 플로우 생성 (문제 -> 시험지 -> 시험)
    examData = await createFullExamFlow(teacher.tokens.access, subjectId, [student.studentId])

    console.log(`Questions created: ${examData.questions.map((q) => q.id).join(', ')}`)
    console.log(`TestPaper created: ${examData.testPaper.id}`)
    console.log(`Examination created: ${examData.examination.id}`)
  })

  test.afterAll(async () => {
    // 테스트 데이터 정리
    console.log('=== Cleaning up test data ===')

    await cleanupTestData(teacher.tokens.access, {
      questionIds: examData.questions.map((q) => q.id),
      testPaperIds: [examData.testPaper.id],
      examinationIds: [examData.examination.id],
    })
  })

  test('Student가 시험 전체 과정을 완료할 수 있어야 함', async ({ page }) => {
    const examTitle = examData.examination.name

    await test.step('Dashboard에서 시험 확인', async () => {
      await loginAsStudent(page, {
        username: student.user.username,
        password: student.user.password,
      })
      await waitForLoadingComplete(page)
      await expectToBeOnDashboard(page)

      // 진행 중인 시험 섹션에서 생성된 시험 확인
      await expect(page.locator(`text=${examTitle}`)).toBeVisible()
      console.log(`✓ Exam "${examTitle}" is visible on Student Dashboard`)
    })

    await test.step('시험 시작', async () => {
      // 시험 시작 시간이 도래할 때까지 대기 (시험은 +5초 후 시작으로 생성됨)
      console.log('시험 시작 시간 대기 중...')
      await page.waitForTimeout(6000) // 6초 대기 (5초 + 1초 버퍼)

      // 시험 카드 찾기 및 시작 버튼 클릭
      const examCard = page.locator(`text=${examTitle}`).locator('..')
      const startButton = examCard.locator('button', { hasText: /시작|응시/ }).first()
      await startButton.click()

      // 시험 응시 페이지로 이동되었는지 확인
      await page.waitForURL(/\/exams\/\d+\/take/)
      await expect(page.locator('h2')).toContainText(examTitle)
      console.log(`✓ Student started exam "${examTitle}"`)
    })

    await test.step('객관식 문제에 답변', async () => {
      // 첫 번째 문제 확인 (객관식)
      const multipleChoiceQuestion = examData.questions.find((q) => q.tq_type === 'xz')
      if (!multipleChoiceQuestion) {
        throw new Error('Multiple choice question not found')
      }

      // 문제 제목이 표시되는지 확인 (text-xl 클래스를 가진 h3)
      await expect(page.locator('h3.text-xl')).toContainText(multipleChoiceQuestion.name)

      // 정답 선택 (테스트 데이터에서 option '2'가 항상 정답)
      // Label 전체를 클릭하여 checkbox가 확실히 선택되도록 함
      const optionLabel = page.locator('label', { hasText: '2' }).first()
      await optionLabel.click()

      // Save mutation이 완료될 때까지 잠시 대기
      await page.waitForTimeout(500)
      console.log(`✓ Student selected answer for multiple choice question`)
    })

    await test.step('다음 문제로 이동', async () => {
      // "다음" 버튼 클릭
      const nextButton = page.locator('button', { hasText: /다음|Next/ })
      await nextButton.click()

      // 두 번째 문제 (주관식) 제목 확인
      const shortAnswerQuestion = examData.questions.find((q) => q.tq_type === 'pd')
      if (!shortAnswerQuestion) {
        throw new Error('Short answer question not found')
      }

      await expect(page.locator('h3.text-xl')).toContainText(shortAnswerQuestion.name)
      console.log(`✓ Student navigated to next question`)
    })

    await test.step('주관식 문제에 답변', async () => {
      // 주관식 답변 입력
      const answerInput = page.locator('input[placeholder="답안을 입력하세요"]')
      await answerInput.fill('a제곱 더하기 b제곱은 c제곱이다')

      // Save mutation이 완료될 때까지 잠시 대기
      await page.waitForTimeout(500)
      console.log(`✓ Student entered answer for short answer question`)
    })

    await test.step('시험 제출', async () => {
      // Browser confirm dialog 처리 (미답변 문제가 있을 경우)
      page.on('dialog', async (dialog) => {
        console.log(`Dialog detected: ${dialog.message()}`)
        await dialog.accept()
      })

      // "제출하기" 버튼 클릭 (상단 오른쪽 버튼)
      const submitButton = page.getByRole('button', { name: '제출하기' })
      await submitButton.click()

      // 제출 확인 Modal이 표시될 때까지 대기
      await page.waitForSelector('.fixed.inset-0.z-50', { timeout: 3000 })
      console.log('Submit confirmation modal appeared')

      // Modal 내 "제출하기" 버튼 찾기 (두 번째 "제출하기" 버튼)
      const confirmButton = page.locator('.fixed.inset-0.z-50 button', { hasText: '제출하기' })
      await expect(confirmButton).toBeVisible({ timeout: 3000 })

      // 제출 API 응답 대기 (성공/실패 모두 캡처)
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes('/submit'),
        { timeout: 10000 }
      )

      await confirmButton.click()
      console.log('Modal confirmation button clicked')

      const response = await responsePromise
      const status = response.status()
      console.log(`Submit API response status: ${status}`)

      if (status !== 200) {
        const responseBody = await response.text()
        console.log(`Submit API error response: ${responseBody}`)
        throw new Error(`Submit API failed with status ${status}: ${responseBody}`)
      }

      console.log('Submit API call completed successfully')

      // 제출 완료 후 결과 페이지로 리다이렉트 대기
      await page.waitForURL(/\/exams\/\d+\/result/, { timeout: 20000 })
      console.log(`✓ Student submitted exam`)
    })

    await test.step('시험 결과 확인', async () => {
      // 로딩 완료 대기
      await page.waitForSelector('text=결과를 불러오는 중...', { state: 'hidden', timeout: 10000 })

      // 에러 메시지가 없는지 확인
      await expect(page.getByText('결과를 찾을 수 없습니다.')).not.toBeVisible()

      // 시험 결과 페이지 헤더 확인 (h1 heading으로 명확하게 선택)
      await expect(page.getByRole('heading', { name: '시험 결과' })).toBeVisible({ timeout: 5000 })

      console.log(`✓ Student viewed exam result`)
    })

    // NOTE: Teacher Dashboard는 아직 실제 backend 데이터를 fetching하지 않고 mock 데이터를 표시하므로
    // 이 단계는 Teacher Dashboard UI가 완전히 구현된 후에 활성화합니다.
    // await test.step('Teacher Dashboard에서 응시 현황 확인', async () => {
    //   await loginAsTeacher(page, {
    //     username: teacher.user.username,
    //     password: teacher.user.password,
    //   })
    //   await waitForLoadingComplete(page)
    //   await expectToBeOnDashboard(page)
    //   await expect(page.locator(`text=${examTitle}`)).toBeVisible()
    //   console.log(`✓ Teacher can view exam status on Dashboard`)
    // })
  })
})
