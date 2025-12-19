import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username\uc740 3\uc790 \uc774\uc0c1\uc774\uc5b4\uc57c \ud569\ub2c8\ub2e4')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username\uc740 \uc601\ubb38, \uc22b\uc790, \ubc11\uc904(_)\ub9cc \uc0ac\uc6a9 \uac00\ub2a5\ud569\ub2c8\ub2e4'),
    email: z.string().email('\uc62c\ubc14\ub978 \uc774\uba54\uc77c \uc8fc\uc18c\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694'),
    nick_name: z.string().min(2, '\ub2c9\ub124\uc784\uc740 2\uc790 \uc774\uc0c1\uc774\uc5b4\uc57c \ud569\ub2c8\ub2e4'),
    password: z
      .string()
      .min(8, 'Password\ub294 8\uc790 \uc774\uc0c1\uc774\uc5b4\uc57c \ud569\ub2c8\ub2e4'),
    password_confirm: z.string(),
    user_type: z.enum(['student', 'teacher']),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: 'Password\uac00 \uc77c\uce58\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4',
    path: ['password_confirm'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export function RegisterPage() {
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      alert('\ud68c\uc6d0\uac00\uc785\uc774 \uc644\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \ub85c\uadf8\uc778\ud574\uc8fc\uc138\uc694.')
      navigate({ to: '/login' })
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        '\ud68c\uc6d0\uac00\uc785\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.'
      alert(errorMessage)
    },
  })

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">\ud68c\uc6d0\uac00\uc785</h1>
          <p className="text-muted-foreground">
            \uc0c8 \uacc4\uc815\uc744 \ub9cc\ub4e4\uc5b4 \uc2dc\uc791\ud558\uc138\uc694
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Username (\uc601\ubb38, \uc22b\uc790, _ \uac00\ub2a5)"
              {...register('username')}
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="\uc774\uba54\uc77c \uc8fc\uc18c"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nick_name">\ub2c9\ub124\uc784</Label>
            <Input
              id="nick_name"
              type="text"
              placeholder="\ub2c9\ub124\uc784"
              {...register('nick_name')}
            />
            {errors.nick_name && (
              <p className="text-sm text-destructive">{errors.nick_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="8\uc790 \uc774\uc0c1"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password_confirm">Password \ud655\uc778</Label>
            <Input
              id="password_confirm"
              type="password"
              placeholder="Password \uc7ac\uc785\ub825"
              {...register('password_confirm')}
            />
            {errors.password_confirm && (
              <p className="text-sm text-destructive">
                {errors.password_confirm.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>\uc0ac\uc6a9\uc790 \uc720\ud615</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="student"
                  {...register('user_type')}
                  className="h-4 w-4"
                />
                <span className="text-sm">\ud559\uc0dd</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="teacher"
                  {...register('user_type')}
                  className="h-4 w-4"
                />
                <span className="text-sm">\uad50\uc0ac</span>
              </label>
            </div>
            {errors.user_type && (
              <p className="text-sm text-destructive">{errors.user_type.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? '\uac00\uc785 \uc911...' : '\ud68c\uc6d0\uac00\uc785'}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">\uc774\ubbf8 \uacc4\uc815\uc774 \uc788\uc73c\uc2e0\uac00\uc694? </span>
          <button
            onClick={() => navigate({ to: '/login' })}
            className="text-primary hover:underline"
          >
            \ub85c\uadf8\uc778
          </button>
        </div>
      </div>
    </div>
  )
}
