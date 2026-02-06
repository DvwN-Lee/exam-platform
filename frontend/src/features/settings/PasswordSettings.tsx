import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck, KeyRound, RefreshCw, Ban } from 'lucide-react'
import apiClient from '@/api/client'
import { getErrorMessage } from '@/utils/error'
import { FadeIn } from '@/components/animation'
import { PASSWORD_MIN_LENGTH } from '@/constants'

interface PasswordData {
  old_password: string
  new_password: string
  new_password2: string
}

export function PasswordSettings() {
  const [formData, setFormData] = useState<PasswordData>({
    old_password: '',
    new_password: '',
    new_password2: '',
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordData) => {
      const response = await apiClient.put('/users/me/change-password/', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('비밀번호가 변경되었습니다.')
      setFormData({
        old_password: '',
        new_password: '',
        new_password2: '',
      })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, '비밀번호 변경에 실패했습니다.'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.new_password !== formData.new_password2) {
      toast.warning('새 비밀번호가 일치하지 않습니다.')
      return
    }

    if (formData.new_password.length < PASSWORD_MIN_LENGTH) {
      toast.warning(`비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`)
      return
    }

    changePasswordMutation.mutate(formData)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">비밀번호 변경</h2>
        <p className="text-sm text-muted-foreground">
          계정 보안을 위해 주기적으로 비밀번호를 변경하세요
        </p>
      </div>

      <FadeIn type="slideUp" delay={0.1}>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div>
            <label className="block text-sm font-medium">현재 비밀번호</label>
            <input
              type="password"
              value={formData.old_password}
              onChange={(e) =>
                setFormData({ ...formData, old_password: e.target.value })
              }
              required
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="현재 비밀번호를 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">새 비밀번호</label>
            <input
              type="password"
              value={formData.new_password}
              onChange={(e) =>
                setFormData({ ...formData, new_password: e.target.value })
              }
              required
              minLength={PASSWORD_MIN_LENGTH}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder={`새 비밀번호를 입력하세요 (최소 ${PASSWORD_MIN_LENGTH}자)`}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              최소 {PASSWORD_MIN_LENGTH}자 이상, 영문, 숫자, 특수문자를 포함하는 것을 권장합니다
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">새 비밀번호 확인</label>
            <input
              type="password"
              value={formData.new_password2}
              onChange={(e) =>
                setFormData({ ...formData, new_password2: e.target.value })
              }
              required
              minLength={PASSWORD_MIN_LENGTH}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="새 비밀번호를 다시 입력하세요"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {changePasswordMutation.isPending ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </FadeIn>

      <FadeIn type="slideUp" delay={0.2}>
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">비밀번호 보안 가이드</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-md border p-3">
              <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">고유한 비밀번호 사용</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  다른 사이트와 동일한 비밀번호를 사용하지 마세요
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Ban className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">개인정보 사용 금지</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  생일, 전화번호 등 추측 가능한 정보를 피하세요
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border p-3">
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">주기적 변경</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  3개월마다 비밀번호를 변경하는 것을 권장합니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  )
}
