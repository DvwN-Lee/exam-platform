import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
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
  setAuth: (user: User, accessToken: string) => void
  setUser: (user: User) => void
  setTokens: (accessToken: string) => void
  logout: () => void
  initializeAuth: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: (user, accessToken) => {
        safeSetItem('access_token', accessToken)
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      setUser: (user) => {
        set({ user })
      },

      setTokens: (accessToken) => {
        safeSetItem('access_token', accessToken)
        set({ accessToken })
      },

      logout: () => {
        safeRemoveItem('access_token')
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      initializeAuth: async () => {
        const accessToken = safeGetItem('access_token')

        if (!accessToken) {
          set({ isLoading: false })
          return
        }

        // Zustand persist에서 user가 이미 복원된 경우 API 호출 없이 진행
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          set({ accessToken, isAuthenticated: true, isLoading: false })
          return
        }

        // user가 없으면 Profile API로 복원 시도
        // 순환 참조 방지를 위해 bare axios 사용 (apiClient -> authStore 순환)
        try {
          const response = await axios.get<User>(
            `${import.meta.env.VITE_API_BASE_URL}/users/me/`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              withCredentials: true,
            }
          )
          set({
            user: response.data,
            accessToken,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch {
          // Token 무효 → 로그아웃 처리
          safeRemoveItem('access_token')
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          })
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
