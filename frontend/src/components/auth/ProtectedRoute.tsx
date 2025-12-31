import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
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
      toast.error('접근 권한이 없습니다.')
      navigate({ to: '/' })
    }
  }, [isAuthenticated, isLoading, user, requireRole, navigate])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg">로딩 중...</div>
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
