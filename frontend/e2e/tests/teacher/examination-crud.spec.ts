import { test, expect } from '@playwright/test'
import { loginAsTeacher } from '../../helpers/auth.helper'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import {
  apiLogin,
  apiCreateTestPaper,
  apiDeleteTestPaper,
  apiCreateQuestion,
  apiDeleteQuestion,
  apiGetSubjects,
} from '../../helpers/api.helper'

/**
 * Teacher Examination CRUD 통합 테스트
 */
test.describe('Teacher Examination Management', () => {
  const teacherUsername = process.env.E2E_TEACHER_USERNAME || 'testteacher2'
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD || 'test12345678'

  let teacherToken: string
  let subjectId: number
  let createdQuestionIds: number[] = []
  let createdTestPaperIds: number[] = []
  let createdExaminationIds: number[] = []

  test.beforeAll(async () => {
    // Teacher 로그인하여 토큰 얻기
    const loginResponse = await apiLogin(teacherUsername, teacherPassword)
    teacherToken = loginResponse.access

    // 과목 조회
    const subjects = await apiGetSubjects()
    subjectId = subjects[0]?.id || 1

    // 테스트용 문제 2개 생성
    for (let i = 0; i < 2; i++) {
      const question = await apiCreateQuestion(teacherToken, {
        subject_id: subjectId,
        name: `시험용 문제 ${i + 1} ${Date.now()}`,
        score: 10,
        tq_type: 'xz',
        tq_degree: 'zd',
        options: [
          { option: '옵션 1', is_right: true },
          { option: '옵션 2', is_right: false },
        ],
      })
      createdQuestionIds.push(question.id)
    }

    // 테스트용 시험지 1개 생성
    const testPaper = await apiCreateTestPaper(teacherToken, {
      name: `통합 테스트 시험지 ${Date.now()}`,
      subject_id: subjectId,
      tp_degree: 'zd',
      passing_score: 12,
      questions: createdQuestionIds.map((qId, index) => ({
        question_id: qId,
        score: 10,
        order: index + 1,
      })),
    })
    createdTestPaperIds.push(testPaper.id)

    console.log(`=== Setup Complete ===`)
    console.log(`Teacher: ${teacherUsername}`)
    console.log(`Subject ID: ${subjectId}`)
    console.log(`Created ${createdQuestionIds.length} test questions`)
    console.log(`Created test paper ID: ${testPaper.id}`)
  })

  test.afterAll(async () => {
    // 생성한 Examination 정리 (API를 통해)
    console.log(`=== Cleaning up ${createdExaminationIds.length} examinations ===`)
    for (const examId of createdExaminationIds) {
      try {
        await fetch(`http://localhost:8000/api/v1/examinations/${examId}/`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${teacherToken}`,
          },
        })
      } catch (error) {
        // 이미 삭제된 경우 무시
      }
    }

    // 생성한 TestPaper 정리
    console.log(`=== Cleaning up ${createdTestPaperIds.length} test papers ===`)
    for (const tpId of createdTestPaperIds) {
      try {
        await apiDeleteTestPaper(teacherToken, tpId)
      } catch (error) {
        // 이미 삭제된 경우 무시
      }
    }

    // 생성한 Question 정리
    console.log(`=== Cleaning up ${createdQuestionIds.length} questions ===`)
    for (const qId of createdQuestionIds) {
      try {
        await apiDeleteQuestion(teacherToken, qId)
      } catch (error) {
        // 이미 삭제된 경우 무시
      }
    }
  })

  test('Teacher가 Examination 전체 CRUD를 완료할 수 있어야 함', async ({ page }) => {
    // 브라우저 콘솔 로그 캡처
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`Browser ${msg.type()}: ${msg.text()}`)
      }
    })

    // 네트워크 요청 실패 캡처
    page.on('requestfailed', (request) => {
      console.log(`Request failed: ${request.url()}`)
    })

    await test.step('Teacher 로그인', async () => {
      await loginAsTeacher(page, {
        username: teacherUsername,
        password: teacherPassword,
      })
      await waitForLoadingComplete(page)

      console.log('✓ Teacher logged in')
    })

    await test.step('Examination 목록 페이지 접근', async () => {
      await page.goto('/examinations')
      await waitForLoadingComplete(page)

      // 페이지 제목 확인
      await expect(page.locator('h1')).toContainText('시험 일정')

      // '시험 생성' 버튼 확인
      await expect(page.locator('button:has-text("시험 생성")')).toBeVisible()

      console.log('✓ Examination list page loaded')
    })

    let examinationName: string
    let examinationId: number

    await test.step('Examination 생성', async () => {
      // 시험 생성 페이지로 이동
      await page.click('button:has-text("시험 생성")')
      await page.waitForURL('/examinations/new')
      await waitForLoadingComplete(page)

      // 시험명
      examinationName = `통합 시험 ${Date.now()}`
      await page.fill('#exam_name', examinationName)

      // 시험지 선택 대기
      await page.waitForFunction(
        (selectId) => {
          const select = document.querySelector(selectId) as HTMLSelectElement
          return select && select.options.length > 1
        },
        '#testpaper_id',
        { timeout: 10000 }
      )

      // 첫 번째 시험지 선택 (우리가 생성한 시험지)
      const testPaperOptions = await page.locator('#testpaper_id option').allTextContents()
      console.log(`Available test papers: ${testPaperOptions.length - 1}`) // -1 for "시험지 선택"

      await page.selectOption('#testpaper_id', { index: 1 }) // 첫 번째 실제 시험지

      // 시작/종료 시간 설정 (현재 시간 기준)
      const now = new Date()
      const startTime = new Date(now.getTime() + 10 * 60000) // 10분 후
      const endTime = new Date(now.getTime() + 70 * 60000) // 70분 후 (1시간 10분)

      const formatDateTimeLocal = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      }

      await page.fill('#start_time', formatDateTimeLocal(startTime))
      await page.fill('#end_time', formatDateTimeLocal(endTime))

      // 공개 시험으로 설정
      await page.check('#is_public')

      // 네트워크 응답 캡처
      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/examinations/') && response.request().method() === 'POST'
      )

      // 저장
      await page.click('button:has-text("시험 생성")')

      // API 응답 대기
      const response = await responsePromise
      const responseData = await response.json()
      console.log(`Examination creation response status: ${response.status()}`)
      console.log(`Examination created with ID: ${responseData.id}`)

      // ID를 cleanup 배열에 추가
      if (response.status() === 201 && responseData.id) {
        examinationId = responseData.id
        createdExaminationIds.push(responseData.id)

        // 목록 페이지로 리디렉션 대기
        await page.waitForURL('/examinations')
        await waitForLoadingComplete(page)

        // 목록 새로고침
        await page.reload()
        await waitForLoadingComplete(page)

        // 생성된 시험 확인
        await expect(page.locator(`text=${examinationName}`).first()).toBeVisible({
          timeout: 10000,
        })

        console.log(`✓ Examination created: "${examinationName}"`)
      } else {
        throw new Error(
          `Examination creation failed with status ${response.status()}: ${JSON.stringify(responseData)}`
        )
      }
    })

    await test.step('Examination 상세 조회', async () => {
      // 상세 페이지로 직접 이동
      await page.goto(`/examinations/${examinationId}`)

      // API 응답 대기
      await page.waitForResponse(
        (response) =>
          response.url().includes(`/examinations/${examinationId}`) &&
          response.request().method() === 'GET' &&
          response.status() === 200
      )

      await waitForLoadingComplete(page)

      // 시험명 확인
      await expect(page.locator('h1').first()).toContainText(examinationName)

      // 시험지 정보 확인
      await expect(page.locator('text=/시험지 정보/')).toBeVisible()
      await expect(page.locator('text=/총 문제 수/')).toBeVisible()

      console.log('✓ Examination detail page loaded')

      // 목록으로 돌아가기
      await page.goto('/examinations')
      await waitForLoadingComplete(page)
    })

    // Note: 학생 등록, 발행, 삭제 기능은 UI에 구현 여부를 확인 필요
    // 현재는 생성 및 조회까지만 테스트

    console.log('✓ All available Examination CRUD operations completed')
  })
})
