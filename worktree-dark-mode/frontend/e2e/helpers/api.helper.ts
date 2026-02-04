import axios, { AxiosInstance, AxiosError } from 'axios'

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

/**
 * E2E 테스트 API 사용 가능 여부 확인
 * E2E_TEST_API_ENABLED 환경변수가 설정되어 있어야 E2E API 사용 가능
 */
export async function verifyE2EApiEnabled(): Promise<boolean> {
  try {
    const client = createApiClient()
    // E2E API health check (존재하지 않으면 404 반환)
    await client.get('/e2e/examinations/', { timeout: 5000 })
    return true
  } catch (error) {
    const axiosError = error as AxiosError
    // 404는 E2E API가 비활성화된 상태
    if (axiosError.response?.status === 404) {
      console.warn(
        '[E2E] E2E API is not enabled. Set E2E_TEST_API_ENABLED=true in backend environment.'
      )
      return false
    }
    // 401/403은 API는 존재하지만 인증이 필요한 상태 (정상)
    if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
      return true
    }
    // 기타 오류는 연결 문제
    console.error('[E2E] Failed to verify E2E API:', axiosError.message)
    return false
  }
}

/**
 * API 클라이언트 생성
 */
export function createApiClient(token?: string): AxiosInstance {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return axios.create({
    baseURL: API_BASE_URL,
    headers,
  })
}

/**
 * 로그인 API 호출
 */
export async function apiLogin(username: string, password: string) {
  const client = createApiClient()
  const response = await client.post('/auth/token/', {
    username,
    password,
  })

  return response.data
}

/**
 * 회원가입 API 호출
 */
export async function apiRegister(userData: {
  username: string
  password: string
  password2: string
  nick_name: string
  email: string
  user_type: 'student' | 'teacher'
  student_name?: string
  teacher_name?: string
  subject_id?: number
}) {
  const client = createApiClient()
  const response = await client.post('/auth/register/', userData)

  return response.data
}

/**
 * 문제 생성 API 호출
 */
export async function apiCreateQuestion(token: string, questionData: {
  subject_id: number
  name: string
  score: number
  tq_type: 'xz' | 'pd' | 'tk'
  tq_degree: 'jd' | 'zd' | 'kn'
  is_share?: boolean
  options?: { option: string; is_right: boolean }[]
}) {
  const client = createApiClient(token)
  const response = await client.post('/questions/', questionData)

  return response.data
}

/**
 * 시험지 생성 API 호출
 */
export async function apiCreateTestPaper(token: string, testPaperData: {
  name: string
  subject_id: number
  tp_degree: 'jd' | 'zd' | 'kn'
  passing_score: number
  questions: { question_id: number; score: number; order: number }[]
}) {
  const client = createApiClient(token)
  const response = await client.post('/testpapers/', testPaperData)

  return response.data
}

/**
 * 시험 생성 API 호출
 */
export async function apiCreateExamination(token: string, examinationData: {
  name: string
  subject_id: number
  start_time: string
  duration: number
  exam_type: 'pt' | 'ts'
  papers: { paper_id: number }[]
}) {
  const client = createApiClient(token)
  try {
    const response = await client.post('/examinations/', examinationData)
    return response.data
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: unknown }; message?: string }
    console.error('시험 생성 실패:', axiosError.response?.data || axiosError.message)
    throw error
  }
}

/**
 * 시험에 학생 등록 API 호출
 */
export async function apiEnrollStudents(token: string, examId: number, studentIds: number[]) {
  const client = createApiClient(token)
  const response = await client.post(`/examinations/${examId}/enroll_students/`, {
    student_ids: studentIds
  })

  return response.data
}

/**
 * 시험 응시 시작 API 호출
 */
export async function apiStartExam(token: string, examId: number) {
  const client = createApiClient(token)
  const response = await client.post(`/examinations/${examId}/start/`)

  return response.data
}

/**
 * 시험 답안 제출 API 호출
 */
export async function apiSubmitExamAnswers(
  token: string,
  examId: number,
  answers: { question: number; answer: string }[]
) {
  const client = createApiClient(token)
  const response = await client.post(`/examinations/${examId}/submit/`, {
    answers,
  })

  return response.data
}

