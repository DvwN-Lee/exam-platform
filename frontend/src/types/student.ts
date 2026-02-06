/**
 * Student type definitions
 */

export interface Student {
  id: number
  username: string
  email: string
  nick_name: string
  student_name: string
  student_id: string
  student_class: string
  student_school: string
  studentsinfo_id: number
  date_joined: string
}

export interface StudentListResponse {
  results: Student[]
  count: number
  next: string | null
  previous: string | null
}

export interface StudentStatistics {
  total_exams_taken: number
  average_score: number
  pass_rate: number
}

export interface ExamHistoryItem {
  exam_id: number
  exam_name: string
  subject_name: string | null
  score: number
  total_score: number
  submitted_at: string | null
}

export interface StudentDetail extends Student {
  statistics: StudentStatistics
  exam_history: ExamHistoryItem[]
}

export interface StudentListParams {
  search?: string
  school?: string
  class?: string
  page?: number
  ordering?: string
}
