export interface User {
  id: number
  username: string
  email: string
  nick_name: string
  user_type: 'student' | 'teacher'
  created_at: string
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
  password_confirm: string
  nick_name: string
  user_type: 'student' | 'teacher'
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
  new_password_confirm: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}
