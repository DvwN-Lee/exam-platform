import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, AuthState } from '@/types/auth'

/**
 * LocalStorage 안전하게 읽기
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * LocalStorage 안전하게 쓰기
 */
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage 용량 초과 또는 접근 불가 시 무시
  }
}

/**
 * LocalStorage 안전하게 삭제
 */
function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // 무시
  }
}

interface AuthStore extends AuthState {
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setUser: (user: User) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
  initializeAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, accessToken, refreshToken) => {
        safeSetItem('access_token', accessToken)
        safeSetItem('refresh_token', refreshToken)
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      setUser: (user) => {
        set({ user })
      },

      setTokens: (accessToken, refreshToken) => {
        safeSetItem('access_token', accessToken)
        safeSetItem('refresh_token', refreshToken)
        set({ accessToken, refreshToken })
      },

      logout: () => {
        safeRemoveItem('access_token')
        safeRemoveItem('refresh_token')
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      initializeAuth: () => {
        const accessToken = safeGetItem('access_token')
        const refreshToken = safeGetItem('refresh_token')

        if (accessToken && refreshToken) {
          set({
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } else {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
)
