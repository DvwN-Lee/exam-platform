import { test, expect } from '@playwright/test'
import { apiGetSubjects, apiCreateQuestion } from '../../helpers/api.helper'
import { setStoredTokens } from '../../helpers/auth.helper'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'

/**
 * Teacher Question 관리 테스트
 */
test.describe('Teacher Question Management', () => {
  const teacherToken = process.env.E2E_TEACHER_TOKEN || ''
  const teacherUsername = process.env.E2E_TEACHER_USERNAME || 'testteacher2'
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD || 'test12345678'

  let subjectId: number

  test.beforeAll(async () => {
    // 과목 조회
    const subjects = await apiGetSubjects()
    if (!subjects.results || subjects.results.length === 0) {
      throw new Error('No subjects found')
    }
    subjectId = subjects.results[0].id
  })

  test('Question 목록 페이지가 렌더링되어야 함', async ({ page }) => {
    // Teacher로 로그인
    await page.goto('/')

    // 기존 계정으로 로그인 (setup에서 생성한 계정이 아닌 기존 테스트 계정 사용)
    await page.goto('/login')
    await page.click('button:has-text("교사")')
    await page.fill('input[id="username"]', teacherUsername)
    await page.fill('input[id="password"]', teacherPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    // Question 관리 페이지로 이동
    await page.goto('/questions')
    await waitForLoadingComplete(page)

    // 페이지 제목 확인
    await expect(page.locator('h1')).toContainText('문제 관리')

    // '문제 생성' 버튼 확인
    await expect(page.locator('button:has-text("문제 생성")')).toBeVisible()

    console.log('✓ Question list page rendered successfully')
  })

  test('Question 생성 페이지가 렌더링되어야 함', async ({ page }) => {
    // Teacher로 로그인
    await page.goto('/login')
    await page.click('button:has-text("교사")')
    await page.fill('input[id="username"]', teacherUsername)
    await page.fill('input[id="password"]', teacherPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    // Question 생성 페이지로 이동
    await page.goto('/questions/new')
    await waitForLoadingComplete(page)

    // 페이지 제목 확인
    await expect(page.locator('h1')).toContainText('문제 생성')

    // 폼 필드 확인
    await expect(page.locator('input[id="name"]')).toBeVisible()
    await expect(page.locator('select[id="subject_id"]')).toBeVisible()
    await expect(page.locator('select[id="tq_type"]')).toBeVisible()
    await expect(page.locator('select[id="tq_degree"]')).toBeVisible()

    console.log('✓ Question creation page rendered successfully')
  })

  test('검색 및 필터링 기능이 동작해야 함', async ({ page }) => {
    // Teacher로 로그인
    await page.goto('/login')
    await page.click('button:has-text("교사")')
    await page.fill('input[id="username"]', teacherUsername)
    await page.fill('input[id="password"]', teacherPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    // Question 목록 페이지로 이동
    await page.goto('/questions')
    await waitForLoadingComplete(page)

    // 검색 입력 필드 확인
    const searchInput = page.locator('input[placeholder*="문제 제목 검색"]')
    await expect(searchInput).toBeVisible()

    // 유형 필터 선택
    const typeFilter = page.locator('select').first()
    await typeFilter.selectOption('xz') // 객관식
    await waitForLoadingComplete(page)

    // 필터 초기화 버튼이 표시되어야 함
    await expect(page.locator('button:has-text("필터 초기화")')).toBeVisible()

    console.log('✓ Search and filtering features work correctly')
  })
})
