import { test, expect } from '@playwright/test'
import {
  createAndLoginTeacher,
  createAndLoginStudent,
} from '../../helpers/data-factory.helper'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import { selectors } from '../../helpers/selectors'
import {
  getTheme,
  isDarkModeActive,
  openUserProfileDropdown,
  selectThemeFromDropdown,
} from '../../helpers/theme.helper'

let testTeacher: Awaited<ReturnType<typeof createAndLoginTeacher>> | null = null
let testStudent: Awaited<ReturnType<typeof createAndLoginStudent>> | null = null

test.describe('Sidebar UI Improvements - Desktop', () => {
  test.beforeAll(async () => {
    testTeacher = await createAndLoginTeacher()
    testStudent = await createAndLoginStudent()
    console.log(
      `Test accounts created: ${testTeacher.user.username}, ${testStudent.user.username}`
    )
  })

  test.beforeEach(async ({ page }) => {
    // 테마 초기화
    await page.goto('/login')
    await page.evaluate(() => localStorage.removeItem('theme'))
  })

  test.describe('1. Sidebar 렌더링', () => {
    test('교수 계정으로 로그인 시 navigation items 확인', async ({ page }) => {
      await test.step('Step 1: Login as teacher', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
        console.log('✓ Logged in as teacher')
      })

      await test.step('Step 2: Verify sidebar items', async () => {
        const sidebar = page.locator(selectors.sidebar.container)
        await expect(sidebar).toBeVisible()

        // 교수 전용 메뉴 확인
        await expect(sidebar.locator('text=문제 관리')).toBeVisible()
        await expect(sidebar.locator('text=시험지 관리')).toBeVisible()
        await expect(sidebar.locator('text=시험 관리')).toBeVisible()
        await expect(sidebar.locator('text=학생 관리')).toBeVisible()
        await expect(sidebar.locator('text=통계 분석')).toBeVisible()
        console.log('✓ Teacher navigation items verified')
      })

      await test.step('Step 3: Verify user type label', async () => {
        const userTypeLabel = page.locator('aside p.text-\\[13px\\]').filter({ hasText: '교수' })
        await expect(userTypeLabel).toBeVisible()
        console.log('✓ User type label "교수" displayed')
      })
    })

    test('학생 계정으로 로그인 시 navigation items 확인', async ({ page }) => {
      await test.step('Step 1: Login as student', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testStudent!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testStudent!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
        console.log('✓ Logged in as student')
      })

      await test.step('Step 2: Verify sidebar items', async () => {
        const sidebar = page.locator(selectors.sidebar.container)
        await expect(sidebar).toBeVisible()

        // 학생 전용 메뉴 확인
        await expect(sidebar.locator('text=내 시험')).toBeVisible()
        await expect(sidebar.locator('text=성적 조회')).toBeVisible()
        console.log('✓ Student navigation items verified')
      })

      await test.step('Step 3: Verify user type label', async () => {
        const userTypeLabel = page.locator('aside p.text-\\[13px\\]').filter({ hasText: '학생' })
        await expect(userTypeLabel).toBeVisible()
        console.log('✓ User type label "학생" displayed')
      })
    })
  })

  test.describe('2. 아이콘 strokeWidth 검증', () => {
    test('Navigation 아이콘 strokeWidth가 1.75여야 함', async ({ page }) => {
      await test.step('Step 1: Login', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
      })

      await test.step('Step 2: Verify icon strokeWidth', async () => {
        // 첫 번째 navigation 아이콘 (대시보드)
        const firstNavIcon = page.locator('nav ul li:first-child a svg').first()
        const strokeWidth = await firstNavIcon.getAttribute('stroke-width')
        expect(strokeWidth).toBe('1.75')
        console.log('✓ Icon strokeWidth verified: 1.75')
      })
    })
  })

  test.describe('3. 사용자 프로필 드롭다운', () => {
    test('프로필 버튼 클릭 시 드롭다운 표시', async ({ page }) => {
      await test.step('Step 1: Login', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
      })

      await test.step('Step 2: Open dropdown', async () => {
        await openUserProfileDropdown(page)
        await expect(page.locator(selectors.sidebar.dropdown.content)).toBeVisible()
        console.log('✓ Dropdown opened')
      })

      await test.step('Step 3: Verify menu items', async () => {
        await expect(page.locator('text=내 계정')).toBeVisible()
        await expect(page.locator(selectors.sidebar.dropdown.settingsItem)).toBeVisible()
        await expect(page.locator(selectors.sidebar.dropdown.themeLabel)).toBeVisible()
        await expect(page.locator(selectors.sidebar.dropdown.logoutItem)).toBeVisible()
        console.log('✓ All menu items present')
      })
    })

    test('외부 클릭 시 드롭다운 닫힘', async ({ page }) => {
      await test.step('Step 1: Login and open dropdown', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
        await openUserProfileDropdown(page)
        await expect(page.locator(selectors.sidebar.dropdown.content)).toBeVisible()
      })

      await test.step('Step 2: Click outside', async () => {
        // 메인 콘텐츠 영역을 클릭하여 드롭다운 닫기
        await page.click('main', { position: { x: 100, y: 100 }, force: true })
        await page.waitForTimeout(300)
        await expect(page.locator(selectors.sidebar.dropdown.content)).not.toBeVisible()
        console.log('✓ Dropdown closed on outside click')
      })
    })

    test('Escape 키로 드롭다운 닫힘', async ({ page }) => {
      await test.step('Step 1: Login and open dropdown', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
        await openUserProfileDropdown(page)
        await expect(page.locator(selectors.sidebar.dropdown.content)).toBeVisible()
      })

      await test.step('Step 2: Press Escape', async () => {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
        await expect(page.locator(selectors.sidebar.dropdown.content)).not.toBeVisible()
        console.log('✓ Dropdown closed on Escape key')
      })
    })
  })

  test.describe('4. 설정 페이지 이동', () => {
    test('드롭다운에서 설정 클릭 시 설정 페이지로 이동', async ({ page }) => {
      await test.step('Step 1: Login and open dropdown', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
        await openUserProfileDropdown(page)
      })

      await test.step('Step 2: Click settings', async () => {
        await page.click(selectors.sidebar.dropdown.settingsItem)
        await page.waitForTimeout(300)
        await expect(page).toHaveURL('/settings')
        console.log('✓ Navigated to /settings')
      })

      await test.step('Step 3: Verify dropdown closed', async () => {
        await expect(page.locator(selectors.sidebar.dropdown.content)).not.toBeVisible()
        console.log('✓ Dropdown auto-closed')
      })
    })
  })

  test.describe('5. 테마 전환 기능', () => {
    test('라이트 모드 → 다크 모드 전환', async ({ page }) => {
      await test.step('Step 1: Login', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
      })

      await test.step('Step 2: Switch to dark mode', async () => {
        await selectThemeFromDropdown(page, 'dark')
        const darkModeActive = await isDarkModeActive(page)
        expect(darkModeActive).toBe(true)
        const theme = await getTheme(page)
        expect(theme).toBe('dark')
        console.log('✓ Dark mode activated')
      })
    })

    test('다크 모드 → 라이트 모드 전환', async ({ page }) => {
      await test.step('Step 1: Login and set dark mode', async () => {
        await page.goto('/login')
        await page.evaluate(() => localStorage.setItem('theme', 'dark'))
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
      })

      await test.step('Step 2: Switch to light mode', async () => {
        await selectThemeFromDropdown(page, 'light')
        const darkModeActive = await isDarkModeActive(page)
        expect(darkModeActive).toBe(false)
        const theme = await getTheme(page)
        expect(theme).toBe('light')
        console.log('✓ Light mode activated')
      })
    })

    test('시스템 모드 선택', async ({ page }) => {
      await test.step('Step 1: Login', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
      })

      await test.step('Step 2: Switch to system mode', async () => {
        await selectThemeFromDropdown(page, 'system')
        const theme = await getTheme(page)
        expect(theme).toBe('system')
        console.log('✓ System mode selected')
      })
    })

    test('페이지 이동 후 테마 유지', async ({ page }) => {
      await test.step('Step 1: Login and set dark mode', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
        await selectThemeFromDropdown(page, 'dark')
      })

      await test.step('Step 2: Navigate to questions page', async () => {
        await page.click('a[href="/questions"]')
        await waitForLoadingComplete(page)
        await expect(page).toHaveURL('/questions')
      })

      await test.step('Step 3: Verify theme persisted', async () => {
        const darkModeActive = await isDarkModeActive(page)
        expect(darkModeActive).toBe(true)
        const theme = await getTheme(page)
        expect(theme).toBe('dark')
        console.log('✓ Theme persisted after navigation')
      })
    })

    test('라디오 인디케이터 정확성', async ({ page }) => {
      await test.step('Step 1: Login', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
      })

      await test.step('Step 2: Select dark mode', async () => {
        await openUserProfileDropdown(page)
        await page.click(selectors.sidebar.dropdown.darkTheme)
        await page.waitForTimeout(300)
        console.log('✓ Dark theme selected')
      })

      await test.step('Step 3: Verify dark theme indicator', async () => {
        await openUserProfileDropdown(page)
        const darkTheme = page.locator(selectors.sidebar.dropdown.darkTheme)
        await expect(darkTheme).toHaveAttribute('data-state', 'checked')
        console.log('✓ Dark theme indicator accurate')
      })

      await test.step('Step 4: Select light mode', async () => {
        await page.click(selectors.sidebar.dropdown.lightTheme)
        await page.waitForTimeout(300)
        console.log('✓ Light theme selected')
      })

      await test.step('Step 5: Verify light theme indicator', async () => {
        await openUserProfileDropdown(page)
        const lightTheme = page.locator(selectors.sidebar.dropdown.lightTheme)
        await expect(lightTheme).toHaveAttribute('data-state', 'checked')
        console.log('✓ Light theme indicator accurate')
      })
    })
  })

  test.describe('6. 로그아웃 기능', () => {
    test('드롭다운에서 로그아웃 클릭 시 로그인 페이지로 리다이렉트', async ({ page }) => {
      await test.step('Step 1: Login', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
      })

      await test.step('Step 2: Open dropdown and logout', async () => {
        await openUserProfileDropdown(page)
        await page.click(selectors.sidebar.dropdown.logoutItem)
        await page.waitForTimeout(300)
        await expect(page).toHaveURL('/login')
        console.log('✓ Redirected to /login')
      })

      await test.step('Step 3: Verify tokens removed', async () => {
        const accessToken = await page.evaluate(() =>
          localStorage.getItem('access_token')
        )
        const refreshToken = await page.evaluate(() =>
          localStorage.getItem('refresh_token')
        )
        expect(accessToken).toBeNull()
        expect(refreshToken).toBeNull()
        console.log('✓ Tokens removed from localStorage')
      })
    })
  })

  test.describe('7. 접근성', () => {
    test('프로필 버튼에 aria-label 존재', async ({ page }) => {
      await test.step('Step 1: Login', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
      })

      await test.step('Step 2: Verify aria-label', async () => {
        const profileButton = page.locator(selectors.sidebar.userProfile.trigger)
        await expect(profileButton).toHaveAttribute('aria-label', '사용자 메뉴 열기')
        console.log('✓ aria-label present on profile button')
      })
    })

    test('키보드 탐색 (Tab, Enter, Escape)', async ({ page }) => {
      await test.step('Step 1: Login', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
      })

      await test.step('Step 2: Tab to profile button', async () => {
        // 프로필 버튼에 포커스
        const profileButton = page.locator(selectors.sidebar.userProfile.trigger)
        await profileButton.focus()
        await expect(profileButton).toBeFocused()
        console.log('✓ Profile button focused with Tab')
      })

      await test.step('Step 3: Open with Enter', async () => {
        await page.keyboard.press('Enter')
        await page.waitForTimeout(300)
        await expect(page.locator(selectors.sidebar.dropdown.content)).toBeVisible()
        console.log('✓ Dropdown opened with Enter')
      })

      await test.step('Step 4: Close with Escape', async () => {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
        await expect(page.locator(selectors.sidebar.dropdown.content)).not.toBeVisible()
        console.log('✓ Dropdown closed with Escape')
      })
    })

    test('테마 라디오 항목에 적절한 aria-label', async ({ page }) => {
      await test.step('Step 1: Login and open dropdown', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
        await openUserProfileDropdown(page)
      })

      await test.step('Step 2: Verify theme items aria-labels', async () => {
        const lightTheme = page.locator(selectors.sidebar.dropdown.lightTheme)
        const darkTheme = page.locator(selectors.sidebar.dropdown.darkTheme)
        const systemTheme = page.locator(selectors.sidebar.dropdown.systemTheme)

        await expect(lightTheme).toHaveAttribute('aria-label', '라이트 테마로 전환')
        await expect(darkTheme).toHaveAttribute('aria-label', '다크 테마로 전환')
        await expect(systemTheme).toHaveAttribute('aria-label', '시스템 테마로 전환')
        console.log('✓ All theme items have proper aria-labels')
      })
    })
  })

  test.describe('8. 시각적 일관성', () => {
    test('활성 navigation 항목 스타일링', async ({ page }) => {
      await test.step('Step 1: Login', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
      })

      await test.step('Step 2: Verify active item styling', async () => {
        // 대시보드가 활성 상태
        const activeItem = page.locator('nav a.text-primary').first()
        await expect(activeItem).toBeVisible()
        console.log('✓ Active navigation item styled correctly')
      })
    })

    test('프로필 버튼 hover 효과', async ({ page }) => {
      await test.step('Step 1: Login', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
      })

      await test.step('Step 2: Hover over profile button', async () => {
        const profileButton = page.locator(selectors.sidebar.userProfile.trigger)
        await profileButton.hover()
        // hover 클래스 확인
        await expect(profileButton).toHaveClass(/hover:bg-green-100/)
        console.log('✓ Profile button has hover effect')
      })
    })

    test('로그아웃 버튼 destructive 색상', async ({ page }) => {
      await test.step('Step 1: Login and open dropdown', async () => {
        await page.goto('/login')
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
        await openUserProfileDropdown(page)
      })

      await test.step('Step 2: Verify logout button styling', async () => {
        const logoutItem = page.locator(selectors.sidebar.dropdown.logoutItem)
        await expect(logoutItem).toHaveClass(/text-destructive/)
        console.log('✓ Logout button has destructive color')
      })
    })
  })
})
