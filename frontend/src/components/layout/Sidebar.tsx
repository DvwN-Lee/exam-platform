import { Link, useLocation } from '@tanstack/react-router'
import {
  LayoutDashboard,
  FileCheck,
  TrendingUp,
  BookOpen,
  Settings,
  FileText,
  Files,
  ClipboardCheck,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
}

const studentNavItems: NavItem[] = [
  { label: '대시보드', path: '/dashboard', icon: LayoutDashboard },
  { label: '내 시험', path: '/exams', icon: FileCheck },
  { label: '성적 조회', path: '/exams/results', icon: TrendingUp },
  { label: '과목', path: '/subjects', icon: BookOpen },
  { label: '설정', path: '/settings', icon: Settings },
]

const teacherNavItems: NavItem[] = [
  { label: '대시보드', path: '/dashboard', icon: LayoutDashboard },
  { label: '문제 관리', path: '/questions', icon: FileText },
  { label: '시험지 관리', path: '/testpapers', icon: Files },
  { label: '시험 관리', path: '/examinations', icon: ClipboardCheck },
  { label: '학생 관리', path: '/students', icon: Users },
  { label: '통계 분석', path: '/analytics', icon: TrendingUp },
  { label: '설정', path: '/settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)

  const navItems =
    user?.user_type === 'teacher' ? teacherNavItems : studentNavItems

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[280px] bg-white shadow-sm">
      <div className="flex h-full flex-col overflow-y-auto px-6 py-8">
        {/* Logo */}
        <div className="mb-12 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-primary/70 font-bold text-white">
            E
          </div>
          <span className="text-2xl font-bold text-primary">ExamOnline</span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3.5 font-medium transition-all ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-primary/5 hover:text-primary'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="mt-12 rounded-2xl bg-green-50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-xl font-bold text-white">
              {user?.nick_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="truncate text-[15px] font-semibold text-gray-900">
                {user?.nick_name || '사용자'}
              </h4>
              <p className="truncate text-[13px] text-gray-600">
                {user?.user_type === 'teacher' ? '컴퓨터공학과' : '컴퓨터공학과'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
