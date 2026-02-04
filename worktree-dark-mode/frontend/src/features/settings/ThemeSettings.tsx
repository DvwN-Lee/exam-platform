import { ThemeToggle } from '@/components/ui/theme-toggle'
import { FadeIn } from '@/components/animation'

export function ThemeSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">테마 설정</h2>
        <p className="text-sm text-muted-foreground">
          화면 테마를 선택합니다
        </p>
      </div>

      <FadeIn type="slideUp" delay={0.1}>
        <div className="max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium mb-3">테마 모드</label>
            <ThemeToggle />
          </div>

          <p className="text-sm text-muted-foreground">
            시스템 설정을 선택하면 운영체제의 테마 설정을 따릅니다.
          </p>
        </div>
      </FadeIn>
    </div>
  )
}
