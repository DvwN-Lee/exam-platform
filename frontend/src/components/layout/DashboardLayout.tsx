import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { useSidebarStore } from '@/stores/sidebarStore'
import { cn } from '@/lib/utils'
import { MotionWrapper } from '@/components/animation'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isCollapsed } = useSidebarStore()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <MobileHeader />

      <main
        className={cn(
          'flex-1 overflow-y-auto p-6 transition-all duration-300',
          // Mobile: 상단 여백 (MobileHeader h-16 = 64px)
          'pt-16 md:pt-6',
          // Tablet/Desktop: 좌측 여백 (사이드바 너비)
          'md:ml-[64px] lg:ml-[280px]',
          isCollapsed && 'lg:ml-[64px]'
        )}
      >
        <MotionWrapper>{children}</MotionWrapper>
      </main>
    </div>
  )
}
