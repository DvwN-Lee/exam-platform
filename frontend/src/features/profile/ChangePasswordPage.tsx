import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, '현재 Password를 입력해주세요'),
    new_password: z.string().min(8, '새 Password는 8자 이상이어야 합니다'),
    new_password2: z.string(),
  })
  .refine((data) => data.new_password === data.new_password2, {
    message: '새 Password가 일치하지 않습니다',
    path: ['new_password2'],
  })

type ChangePasswordForm = z.infer<typeof changePasswordSchema>

export function ChangePasswordPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  })

  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast.success('비밀번호가 변경되었습니다.')
      reset()
      navigate({ to: '/profile' })
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.old_password?.[0] ||
        error.response?.data?.detail ||
        '비밀번호 변경에 실패했습니다.'
      toast.error(errorMessage)
    },
  })

  const onSubmit = (data: ChangePasswordForm) => {
    changePasswordMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">비밀번호 변경</h1>
          <p className="text-muted-foreground">새 비밀번호를 설정해주세요</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="old_password">현재 Password</Label>
            <Input
              id="old_password"
              type="password"
              placeholder="현재 Password"
              {...register('old_password')}
            />
            {errors.old_password && (
              <p className="text-sm text-destructive">
                {errors.old_password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">새 Password</Label>
            <Input
              id="new_password"
              type="password"
              placeholder="8자 이상"
              {...register('new_password')}
            />
            {errors.new_password && (
              <p className="text-sm text-destructive">
                {errors.new_password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password2">새 Password 확인</Label>
            <Input
              id="new_password2"
              type="password"
              placeholder="새 Password 재입력"
              {...register('new_password2')}
            />
            {errors.new_password2 && (
              <p className="text-sm text-destructive">
                {errors.new_password2.message}
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate({ to: '/profile' })}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending
                ? '변경 중...'
                : '비밀번호 변경'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
