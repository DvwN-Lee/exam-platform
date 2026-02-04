import { Page } from '@playwright/test'

/**
 * localStorage에 테마 값을 설정
 */
export async function setTheme(page: Page, theme: 'light' | 'dark' | 'system') {
  await page.evaluate((themeValue) => {
    localStorage.setItem('theme', themeValue)
  }, theme)
}

/**
 * localStorage에서 현재 테마 값을 조회
 */
export async function getTheme(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('theme'))
}

/**
 * 다크 모드가 활성화되어 있는지 확인
 */
export async function isDarkModeActive(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return document.documentElement.classList.contains('dark')
  })
}

/**
 * 사용자 프로필 드롭다운 열기
 */
export async function openUserProfileDropdown(page: Page) {
  const profileButton = page.locator('button[aria-label="사용자 메뉴 열기"]')

  // 페이지 하단으로 스크롤
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(200)

  // 프로필 버튼 클릭
  await profileButton.click({ force: true })
  await page.waitForTimeout(300) // Radix UI animation
}

/**
 * 드롭다운에서 테마 선택
 */
export async function selectThemeFromDropdown(
  page: Page,
  theme: 'light' | 'dark' | 'system'
) {
  await openUserProfileDropdown(page)

  const themeMap = {
    light: '[role="menuitemradio"]:has-text("라이트")',
    dark: '[role="menuitemradio"]:has-text("다크")',
    system: '[role="menuitemradio"]:has-text("시스템")',
  }

  await page.click(themeMap[theme])
  await page.waitForTimeout(300)
}

/**
 * 아이콘의 strokeWidth 속성 조회
 */
export async function getIconStrokeWidth(
  page: Page,
  iconSelector: string
): Promise<string | null> {
  return await page.locator(iconSelector).evaluate((el) => {
    return el.getAttribute('stroke-width')
  })
}
