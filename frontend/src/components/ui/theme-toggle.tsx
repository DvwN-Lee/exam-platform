import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

interface ThemeOption {
  value: Theme
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const themeOptions: ThemeOption[] = [
  { value: 'light', label: '라이트', icon: Sun },
  { value: 'dark', label: '다크', icon: Moon },
  { value: 'system', label: '시스템', icon: Monitor },
]

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex gap-2">
        {themeOptions.map((option) => (
          <div
            key={option.value}
            className="h-9 w-[88px] animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      {themeOptions.map((option) => {
        const Icon = option.icon
        const isActive = theme === option.value

        return (
          <Button
            key={option.value}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme(option.value)}
            aria-pressed={isActive}
            className={cn(
              'flex items-center gap-2',
              isActive && 'pointer-events-none'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{option.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
