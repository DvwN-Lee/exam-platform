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

export interface StudentListParams {
  search?: string
  school?: string
  class?: string
  page?: number
}
