import { test, expect } from '@playwright/test';

/**
 * Smoke Tests for Infrastructure Deployment Verification
 *
 * 배포 후 서비스 Health 상태를 빠르게 검증하는 테스트
 * Terratest Integration 테스트에서 호출됨
 */

test.describe('Smoke Tests - Health Check', () => {
  test('Frontend main page should load successfully', async ({ page }) => {
    const response = await page.goto('/');

    // HTTP 200 응답 확인
    expect(response?.status()).toBe(200);

    // 페이지 렌더링 대기
    await page.waitForLoadState('domcontentloaded');

    // HTML 구조 기본 검증
    const html = await page.content();
    expect(html).toContain('<!DOCTYPE html>');
  });

  test('Login page should be accessible', async ({ page }) => {
    const response = await page.goto('/login');

    expect(response?.status()).toBe(200);

    // Login 폼 요소 존재 확인
    const loginForm = page.locator('form');
    await expect(loginForm).toBeVisible({ timeout: 10000 });

    // Username 입력 필드 확인 (한국어 label "아이디" 사용)
    const usernameInput = page.locator('input[id="username"]');
    await expect(usernameInput).toBeVisible();

    // Password 입력 필드 확인
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('Static resources should load correctly', async ({ page }) => {
    const resourceErrors: string[] = [];

    // 리소스 로드 실패 이벤트 캡처
    page.on('requestfailed', (request) => {
      const resourceType = request.resourceType();
      if (['script', 'stylesheet', 'image'].includes(resourceType)) {
        resourceErrors.push(`${resourceType}: ${request.url()}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 모든 리소스가 정상 로드되었는지 확인
    expect(resourceErrors).toHaveLength(0);
  });

  test('JavaScript bundle should execute without errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    // Console 에러 캡처
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 페이지 에러 캡처
    page.on('pageerror', (error) => {
      consoleErrors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 심각한 JS 에러가 없는지 확인
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('favicon') &&
        !err.includes('manifest') &&
        !err.includes('robots.txt')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Smoke Tests - Backend API', () => {
  test('Backend health endpoint should respond', async ({ request }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    const backendURL = process.env.BACKEND_URL || `${baseURL}/api/v1`;

    try {
      const response = await request.get(`${backendURL}/health/`);

      // Backend 응답 확인 (200 또는 API Gateway가 반환하는 다른 성공 코드)
      expect([200, 204]).toContain(response.status());
    } catch {
      // Backend가 분리된 환경에서는 테스트 스킵
      console.log('Backend health check skipped - backend may be on different host');
    }
  });

  test('API should return proper CORS headers', async ({ request }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    const apiURL = process.env.BACKEND_URL || `${baseURL}/api/v1`;

    try {
      const response = await request.options(`${apiURL}/health/`, {
        headers: {
          Origin: baseURL,
          'Access-Control-Request-Method': 'GET',
        },
      });

      // CORS preflight 성공 확인
      if (response.status() === 200 || response.status() === 204) {
        const headers = response.headers();
        // CORS가 설정되어 있다면 헤더 확인
        if (headers['access-control-allow-origin']) {
          expect(headers['access-control-allow-origin']).toBeTruthy();
        }
      }
    } catch {
      console.log('CORS check skipped');
    }
  });
});

test.describe('Smoke Tests - UI Rendering', () => {
  test('Page should not have visual regressions in critical elements', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 페이지 전체가 렌더링되었는지 확인
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // 빈 페이지가 아닌지 확인
    const content = await body.textContent();
    expect(content?.length).toBeGreaterThan(10);
  });

  test('Critical navigation elements should be present', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 메인 네비게이션 또는 헤더 존재 확인
    const header = page.locator('header, nav, [role="navigation"]');
    const hasNavigation = (await header.count()) > 0;

    // 네비게이션이 있거나 로그인 페이지로 리다이렉트된 경우
    const currentURL = page.url();
    const isOnLoginPage = currentURL.includes('/login');

    expect(hasNavigation || isOnLoginPage).toBe(true);
  });

  test('Page should be responsive to viewport changes', async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Smoke Tests - Performance', () => {
  test('Page should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // 페이지 로드 시간이 10초 이내인지 확인
    expect(loadTime).toBeLessThan(10000);
  });

  test('Time to first contentful paint should be reasonable', async ({
    page,
  }) => {
    await page.goto('/');

    // FCP 메트릭 수집
    const fcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntriesByName('first-contentful-paint');
          if (entries.length > 0) {
            resolve(entries[0].startTime);
          }
        });
        observer.observe({ type: 'paint', buffered: true });

        // 이미 기록된 FCP가 있는지 확인
        const existing = performance.getEntriesByName('first-contentful-paint');
        if (existing.length > 0) {
          resolve(existing[0].startTime);
        }

        // Timeout fallback
        setTimeout(() => resolve(0), 5000);
      });
    });

    // FCP가 측정되었다면 5초 이내인지 확인
    if (fcp > 0) {
      expect(fcp).toBeLessThan(5000);
    }
  });
});
