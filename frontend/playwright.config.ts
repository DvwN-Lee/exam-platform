import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 테스트 설정
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e/tests',

  /* 테스트 실행 설정 */
  fullyParallel: false, // 순차 실행 (상태 의존성 때문)
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 테스트 간 상태 공유를 위해 단일 worker

  /* 리포터 설정 */
  reporter: [
    ['html', { outputFolder: 'e2e/reports' }],
    ['json', { outputFile: 'e2e/reports/results.json' }],
    ['list'],
  ],

  /* 공통 테스트 설정 */
  use: {
    baseURL: process.env.VITE_TEST_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* 브라우저 프로젝트 설정 */
  projects: [
    // Setup project - 로그인 상태 저장
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Chromium 테스트
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },
  ],

  /* 개발 서버 설정 */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
