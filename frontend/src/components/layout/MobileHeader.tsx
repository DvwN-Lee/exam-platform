import { Menu } from 'lucide-react'
import { useSidebarStore } from '@/stores/sidebarStore'
import { Button } from '@/components/ui/button'

export function MobileHeader() {
  const { toggle } = useSidebarStore()

  return (
    <header className="fixed left-0 right-0 top-0 z-20 flex h-16 items-center justify-between bg-white px-4 shadow-sm md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        aria-label="메뉴 열기"
        className="h-10 w-10"
      >
        <Menu className="h-6 w-6" />
      </Button>

      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 font-bold text-white text-sm">
          E
        </div>
        <span className="text-lg font-bold text-primary">ExamOnline</span>
      </div>

      <div className="w-10" />
    </header>
  )
}
