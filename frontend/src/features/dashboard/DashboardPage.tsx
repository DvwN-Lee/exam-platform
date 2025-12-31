import { useAuthStore } from '@/stores/authStore'
import { StudentDashboard } from './StudentDashboard'
import { TeacherDashboard } from './TeacherDashboard'

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div>로그인이 필요합니다.</div>
      </div>
    )
  }

  return user.user_type === 'student' ? <StudentDashboard /> : <TeacherDashboard />
}
