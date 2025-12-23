import { Page } from '@playwright/test'

export interface TestCredentials {
  username: string
  password: string
}

/**
 * 로그인 수행
 */
export async function login(page: Page, credentials: TestCredentials) {
  await page.goto('/login')
  await page.fill('input[id="username"]', credentials.username)
  await page.fill('input[id="password"]', credentials.password)
  await page.click('button[type="submit"]')

  // Dashboard로 리다이렉트될 때까지 대기
  await page.waitForURL('/')
}

/**
 * Teacher 계정으로 로그인
 */
export async function loginAsTeacher(page: Page, credentials?: TestCredentials) {
  const defaultCredentials: TestCredentials = {
    username: credentials?.username || 'testteacher2',
    password: credentials?.password || 'test12345678',
  }

  await login(page, defaultCredentials)
}

/**
 * Student 계정으로 로그인
 */
export async function loginAsStudent(page: Page, credentials?: TestCredentials) {
  const defaultCredentials: TestCredentials = {
    username: credentials?.username || 'teststudent2',
    password: credentials?.password || 'test12345678',
  }

  await login(page, defaultCredentials)
}

/**
 * 로그아웃 수행
 */
export async function logout(page: Page) {
  // Profile 페이지로 이동
  await page.goto('/profile')

  // 로그아웃 버튼 클릭
  await page.click('button:has-text("로그아웃")')

  // 로그인 페이지로 리다이렉트될 때까지 대기
  await page.waitForURL('/login')
}

/**
 * 로그인 상태 확인
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // localStorage에 access_token이 있는지 확인
  const accessToken = await page.evaluate(() => {
    return localStorage.getItem('access_token')
  })

  return !!accessToken
}

/**
 * localStorage에서 토큰 가져오기
 */
export async function getStoredTokens(page: Page): Promise<{
  accessToken: string | null
  refreshToken: string | null
}> {
  return await page.evaluate(() => {
    return {
      accessToken: localStorage.getItem('access_token'),
      refreshToken: localStorage.getItem('refresh_token'),
    }
  })
}

/**
 * localStorage에 토큰 및 user 정보 직접 설정 (API 로그인 후 사용)
 */
export async function setStoredTokens(
  page: Page,
  accessToken: string,
  refreshToken: string,
  user?: any
) {
  await page.evaluate(
    ({ access, refresh, userData }) => {
      // 토큰 설정
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)

      // user 정보가 있으면 auth-storage에 저장 (Zustand persist가 user만 저장함)
      if (userData) {
        const authState = {
          state: {
            user: userData,
          },
          version: 0,
        }
        localStorage.setItem('auth-storage', JSON.stringify(authState))
      }
    },
    { access: accessToken, refresh: refreshToken, userData: user }
  )
}

/**
 * 로그인 상태 초기화
 */
export async function clearAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth-storage')
  })
}
