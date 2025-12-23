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
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  nick_name: z.string().min(2, '닉네임은 2자 이상이어야 합니다'),
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
      alert('프로필이 업데이트되었습니다.')
    },
    onError: () => {
      alert('프로필 업데이트에 실패했습니다.')
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
        <div>로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">프로필</h1>
          <p className="text-muted-foreground">내 정보를 관리하세요</p>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div>
            <Label className="text-muted-foreground">아이디</Label>
            <div className="mt-1 text-lg font-medium">{profileData.username}</div>
          </div>

          <div>
            <Label className="text-muted-foreground">사용자 유형</Label>
            <div className="mt-1 text-lg font-medium">
              {profileData.user_type === 'student' ? '학생' : '교사'}
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">가입일</Label>
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
            <Label htmlFor="nick_name">닉네임</Label>
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
              {updateMutation.isPending ? '저장 중...' : '프로필 업데이트'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/profile/change-password' })}
            >
              비밀번호 변경
            </Button>
          </div>
        </form>

        <div className="pt-6 border-t">
          <Button variant="destructive" onClick={handleLogout} className="w-full">
            로그아웃
          </Button>
        </div>
      </div>
    </div>
  )
}
