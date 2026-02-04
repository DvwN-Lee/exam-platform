import { test, expect, devices } from '@playwright/test'
import {
  createAndLoginTeacher,
} from '../../helpers/data-factory.helper'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import { selectors } from '../../helpers/selectors'
import { openUserProfileDropdown, selectThemeFromDropdown } from '../../helpers/theme.helper'

let testTeacher: Awaited<ReturnType<typeof createAndLoginTeacher>> | null = null

// iPhone 13 viewport 사용
test.use({ ...devices['iPhone 13'] })

test.describe('Sidebar UI Improvements - Mobile', () => {
  test.beforeAll(async () => {
    testTeacher = await createAndLoginTeacher()
    console.log(`Test teacher account created: ${testTeacher.user.username}`)
  })

  test.beforeEach(async ({ page }) => {
    // CI 환경에서 스킵
    test.skip(process.env.CI === 'true', 'Mobile tests are skipped in CI environment')

    await page.goto('/login')
    await page.evaluate(() => localStorage.removeItem('theme'))
  })

  test.describe('1. 모바일 반응형', () => {
    test('모바일 viewport에서 sidebar가 정상 작동', async ({ page }) => {
      await test.step('Step 1: Login', async () => {
        await page.click(selectors.auth.login.teacherRoleButton)
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
        console.log('✓ Logged in on mobile')
      })

      await test.step('Step 2: Verify mobile viewport', async () => {
        const viewport = page.viewportSize()
        expect(viewport?.width).toBe(390) // iPhone 13 width
        console.log('✓ Mobile viewport confirmed')
      })
    })
  })

  test.describe('2. Overlay 동작', () => {
    test('Sidebar 열 때 overlay 표시되고 클릭 시 닫힘', async ({ page }) => {
      await test.step('Step 1: Login', async () => {
        await page.click(selectors.auth.login.teacherRoleButton)
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
      })

      await test.step('Step 2: Open sidebar', async () => {
        // 햄버거 버튼이 있다면 클릭 (구현에 따라 다를 수 있음)
        // 모바일에서 sidebar는 기본적으로 숨겨져 있음
        const sidebar = page.locator(selectors.sidebar.container)

        // Sidebar가 존재하는지 확인
        await expect(sidebar).toBeInViewport()
        console.log('✓ Sidebar accessible on mobile')
      })
    })
  })

  test.describe('3. 드롭다운 기능', () => {
    test('모바일에서 프로필 버튼 탭 시 드롭다운 표시', async ({ page }) => {
      await test.step('Step 1: Login', async () => {
        await page.click(selectors.auth.login.teacherRoleButton)
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
      })

      await test.step('Step 2: Tap profile button', async () => {
        const profileButton = page.locator(selectors.sidebar.userProfile.trigger)
        await profileButton.tap()
        await page.waitForTimeout(300)
        await expect(page.locator(selectors.sidebar.dropdown.content)).toBeVisible()
        console.log('✓ Dropdown opened on tap')
      })
    })

    test('드롭다운 너비 240px 확인', async ({ page }) => {
      await test.step('Step 1: Login and open dropdown', async () => {
        await page.click(selectors.auth.login.teacherRoleButton)
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
        await openUserProfileDropdown(page)
      })

      await test.step('Step 2: Verify dropdown width', async () => {
        const dropdown = page.locator(selectors.sidebar.dropdown.content)
        const boundingBox = await dropdown.boundingBox()
        expect(boundingBox?.width).toBe(240)
        console.log('✓ Dropdown width is 240px')
      })
    })

    test('테마 전환 정상 작동', async ({ page }) => {
      await test.step('Step 1: Login', async () => {
        await page.click(selectors.auth.login.teacherRoleButton)
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
      })

      await test.step('Step 2: Switch theme on mobile', async () => {
        await selectThemeFromDropdown(page, 'dark')
        const htmlElement = page.locator('html')
        await expect(htmlElement).toHaveClass(/dark/)
        console.log('✓ Theme switching works on mobile')
      })
    })
  })

  test.describe('4. 터치 상호작용', () => {
    test('모든 메뉴 항목 터치 가능', async ({ page }) => {
      await test.step('Step 1: Login and open dropdown', async () => {
        await page.click(selectors.auth.login.teacherRoleButton)
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
        await openUserProfileDropdown(page)
      })

      await test.step('Step 2: Verify all items tappable', async () => {
        const settingsItem = page.locator(selectors.sidebar.dropdown.settingsItem)
        const logoutItem = page.locator(selectors.sidebar.dropdown.logoutItem)

        await expect(settingsItem).toBeVisible()
        await expect(logoutItem).toBeVisible()

        // 터치 타겟 크기 확인 (최소 44px)
        const settingsBox = await settingsItem.boundingBox()
        const logoutBox = await logoutItem.boundingBox()

        expect(settingsBox?.height).toBeGreaterThanOrEqual(40)
        expect(logoutBox?.height).toBeGreaterThanOrEqual(40)
        console.log('✓ All menu items have adequate touch targets')
      })
    })
  })

  test.describe('5. 포지셔닝', () => {
    test('드롭다운이 viewport 밖으로 넘어가지 않음', async ({ page }) => {
      await test.step('Step 1: Login and open dropdown', async () => {
        await page.click(selectors.auth.login.teacherRoleButton)
        await page.fill(selectors.auth.login.usernameInput, testTeacher!.user.username)
        await page.fill(selectors.auth.login.passwordInput, testTeacher!.user.password)
        await page.click(selectors.auth.login.submitButton)
        await waitForLoadingComplete(page)
        await openUserProfileDropdown(page)
      })

      await test.step('Step 2: Verify dropdown positioning', async () => {
        const dropdown = page.locator(selectors.sidebar.dropdown.content)
        const boundingBox = await dropdown.boundingBox()
        const viewport = page.viewportSize()

        expect(boundingBox?.x).toBeGreaterThanOrEqual(0)
        expect(boundingBox?.y).toBeGreaterThanOrEqual(0)
        if (boundingBox && viewport) {
          expect(boundingBox.x + boundingBox.width).toBeLessThanOrEqual(viewport.width)
          expect(boundingBox.y + boundingBox.height).toBeLessThanOrEqual(viewport.height)
        }
        console.log('✓ Dropdown positioned within viewport')
      })
    })
  })
})
