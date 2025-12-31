import { test as setup } from '@playwright/test'
import { createAndLoginTeacher, createAndLoginStudent } from '../../helpers/data-factory.helper'
import { setStoredTokens } from '../../helpers/auth.helper'

const TEACHER_STORAGE_STATE = 'e2e/.auth/teacher.json'
const STUDENT_STORAGE_STATE = 'e2e/.auth/student.json'

/**
 * Teacher 계정 생성 및 로그인 상태 저장
 */
setup('setup teacher auth', async ({ page }) => {
  console.log('Setting up teacher authentication...')

  // Teacher 계정 생성 및 로그인
  const teacher = await createAndLoginTeacher()

  console.log(`Teacher account created: ${teacher.user.username}`)
  console.log(`Teacher ID: ${teacher.userId}`)

  // 페이지 이동 및 토큰 설정
  await page.goto('/')
  await setStoredTokens(page, teacher.tokens.access, teacher.tokens.refresh)

  // 인증 상태 저장
  await page.context().storageState({ path: TEACHER_STORAGE_STATE })

  console.log('Teacher authentication saved to:', TEACHER_STORAGE_STATE)

  // 테스트 환경 변수에 정보 저장 (다른 테스트에서 사용)
  process.env.E2E_TEACHER_USERNAME = teacher.user.username
  process.env.E2E_TEACHER_PASSWORD = teacher.user.password
  process.env.E2E_TEACHER_ID = String(teacher.userId)
  process.env.E2E_TEACHER_TOKEN = teacher.tokens.access
})

/**
 * Student 계정 생성 및 로그인 상태 저장
 */
setup('setup student auth', async ({ page }) => {
  console.log('Setting up student authentication...')

  // Student 계정 생성 및 로그인
  const student = await createAndLoginStudent()

  console.log(`Student account created: ${student.user.username}`)
  console.log(`Student ID: ${student.userId}`)

  // 페이지 이동 및 토큰 설정
  await page.goto('/')
  await setStoredTokens(page, student.tokens.access, student.tokens.refresh)

  // 인증 상태 저장
  await page.context().storageState({ path: STUDENT_STORAGE_STATE })

  console.log('Student authentication saved to:', STUDENT_STORAGE_STATE)

  // 테스트 환경 변수에 정보 저장 (다른 테스트에서 사용)
  process.env.E2E_STUDENT_USERNAME = student.user.username
  process.env.E2E_STUDENT_PASSWORD = student.user.password
  process.env.E2E_STUDENT_ID = String(student.userId)
  process.env.E2E_STUDENT_TOKEN = student.tokens.access
})
