import type { Question, Subject } from './question'

export interface TestPaperQuestion {
  id: number
  question: Question
  score: number
  order: number
}

export interface TestPaper {
  id: number
  name: string
  subject: Subject
  tp_degree: 'jd' | 'zd' | 'kn'
  tp_degree_display: string
  total_score: number
  passing_score: number
  question_count: number
  creat_user: {
    id: number
    nick_name: string
  }
  questions: TestPaperQuestion[]
  created_at: string
  updated_at: string
}

export interface TestPaperListResponse {
  count: number
  next: string | null
  previous: string | null
  results: TestPaper[]
}

export interface CreateTestPaperRequest {
  name: string
  subject_id: number
  tp_degree?: 'jd' | 'zd' | 'kn' // 쉬움/중간/어려움
  passing_score?: number
  questions: Array<{
    question_id: number
    score: number
    order: number
  }>
}

export interface UpdateTestPaperRequest {
  name?: string
  subject_id?: number
  tp_degree?: 'jd' | 'zd' | 'kn'
  passing_score?: number
  questions?: Array<{
    id?: number
    question_id: number
    score: number
    order: number
  }>
}

export interface Examination {
  id: number
  exam_name: string
  testpaper: TestPaper | {
    id: number
    name: string
    subject: Subject
    question_count: number
    questions?: TestPaperQuestion[]
  }
  start_time: string
  end_time: string
  is_public: boolean
  creat_user: {
    id: number
    nick_name: string
  }
  created_at: string
  updated_at: string
}

export interface ExaminationListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Examination[]
}

export interface CreateExaminationRequest {
  name: string
  subject_id: number
  start_time: string
  duration: number // 시험 시간 (분)
  exam_type?: string
  papers: Array<{
    paper_id: number
  }>
}

export interface UpdateExaminationRequest {
  exam_name?: string
  testpaper_id?: number
  start_time?: string
  end_time?: string
  is_public?: boolean
}

export type ExaminationStatus = 'upcoming' | 'ongoing' | 'completed'

export interface ExaminationFilters {
  status?: ExaminationStatus
  search?: string
  ordering?: string
  page?: number
}
