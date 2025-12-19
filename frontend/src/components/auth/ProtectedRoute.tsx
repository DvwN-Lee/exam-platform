import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: 'student' | 'teacher'
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, user } = useAuthStore()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/login' })
      return
    }

    if (!isLoading && requireRole && user?.user_type !== requireRole) {
      alert('\uc811\uadfc \uad8c\ud55c\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.')
      navigate({ to: '/' })
    }
  }, [isAuthenticated, isLoading, user, requireRole, navigate])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg">\ub85c\ub529 \uc911...</div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (requireRole && user?.user_type !== requireRole) {
    return null
  }

  return <>{children}</>
}
