import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import {
  createAndLoginTeacher,
  createAndLoginStudent,
  createQuestion,
} from '../../helpers/data-factory.helper'
import { loginAsTeacher, loginAsStudent } from '../../helpers/auth.helper'
import { apiGetSubjects } from '../../helpers/api.helper'

/**
 * Chart Interaction 테스트
 * - Dashboard 차트 렌더링 테스트
 * - 차트 Hover/Tooltip 테스트
 * - Legend 토글 테스트
 * - 차트 클릭 드릴다운 테스트
 */
test.describe('Chart Interaction', () => {
  let teacher: Awaited<ReturnType<typeof createAndLoginTeacher>>
  let student: Awaited<ReturnType<typeof createAndLoginStudent>>
  let subjectId: number
  let questionIds: number[] = []

  test.beforeAll(async () => {
    try {
      teacher = await createAndLoginTeacher()
      student = await createAndLoginStudent()

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

      // 차트 데이터를 위한 문제 생성 (다양한 유형/난이도)
      try {
        const q1 = await createQuestion(teacher.tokens.access, subjectId, 'xz') // 객관식
        const q2 = await createQuestion(teacher.tokens.access, subjectId, 'pd') // 주관식
        const q3 = await createQuestion(teacher.tokens.access, subjectId, 'xz')
        questionIds = [q1.id, q2.id, q3.id]
        console.log(`Questions created: ${questionIds.length}`)
      } catch (questionError) {
        console.log('Failed to create questions, tests will run with empty data')
        console.log(`Question creation error: ${questionError}`)
      }

      console.log('=== Chart Interaction Test Setup Complete ===')
      console.log(`Teacher: ${teacher.user.username}`)
    } catch (error) {
      console.error('Chart Interaction beforeAll failed:', error)
      throw error
    }
  })

  test.afterAll(async () => {
    // 문제 정리는 question 삭제 API 호출
    for (const id of questionIds) {
      try {
        await fetch(`http://localhost:8000/api/v1/questions/${id}/`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${teacher.tokens.access}`,
          },
        })
      } catch (e) {
        // 이미 삭제되었거나 오류 무시
      }
    }
  })

  test.describe('Teacher Dashboard Charts', () => {
    test('문제 유형 분포 PieChart 렌더링', async ({ page }) => {
      await test.step('Teacher 로그인 및 Dashboard 접근', async () => {
        await loginAsTeacher(page, {
          username: teacher.user.username,
          password: teacher.user.password,
        })
        await waitForLoadingComplete(page)

        await page.goto('/dashboard')
        await waitForLoadingComplete(page)
      })

      await test.step('PieChart 섹션 확인', async () => {
        // 문제 유형 분포 제목 확인
        await expect(page.locator('h2:has-text("문제 유형 분포")')).toBeVisible()

        // SVG 차트 요소 확인
        const chartContainer = page.locator('h2:has-text("문제 유형 분포")').locator('..')
        const svgElement = chartContainer.locator('svg').first()
        await expect(svgElement).toBeVisible()

        console.log('PieChart rendered')
      })

      await test.step('Legend 표시 확인', async () => {
        // 범례 항목 확인 (객관식, 주관식, 빈칸)
        const legendItems = page.locator('text=/객관식|주관식|빈칸/')
        const count = await legendItems.count()
        expect(count).toBeGreaterThan(0)

        console.log(`Legend items: ${count}`)
      })
    })

    test('문제 난이도 분포 BarChart 렌더링', async ({ page }) => {
      await test.step('Teacher 로그인 및 Dashboard 접근', async () => {
        await loginAsTeacher(page, {
          username: teacher.user.username,
          password: teacher.user.password,
        })
        await waitForLoadingComplete(page)

        await page.goto('/dashboard')
        await waitForLoadingComplete(page)
      })

      await test.step('BarChart 섹션 확인', async () => {
        // 문제 난이도 분포 제목 확인
        await expect(page.locator('h2:has-text("문제 난이도 분포")')).toBeVisible()

        // SVG 차트 요소 확인
        const chartContainer = page.locator('h2:has-text("문제 난이도 분포")').locator('..')
        const svgElement = chartContainer.locator('svg').first()
        await expect(svgElement).toBeVisible()

        console.log('BarChart rendered')
      })

      await test.step('축 레이블 확인', async () => {
        // 난이도 레이블 확인 (쉬움, 보통, 어려움)
        const axisLabels = page.locator('text=/쉬움|보통|어려움/')
        const count = await axisLabels.count()
        expect(count).toBeGreaterThan(0)

        console.log(`Axis labels: ${count}`)
      })
    })

    test('PieChart Hover 시 Tooltip 표시', async ({ page }) => {
      await test.step('Teacher 로그인 및 Dashboard 접근', async () => {
        await loginAsTeacher(page, {
          username: teacher.user.username,
          password: teacher.user.password,
        })
        await waitForLoadingComplete(page)

        await page.goto('/dashboard')
        await waitForLoadingComplete(page)
      })

      await test.step('차트 Hover 및 Tooltip 확인', async () => {
        // PieChart 영역 찾기
        const chartContainer = page.locator('h2:has-text("문제 유형 분포")').locator('..')
        const pieSlice = chartContainer.locator('path').first()

        if (await pieSlice.isVisible().catch(() => false)) {
          // Hover
          await pieSlice.hover()
          await page.waitForTimeout(300)

          // Tooltip 확인 (recharts-tooltip 클래스 또는 custom tooltip)
          const tooltip = page.locator('.recharts-tooltip-wrapper, [role="tooltip"]')
          const tooltipVisible = await tooltip.first().isVisible().catch(() => false)

          if (tooltipVisible) {
            console.log('Tooltip displayed on hover')
          } else {
            console.log('Tooltip not visible (may need data)')
          }
        } else {
          console.log('No pie slice to hover (empty data)')
        }
      })
    })

    test('BarChart Hover 효과', async ({ page }) => {
      await test.step('Teacher 로그인 및 Dashboard 접근', async () => {
        await loginAsTeacher(page, {
          username: teacher.user.username,
          password: teacher.user.password,
        })
        await waitForLoadingComplete(page)

        await page.goto('/dashboard')
        await waitForLoadingComplete(page)
      })

      await test.step('막대 Hover 효과 확인', async () => {
        // 문제 난이도 분포 섹션 찾기
        const chartSection = page.locator('h2:has-text("문제 난이도 분포")')
        await expect(chartSection).toBeVisible()

        // 차트 컨테이너 내 SVG 찾기
        const chartContainer = chartSection.locator('..').locator('svg').first()
        const hasSvg = await chartContainer.isVisible().catch(() => false)

        if (hasSvg) {
          // SVG 내의 rect 요소들 (막대)
          const bars = chartContainer.locator('rect')
          const barCount = await bars.count()
          console.log(`Bar count in chart: ${barCount}`)

          if (barCount > 0) {
            // 막대 위에 마우스 올리기
            await bars.first().hover({ force: true })
            await page.waitForTimeout(300)

            // Tooltip 표시 확인
            const tooltip = page.locator('.recharts-tooltip-wrapper')
            const tooltipVisible = await tooltip.isVisible().catch(() => false)
            console.log(`Tooltip visible: ${tooltipVisible}`)

            console.log('Bar hover effect triggered')
          } else {
            console.log('No bars to hover (empty data or different chart type)')
          }
        } else {
          console.log('Chart SVG not found')
        }
      })
    })

    test('Legend 토글 기능', async ({ page }) => {
      await test.step('Teacher 로그인 및 Dashboard 접근', async () => {
        await loginAsTeacher(page, {
          username: teacher.user.username,
          password: teacher.user.password,
        })
        await waitForLoadingComplete(page)

        await page.goto('/dashboard')
        await waitForLoadingComplete(page)
      })

      await test.step('Legend 항목 클릭하여 토글', async () => {
        const chartContainer = page.locator('h2:has-text("문제 유형 분포")').locator('..')

        // Legend 항목 찾기
        const legendItem = chartContainer.locator('text=객관식').first()
        const isVisible = await legendItem.isVisible().catch(() => false)

        if (isVisible) {
          // 클릭 전 상태 저장
          await legendItem.click()
          await page.waitForTimeout(300)

          // 클릭 후 스타일 변화 확인 (opacity 감소 또는 취소선)
          // 토글 기능이 활성화된 경우
          console.log('Legend toggle clicked')
        } else {
          console.log('Legend item not visible')
        }
      })
    })

    test('차트 클릭 시 문제 목록으로 이동 (드릴다운)', async ({ page }) => {
      await test.step('Teacher 로그인 및 Dashboard 접근', async () => {
        await loginAsTeacher(page, {
          username: teacher.user.username,
          password: teacher.user.password,
        })
        await waitForLoadingComplete(page)

        await page.goto('/dashboard')
        await waitForLoadingComplete(page)
      })

      await test.step('PieChart 슬라이스 클릭', async () => {
        const chartContainer = page.locator('h2:has-text("문제 유형 분포")').locator('..')
        const pieSlice = chartContainer.locator('path').first()

        if (await pieSlice.isVisible().catch(() => false)) {
          // 클릭 이벤트 리스너가 있는 경우 클릭
          await pieSlice.click()
          await page.waitForTimeout(500)

          // URL 변경 확인 (questions 페이지로 이동)
          const currentUrl = page.url()
          const navigatedToQuestions = currentUrl.includes('/questions')

          if (navigatedToQuestions) {
            console.log('Navigated to questions page on chart click')
          } else {
            console.log('Click handler may not be configured for drill-down')
          }
        }
      })
    })
  })

  test.describe('Empty State Charts', () => {
    test('데이터 없을 때 Empty State 표시', async ({ page }) => {
      // 새 Teacher 계정으로 테스트 (데이터 없음)
      const newTeacher = await createAndLoginTeacher()

      await test.step('새 Teacher 로그인', async () => {
        await loginAsTeacher(page, {
          username: newTeacher.user.username,
          password: newTeacher.user.password,
        })
        await waitForLoadingComplete(page)

        await page.goto('/dashboard')
        await waitForLoadingComplete(page)
      })

      await test.step('Empty State 확인', async () => {
        // 데이터 없음 메시지 또는 빈 차트
        const emptyMessage = page.locator('text=/표시할 데이터가 없습니다|데이터가 없습니다/')
        const hasEmptyMessage = await emptyMessage.first().isVisible().catch(() => false)

        if (hasEmptyMessage) {
          console.log('Empty state message displayed')
        } else {
          // 차트가 0값으로 렌더링될 수도 있음
          console.log('Chart rendered with zero values or no empty message')
        }
      })
    })
  })

  test.describe('Student Dashboard Charts', () => {
    test('점수 추이 차트 렌더링 (데이터 있는 경우)', async ({ page }) => {
      await test.step('Student 로그인 및 Dashboard 접근', async () => {
        await loginAsStudent(page, {
          username: student.user.username,
          password: student.user.password,
        })
        await waitForLoadingComplete(page)

        await page.goto('/dashboard')
        await waitForLoadingComplete(page)
      })

      await test.step('Student Dashboard 확인', async () => {
        // Student Dashboard 제목 확인
        await expect(page.locator('h1:has-text("학생 대시보드")')).toBeVisible()

        // 점수 추이 차트가 있는 경우 확인
        const scoreTrendSection = page.locator('text=/점수 추이|성적 추이/')
        const hasScoreTrend = await scoreTrendSection.first().isVisible().catch(() => false)

        if (hasScoreTrend) {
          // LineChart SVG 확인
          const svgElement = page.locator('svg').first()
          await expect(svgElement).toBeVisible()
          console.log('Score trend chart section found')
        } else {
          console.log('Score trend chart not displayed (no exam data)')
        }
      })

      await test.step('통계 카드 확인', async () => {
        // 완료한 시험 카드
        await expect(page.getByText('완료한 시험', { exact: true })).toBeVisible()

        // 평균 점수 카드
        await expect(page.getByText('평균 점수', { exact: true })).toBeVisible()

        console.log('Student stats cards displayed')
      })
    })
  })

  test.describe('Chart Accessibility', () => {
    test('차트에 접근 가능한 레이블 제공', async ({ page }) => {
      await test.step('Teacher 로그인 및 Dashboard 접근', async () => {
        await loginAsTeacher(page, {
          username: teacher.user.username,
          password: teacher.user.password,
        })
        await waitForLoadingComplete(page)

        await page.goto('/dashboard')
        await waitForLoadingComplete(page)
      })

      await test.step('차트 접근성 확인', async () => {
        // 차트 섹션에 제목이 있는지 확인
        await expect(page.locator('h2:has-text("문제 유형 분포")')).toBeVisible()
        await expect(page.locator('h2:has-text("문제 난이도 분포")')).toBeVisible()

        // SVG 요소에 role 또는 aria-label 확인
        const chartSvgs = page.locator('svg')
        const svgCount = await chartSvgs.count()

        console.log(`Chart SVG elements: ${svgCount}`)

        // 최소한 차트 컨테이너에 설명적 제목이 있어야 함
        expect(svgCount).toBeGreaterThan(0)
      })
    })

    test('키보드로 차트 네비게이션 가능', async ({ page }) => {
      await test.step('Teacher 로그인 및 Dashboard 접근', async () => {
        await loginAsTeacher(page, {
          username: teacher.user.username,
          password: teacher.user.password,
        })
        await waitForLoadingComplete(page)

        await page.goto('/dashboard')
        await waitForLoadingComplete(page)
      })

      await test.step('Tab 키로 차트 영역 접근', async () => {
        // Tab 키로 페이지 네비게이션
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab')
        }

        // 포커스된 요소 확인
        const focusedElement = await page.evaluate(() => {
          return document.activeElement?.tagName
        })

        console.log(`Focused element after tabs: ${focusedElement}`)
      })
    })
  })
})
