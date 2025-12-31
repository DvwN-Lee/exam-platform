import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import apiClient from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { FadeIn } from '@/components/animation'

interface ProfileData {
  nick_name: string
  email: string
  mobile?: string
  gender?: 'male' | 'female'
}

export function ProfileSettings() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState<ProfileData>({
    nick_name: user?.nick_name || '',
    email: user?.email || '',
    mobile: '',
    gender: 'female',
  })

  // 프로필 조회
  const { data: profileData, isLoading } = useQuery<ProfileData>({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await apiClient.get('/users/me/')
      return response.data
    },
  })

  // 프로필 데이터가 로드되면 form 초기화
  useEffect(() => {
    if (profileData) {
      setFormData({
        nick_name: profileData.nick_name,
        email: profileData.email,
        mobile: profileData.mobile || '',
        gender: profileData.gender || 'female',
      })
    }
  }, [profileData])

  // 프로필 수정
  const updateMutation = useMutation({
    mutationFn: async (data: ProfileData) => {
      const response = await apiClient.put('/users/me/', data)
      return response.data
    },
    onSuccess: (data) => {
      toast.success('프로필이 수정되었습니다.')
      setUser({ ...user!, ...data })
      setIsEditing(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || '프로필 수정에 실패했습니다.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  if (isLoading) {
    return <div className="text-center">로딩 중...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">프로필 정보</h2>
        <p className="text-sm text-muted-foreground">
          기본 프로필 정보를 관리합니다
        </p>
      </div>

      <FadeIn type="slideUp" delay={0.1}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">
              아이디
            </span>
            <p className="text-base font-medium">{user?.username}</p>
          </div>

        <div>
          <label className="block text-sm font-medium">닉네임</label>
          <input
            type="text"
            value={formData.nick_name}
            onChange={(e) =>
              setFormData({ ...formData, nick_name: e.target.value })
            }
            disabled={!isEditing}
            className="mt-1 w-full rounded-md border px-3 py-2 disabled:bg-muted disabled:text-muted-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">이메일</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            disabled={!isEditing}
            className="mt-1 w-full rounded-md border px-3 py-2 disabled:bg-muted disabled:text-muted-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">전화번호</label>
          <input
            type="tel"
            value={formData.mobile}
            onChange={(e) =>
              setFormData({ ...formData, mobile: e.target.value })
            }
            disabled={!isEditing}
            placeholder="010-1234-5678"
            className="mt-1 w-full rounded-md border px-3 py-2 disabled:bg-muted disabled:text-muted-foreground"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">성별</label>
          <select
            value={formData.gender}
            onChange={(e) =>
              setFormData({
                ...formData,
                gender: e.target.value as 'male' | 'female',
              })
            }
            disabled={!isEditing}
            className="mt-1 w-full rounded-md border px-3 py-2 disabled:bg-muted disabled:text-muted-foreground"
          >
            <option value="female">여성</option>
            <option value="male">남성</option>
          </select>
        </div>

        <div className="flex gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              수정하기
            </button>
          ) : (
            <>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {updateMutation.isPending ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setFormData({
                    nick_name: profileData?.nick_name || '',
                    email: profileData?.email || '',
                    mobile: profileData?.mobile || '',
                    gender: profileData?.gender || 'female',
                  })
                }}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                취소
              </button>
            </>
          )}
        </div>
        </form>
      </FadeIn>
    </div>
  )
}