/**
 * 사용자 프로필 조회 API 호출
 */
export async function apiGetProfile(token: string) {
  const client = createApiClient(token)
  const response = await client.get('/users/me/')

  return response.data
}

/**
 * 과목 목록 조회 API 호출
 * Handles both paginated (results array) and non-paginated (direct array) responses
 */
export async function apiGetSubjects(token?: string) {
  const client = createApiClient(token)
  const response = await client.get('/subjects/')

  // Normalize response to always return an array
  const data = response.data
  if (Array.isArray(data)) {
    return data
  }
  // Handle paginated response { results: [...] }
  if (data && Array.isArray(data.results)) {
    return data.results
  }
  // Fallback to empty array
  return []
}

/**
 * Student Dashboard 데이터 조회
 */
export async function apiGetStudentDashboard(token: string) {
  const client = createApiClient(token)
  const response = await client.get('/dashboard/student/')

  return response.data
}

/**
 * Teacher Dashboard 데이터 조회
 */
export async function apiGetTeacherDashboard(token: string) {
  const client = createApiClient(token)
  const response = await client.get('/dashboard/teacher/')

  return response.data
}

/**
 * 문제 목록 조회
 */
export async function apiGetQuestions(token: string, params?: {
  page?: number
  subject?: number
  difficulty?: string
  question_type?: string
}) {
  const client = createApiClient(token)
  const response = await client.get('/questions/my/', { params })

  return response.data
}

/**
 * 시험지 목록 조회
 */
export async function apiGetTestPapers(token: string, params?: {
  page?: number
  subject?: number
}) {
  const client = createApiClient(token)
  const response = await client.get('/testpapers/', { params })

  return response.data
}

/**
 * 시험 목록 조회
 */
export async function apiGetExaminations(token: string, params?: {
  page?: number
  status?: string
}) {
  const client = createApiClient(token)
  const response = await client.get('/examinations/', { params })

  return response.data
}

/**
 * 시험 삭제 API 호출
 */
export async function apiDeleteExamination(token: string, examId: number) {
  const client = createApiClient(token)
  const response = await client.delete(`/examinations/${examId}/`)

  return response.data
}

/**
 * 문제 삭제 API 호출
 */
export async function apiDeleteQuestion(token: string, questionId: number) {
  const client = createApiClient(token)
  const response = await client.delete(`/questions/${questionId}/`)

  return response.data
}

/**
 * 시험지 삭제 API 호출
 */
export async function apiDeleteTestPaper(token: string, testPaperId: number) {
  const client = createApiClient(token)
  const response = await client.delete(`/testpapers/${testPaperId}/`)

  return response.data
}

// ==================== E2E 테스트 전용 API ====================

/**
 * E2E 테스트용 시험 생성 API (시간 검증 없음)
 * 시작 시간을 현재 시간 또는 과거로 설정해도 생성 가능합니다.
 */
export async function apiCreateExaminationE2E(token: string, examinationData: {
  name: string
  subject_id: number
  start_time?: string
  duration: number
  exam_type: 'pt' | 'ts'
  papers: { paper_id: number }[]
}) {
  const client = createApiClient(token)
  try {
    const response = await client.post('/e2e/examinations/', examinationData)
    return response.data
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: unknown }; message?: string }
    console.error('E2E 시험 생성 실패:', axiosError.response?.data || axiosError.message)
    throw error
  }
}

/**
 * E2E 테스트용 학생 등록 API
 */
export async function apiEnrollStudentsE2E(token: string, examId: number, studentIds: number[]) {
  const client = createApiClient(token)
  const response = await client.post(`/e2e/examinations/${examId}/enroll_students/`, {
    student_ids: studentIds
  })
  return response.data
}

/**
 * E2E 테스트용 시험 강제 시작 API (시간 검증 없음)
 * 시험 시작 시간과 관계없이 즉시 시험을 시작합니다.
 */
export async function apiForceStartExam(token: string, examId: number) {
  const client = createApiClient(token)
  const response = await client.post(`/e2e/examinations/${examId}/force_start/`)
  return response.data
}
