export type QuestionType = 'xz' | 'pd' | 'tk' // xz: 객관식, pd: 주관식, tk: 빈칸채우기
export type QuestionDegree = 'jd' | 'zd' | 'kn' // jd: 쉬움, zd: 보통, kn: 어려움

export interface QuestionOption {
  id?: number
  option: string
  is_right: boolean
}

export interface Subject {
  id: number
  subject_name: string
}

export interface Question {
  id: number
  name: string
  subject: Subject
  score: number
  tq_type: QuestionType
  tq_degree: QuestionDegree
  tq_img?: string
  is_share: boolean
  is_del: boolean
  creat_user: {
    id: number
    nick_name: string
  }
  options: QuestionOption[]
  created_at: string
  updated_at: string
}

export interface QuestionListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Question[]
}

export interface CreateQuestionRequest {
  name: string
  subject_id: number
  score: number
  tq_type: QuestionType
  tq_degree: QuestionDegree
  tq_img?: string
  options: Omit<QuestionOption, 'id'>[]
}

export interface UpdateQuestionRequest {
  name?: string
  subject_id?: number
  score?: number
  tq_type?: QuestionType
  tq_degree?: QuestionDegree
  tq_img?: string
  options?: QuestionOption[]
}

export interface QuestionFilters {
  subject?: number
  tq_type?: QuestionType
  tq_degree?: QuestionDegree
  score_min?: number
  score_max?: number
  search?: string
  ordering?: string
  page?: number
}
