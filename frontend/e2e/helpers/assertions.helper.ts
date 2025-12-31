import { expect, Page } from '@playwright/test'
import { selectors } from './selectors'

/**
 * URL 검증
 */
export async function expectToBeOnPage(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(path))
}

/**
 * 로그인 상태 검증
 */
export async function expectToBeLoggedIn(page: Page) {
  const accessToken = await page.evaluate(() => {
    return localStorage.getItem('access_token')
  })

  expect(accessToken).toBeTruthy()
}

/**
 * 로그아웃 상태 검증
 */
export async function expectToBeLoggedOut(page: Page) {
  const accessToken = await page.evaluate(() => {
    return localStorage.getItem('access_token')
  })

  expect(accessToken).toBeNull()
}

/**
 * 로딩 완료 대기
 */
export async function waitForLoadingComplete(page: Page) {
  // 로딩 스피너가 사라질 때까지 대기
  const loadingSelector = selectors.common.loadingSpinner

  try {
    await page.waitForSelector(loadingSelector, { state: 'hidden', timeout: 10000 })
  } catch (error) {
    // 로딩 스피너가 없는 경우 무시
  }

  // 네트워크 요청이 완료될 때까지 대기
  await page.waitForLoadState('networkidle', { timeout: 10000 })
}

/**
 * 에러 메시지 표시 확인
 */
export async function expectErrorMessage(page: Page, message?: string) {
  const errorSelector = selectors.common.errorMessage

  if (message) {
    await expect(page.locator(errorSelector)).toContainText(message)
  } else {
    await expect(page.locator(errorSelector)).toBeVisible()
  }
}

/**
 * 성공 메시지 표시 확인
 */
export async function expectSuccessMessage(page: Page, message?: string) {
  const successSelector = selectors.common.successMessage

  if (message) {
    await expect(page.locator(successSelector)).toContainText(message)
  } else {
    await expect(page.locator(successSelector)).toBeVisible()
  }
}

/**
 * 페이지 제목 확인
 */
export async function expectPageTitle(page: Page, title: string) {
  await expect(page).toHaveTitle(new RegExp(title))
}

/**
 * 요소 표시 확인
 */
export async function expectElementVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible()
}

/**
 * 요소 숨김 확인
 */
export async function expectElementHidden(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeHidden()
}

/**
 * 텍스트 포함 확인
 */
export async function expectTextContent(page: Page, selector: string, text: string) {
  await expect(page.locator(selector)).toContainText(text)
}

/**
 * 입력 필드 값 확인
 */
export async function expectInputValue(page: Page, selector: string, value: string) {
  await expect(page.locator(selector)).toHaveValue(value)
}

/**
 * 요소 개수 확인
 */
export async function expectElementCount(page: Page, selector: string, count: number) {
  await expect(page.locator(selector)).toHaveCount(count)
}

/**
 * Dashboard 페이지 확인
 */
export async function expectToBeOnDashboard(page: Page) {
  await expectToBeOnPage(page, '/dashboard')
  await expectToBeLoggedIn(page)
}

/**
 * 로그인 페이지 확인
 */
export async function expectToBeOnLoginPage(page: Page) {
  await expectToBeOnPage(page, '/login')
  await expectToBeLoggedOut(page)
}

/**
 * Dialog/Modal 확인
 */
export async function expectDialogVisible(page: Page) {
  await expect(page.locator(selectors.common.confirmDialog)).toBeVisible()
}

/**
 * 테이블 행 개수 확인
 */
export async function expectTableRowCount(page: Page, tableSelector: string, count: number) {
  const rows = page.locator(`${tableSelector} tbody tr`)
  await expect(rows).toHaveCount(count)
}
