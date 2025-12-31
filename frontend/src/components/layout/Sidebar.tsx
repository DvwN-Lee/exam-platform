import { Link, useLocation } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  FileCheck,
  TrendingUp,
  Settings,
  FileText,
  Files,
  ClipboardCheck,
  Users,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSidebarStore } from '@/stores/sidebarStore'
import { cn } from '@/lib/utils'
import { STAGGER, DURATION, EASING } from '@/lib/animations'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
}

const studentNavItems: NavItem[] = [
  { label: '대시보드', path: '/dashboard', icon: LayoutDashboard },
  { label: '내 시험', path: '/exams', icon: FileCheck },
  { label: '성적 조회', path: '/exams/results', icon: TrendingUp },
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
  const { isOpen, isCollapsed, close } = useSidebarStore()

  const navItems =
    user?.user_type === 'teacher' ? teacherNavItems : studentNavItems

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-white shadow-sm transition-all duration-300',
          // Mobile: 숨김/슬라이드
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
          // Tablet/Desktop: 반응형 width
          'md:w-[64px] lg:w-[280px]',
          isCollapsed && 'lg:w-[64px]'
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto px-6 py-8">
          {/* Logo - 클릭 가능 */}
          <Link
            to="/dashboard"
            className="mb-12 flex items-center gap-2 transition-colors hover:opacity-80"
            onClick={() => isOpen && close()}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-primary/70 font-bold text-white">
              E
            </div>
            <span
              className={cn(
                'text-2xl font-bold text-primary transition-opacity',
                'md:hidden lg:block',
                isCollapsed && 'lg:hidden'
              )}
            >
              ExamOnline
            </span>
          </Link>

          {/* Navigation Menu */}
          <nav className="flex-1">
            <motion.ul
              className="space-y-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: STAGGER.fast,
                    delayChildren: 0.2,
                  },
                },
              }}
            >
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)

                return (
                  <motion.li
                    key={item.path}
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: {
                          duration: DURATION.normal,
                          ease: EASING.easeOut,
                        },
                      },
                    }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => isOpen && close()}
                      className={cn(
                        'relative flex items-center gap-3 rounded-xl px-4 py-3.5 font-medium transition-colors',
                        active
                          ? 'text-primary'
                          : 'text-gray-600 hover:bg-primary/5 hover:text-primary',
                        'md:justify-center lg:justify-start',
                        isCollapsed && 'lg:justify-center'
                      )}
                      title={item.label}
                    >
                      {active && (
                        <motion.div
                          layoutId="activeNavIndicator"
                          className="absolute inset-0 rounded-xl bg-primary/10"
                          transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 30,
                          }}
                        />
                      )}
                      <Icon className="relative h-5 w-5 shrink-0" />
                      <span
                        className={cn(
                          'relative transition-opacity',
                          'md:hidden lg:inline',
                          isCollapsed && 'lg:hidden'
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </motion.li>
                )
              })}
            </motion.ul>
          </nav>

          {/* User Profile */}
          <div className="mt-12 rounded-2xl bg-green-50 p-5">
            <div
              className={cn(
                'flex items-center gap-4',
                'md:justify-center lg:justify-start',
                isCollapsed && 'lg:justify-center'
              )}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-xl font-bold text-white">
                {user?.nick_name?.charAt(0) || 'U'}
              </div>
              <div
                className={cn(
                  'min-w-0 flex-1',
                  'md:hidden lg:block',
                  isCollapsed && 'lg:hidden'
                )}
              >
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
    </>
  )
}
