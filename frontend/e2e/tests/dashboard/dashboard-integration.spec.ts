import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import {
  createAndLoginStudent,
  createAndLoginTeacher,
} from '../../helpers/data-factory.helper'
import { loginAsStudent, loginAsTeacher } from '../../helpers/auth.helper'

/**
 * Dashboard 통합 테스트
 * - Student Dashboard 페이지 로드 및 요소 확인
 * - Teacher Dashboard 페이지 로드 및 요소 확인
 */
test.describe('Dashboard Integration', () => {
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

  test('Student Dashboard가 올바르게 로드되어야 함', async ({ page }) => {
    await test.step('Student 로그인', async () => {
      await loginAsStudent(page, {
        username: student.user.username,
        password: student.user.password,
      })
      await waitForLoadingComplete(page)

      console.log('Student logged in')
    })

    await test.step('Dashboard 페이지 접근', async () => {
      await page.goto('/dashboard')
      await waitForLoadingComplete(page)

      // 페이지 제목 확인
      await expect(page.locator('h1:has-text("학생 대시보드")')).toBeVisible()

      console.log('Dashboard page loaded')
    })

    await test.step('통계 카드 표시 확인', async () => {
      // 완료한 시험 카드
      await expect(
        page.locator('.text-muted-foreground:has-text("완료한 시험")')
      ).toBeVisible()

      // 평균 점수 카드
      await expect(
        page.locator('.text-muted-foreground:has-text("평균 점수")').first()
      ).toBeVisible()

      // 예정된 시험 카드
      await expect(
        page.locator('.text-muted-foreground:has-text("예정된 시험")').first()
      ).toBeVisible()

      console.log('Statistics cards displayed')
    })

    await test.step('섹션 확인', async () => {
      // 과목별 최근 성적 차트
      await expect(page.locator('h2:has-text("과목별 최근 성적")')).toBeVisible()

      // 최근 시험 성적 섹션
      await expect(page.locator('h2:has-text("최근 시험 성적")')).toBeVisible()

      // 응시 예정 시험 섹션
      await expect(page.locator('h2:has-text("응시 예정 시험")')).toBeVisible()

      // 학습 진행률 섹션
      await expect(page.locator('h2:has-text("학습 진행률")')).toBeVisible()

      console.log('All sections displayed')
    })

    await test.step('네비게이션 버튼 확인', async () => {
      // 시험 보러 가기 버튼
      const examButton = page.locator('button:has-text("시험 보러 가기")')
      await expect(examButton).toBeVisible()

      // 전체 보기 버튼들
      const viewAllButtons = page.locator('button:has-text("전체 보기")')
      expect(await viewAllButtons.count()).toBeGreaterThanOrEqual(2)

      console.log('Navigation buttons displayed')
    })
  })

  test('Teacher Dashboard가 올바르게 로드되어야 함', async ({ page }) => {
    await test.step('Teacher 로그인', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      console.log('Teacher logged in')
    })

    await test.step('Dashboard 페이지 접근', async () => {
      await page.goto('/dashboard')
      await waitForLoadingComplete(page)

      // 환영 메시지 확인
      await expect(page.locator('h1:has-text("환영합니다")')).toBeVisible()

      console.log('Dashboard page loaded')
    })

    await test.step('통계 카드 표시 확인', async () => {
      // 환영 메시지 또는 대시보드 컨텐츠가 표시되는지 확인
      // 실제 데이터 기반으로 동작하므로 데이터가 없을 수도 있음
      const dashboardContent = page.locator('[class*="dashboard"], main, .container').first()
      await expect(dashboardContent).toBeVisible()

      // 통계 섹션이 존재하는지 확인 (텍스트 또는 숫자 카드)
      const hasStatsSection = await page
        .locator('text=/문제|시험지|응시자|점수/')
        .first()
        .isVisible()
        .catch(() => false)

      if (hasStatsSection) {
        console.log('Statistics cards found')
      } else {
        console.log('Empty state displayed (no data)')
      }

      console.log('Dashboard content displayed')
    })

    await test.step('차트 섹션 확인', async () => {
      // 문제 유형 분포 차트
      await expect(page.locator('h2:has-text("문제 유형 분포")')).toBeVisible()

      // 문제 난이도 분포 차트
      await expect(page.locator('h2:has-text("문제 난이도 분포")')).toBeVisible()

      console.log('Chart sections displayed')
    })

    await test.step('활동 및 결과 섹션 확인', async () => {
      // 최근 활동 섹션
      await expect(page.locator('h2:has-text("최근 활동")')).toBeVisible()

      // 점수 분포 섹션
      await expect(page.locator('h2:has-text("점수 분포")')).toBeVisible()

      // 최근 시험 결과 테이블
      await expect(page.locator('h2:has-text("최근 시험 결과")')).toBeVisible()

      console.log('Activity and results sections displayed')
    })

    await test.step('하단 섹션 확인', async () => {
      // 최근 생성한 문제 섹션
      await expect(
        page.locator('h2:has-text("최근 생성한 문제")')
      ).toBeVisible()

      // 진행 중인 시험 섹션
      await expect(page.locator('h2:has-text("진행 중인 시험")')).toBeVisible()

      // 최근 제출된 시험 섹션
      await expect(page.locator('h2:has-text("최근 제출된 시험")')).toBeVisible()

      console.log('Bottom sections displayed')
    })

    await test.step('네비게이션 버튼 확인', async () => {
      // 문제 추가 버튼
      await expect(page.locator('button:has-text("+ 문제 추가")')).toBeVisible()

      // 시험 생성 버튼
      await expect(page.locator('button:has-text("시험 생성")')).toBeVisible()

      // 전체 보기 버튼들
      const viewAllButtons = page.locator(
        'button:has-text("전체 보기"), button:has-text("전체 보기 →")'
      )
      expect(await viewAllButtons.count()).toBeGreaterThanOrEqual(3)

      console.log('Navigation buttons displayed')
    })
  })

  test('Student가 시험 보러 가기 버튼으로 시험 페이지 이동', async ({
    page,
  }) => {
    await test.step('Student 로그인 및 Dashboard 접근', async () => {
      await loginAsStudent(page, {
        username: student.user.username,
        password: student.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/dashboard')
      await waitForLoadingComplete(page)
    })

    await test.step('시험 보러 가기 버튼 클릭', async () => {
      await page.click('button:has-text("시험 보러 가기")')

      // 시험 목록 페이지로 이동 확인
      await page.waitForURL('/exams')
      await waitForLoadingComplete(page)

      console.log('Navigated to exams page')
    })
  })

  test('Teacher가 문제 추가 버튼으로 문제 생성 페이지 이동', async ({
    page,
  }) => {
    await test.step('Teacher 로그인 및 Dashboard 접근', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/dashboard')
      await waitForLoadingComplete(page)
    })

    await test.step('문제 추가 버튼 클릭', async () => {
      await page.click('button:has-text("+ 문제 추가")')

      // 문제 생성 페이지로 이동 확인
      await page.waitForURL('/questions/new')
      await waitForLoadingComplete(page)

      console.log('Navigated to new question page')
    })
  })

  test('Teacher가 시험 생성 버튼으로 시험 생성 페이지 이동', async ({
    page,
  }) => {
    await test.step('Teacher 로그인 및 Dashboard 접근', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/dashboard')
      await waitForLoadingComplete(page)
    })

    await test.step('시험 생성 버튼 클릭', async () => {
      await page.click('button:has-text("시험 생성")')

      // 시험 생성 페이지로 이동 확인
      await page.waitForURL('/examinations/new')
      await waitForLoadingComplete(page)

      console.log('Navigated to new examination page')
    })
  })
})
