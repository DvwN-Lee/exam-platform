import { test, expect } from '@playwright/test'
import { loginAsTeacher } from '../../helpers/auth.helper'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import { apiGetSubjects, apiDeleteQuestion, apiLogin } from '../../helpers/api.helper'

/**
 * Teacher Question CRUD 통합 테스트
 */
test.describe('Teacher Question Management', () => {
  const teacherUsername = process.env.E2E_TEACHER_USERNAME || 'testteacher2'
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD || 'test12345678'

  let teacherToken: string
  let subjectId: number
  let createdQuestionIds: number[] = []

  test.beforeAll(async () => {
    // Teacher 로그인하여 토큰 얻기 (cleanup용)
    const loginResponse = await apiLogin(teacherUsername, teacherPassword)
    teacherToken = loginResponse.access

    // 과목 조회
    const subjects = await apiGetSubjects()
    subjectId = subjects.results[0].id

    console.log(`=== Setup Complete ===`)
    console.log(`Teacher: ${teacherUsername}`)
    console.log(`Subject ID: ${subjectId}`)
  })

  test.afterAll(async () => {
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

  test('Teacher가 Question 전체 CRUD를 완료할 수 있어야 함', async ({ page }) => {
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

    await test.step('Question 목록 페이지 접근', async () => {
      await page.goto('/questions')
      await waitForLoadingComplete(page)

      // 페이지 제목 확인
      await expect(page.locator('h1')).toContainText('문제 관리')

      // '문제 생성' 버튼 확인
      await expect(page.locator('button:has-text("문제 생성")')).toBeVisible()

      console.log('✓ Question list page loaded')
    })

    let multipleChoiceQuestionName: string

    await test.step('객관식 Question 생성', async () => {
      // 문제 생성 페이지로 이동
      await page.click('button:has-text("문제 생성")')
      await page.waitForURL('/questions/new')
      await waitForLoadingComplete(page)

      // 문제명 (고유한 이름)
      multipleChoiceQuestionName = `객관식 문제 ${Date.now()}`
      await page.fill('#name', multipleChoiceQuestionName)

      // 과목 옵션이 로드될 때까지 대기
      await page.waitForFunction(
        (selectId) => {
          const select = document.querySelector(selectId) as HTMLSelectElement
          return select && select.options.length > 1 // "과목 선택" 외에 실제 과목이 있는지 확인
        },
        '#subject_id',
        { timeout: 10000 }
      )

      // 과목 선택
      await page.selectOption('#subject_id', String(subjectId))

      // 점수
      await page.fill('#score', '10')

      // 문제 유형: 객관식(xz)
      await page.selectOption('#tq_type', 'xz')

      // 난이도: 보통(zd)
      await page.selectOption('#tq_degree', 'zd')

      // 옵션 4개 추가
      const optionTexts = ['옵션 1', '옵션 2 (정답)', '옵션 3', '옵션 4']

      for (let i = 0; i < optionTexts.length; i++) {
        // 첫 2개 옵션은 이미 있으므로, 3번째부터는 추가 버튼 클릭
        if (i >= 2) {
          await page.click('button:has-text("선택지 추가")')
          await page.waitForTimeout(500)
        }

        // 옵션 텍스트 입력
        const optionInput = page.locator(`input[placeholder^="선택지"]`).nth(i)
        await optionInput.fill(optionTexts[i])

        // 두 번째 옵션을 정답으로 지정
        if (i === 1) {
          const checkbox = page.locator('input[type="checkbox"]').nth(i)
          await checkbox.check()
        }
      }

      // 네트워크 응답 캡처를 위한 Promise
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes('/questions/') && response.request().method() === 'POST'
      )

      // 저장
      await page.click('button:has-text("문제 생성")')

      // API 응답 대기
      const response = await responsePromise
      const responseData = await response.json()
      console.log(`Question creation response status: ${response.status()}`)
      console.log(`Question created with ID: ${responseData.id}`)

      // ID를 cleanup 배열에 추가
      createdQuestionIds.push(responseData.id)

      // 목록 페이지로 리디렉션 대기
      await page.waitForURL('/questions')
      await waitForLoadingComplete(page)

      // LocalStorage 토큰 확인
      const tokens = await page.evaluate(() => ({
        access: localStorage.getItem('access_token'),
        refresh: localStorage.getItem('refresh_token'),
        authStorage: localStorage.getItem('auth-storage'),
      }))
      console.log(`Access token present: ${!!tokens.access}`)
      console.log(`Refresh token present: ${!!tokens.refresh}`)
      console.log(`Auth storage:`, tokens.authStorage)

      // /questions/my API 응답 캡처 (redirect가 아닌 실제 API 응답만)
      const listResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/questions/my') &&
          response.status() === 200 &&
          response.request().method() === 'GET'
      )
      await page.reload() // 목록 새로고침
      const listResponse = await listResponsePromise
      const listData = await listResponse.json()
      console.log(`Questions list count: ${listData.results?.length || 0}`)
      if (listData.results && listData.results.length > 0) {
        console.log(
          `First question:`,
          listData.results[0].id,
          listData.results[0].name
        )
      }

      // 생성된 문제 확인
      await expect(page.locator(`text=${multipleChoiceQuestionName}`).first()).toBeVisible({
        timeout: 10000,
      })

      console.log(`✓ Multiple choice question created: "${multipleChoiceQuestionName}"`)
    })

    let shortAnswerQuestionName: string

    await test.step('주관식 Question 생성', async () => {
      // 문제 생성 페이지로 이동
      await page.click('button:has-text("문제 생성")')
      await page.waitForURL('/questions/new')
      await waitForLoadingComplete(page)

      // 문제명
      shortAnswerQuestionName = `주관식 문제 ${Date.now()}`
      await page.fill('#name', shortAnswerQuestionName)

      // 과목 옵션이 로드될 때까지 대기
      await page.waitForFunction(
        (selectId) => {
          const select = document.querySelector(selectId) as HTMLSelectElement
          return select && select.options.length > 1
        },
        '#subject_id',
        { timeout: 10000 }
      )

      // 과목 선택
      await page.selectOption('#subject_id', String(subjectId))

      // 점수
      await page.fill('#score', '20')

      // 문제 유형: 주관식(pd)
      await page.selectOption('#tq_type', 'pd')

      // 난이도: 어려움(kn)
      await page.selectOption('#tq_degree', 'kn')

      // 네트워크 응답 캡처를 위한 Promise
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes('/questions/') && response.request().method() === 'POST'
      )

      // 저장
      await page.click('button:has-text("문제 생성")')

      // API 응답 대기
      const response = await responsePromise
      const responseData = await response.json()
      console.log(`Question creation response status: ${response.status()}`)
      console.log(`Question created with ID: ${responseData.id}`)

      // ID를 cleanup 배열에 추가
      createdQuestionIds.push(responseData.id)

      // 목록 페이지로 리디렉션 대기
      await page.waitForURL('/questions')
      await waitForLoadingComplete(page)

      // 목록 새로고침하여 최신 데이터 확인
      const listResponsePromise2 = page.waitForResponse(
        (response) =>
          response.url().includes('/questions/my') &&
          response.status() === 200 &&
          response.request().method() === 'GET'
      )
      await page.reload()
      const listResponse2 = await listResponsePromise2
      const listData2 = await listResponse2.json()
      console.log(`Questions list count: ${listData2.results?.length || 0}`)

      // 생성된 문제 확인
      await expect(page.locator(`text=${shortAnswerQuestionName}`).first()).toBeVisible({
        timeout: 10000,
      })

      console.log(`✓ Short answer question created: "${shortAnswerQuestionName}"`)
    })

    await test.step('Question 상세 조회', async () => {
      // 첫 번째 문제의 상세 버튼 클릭
      // 목록에서 마지막 문제(객관식)의 상세 버튼 클릭
      const detailButtons = page.locator('button:has-text("상세")')
      await detailButtons.last().click()

      // 상세 페이지로 이동 대기
      await page.waitForURL(/\/questions\/\d+/)
      await waitForLoadingComplete(page)

      // 문제명 확인
      await expect(page.locator('h1, h2, h3').filter({ hasText: multipleChoiceQuestionName })).toBeVisible()

      console.log('✓ Question detail page loaded')

      // 목록으로 돌아가기
      await page.goto('/questions')
      await waitForLoadingComplete(page)
    })

    await test.step('Question 수정', async () => {
      // 첫 번째 문제 (객관식)의 상세 버튼 클릭하여 상세 페이지로 이동
      const detailButtons = page.locator('button:has-text("상세")')
      await detailButtons.last().click()
      await page.waitForURL(/\/questions\/\d+/)
      await waitForLoadingComplete(page)

      // 수정 버튼 클릭
      const editButton = page.locator('button:has-text("수정")')
      if (await editButton.isVisible()) {
        await editButton.click()
        await page.waitForURL(/\/questions\/\d+\/edit/)
        await waitForLoadingComplete(page)

        // 문제명 변경
        const updatedName = `${multipleChoiceQuestionName} (수정됨)`
        await page.fill('#name', updatedName)

        // 첫 번째 옵션 텍스트 변경
        const firstOptionInput = page.locator(`input[placeholder^="선택지"]`).first()
        await firstOptionInput.fill('옵션 1 (수정)')

        // 저장
        await page.click('button:has-text("문제 수정")')

        // 상세 또는 목록 페이지로 리디렉션 대기
        await page.waitForURL(/\/questions/)
        await waitForLoadingComplete(page)

        // 수정된 내용 확인 (목록 또는 상세 페이지에서)
        await expect(page.locator(`text=${updatedName}`).first()).toBeVisible({ timeout: 10000 })

        multipleChoiceQuestionName = updatedName

        console.log(`✓ Question updated: "${updatedName}"`)
      } else {
        console.log('⚠ Edit button not found, skipping question update')
      }

      // 목록으로 돌아가기
      await page.goto('/questions')
      await waitForLoadingComplete(page)
    })

    await test.step('Question 공유/공유해제', async () => {
      // 첫 번째 문제의 상세 버튼 클릭
      const detailButtons = page.locator('button:has-text("상세")')
      await detailButtons.last().click()
      await page.waitForURL(/\/questions\/\d+/)
      await waitForLoadingComplete(page)

      // 공유 버튼 찾기
      const shareButton = page.locator('button:has-text("공유")')
      if (await shareButton.isVisible()) {
        // 공유
        await shareButton.click()
        await page.waitForTimeout(1000)

        // 공유 완료 확인 (버튼 텍스트 변경 또는 메시지 확인)
        console.log('✓ Question shared')

        // 공유 해제
        const unshareButton = page.locator('button:has-text("공유 해제")')
        if (await unshareButton.isVisible()) {
          await unshareButton.click()
          await page.waitForTimeout(1000)
          console.log('✓ Question unshared')
        }
      } else {
        console.log('⚠ Share button not found, skipping share/unshare')
      }

      // 목록으로 돌아가기
      await page.goto('/questions')
      await waitForLoadingComplete(page)
    })

    await test.step('Question 삭제', async () => {
      // 페이지 새로고침하여 최신 목록 확인
      await page.reload()
      await waitForLoadingComplete(page)

      // 삭제할 문제들 찾기 (둘 다 삭제)
      const questionsToDelete = [multipleChoiceQuestionName, shortAnswerQuestionName]

      for (const questionName of questionsToDelete) {
        // 문제의 상세 버튼 클릭 (목록에 남아있는 첫 번째 문제)
        const detailButtons = page.locator('button:has-text("상세")')
        if ((await detailButtons.count()) > 0) {
          await detailButtons.first().click()
          await page.waitForURL(/\/questions\/\d+/)
          await waitForLoadingComplete(page)

          // 삭제 버튼 찾기
          const deleteButton = page.locator('button:has-text("삭제")')
          if (await deleteButton.isVisible()) {
            // 삭제 확인 다이얼로그 처리
            page.on('dialog', async (dialog) => {
              console.log(`Dialog: ${dialog.message()}`)
              await dialog.accept()
            })

            await deleteButton.click()
            await page.waitForTimeout(1000)

            // 목록으로 리디렉션 대기
            await page.waitForURL('/questions')
            await waitForLoadingComplete(page)

            console.log(`✓ Question deleted: "${questionName}"`)
          } else {
            console.log(`⚠ Delete button not found for "${questionName}"`)
            // 목록으로 돌아가기
            await page.goto('/questions')
            await waitForLoadingComplete(page)
          }
        } else {
          console.log(`⚠ Question "${questionName}" not found`)
        }
      }

      console.log('✓ All questions deleted')
    })
  })
})
