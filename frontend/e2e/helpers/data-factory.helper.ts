import {
  apiLogin,
  apiRegister,
  apiCreateQuestion,
  apiCreateTestPaper,
  apiCreateExamination,
  apiEnrollStudents,
  apiDeleteQuestion,
  apiDeleteTestPaper,
  apiDeleteExamination,
  apiGetProfile,
} from './api.helper'

/**
 * 고유한 사용자 생성 (timestamp 기반)
 */
export function createUniqueUser(role: 'student' | 'teacher') {
  const timestamp = Date.now()
  const randomSuffix = Math.floor(Math.random() * 1000)

  const baseData = {
    username: `test_${role}_${timestamp}_${randomSuffix}`,
    password: 'test12345678',
    password2: 'test12345678',
    nick_name: `테스트${role === 'student' ? '학생' : '교사'}${timestamp}`,
    email: `test_${role}_${timestamp}@test.com`,
    user_type: role,
  }

  if (role === 'student') {
    return {
      ...baseData,
      student_name: `테스트학생${timestamp}`,
    }
  } else {
    return {
      ...baseData,
      teacher_name: `테스트교사${timestamp}`,
      subject_id: 1, // 첫 번째 과목 사용 (추후 동적으로 변경 가능)
    }
  }
}

/**
 * 테스트용 학생 계정 생성 및 로그인
 */
export async function createAndLoginStudent() {
  const studentData = createUniqueUser('student')

  // 회원가입
  await apiRegister(studentData)

  // 로그인
  const loginResponse = await apiLogin(studentData.username, studentData.password)

  // 프로필 조회하여 Student profile ID 가져오기
  const profile = await apiGetProfile(loginResponse.access)

  return {
    user: studentData,
    apiUser: loginResponse.user, // API에서 반환한 user 객체
    tokens: {
      access: loginResponse.access,
      refresh: loginResponse.refresh,
    },
    userId: loginResponse.user.id,
    studentId: profile.student_info?.id, // Student profile ID
  }
}

/**
 * 테스트용 교사 계정 생성 및 로그인
 */
export async function createAndLoginTeacher() {
  const teacherData = createUniqueUser('teacher')

  // 회원가입
  await apiRegister(teacherData)

  // 로그인
  const loginResponse = await apiLogin(teacherData.username, teacherData.password)

  return {
    user: teacherData,
    apiUser: loginResponse.user, // API에서 반환한 user 객체
    tokens: {
      access: loginResponse.access,
      refresh: loginResponse.refresh,
    },
    userId: loginResponse.user.id,
  }
}

/**
 * 테스트용 객관식 문제 데이터 생성
 */
export function createMultipleChoiceQuestionData(subjectId: number) {
  const timestamp = Date.now()

  return {
    subject_id: subjectId,
    name: `객관식 문제 ${timestamp}`,
    score: 50,
    tq_type: 'xz' as const, // 객관식
    tq_degree: 'jd' as const, // 쉬움
    is_share: false,
    options: [
      { option: '1', is_right: false },
      { option: '2', is_right: true },
      { option: '3', is_right: false },
      { option: '4', is_right: false },
    ],
  }
}

/**
 * 테스트용 주관식 문제 데이터 생성
 */
export function createShortAnswerQuestionData(subjectId: number) {
  const timestamp = Date.now()

  return {
    subject_id: subjectId,
    name: `주관식 문제 ${timestamp}`,
    score: 50,
    tq_type: 'pd' as const, // 주관식
    tq_degree: 'zd' as const, // 보통
    is_share: false,
    options: [], // 주관식은 옵션 없음
  }
}

/**
 * API를 통한 문제 생성
 */
export async function createQuestion(
  token: string,
  subjectId: number,
  type: 'xz' | 'pd' = 'xz'
) {
  const questionData =
    type === 'xz'
      ? createMultipleChoiceQuestionData(subjectId)
      : createShortAnswerQuestionData(subjectId)

  return await apiCreateQuestion(token, questionData)
}

/**
 * API를 통한 시험지 생성
 */
export async function createTestPaper(
  token: string,
  subjectId: number,
  questionIds: number[]
) {
  const timestamp = Date.now()

  const testPaperData = {
    name: `테스트 시험지 ${timestamp}`,
    subject_id: subjectId,
    tp_degree: 'zd' as const, // 보통 난이도
    passing_score: 60, // 60점 합격
    questions: questionIds.map((questionId, index) => ({
      question_id: questionId,
      score: 50, // 각 문제당 50점
      order: index + 1, // 순서는 1부터 시작
    })),
  }

  return await apiCreateTestPaper(token, testPaperData)
}

/**
 * API를 통한 시험 생성
 */
export async function createExamination(
  token: string,
  subjectId: number,
  testPaperId: number,
  studentIds: number[]
) {
  const timestamp = Date.now()

  // 5초 후에 시작하는 시험 (네트워크 지연 고려, 곧 응시 가능)
  const now = new Date()
  const startTime = new Date(now.getTime() + 5 * 1000).toISOString()

  const examinationData = {
    name: `테스트 시험 ${timestamp}`,
    subject_id: subjectId,
    start_time: startTime,
    duration: 60, // 60분
    exam_type: 'pt' as const, // 보통 유형
    papers: [{ paper_id: testPaperId }],
  }

  const examination = await apiCreateExamination(token, examinationData)

  // 학생 등록
  if (studentIds && studentIds.length > 0) {
    await apiEnrollStudents(token, examination.id, studentIds)
  }

  return examination
}

/**
 * 테스트 데이터 일괄 생성 (문제 -> 시험지 -> 시험)
 */
export async function createFullExamFlow(
  teacherToken: string,
  subjectId: number,
  studentIds: number[]
) {
  // 1. 문제 2개 생성 (객관식 1개, 주관식 1개)
  const question1 = await createQuestion(teacherToken, subjectId, 'xz')
  const question2 = await createQuestion(teacherToken, subjectId, 'pd')

  // 2. 시험지 생성
  const testPaper = await createTestPaper(teacherToken, subjectId, [
    question1.id,
    question2.id,
  ])

  // 3. 시험 생성
  const examination = await createExamination(teacherToken, subjectId, testPaper.id, studentIds)

  return {
    questions: [question1, question2],
    testPaper,
    examination,
  }
}

/**
 * 테스트 데이터 정리
 */
export async function cleanupTestData(
  token: string,
  data: {
    questionIds?: number[]
    testPaperIds?: number[]
    examinationIds?: number[]
  }
) {
  const errors: Error[] = []

  // 시험 삭제 (먼저)
  if (data.examinationIds) {
    for (const id of data.examinationIds) {
      try {
        await apiDeleteExamination(token, id)
      } catch (error) {
        errors.push(error as Error)
      }
    }
  }

  // 시험지 삭제
  if (data.testPaperIds) {
    for (const id of data.testPaperIds) {
      try {
        await apiDeleteTestPaper(token, id)
      } catch (error) {
        errors.push(error as Error)
      }
    }
  }

  // 문제 삭제
  if (data.questionIds) {
    for (const id of data.questionIds) {
      try {
        await apiDeleteQuestion(token, id)
      } catch (error) {
        errors.push(error as Error)
      }
    }
  }

  if (errors.length > 0) {
    console.warn('일부 테스트 데이터 정리 중 오류 발생:', errors)
  }
}

/**
 * 테스트 환경 초기화 (Teacher + Student 생성)
 */
export async function setupTestEnvironment() {
  const teacher = await createAndLoginTeacher()
  const student = await createAndLoginStudent()

  return {
    teacher,
    student,
  }
}
