import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { LoadingPage } from '@/components/ui/loading'

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
    return <LoadingPage message="인증 확인 중..." />
  }

  if (!isAuthenticated) {
    return null
  }

  if (requireRole && user?.user_type !== requireRole) {
    return null
  }

  return <>{children}</>
}
