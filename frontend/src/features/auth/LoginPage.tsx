import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  username: z.string().min(1, 'Username\uc744 \uc785\ub825\ud574\uc8fc\uc138\uc694'),
  password: z.string().min(1, 'Password\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.access, data.refresh)
      navigate({ to: '/' })
    },
    onError: (error: any) => {
      alert(error.response?.data?.detail || '\ub85c\uadf8\uc778\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.')
    },
  })

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">\ub85c\uadf8\uc778</h1>
          <p className="text-muted-foreground">
            \uc628\ub77c\uc778 \uc2dc\ud5d8 \uc2dc\uc2a4\ud15c\uc5d0 \uc624\uc2e0 \uac83\uc744 \ud658\uc601\ud569\ub2c8\ub2e4
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Username\uc744 \uc785\ub825\ud558\uc138\uc694"
              {...register('username')}
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Password\ub97c \uc785\ub825\ud558\uc138\uc694"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? '\ub85c\uadf8\uc778 \uc911...' : '\ub85c\uadf8\uc778'}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">\uacc4\uc815\uc774 \uc5c6\uc73c\uc2e0\uac00\uc694? </span>
          <button
            onClick={() => navigate({ to: '/register' })}
            className="text-primary hover:underline"
          >
            \ud68c\uc6d0\uac00\uc785
          </button>
        </div>
      </div>
    </div>
  )
}
