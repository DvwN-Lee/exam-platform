import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke Tests 전용 Playwright 설정
 *
 * 기존 playwright.config.ts는 chromium Project가 setup Project(auth.setup.ts)에 의존한다.
 * Smoke Tests는 인증이 필요 없으므로 auth setup 의존성을 제거한 별도 Config를 사용한다.
 */
export default defineConfig({
  testDir: './e2e/tests/smoke',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
