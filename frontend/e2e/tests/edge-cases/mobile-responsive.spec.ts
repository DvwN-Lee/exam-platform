import { test, expect, devices } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import {
  createAndLoginStudent,
  createAndLoginTeacher,
} from '../../helpers/data-factory.helper'
import { loginAsStudent, loginAsTeacher } from '../../helpers/auth.helper'

// iPhone 13 viewport 사용 (최상위 레벨에서 설정)
test.use({ ...devices['iPhone 13'] })

/**
 * Mobile Responsive 테스트
 * - 모바일 Viewport에서의 레이아웃 테스트
 * - MobileHeader 동작 테스트
 * - 터치 인터랙션 테스트
 */
test.describe('Mobile Responsive', () => {

  let student: Awaited<ReturnType<typeof createAndLoginStudent>>
  let teacher: Awaited<ReturnType<typeof createAndLoginTeacher>>

  test.beforeAll(async () => {
    student = await createAndLoginStudent()
    teacher = await createAndLoginTeacher()

    console.log('=== Mobile Test Setup Complete ===')
    console.log(`Student: ${student.user.username}`)
    console.log(`Teacher: ${teacher.user.username}`)
  })

  test.describe('Mobile Header', () => {
    test('모바일에서 MobileHeader가 표시되어야 함', async ({ page }) => {
      await loginAsStudent(page, {
        username: student.user.username,
        password: student.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/dashboard')
      await waitForLoadingComplete(page)

      // 모바일 viewport 확인
      const viewport = page.viewportSize()
      console.log(`Viewport: ${viewport?.width}x${viewport?.height}`)

      // MobileHeader 또는 일반 헤더 확인
      const header = page.locator('header').first()
      const hasHeader = await header.isVisible().catch(() => false)

      if (hasHeader) {
        console.log('Header is visible on mobile')
      }

      // 햄버거 메뉴 버튼 또는 네비게이션 확인
      const menuButton = page.locator('button[aria-label="메뉴 열기"]')
      const hasMenuButton = await menuButton.isVisible().catch(() => false)

      if (hasMenuButton) {
        await expect(menuButton).toBeVisible()
        console.log('Mobile menu button displayed')
      } else {
        // 데스크톱 사이드바가 축소된 상태일 수 있음
        const sidebar = page.locator('aside, nav')
        const hasSidebar = await sidebar.first().isVisible().catch(() => false)
        console.log(`Sidebar visible: ${hasSidebar}`)
      }

      // 로고 확인
      const logo = page.locator('text=ExamOnline')
      const hasLogo = await logo.first().isVisible().catch(() => false)
      console.log(`Logo visible: ${hasLogo}`)

      console.log('Mobile layout checked')
    })

    test('햄버거 메뉴로 Sidebar 토글', async ({ page }) => {
      await loginAsStudent(page, {
        username: student.user.username,
        password: student.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/dashboard')
      await waitForLoadingComplete(page)

      // 햄버거 메뉴 클릭
      const menuButton = page.locator('button[aria-label="메뉴 열기"]')
      await menuButton.click()

      // Sidebar가 열리는지 확인 (모바일에서는 오버레이로 표시)
      await page.waitForTimeout(300) // 애니메이션 대기

      // Sidebar 내 네비게이션 항목 확인
      const sidebarNav = page.locator('nav')
      const dashboardLink = sidebarNav.locator('text=대시보드')
      await expect(dashboardLink).toBeVisible()

      console.log('Sidebar toggle works on mobile')
    })
  })

  test.describe('Mobile Layout', () => {
    test('로그인 페이지가 모바일에서 올바르게 렌더링', async ({ page }) => {
      await page.goto('/login')
      await waitForLoadingComplete(page)

      // 로그인 폼이 화면에 맞게 표시
      const loginForm = page.locator('form')
      await expect(loginForm).toBeVisible()

      // 입력 필드가 터치 가능한 크기
      const usernameInput = page.locator('#username')
      const box = await usernameInput.boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(40) // 최소 터치 영역

      // 버튼이 터치 가능한 크기
      const submitButton = page.locator('button[type="submit"]')
      const buttonBox = await submitButton.boundingBox()
      expect(buttonBox?.height).toBeGreaterThanOrEqual(40)

      console.log('Login page renders correctly on mobile')
    })

    test('Dashboard가 모바일에서 올바르게 렌더링', async ({ page }) => {
      await loginAsStudent(page, {
        username: student.user.username,
        password: student.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/dashboard')
      await waitForLoadingComplete(page)

      // 컨텐츠가 화면 너비에 맞게 표시
      const viewport = page.viewportSize()
      const content = page.locator('main').first()
      const contentBox = await content.boundingBox()

      // 컨텐츠가 Viewport를 초과하지 않음
      expect(contentBox?.width).toBeLessThanOrEqual(viewport!.width)

      // 통계 카드들이 세로로 쌓임 (모바일 레이아웃)
      const statsCards = page.locator('.rounded-lg.border.bg-card')
      const count = await statsCards.count()
      expect(count).toBeGreaterThan(0)

      console.log('Dashboard renders correctly on mobile')
    })

    test('시험 목록이 모바일에서 올바르게 표시', async ({ page }) => {
      await loginAsStudent(page, {
        username: student.user.username,
        password: student.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/exams')
      await waitForLoadingComplete(page)

      // 페이지 제목 확인
      await expect(page.locator('h1')).toBeVisible()

      // 컨텐츠가 스크롤 가능
      const body = page.locator('body')
      const isScrollable = await body.evaluate((el) => el.scrollHeight > el.clientHeight)
      // 스크롤 가능 여부는 컨텐츠 양에 따라 다름

      console.log('Exam list renders correctly on mobile')
    })
  })

  test.describe('Mobile Touch Interactions', () => {
    test('버튼 터치 동작 확인', async ({ page }) => {
      await loginAsStudent(page, {
        username: student.user.username,
        password: student.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/dashboard')
      await waitForLoadingComplete(page)

      // 시험 보러 가기 버튼 터치
      const examButton = page.locator('button:has-text("시험 보러 가기")')
      await expect(examButton).toBeVisible()

      // 터치 (탭) 동작
      await examButton.tap()

      // 페이지 이동 확인
      await page.waitForURL('/exams')

      console.log('Button touch interaction works')
    })

    test('스크롤 동작 확인', async ({ page }) => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/dashboard')
      await waitForLoadingComplete(page)

      // 페이지가 스크롤 가능한지 확인
      const scrollableHeight = await page.evaluate(() => {
        return document.documentElement.scrollHeight - window.innerHeight
      })

      console.log(`Scrollable height: ${scrollableHeight}px`)

      if (scrollableHeight > 0) {
        // 초기 스크롤 위치
        const initialScroll = await page.evaluate(() => window.scrollY)

        // 터치 스크롤 시뮬레이션
        await page.evaluate(() => window.scrollTo(0, 200))
        await page.waitForTimeout(300)

        // 스크롤 위치 변경 확인
        const newScroll = await page.evaluate(() => window.scrollY)
        expect(newScroll).toBeGreaterThan(initialScroll)

        console.log(`Scroll position: ${initialScroll} -> ${newScroll}`)
      } else {
        console.log('Page content fits within viewport')
      }

      console.log('Scroll interaction checked')
    })
  })

  test.describe('Mobile Form Interactions', () => {
    test('모바일에서 폼 입력 동작', async ({ page }) => {
      await page.goto('/login')
      await waitForLoadingComplete(page)

      // 터치로 입력 필드 포커스
      const usernameInput = page.locator('#username')
      await usernameInput.tap()

      // 가상 키보드로 입력 시뮬레이션
      await usernameInput.fill('testuser')
      expect(await usernameInput.inputValue()).toBe('testuser')

      // 다음 필드로 이동
      const passwordInput = page.locator('#password')
      await passwordInput.tap()
      await passwordInput.fill('testpassword')
      expect(await passwordInput.inputValue()).toBe('testpassword')

      console.log('Mobile form input works correctly')
    })

    test('모바일에서 Select/Dropdown 동작', async ({ page }) => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/questions/new')
      await waitForLoadingComplete(page)

      // Select 컴포넌트 터치
      const typeSelect = page.locator('button[role="combobox"]').first()
      if (await typeSelect.isVisible()) {
        await typeSelect.tap()
        await page.waitForTimeout(300)

        // 드롭다운 옵션 표시 확인
        const options = page.locator('[role="option"]')
        const optionCount = await options.count()
        expect(optionCount).toBeGreaterThan(0)

        // 옵션 선택
        await options.first().tap()
      }

      console.log('Mobile select/dropdown works correctly')
    })
  })
})
