export interface StudentInfo {
  student_name: string
  student_id: string
  student_class: string
  student_school: string
}

export interface TeacherInfo {
  teacher_name: string
  work_years: number
  teacher_school: string
  subject: {
    id: number
    subject_name: string
    create_time: string
  }
}

export interface User {
  id: number
  username: string
  email: string
  nick_name: string
  gender: 'male' | 'female'
  mobile: string | null
  user_type: 'student' | 'teacher'
  age: number
  image: string
  created_at: string
  student_info?: StudentInfo
  teacher_info?: TeacherInfo
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  password2: string
  nick_name: string
  user_type: 'student' | 'teacher'
  // Student fields
  student_name?: string
  // Teacher fields
  teacher_name?: string
  subject_id?: number
}

export interface RegisterResponse {
  user: User
  message: string
}

export interface ProfileUpdateRequest {
  email?: string
  nick_name?: string
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
  new_password2: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}
