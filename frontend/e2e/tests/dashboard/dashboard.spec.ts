import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import {
  createAndLoginStudent,
  createAndLoginTeacher,
} from '../../helpers/data-factory.helper'
import { loginAsStudent, loginAsTeacher } from '../../helpers/auth.helper'

/**
 * Dashboard 통합 테스트
 */
test.describe('Dashboard', () => {
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

  test.describe('Student Dashboard', () => {
    test('Student Dashboard가 렌더링되어야 함', async ({ page }) => {
      await test.step('Student 로그인', async () => {
        await loginAsStudent(page, {
          username: student.user.username,
          password: student.user.password,
        })
        await waitForLoadingComplete(page)
      })

      await test.step('Dashboard 페이지 확인', async () => {
        await page.goto('/dashboard')
        await waitForLoadingComplete(page)

        // 페이지 제목 확인
        await expect(page.locator('h1:has-text("학생 대시보드")')).toBeVisible()

        // 부제목 확인
        await expect(
          page.locator('text=학습 현황을 한눈에 확인하세요')
        ).toBeVisible()

        console.log('✓ Student Dashboard rendered')
      })

      await test.step('통계 카드 확인', async () => {
        // 통계 카드들 (class로 구별)
        const statsCards = page.locator('.rounded-lg.border.bg-card')
        const count = await statsCards.count()
        expect(count).toBeGreaterThanOrEqual(3)

        // 완료한 시험 카드 (정확한 텍스트)
        await expect(page.getByText('완료한 시험', { exact: true })).toBeVisible()

        // 평균 점수 카드
        await expect(page.getByText('평균 점수', { exact: true })).toBeVisible()

        // 예정된 시험 카드 (정확한 텍스트)
        await expect(page.getByText('예정된 시험', { exact: true })).toBeVisible()

        console.log('✓ Statistics cards displayed')
      })

      await test.step('섹션 확인', async () => {
        // 최근 시험 성적 섹션
        await expect(page.locator('h2:has-text("최근 시험 성적")')).toBeVisible()

        // 응시 예정 시험 섹션
        await expect(page.locator('h2:has-text("응시 예정 시험")')).toBeVisible()

        console.log('✓ Dashboard sections displayed')
      })

      await test.step('버튼 동작 확인', async () => {
        // 시험 보러 가기 버튼
        await expect(
          page.locator('button:has-text("시험 보러 가기")')
        ).toBeVisible()

        // 전체 보기 버튼들
        const viewAllButtons = page.locator('button:has-text("전체 보기")')
        const count = await viewAllButtons.count()
        expect(count).toBeGreaterThan(0)

        console.log('✓ Dashboard buttons visible')
      })
    })

    test('Student Dashboard에서 시험 목록으로 이동', async ({ page }) => {
      await loginAsStudent(page, {
        username: student.user.username,
        password: student.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/dashboard')
      await waitForLoadingComplete(page)

      // 시험 보러 가기 버튼 클릭
      await page.click('button:has-text("시험 보러 가기")')
      await page.waitForURL('/exams')
      await waitForLoadingComplete(page)

      console.log('✓ Navigated to exams page')
    })
  })

  test.describe('Teacher Dashboard', () => {
    test('Teacher Dashboard가 렌더링되어야 함', async ({ page }) => {
      await test.step('Teacher 로그인', async () => {
        await loginAsTeacher(page, {
          username: teacher.user.username,
          password: teacher.user.password,
        })
        await waitForLoadingComplete(page)
      })

      await test.step('Dashboard 페이지 확인', async () => {
        await page.goto('/dashboard')
        await waitForLoadingComplete(page)

        // 환영 메시지 확인 (교수님 환영 메시지)
        await expect(page.locator('h1:has-text("환영합니다")')).toBeVisible()

        console.log('✓ Teacher Dashboard rendered')
      })

      await test.step('통계 카드 확인', async () => {
        // 통계 카드들 확인
        const statsCards = page.locator('.rounded-lg.border.bg-card')
        const count = await statsCards.count()
        expect(count).toBeGreaterThanOrEqual(4)

        // 생성한 문제 카드 (정확한 텍스트)
        await expect(page.getByText('생성한 문제', { exact: true })).toBeVisible()

        // 시험지 수 카드
        await expect(page.getByText('시험지 수', { exact: true })).toBeVisible()

        // 총 응시자 카드
        await expect(page.getByText('총 응시자', { exact: true })).toBeVisible()

        // 평균 점수 카드 (div 내부의 것만 선택)
        await expect(
          page.locator('div.text-sm.font-medium.text-muted-foreground:has-text("평균 점수")')
        ).toBeVisible()

        console.log('✓ Statistics cards displayed')
      })

      await test.step('차트 섹션 확인', async () => {
        // 문제 유형 분포 차트
        await expect(page.locator('h2:has-text("문제 유형 분포")')).toBeVisible()

        // 문제 난이도 분포 차트
        await expect(page.locator('h2:has-text("문제 난이도 분포")')).toBeVisible()

        console.log('✓ Chart sections displayed')
      })

      await test.step('활동 및 데이터 섹션 확인', async () => {
        // 최근 생성한 문제 섹션
        await expect(page.locator('h2:has-text("최근 생성한 문제")')).toBeVisible()

        // 진행 중인 시험 섹션
        await expect(page.locator('h2:has-text("진행 중인 시험")')).toBeVisible()

        // 최근 제출된 시험 섹션
        await expect(page.locator('h2:has-text("최근 제출된 시험")')).toBeVisible()

        console.log('✓ Activity and data sections displayed')
      })

      await test.step('버튼 동작 확인', async () => {
        // 문제 추가 버튼
        await expect(page.locator('button:has-text("+ 문제 추가")')).toBeVisible()

        // 시험 생성 버튼
        await expect(page.locator('button:has-text("시험 생성")')).toBeVisible()

        console.log('✓ Teacher Dashboard buttons visible')
      })
    })

    test('Teacher Dashboard에서 문제 추가 페이지로 이동', async ({ page }) => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/dashboard')
      await waitForLoadingComplete(page)

      // 문제 추가 버튼 클릭
      await page.click('button:has-text("+ 문제 추가")')
      await page.waitForURL('/questions/new')
      await waitForLoadingComplete(page)

      console.log('✓ Navigated to new question page')
    })

    test('Teacher Dashboard에서 시험 생성 페이지로 이동', async ({ page }) => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/dashboard')
      await waitForLoadingComplete(page)

      // 시험 생성 버튼 클릭
      await page.click('button:has-text("시험 생성")')
      await page.waitForURL('/examinations/new')
      await waitForLoadingComplete(page)

      console.log('✓ Navigated to new examination page')
    })

    test('Teacher Dashboard에서 문제 목록으로 이동', async ({ page }) => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/dashboard')
      await waitForLoadingComplete(page)

      // 최근 생성한 문제 섹션의 전체 보기 버튼 클릭
      const questionsSection = page.locator('h2:has-text("최근 생성한 문제")').locator('..')
      await questionsSection.locator('button:has-text("전체 보기")').click()
      await page.waitForURL('/questions')
      await waitForLoadingComplete(page)

      console.log('✓ Navigated to questions page')
    })

    test('Teacher Dashboard에서 시험 목록으로 이동', async ({ page }) => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/dashboard')
      await waitForLoadingComplete(page)

      // 진행 중인 시험 섹션의 전체 보기 버튼 클릭
      const examsSection = page.locator('h2:has-text("진행 중인 시험")').locator('..')
      await examsSection.locator('button:has-text("전체 보기")').click()
      await page.waitForURL('/examinations')
      await waitForLoadingComplete(page)

      console.log('✓ Navigated to examinations page')
    })
  })
})
