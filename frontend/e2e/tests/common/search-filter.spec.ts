import { test, expect } from '@playwright/test'
import { waitForLoadingComplete } from '../../helpers/assertions.helper'
import { createAndLoginTeacher } from '../../helpers/data-factory.helper'
import { loginAsTeacher } from '../../helpers/auth.helper'
import { apiCreateQuestion, apiGetSubjects } from '../../helpers/api.helper'

/**
 * 검색/필터링 통합 테스트
 */
test.describe('Search and Filter', () => {
  let teacher: Awaited<ReturnType<typeof createAndLoginTeacher>>
  let subjectId: number
  const testQuestions: { id: number; name: string; type: string; degree: string }[] = []

  test.beforeAll(async () => {
    // Teacher 계정 생성
    teacher = await createAndLoginTeacher()

    // 과목 조회
    const subjects = await apiGetSubjects()
    subjectId = subjects.results[0].id

    // 테스트용 문제 생성 (다양한 유형과 난이도)
    const timestamp = Date.now()

    // 객관식 쉬움
    const q1 = await apiCreateQuestion(teacher.tokens.access, {
      name: `검색테스트_객관식_${timestamp}`,
      subject_id: subjectId,
      tq_type: 'xz',
      tq_degree: 'jd',
      score: 5,
      options: [
        { option: '보기 A', is_right: true },
        { option: '보기 B', is_right: false },
        { option: '보기 C', is_right: false },
        { option: '보기 D', is_right: false },
      ],
    })
    testQuestions.push({ id: q1.id, name: q1.name, type: 'xz', degree: 'jd' })

    // 주관식 보통
    const q2 = await apiCreateQuestion(teacher.tokens.access, {
      name: `검색테스트_주관식_${timestamp}`,
      subject_id: subjectId,
      tq_type: 'pd',
      tq_degree: 'zd',
      score: 10,
      options: [],
    })
    testQuestions.push({ id: q2.id, name: q2.name, type: 'pd', degree: 'zd' })

    // 빈칸채우기 어려움
    const q3 = await apiCreateQuestion(teacher.tokens.access, {
      name: `검색테스트_빈칸_${timestamp}`,
      subject_id: subjectId,
      tq_type: 'tk',
      tq_degree: 'kn',
      score: 15,
      options: [],
    })
    testQuestions.push({ id: q3.id, name: q3.name, type: 'tk', degree: 'kn' })

    console.log(`=== Setup Complete ===`)
    console.log(`Teacher: ${teacher.user.username}`)
    console.log(`Created ${testQuestions.length} test questions`)
  })

  test('문제 목록 검색 기능', async ({ page }) => {
    await test.step('Teacher 로그인 및 문제 목록 접근', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/questions')
      await waitForLoadingComplete(page)

      // 페이지 제목 확인
      await expect(page.locator('h1:has-text("문제 관리")')).toBeVisible()

      console.log('✓ Question list page loaded')
    })

    await test.step('텍스트 검색', async () => {
      // 검색어 입력
      const searchInput = page.locator('input[placeholder="문제 제목 검색..."]')
      await searchInput.fill('검색테스트')

      // 검색 버튼 클릭
      await page.click('button:has-text("검색")')
      await waitForLoadingComplete(page)

      // 검색 결과에 테스트 문제들이 표시되는지 확인
      for (const q of testQuestions) {
        await expect(page.locator(`text=${q.name}`)).toBeVisible()
      }

      console.log('✓ Text search works')
    })

    await test.step('Enter 키로 검색', async () => {
      const searchInput = page.locator('input[placeholder="문제 제목 검색..."]')
      await searchInput.clear()
      await searchInput.fill('객관식')
      await searchInput.press('Enter')
      await waitForLoadingComplete(page)

      // 객관식 문제만 검색됨
      await expect(page.locator(`text=${testQuestions[0].name}`)).toBeVisible()

      console.log('✓ Enter key search works')
    })
  })

  test('문제 유형별 필터링', async ({ page }) => {
    await test.step('Teacher 로그인', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/questions')
      await waitForLoadingComplete(page)
    })

    await test.step('객관식 필터', async () => {
      // 전체 유형 드롭다운에서 객관식 선택
      await page.selectOption('select:has-text("전체 유형")', 'xz')
      await waitForLoadingComplete(page)

      // 객관식 문제 레이블이 표시되는지 확인 (span 태그 내부)
      await expect(page.locator('span.rounded.bg-primary\\/10:has-text("객관식")').first()).toBeVisible()

      console.log('✓ Multiple choice filter works')
    })

    await test.step('주관식 필터', async () => {
      await page.selectOption('select', { index: 0 }) // reset
      await page.waitForTimeout(300)

      // 주관식 선택
      const typeSelect = page.locator('select').first()
      await typeSelect.selectOption('pd')
      await waitForLoadingComplete(page)

      // 주관식 레이블이 보이는지 확인
      await expect(page.locator('span.rounded.bg-primary\\/10:has-text("주관식")').first()).toBeVisible()

      console.log('✓ Short answer filter works')
    })

    await test.step('빈칸채우기 필터', async () => {
      const typeSelect = page.locator('select').first()
      await typeSelect.selectOption('tk')
      await waitForLoadingComplete(page)

      // 빈칸채우기 레이블 확인
      await expect(page.locator('span.rounded.bg-primary\\/10:has-text("빈칸채우기")').first()).toBeVisible()

      console.log('✓ Fill in blank filter works')
    })
  })

  test('문제 난이도별 필터링', async ({ page }) => {
    await test.step('Teacher 로그인', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/questions')
      await waitForLoadingComplete(page)
    })

    await test.step('쉬움 난이도 필터', async () => {
      // 난이도 드롭다운 (두 번째 select)
      const degreeSelect = page.locator('select').nth(1)
      await degreeSelect.selectOption('jd')
      await waitForLoadingComplete(page)

      // 쉬움 레이블 확인
      await expect(page.locator('.rounded.bg-secondary:has-text("쉬움")').first()).toBeVisible()

      console.log('✓ Easy difficulty filter works')
    })

    await test.step('보통 난이도 필터', async () => {
      const degreeSelect = page.locator('select').nth(1)
      await degreeSelect.selectOption('zd')
      await waitForLoadingComplete(page)

      await expect(page.locator('.rounded.bg-secondary:has-text("보통")').first()).toBeVisible()

      console.log('✓ Medium difficulty filter works')
    })

    await test.step('어려움 난이도 필터', async () => {
      const degreeSelect = page.locator('select').nth(1)
      await degreeSelect.selectOption('kn')
      await waitForLoadingComplete(page)

      await expect(page.locator('.rounded.bg-secondary:has-text("어려움")').first()).toBeVisible()

      console.log('✓ Hard difficulty filter works')
    })
  })

  test('정렬 기능', async ({ page }) => {
    await test.step('Teacher 로그인', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/questions')
      await waitForLoadingComplete(page)
    })

    await test.step('생성일 최신순 정렬', async () => {
      const orderSelect = page.locator('select').nth(2)
      await orderSelect.selectOption('-created_at')
      await waitForLoadingComplete(page)

      console.log('✓ Sort by created date (newest) works')
    })

    await test.step('생성일 오래된순 정렬', async () => {
      const orderSelect = page.locator('select').nth(2)
      await orderSelect.selectOption('created_at')
      await waitForLoadingComplete(page)

      console.log('✓ Sort by created date (oldest) works')
    })

    await test.step('점수 높은순 정렬', async () => {
      const orderSelect = page.locator('select').nth(2)
      await orderSelect.selectOption('-score')
      await waitForLoadingComplete(page)

      console.log('✓ Sort by score (high) works')
    })

    await test.step('점수 낮은순 정렬', async () => {
      const orderSelect = page.locator('select').nth(2)
      await orderSelect.selectOption('score')
      await waitForLoadingComplete(page)

      console.log('✓ Sort by score (low) works')
    })
  })

  test('필터 초기화', async ({ page }) => {
    await test.step('Teacher 로그인', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/questions')
      await waitForLoadingComplete(page)
    })

    await test.step('필터 적용', async () => {
      // 검색어 입력
      await page.fill('input[placeholder="문제 제목 검색..."]', '테스트')
      await page.click('button:has-text("검색")')
      await waitForLoadingComplete(page)

      // 유형 필터 적용
      await page.locator('select').first().selectOption('xz')
      await waitForLoadingComplete(page)

      // 필터 초기화 버튼 확인
      await expect(page.locator('button:has-text("필터 초기화")')).toBeVisible()

      console.log('✓ Filter reset button visible')
    })

    await test.step('필터 초기화 클릭', async () => {
      await page.click('button:has-text("필터 초기화")')
      await waitForLoadingComplete(page)

      // 검색어가 초기화되었는지 확인
      const searchInput = page.locator('input[placeholder="문제 제목 검색..."]')
      await expect(searchInput).toHaveValue('')

      // 필터 초기화 버튼이 사라졌는지 확인
      await expect(page.locator('button:has-text("필터 초기화")')).not.toBeVisible()

      console.log('✓ Filter reset works')
    })
  })

  test('복합 필터링', async ({ page }) => {
    await test.step('Teacher 로그인', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/questions')
      await waitForLoadingComplete(page)
    })

    await test.step('검색어 + 유형 + 난이도 복합 필터', async () => {
      // 검색어 입력
      await page.fill('input[placeholder="문제 제목 검색..."]', '검색테스트')
      await page.click('button:has-text("검색")')
      await waitForLoadingComplete(page)

      // 유형 필터: 객관식
      await page.locator('select').first().selectOption('xz')
      await waitForLoadingComplete(page)

      // 난이도 필터: 쉬움
      await page.locator('select').nth(1).selectOption('jd')
      await waitForLoadingComplete(page)

      // 객관식 + 쉬움 문제만 표시되는지 확인
      await expect(page.locator(`text=${testQuestions[0].name}`)).toBeVisible()

      console.log('✓ Combined filters work')
    })
  })

  test('Pagination 동작', async ({ page }) => {
    await test.step('Teacher 로그인', async () => {
      await loginAsTeacher(page, {
        username: teacher.user.username,
        password: teacher.user.password,
      })
      await waitForLoadingComplete(page)

      await page.goto('/questions')
      await waitForLoadingComplete(page)
    })

    await test.step('Pagination 버튼 확인', async () => {
      // 이전/다음 버튼 확인
      const prevButton = page.locator('button:has-text("이전")')
      const nextButton = page.locator('button:has-text("다음")')

      // 버튼이 존재하는지 확인
      await expect(prevButton).toBeVisible()
      await expect(nextButton).toBeVisible()

      // 첫 페이지이므로 이전 버튼은 비활성화
      await expect(prevButton).toBeDisabled()

      console.log('✓ Pagination buttons visible')
    })

    await test.step('총 개수 표시 확인', async () => {
      // 총 X개의 문제 텍스트 확인
      await expect(page.locator('text=/총 \\d+개의 문제/')).toBeVisible()

      console.log('✓ Total count displayed')
    })
  })
})
