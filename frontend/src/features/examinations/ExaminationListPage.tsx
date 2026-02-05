import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { examinationApi } from '@/api/testpaper'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animation'
import { LoadingPage } from '@/components/ui/loading'
import { EmptyState } from '@/components/ui/empty-state'
import { cardHoverVariants } from '@/lib/animations'
import {
  STATUS_LABELS,
  getExamStatus,
  getStatusBadgeVariant,
} from '@/constants/examination'
import { formatKoreanDateTime } from '@/utils/time'
import type { ExaminationFilters, Examination } from '@/types/testpaper'

export function ExaminationListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [filters, setFilters] = useState<ExaminationFilters>({})
  const [searchText, setSearchText] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['examinations', filters],
    queryFn: () => examinationApi.getExaminations(filters),
  })

  const handleSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: searchText, page: 1 }))
  }, [searchText])

  const handleFilterChange = useCallback(
    (key: keyof ExaminationFilters, value: string | number | undefined) => {
      setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
    },
    []
  )

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('시험을 삭제하시겠습니까?')) return

      try {
        await examinationApi.deleteExamination(id)
        refetch()
        toast.success('시험이 삭제되었습니다.')
      } catch {
        toast.error('시험 삭제에 실패했습니다.')
      }
    },
    [refetch]
  )

  const resetFilters = useCallback(() => {
    setFilters({})
    setSearchText('')
  }, [])

  if (isLoading) {
    return <LoadingPage message="시험 목록을 불러오는 중..." />
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">시험 일정</h1>
              <p className="text-muted-foreground text-destructive">
                시험 목록을 불러오는데 실패했습니다.
                {error instanceof Error && `: ${error.message}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => refetch()}>다시 시도</Button>
            <Button variant="outline" onClick={() => navigate({ to: '/dashboard' })}>
              대시보드로 이동
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">시험 일정</h1>
              <p className="text-muted-foreground">
                {user?.user_type === 'teacher'
                  ? '시험 일정을 관리합니다'
                  : '등록된 시험 일정을 확인합니다'}
              </p>
            </div>
            {user?.user_type === 'teacher' && (
              <Button onClick={() => navigate({ to: '/examinations/new' })}>
                시험 생성
              </Button>
            )}
          </div>
        </FadeIn>

        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="flex gap-4">
            <Input
              placeholder="시험명 검색..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch}>검색</Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filters.status || ''}
              onChange={(e) =>
                handleFilterChange('status', e.target.value || undefined)
              }
            >
              <option value="">전체 상태</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filters.ordering || ''}
              onChange={(e) =>
                handleFilterChange('ordering', e.target.value || undefined)
              }
            >
              <option value="">최신순</option>
              <option value="-start_time">시작일 (최신)</option>
              <option value="start_time">시작일 (오래된)</option>
              <option value="-end_time">종료일 (최신)</option>
              <option value="end_time">종료일 (오래된)</option>
            </select>

            {Object.keys(filters).length > 0 && (
              <Button variant="outline" onClick={resetFilters}>
                필터 초기화
              </Button>
            )}
          </div>
        </div>

        <StaggerContainer className="space-y-4">
          {data?.results.length === 0 ? (
            <FadeIn>
              <EmptyState
                title="등록된 시험이 없습니다"
                action={
                  user?.user_type === 'teacher'
                    ? {
                        label: '첫 시험 만들기',
                        onClick: () => navigate({ to: '/examinations/new' }),
                      }
                    : undefined
                }
              />
            </FadeIn>
          ) : (
            data?.results.map((examination: Examination) => {
              const status = getExamStatus(examination.start_time, examination.end_time)
              return (
                <StaggerItem key={examination.id}>
                  <motion.div
                    className="rounded-lg border bg-card p-4 transition-colors"
                    initial="rest"
                    whileHover="hover"
                    variants={cardHoverVariants}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {examination.exam_name}
                          </h3>
                          <Badge variant={getStatusBadgeVariant(status)}>
                            {STATUS_LABELS[status]}
                          </Badge>
                          {examination.is_public && (
                            <Badge variant="purple-soft">공개</Badge>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          시험지: {examination.testpaper.name}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                          <span>시작: {formatKoreanDateTime(examination.start_time)}</span>
                          <span>종료: {formatKoreanDateTime(examination.end_time)}</span>
                          <span>생성자: {examination.creat_user.nick_name}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate({ to: `/examinations/${examination.id}` })
                          }
                        >
                          상세
                        </Button>
                        {user?.id === examination.creat_user.id && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate({
                                  to: `/examinations/${examination.id}/edit`,
                                })
                              }
                            >
                              수정
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(examination.id)}
                            >
                              삭제
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </StaggerItem>
              )
            })
          )}
        </StaggerContainer>

        {data && data.count > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              총 {data.count}개의 시험
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!data.previous}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))
                }
              >
                이전
              </Button>
              <Button
                variant="outline"
                disabled={!data.next}
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))
                }
              >
                다음
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
