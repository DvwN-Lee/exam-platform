import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const profileSchema = z.object({
  email: z.string().email('\uc62c\ubc14\ub978 \uc774\uba54\uc77c \uc8fc\uc18c\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694'),
  nick_name: z.string().min(2, '\ub2c9\ub124\uc784\uc740 2\uc790 \uc774\uc0c1\uc774\uc5b4\uc57c \ud569\ub2c8\ub2e4'),
})

type ProfileForm = z.infer<typeof profileSchema>

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuthStore()

  const { data: profileData, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: authApi.getProfile,
    enabled: !!user,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      email: profileData?.email || '',
      nick_name: profileData?.nick_name || '',
    },
  })

  const updateMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      setUser(data)
      refetch()
      alert('\ud504\ub85c\ud544\uc774 \uc5c5\ub370\uc774\ud2b8\ub418\uc5c8\uc2b5\ub2c8\ub2e4.')
    },
    onError: () => {
      alert('\ud504\ub85c\ud544 \uc5c5\ub370\uc774\ud2b8\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.')
    },
  })

  const onSubmit = (data: ProfileForm) => {
    updateMutation.mutate(data)
  }

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  if (!profileData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>\ub85c\ub529 \uc911...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">\ud504\ub85c\ud544</h1>
          <p className="text-muted-foreground">\ub0b4 \uc815\ubcf4\ub97c \uad00\ub9ac\ud558\uc138\uc694</p>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div>
            <Label className="text-muted-foreground">Username</Label>
            <div className="mt-1 text-lg font-medium">{profileData.username}</div>
          </div>

          <div>
            <Label className="text-muted-foreground">\uc0ac\uc6a9\uc790 \uc720\ud615</Label>
            <div className="mt-1 text-lg font-medium">
              {profileData.user_type === 'student' ? '\ud559\uc0dd' : '\uad50\uc0ac'}
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">\uac00\uc785\uc77c</Label>
            <div className="mt-1 text-lg">
              {new Date(profileData.created_at).toLocaleDateString('ko-KR')}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nick_name">\ub2c9\ub124\uc784</Label>
            <Input id="nick_name" type="text" {...register('nick_name')} />
            {errors.nick_name && (
              <p className="text-sm text-destructive">{errors.nick_name.message}</p>
            )}
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1"
            >
              {updateMutation.isPending ? '\uc800\uc7a5 \uc911...' : '\ud504\ub85c\ud544 \uc5c5\ub370\uc774\ud2b8'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/profile/change-password' })}
            >
              \ube44\ubc00\ubc88\ud638 \ubcc0\uacbd
            </Button>
          </div>
        </form>

        <div className="pt-6 border-t">
          <Button variant="destructive" onClick={handleLogout} className="w-full">
            \ub85c\uadf8\uc544\uc6c3
          </Button>
        </div>
      </div>
    </div>
  )
}
