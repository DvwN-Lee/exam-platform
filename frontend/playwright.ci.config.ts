import { defineConfig, devices } from '@playwright/test';

/**
 * CI 환경용 Playwright 설정
 *
 * edge-cases, layout, validation 디렉토리를 제외하여 CI 실행 시간을 단축한다.
 * - Full 테스트: 185개 (로컬, Manual full)
 * - CI 테스트: ~100개 (Main Push)
 * - Smoke 테스트: ~10개 (PR)
 */
export default defineConfig({
  testDir: './e2e/tests',

  // CI 제외 디렉토리: edge-cases (48) + layout (30) + validation (7) = 85개 제외
  testIgnore: [
    '**/edge-cases/**',
    '**/layout/**',
    '**/validation/**',
  ],

  fullyParallel: false,
  forbidOnly: true,
  retries: 2,
  workers: 1,

  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.VITE_TEST_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
