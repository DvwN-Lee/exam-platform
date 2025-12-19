import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, '\ud604\uc7ac Password\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694'),
    new_password: z.string().min(8, '\uc0c8 Password\ub294 8\uc790 \uc774\uc0c1\uc774\uc5b4\uc57c \ud569\ub2c8\ub2e4'),
    new_password_confirm: z.string(),
  })
  .refine((data) => data.new_password === data.new_password_confirm, {
    message: '\uc0c8 Password\uac00 \uc77c\uce58\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4',
    path: ['new_password_confirm'],
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
      alert('\ube44\ubc00\ubc88\ud638\uac00 \ubcc0\uacbd\ub418\uc5c8\uc2b5\ub2c8\ub2e4.')
      reset()
      navigate({ to: '/profile' })
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.old_password?.[0] ||
        error.response?.data?.detail ||
        '\ube44\ubc00\ubc88\ud638 \ubcc0\uacbd\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.'
      alert(errorMessage)
    },
  })

  const onSubmit = (data: ChangePasswordForm) => {
    changePasswordMutation.mutate(data)
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">\ube44\ubc00\ubc88\ud638 \ubcc0\uacbd</h1>
          <p className="text-muted-foreground">\uc0c8 \ube44\ubc00\ubc88\ud638\ub97c \uc124\uc815\ud574\uc8fc\uc138\uc694</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="old_password">\ud604\uc7ac Password</Label>
            <Input
              id="old_password"
              type="password"
              placeholder="\ud604\uc7ac Password"
              {...register('old_password')}
            />
            {errors.old_password && (
              <p className="text-sm text-destructive">
                {errors.old_password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">\uc0c8 Password</Label>
            <Input
              id="new_password"
              type="password"
              placeholder="8\uc790 \uc774\uc0c1"
              {...register('new_password')}
            />
            {errors.new_password && (
              <p className="text-sm text-destructive">
                {errors.new_password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password_confirm">\uc0c8 Password \ud655\uc778</Label>
            <Input
              id="new_password_confirm"
              type="password"
              placeholder="\uc0c8 Password \uc7ac\uc785\ub825"
              {...register('new_password_confirm')}
            />
            {errors.new_password_confirm && (
              <p className="text-sm text-destructive">
                {errors.new_password_confirm.message}
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
              \ucde8\uc18c
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending
                ? '\ubcc0\uacbd \uc911...'
                : '\ube44\ubc00\ubc88\ud638 \ubcc0\uacbd'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
