import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  FileCheck,
  TrendingUp,
  Settings,
  FileText,
  Files,
  ClipboardCheck,
  Users,
  ChevronUp,
  LogOut,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useSidebarStore } from '@/stores/sidebarStore'
import { cn } from '@/lib/utils'
import { STAGGER, DURATION, EASING } from '@/lib/animations'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
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

type Theme = 'light' | 'dark' | 'system'

interface ThemeOption {
  value: Theme
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

const themeOptions: ThemeOption[] = [
  { value: 'light', label: '라이트', icon: Sun },
  { value: 'dark', label: '다크', icon: Moon },
  { value: 'system', label: '시스템', icon: Monitor },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const { isOpen, isCollapsed, close } = useSidebarStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const navItems =
    user?.user_type === 'teacher' ? teacherNavItems : studentNavItems

  const isActive = (path: string) => {
    return location.pathname === path
  }

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
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
          'fixed left-0 top-0 z-40 h-screen bg-white dark:bg-slate-900 shadow-sm transition-all duration-300',
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
                          : 'text-gray-600 dark:text-gray-400 hover:bg-primary/5 hover:text-primary',
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
                      <Icon
                        className="relative h-5 w-5 shrink-0"
                        strokeWidth={1.75}
                      />
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

          {/* User Profile with Dropdown */}
          <div className="mt-12">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'w-full rounded-2xl bg-green-50 dark:bg-green-900/20 p-5 transition-colors',
                    'hover:bg-green-100 dark:hover:bg-green-900/30',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20'
                  )}
                >
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
                        'min-w-0 flex-1 text-left',
                        'md:hidden lg:block',
                        isCollapsed && 'lg:hidden'
                      )}
                    >
                      <h4 className="truncate text-[15px] font-semibold text-gray-900 dark:text-gray-100">
                        {user?.nick_name || '사용자'}
                      </h4>
                      <p className="truncate text-[13px] text-gray-600 dark:text-gray-400">
                        {user?.user_type === 'teacher'
                          ? '컴퓨터공학과'
                          : '컴퓨터공학과'}
                      </p>
                    </div>
                    <ChevronUp
                      className={cn(
                        'h-4 w-4 text-gray-500',
                        'md:hidden lg:block',
                        isCollapsed && 'lg:hidden'
                      )}
                      strokeWidth={1.75}
                    />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                className="w-[240px]"
                sideOffset={8}
              >
                <DropdownMenuLabel>내 계정</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* 설정 바로가기 */}
                <DropdownMenuItem
                  onClick={() => {
                    navigate({ to: '/settings' })
                    close()
                  }}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" strokeWidth={1.75} />
                  설정
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* 테마 전환 */}
                <DropdownMenuLabel>테마</DropdownMenuLabel>
                <div className="flex gap-1 px-2 py-1.5">
                  {mounted &&
                    themeOptions.map((option) => {
                      const Icon = option.icon
                      const isActiveTheme = theme === option.value

                      return (
                        <button
                          key={option.value}
                          onClick={() => setTheme(option.value)}
                          className={cn(
                            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                            isActiveTheme
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          )}
                          aria-pressed={isActiveTheme}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                          <span className="hidden sm:inline">
                            {option.label}
                          </span>
                        </button>
                      )
                    })}
                </div>

                <DropdownMenuSeparator />

                {/* 로그아웃 */}
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" strokeWidth={1.75} />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </>
  )
}
