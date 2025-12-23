import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-green-50">
      <Sidebar />
      <main className="ml-[280px] flex-1 p-12">{children}</main>
    </div>
  )
}
