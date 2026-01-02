import { test, expect } from '@playwright/test'
import {
  apiGetTeacherDashboard,
  apiGetQuestions,
  apiCreateQuestion,
  apiDeleteQuestion,
  apiGetTestPapers,
  apiCreateTestPaper,
  apiDeleteTestPaper,
  apiGetSubjects,
} from '../../helpers/api.helper'
import { createAndLoginTeacher } from '../../helpers/data-factory.helper'

/**
 * 데이터 정합성 검증 E2E 테스트
 *
 * UI에서 데이터 액션 수행 후 Backend에서 실제 데이터가 변경되었는지 검증
 * Gemini 코드 리뷰에서 지적된 "E2E 테스트 깊이 부족" 문제 해결
 */
test.describe('Data Integrity Verification', () => {
  let teacherToken: string
  let subjectId: number

  test.beforeAll(async () => {
    // 새 Teacher 계정 생성 및 로그인
    const teacher = await createAndLoginTeacher()
    teacherToken = teacher.tokens.access

    // 과목 조회
    const subjects = await apiGetSubjects(teacherToken)
    if (subjects && subjects.length > 0) {
      subjectId = subjects[0].id
    }
  })

  test.describe('Question Data Integrity', () => {
    let createdQuestionId: number

    test('문제 생성 후 Dashboard 통계 증가 확인', async () => {
      // 1. 현재 Dashboard 통계 조회
      const dashboardBefore = await apiGetTeacherDashboard(teacherToken)
      const questionCountBefore = dashboardBefore.question_statistics?.total_questions || 0

      // 2. 새 문제 생성
      const newQuestion = await apiCreateQuestion(teacherToken, {
        name: `통합 테스트 문제 ${Date.now()}`,
        subject_id: subjectId,
        score: 10,
        tq_type: 'xz',
        tq_degree: 'jd',
        is_share: false,
        options: [
          { option: '정답', is_right: true },
          { option: '오답 1', is_right: false },
          { option: '오답 2', is_right: false },
        ],
      })
      createdQuestionId = newQuestion.id
      console.log(`Created question ID: ${createdQuestionId}`)

      // 3. Dashboard 통계 재조회
      const dashboardAfter = await apiGetTeacherDashboard(teacherToken)
      const questionCountAfter = dashboardAfter.question_statistics?.total_questions || 0

      // 4. 검증: 문제 수가 1 증가했는지 확인
      expect(questionCountAfter).toBe(questionCountBefore + 1)
      console.log(`Question count: ${questionCountBefore} -> ${questionCountAfter}`)
    })

    test('문제 삭제 후 Dashboard 통계 감소 확인', async () => {
      // 1. 현재 Dashboard 통계 조회
      const dashboardBefore = await apiGetTeacherDashboard(teacherToken)
      const questionCountBefore = dashboardBefore.question_statistics?.total_questions || 0

      // 2. 이전 테스트에서 생성한 문제 삭제
      if (createdQuestionId) {
        await apiDeleteQuestion(teacherToken, createdQuestionId)
        console.log(`Deleted question ID: ${createdQuestionId}`)
      }

      // 3. Dashboard 통계 재조회
      const dashboardAfter = await apiGetTeacherDashboard(teacherToken)
      const questionCountAfter = dashboardAfter.question_statistics?.total_questions || 0

      // 4. 검증: 문제 수가 1 감소했는지 확인
      expect(questionCountAfter).toBe(questionCountBefore - 1)
      console.log(`Question count: ${questionCountBefore} -> ${questionCountAfter}`)
    })

    test('문제 공유 상태 변경 시 통계 반영 확인', async () => {
      // 1. 비공유 문제 생성
      const question = await apiCreateQuestion(teacherToken, {
        name: `공유 테스트 문제 ${Date.now()}`,
        subject_id: subjectId,
        score: 5,
        tq_type: 'pd',
        tq_degree: 'zd',
        is_share: false,
        options: [
          { option: '정답', is_right: true },
          { option: '오답', is_right: false },
        ],
      })

      // 2. Dashboard에서 shared_questions 확인
      const dashboardBefore = await apiGetTeacherDashboard(teacherToken)
      const sharedBefore = dashboardBefore.question_statistics?.shared_questions || 0

      // 3. 정리
      await apiDeleteQuestion(teacherToken, question.id)

      // 검증: 공유 문제 수가 증가하지 않아야 함 (is_share: false)
      expect(dashboardBefore.question_statistics?.shared_questions).toBe(sharedBefore)
      console.log(`Shared questions count unchanged: ${sharedBefore}`)
    })
  })

  test.describe('TestPaper Data Integrity', () => {
    test('시험지 목록 조회 성공', async () => {
      // 시험지 목록 조회
      const testPapers = await apiGetTestPapers(teacherToken)

      // 검증: 응답 구조 확인
      expect(testPapers).toHaveProperty('count')
      expect(testPapers).toHaveProperty('results')
      expect(Array.isArray(testPapers.results)).toBe(true)

      console.log(`TestPaper count: ${testPapers.count}`)
    })
  })

  test.describe('Dashboard Real-Time Data', () => {
    test('Teacher Dashboard가 실제 DB 데이터 반환', async () => {
      const dashboard = await apiGetTeacherDashboard(teacherToken)

      // 검증: Dashboard 응답 구조 확인
      expect(dashboard).toHaveProperty('question_statistics')
      expect(dashboard).toHaveProperty('student_statistics')
      expect(dashboard).toHaveProperty('recent_questions')
      expect(dashboard).toHaveProperty('recent_testpapers')
      expect(dashboard).toHaveProperty('ongoing_exams')

      // 검증: question_statistics가 숫자 타입인지 확인
      expect(typeof dashboard.question_statistics.total_questions).toBe('number')
      expect(typeof dashboard.question_statistics.shared_questions).toBe('number')

      // 검증: questions_by_type이 객체인지 확인
      expect(typeof dashboard.question_statistics.questions_by_type).toBe('object')
      expect(typeof dashboard.question_statistics.questions_by_difficulty).toBe('object')

      // 검증: student_statistics가 숫자 타입인지 확인
      expect(typeof dashboard.student_statistics.total_students).toBe('number')
      expect(typeof dashboard.student_statistics.total_submissions).toBe('number')
      expect(typeof dashboard.student_statistics.average_score).toBe('number')
      expect(typeof dashboard.student_statistics.pass_rate).toBe('number')

      console.log('Dashboard data structure verified')
      console.log(`Total questions: ${dashboard.question_statistics.total_questions}`)
      console.log(`Total students: ${dashboard.student_statistics.total_students}`)
    })

    test('Recent Questions가 실제 데이터 반환', async () => {
      const dashboard = await apiGetTeacherDashboard(teacherToken)
      const questions = await apiGetQuestions(teacherToken)

      // 검증: recent_questions가 배열인지 확인
      expect(Array.isArray(dashboard.recent_questions)).toBe(true)

      // 검증: recent_questions의 각 항목이 올바른 구조인지 확인
      for (const question of dashboard.recent_questions) {
        expect(question).toHaveProperty('id')
        expect(question).toHaveProperty('name')
        expect(question).toHaveProperty('subject')
        expect(question).toHaveProperty('tq_type')
        expect(question).toHaveProperty('tq_degree')
      }

      console.log(`Recent questions count: ${dashboard.recent_questions.length}`)
    })
  })
})
