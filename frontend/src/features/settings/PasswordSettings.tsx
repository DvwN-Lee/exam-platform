import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import apiClient from '@/api/client'
import { FadeIn } from '@/components/animation'

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
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.detail || '비밀번호 변경에 실패했습니다.'
      toast.error(errorMessage)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.new_password !== formData.new_password2) {
      toast.warning('새 비밀번호가 일치하지 않습니다.')
      return
    }

    if (formData.new_password.length < 8) {
      toast.warning('비밀번호는 최소 8자 이상이어야 합니다.')
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
              minLength={8}
              className="mt-1 w-full rounded-md border px-3 py-2"
              placeholder="새 비밀번호를 입력하세요 (최소 8자)"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              최소 8자 이상, 영문, 숫자, 특수문자를 포함하는 것을 권장합니다
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
              minLength={8}
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
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-medium text-blue-900">보안 팁</h3>
          <ul className="mt-2 space-y-1 text-sm text-blue-700">
            <li>• 다른 사이트와 동일한 비밀번호를 사용하지 마세요</li>
            <li>• 개인정보(생일, 전화번호 등)를 비밀번호로 사용하지 마세요</li>
            <li>• 주기적으로 비밀번호를 변경하세요 (3개월마다 권장)</li>
          </ul>
        </div>
      </FadeIn>
    </div>
  )
}
