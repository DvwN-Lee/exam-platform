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
  questions: Array<{
    question_id: number
    score: number
    order: number
  }>
}

export interface UpdateTestPaperRequest {
  name?: string
  subject_id?: number
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
  testpaper: TestPaper
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
  exam_name: string
  testpaper_id: number
  start_time: string
  end_time: string
  is_public?: boolean
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
